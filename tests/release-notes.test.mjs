import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { candidateFixture } from './release-fixture.mjs';
import { publishReleaseNotes } from '../.github/scripts/motion-release-notes.mjs';

async function fixture(t, version = '0.6.8') {
  const f = await candidateFixture(t, 'main', { version });
  await writeFile(path.join(f.directory, 'release-attempt.json'), JSON.stringify({ version, runId: f.env.GITHUB_RUN_ID, stage: `${f.inputs.channel}-entry-verified` }));
  let release, tagSource;
  const writes = [], env = { ...f.env, GH_TOKEN: 'fixture', MOTION_EXPECTED_SHA256: f.candidate.tgzSHA256, MOTION_INSTALL_PUBLIC_ORIGIN: 'https://download.example.invalid' };
  const fetcher = async (url, init) => {
    assert(String(url).startsWith('https://api.github.com/repos/nexu-io/openmotion/'));
    assert.equal(init.headers.Authorization, 'Bearer fixture');
    const route = new URL(url).pathname.split('/openmotion')[1], data = init.body && JSON.parse(init.body);
    if (init.method !== 'GET') writes.push({ route, method: init.method, data });
    if (route.startsWith('/git/ref/')) return tagSource ? Response.json({ object: { type: 'commit', sha: tagSource } }) : new Response('', { status: 404 });
    if (route === '/releases' && init.method === 'GET') return Response.json([...(release ? [release] : []), { draft: false, prerelease: false, tag_name: 'v0.6.7' }]);
    if (route === '/releases/generate-notes') return Response.json({ body: '## Changes\n\n* Fix installation (#1)' });
    if (route === '/releases' && init.method === 'POST') { release = { ...data, id: 7, html_url: 'https://github.com/nexu-io/openmotion/releases/tag/v' + version }; return Response.json(release); }
    if (route === '/releases/7' && init.method === 'PATCH') { release = { ...release, ...data }; tagSource = f.candidate.sourceCommit; return Response.json(release); }
    throw Error('Unexpected GitHub request: ' + init.method + ' ' + route);
  };
  return { ...f, env, fetcher, writes, getRelease: () => release, changeRelease: patch => { release = { ...release, ...patch }; }, setTag: sha => { tagSource = sha; } };
}

for (const [version, prefix, prerelease] of [['0.6.8', 'open-motion', false], ['0.6.8-test.14', 'open-motion/dev', true]]) {
  test(`${version} notes publish an exact-source draft only after verified npm/snapshots`, async t => {
    const f = await fixture(t, version);
    const record = await publishReleaseNotes(f.directory, f);
    assert.equal(record.status, 'published'); assert.equal(record.sourceCommit, f.candidate.sourceCommit);
    const create = f.writes.find(w => w.route === '/releases' && w.method === 'POST').data;
    assert.equal(create.target_commitish, f.candidate.sourceCommit); assert.equal(create.draft, true); assert.equal(create.prerelease, prerelease);
    assert(create.body.includes(`/${prefix}/${version}/install.md`) && create.body.includes(f.candidate.tgzSHA256));
    assert(create.body.includes('real Agent creation and human audiovisual acceptance are separate'));
    const generated = f.writes.find(w => w.route === '/releases/generate-notes').data;
    assert.equal(generated.target_commitish, f.candidate.sourceCommit);
    assert.equal(generated.previous_tag_name, prerelease ? undefined : 'v0.6.7');
    assert.equal(f.writes.at(-1).data.make_latest, prerelease ? 'false' : 'true');
    const count = f.writes.length;
    f.changeRelease({ body: f.getRelease().body + '\nMaintainer edit\n' });
    await publishReleaseNotes(f.directory, f);
    assert.equal(f.writes.length, count, 'Published releases are not overwritten on retry');
    assert((await readFile(path.join(f.directory, 'release-notes.md'), 'utf8')).includes('Maintainer edit'));
  });
}

test('wrong tags, incomplete snapshots, recovery and a changed candidate cannot create release notes', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.directory, 'release-attempt.json'), JSON.stringify({ version: f.candidate.version, runId: f.env.GITHUB_RUN_ID, stage: 'archive-started' }));
  await assert.rejects(publishReleaseNotes(f.directory, f), /verify snapshots/); assert.equal(f.writes.length, 0);
  await writeFile(path.join(f.directory, 'release-attempt.json'), JSON.stringify({ version: f.candidate.version, runId: f.env.GITHUB_RUN_ID, stage: 'archived-superseded' }));
  f.setTag('f'.repeat(40));
  await assert.rejects(publishReleaseNotes(f.directory, f), /another source/); assert.equal(f.writes.length, 0);
  f.setTag(undefined);
  await publishReleaseNotes(f.directory, f);
  assert.equal(f.writes.at(-1).data.make_latest, 'false', 'An older completion cannot replace the latest GitHub release');
  f.changeRelease({ body: 'Unrelated manual release' });
  const count = f.writes.length;
  await assert.rejects(publishReleaseNotes(f.directory, f), /another candidate/); assert.equal(f.writes.length, count);
  await assert.rejects(publishReleaseNotes(f.directory, { ...f, env: { ...f.env, MOTION_RELEASE_ACTION: 'archive-only' } }), /recovery/);
  await writeFile(path.join(f.directory, 'candidate-install.md'), 'changed');
  await assert.rejects(publishReleaseNotes(f.directory, f), /Candidate file changed/);
});

test('a failed final publish resumes the matching draft without generating or creating it twice', async t => {
  const f = await fixture(t);
  const fetcher = async (url, init) => init.method === 'PATCH' ? new Response('', { status: 503 }) : f.fetcher(url, init);
  await assert.rejects(publishReleaseNotes(f.directory, { ...f, fetcher }), /HTTP 503/);
  assert.equal(f.getRelease().draft, true);
  const count = f.writes.length;
  await publishReleaseNotes(f.directory, f);
  assert.equal(f.writes.length, count + 1);
  assert.equal(f.writes.at(-1).method, 'PATCH');
  assert.equal(f.getRelease().draft, false);
});

test('GitHub Release writing is isolated from npm/R2 and never runs for archive-only recovery', async () => {
  const workflow = await readFile(new URL('../.github/workflows/motion-publish-test.yml', import.meta.url), 'utf8');
  const [before, notes] = workflow.split('\n  release-notes:\n');
  assert(notes.includes('needs: [verify, snapshot, stable-snapshot]') && notes.includes('inputs.archive_only != true'));
  assert(notes.includes("needs.snapshot.result == 'success'") && notes.includes("needs.stable-snapshot.result == 'success'"));
  assert(notes.includes('contents: write') && notes.includes('continue-on-error: true'));
  assert(!before.includes('contents: write'));
  assert(!/id-token:|secrets\.|secrets:|npm publish|dist-tag add/.test(notes));
  assert(notes.includes('artifact-ids: ${{ needs.verify.outputs.artifact_id }}'));
  assert(notes.includes('needs.snapshot.outputs.artifact_id || needs.stable-snapshot.outputs.artifact_id'));
  const recovery = await readFile(new URL('../.github/workflows/motion-publication-recovery.yml', import.meta.url), 'utf8');
  assert(recovery.includes('contents: write') && recovery.includes('archive_only: true'), 'The reusable caller must permit the conditional Release job without running it');
});
