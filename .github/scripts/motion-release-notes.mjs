import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { releaseInputs, verifyDownloaded, repository } from './motion-release.mjs';
import { compareReleaseVersions } from '../../scripts/release-version.mjs';

export async function publishReleaseNotes(directory, { env = process.env, fetcher = fetch } = {}) {
  const inputs = releaseInputs(env);
  assert.notEqual(inputs.action, 'archive-only', 'Snapshot recovery must not create GitHub releases');
  const candidate = await verifyDownloaded(directory, inputs.expectedSHA256, inputs.version);
  const attempt = JSON.parse(await readFile(path.join(directory, 'release-attempt.json'), 'utf8'));
  assert.equal(attempt.version, candidate.version); assert.equal(String(attempt.runId), env.GITHUB_RUN_ID);
  assert([`${inputs.channel}-entry-verified`, 'archived-superseded'].includes(attempt.stage), 'Publish npm and verify snapshots before release notes');
  assert(env.GH_TOKEN, 'Missing scoped GitHub release token');
  const origin = new URL(env.MOTION_INSTALL_PUBLIC_ORIGIN);
  assert(origin.protocol === 'https:' && origin.pathname === '/' && !origin.username && !origin.password && !origin.search && !origin.hash);
  const api = async (route, method = 'GET', data, allowMissing = false) => {
    const response = await fetcher(`https://api.github.com/repos/${repository}${route}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${env.GH_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    if (allowMissing && response.status === 404) return null;
    assert(response.ok, `GitHub release ${method} ${route} failed: HTTP ${response.status}`);
    return response.json();
  };
  const tag = 'v' + candidate.version, prerelease = inputs.channel === 'test';
  const marker = `<!-- openmotion source=${candidate.sourceCommit} sha256=${candidate.tgzSHA256} -->`;
  // Refuse an existing tag pointing at other bytes; never force or move a tag.
  const ref = await api(`/git/ref/tags/${tag}`, 'GET', undefined, true);
  if (ref) {
    let object = ref.object;
    for (let depth = 0; object.type === 'tag' && depth < 5; depth++) object = (await api(`/git/tags/${object.sha}`)).object;
    assert.equal(object.type, 'commit'); assert.equal(object.sha, candidate.sourceCommit, 'Release tag already identifies another source');
  }
  // Listing with write access includes drafts; the by-tag endpoint documents published releases only.
  const releases = [];
  for (let page = 1; ; page++) {
    assert(page <= 100, 'GitHub release history exceeds the bounded lookup');
    const batch = await api(`/releases?per_page=100&page=${page}`);
    assert(Array.isArray(batch), 'Invalid GitHub release list');
    releases.push(...batch);
    if (batch.length < 100) break;
  }
  let release = releases.find(r => r.tag_name === tag);
  if (!release) {
    const previous = releases.filter(r => !r.draft && r.prerelease === prerelease && /^v\d+\.\d+\.\d+(?:-test\.[1-9]\d*(?:\.[1-9]\d*)*)?$/.test(r.tag_name))
      .filter(r => compareReleaseVersions(r.tag_name.slice(1), candidate.version) < 0)
      .sort((a, b) => compareReleaseVersions(b.tag_name.slice(1), a.tag_name.slice(1)))[0];
    const generated = await api('/releases/generate-notes', 'POST', {
      tag_name: tag, target_commitish: candidate.sourceCommit, ...(previous ? { previous_tag_name: previous.tag_name } : {}),
    });
    assert.equal(typeof generated.body, 'string', 'Missing generated release notes');
    const prefix = prerelease ? 'open-motion/dev' : 'open-motion';
    const body = `## Installation\n\n- [Exact ${candidate.version} installation](${origin.origin}/${prefix}/${candidate.version}/install.md)\n- [Current ${inputs.channel} installation](${origin.origin}/${prefix}/install.md)\n- npm: \`${candidate.packageName}@${candidate.version}\`; templates: **${prerelease ? 'DEV' : 'prod'}**.\n\n## Release identity\n\n- Source: [\`${candidate.sourceCommit}\`](https://github.com/${repository}/commit/${candidate.sourceCommit})\n- npm tgz SHA256: \`${candidate.tgzSHA256}\`\n- [Publication and verification](https://github.com/${repository}/actions/runs/${env.GITHUB_RUN_ID})\n\n${prerelease ? 'Test installation checks run separately and may still be pending.' : 'Both exact-version macOS ARM64 and Windows x64 installation checks passed.'} Live templates, real Agent creation and human audiovisual acceptance are separate checks.\n\n${previous ? '' : 'This is the first GitHub Release in this channel; the generated changes may include earlier repository history.\n\n'}${generated.body}\n\n${marker}\n`;
    await writeFile(path.join(directory, 'release-notes.md'), body);
    release = await api('/releases', 'POST', { tag_name: tag, target_commitish: candidate.sourceCommit, name: `OpenMotion ${candidate.version}`, body, draft: true, prerelease });
  }
  assert.equal(release.tag_name, tag); assert.equal(release.prerelease, prerelease);
  assert(release.body?.includes(marker), 'Existing release belongs to another candidate; preserve manual content');
  if (release.draft) {
    assert.equal(release.target_commitish, candidate.sourceCommit, 'Draft release targets another source');
    release = await api(`/releases/${release.id}`, 'PATCH', { draft: false,
      make_latest: !prerelease && attempt.stage !== 'archived-superseded' ? 'true' : 'false' });
  }
  assert.equal(release.draft, false); assert.equal(release.tag_name, tag); assert.equal(release.prerelease, prerelease);
  await writeFile(path.join(directory, 'release-notes.md'), release.body);
  const record = { version: candidate.version, sourceCommit: candidate.sourceCommit, tgzSHA256: candidate.tgzSHA256,
    publicationRun: env.GITHUB_RUN_ID, releaseId: release.id, url: release.html_url, tag, prerelease, status: 'published' };
  await writeFile(path.join(directory, 'github-release.json'), JSON.stringify(record, null, 2) + '\n');
  return record;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, 'Usage: motion-release-notes.mjs <verified-candidate-directory>');
  console.log(JSON.stringify(await publishReleaseNotes(path.resolve(process.argv[2])), null, 2));
}
