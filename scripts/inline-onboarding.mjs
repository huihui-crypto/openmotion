import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile, lstat, mkdir, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { runFile } from './runtime-assets.mjs';

// A current host can render this read-only production view without loading a
// new MCP tool. Domain work continues through the installation's existing CLI.
export async function prepareInlineOnboarding({ appRoot, output, language = 'en' }) {
  assert(path.isAbsolute(output) && output.endsWith('.html'), 'Inline onboarding requires an absolute HTML output path supplied by the calling host');
  return JSON.parse(await runFile(process.execPath, ['--experimental-strip-types', path.join(appRoot, 'scripts/inline-onboarding.mjs'),
    '--output', output, '--language', language], { cwd: appRoot }));
}

export async function renderInlineOnboarding({ appRoot, output, language = 'en' }) {
  language = typeof language === 'string' ? language.trim().toLowerCase().split(/[-_]/)[0] : 'en';
  if (!['zh', 'en', 'ja', 'ko', 'fr', 'es', 'pt'].includes(language)) language = 'en';
  const { loadTemplatePresentation, showTemplateRecommendations } = await import('../shared/mcp-template-recommendations.ts');
  const { welcomeMarkdown } = await import('../mcp-ui/template-recommendations/i18n.ts');
  const directory = path.join(appRoot, 'mcp-ui/template-recommendations');
  const presentation = loadTemplatePresentation({ applicationRoot: appRoot, directory });
  const match = presentation.content.text.match(/window\.__OPENMOTION_TEMPLATE_CARDS__=(.*?);<\/script>/s);
  assert(match, 'Verified production bootstrap is missing');
  const bootstrap = JSON.parse(match[1]);
  const recommendation = showTemplateRecommendations(presentation, {
    templateIds: ['product-promo', 'nyt-graph', 'decision-tree'], language,
  });
  let fragment = await readFile(path.join(directory, 'inline.fragment.html'), 'utf8');
  const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');
  const parts = {
    '__OPENMOTION_INLINE_ROOT__': 'openmotion-onboarding-' + randomUUID(),
    '/*__OPENMOTION_INLINE_STYLE__*/': (await readFile(path.join(directory, 'build/app.css'), 'utf8')).replace(/<\/style/gi, '<\\/style'),
    '/*__OPENMOTION_INLINE_APP__*/': (await readFile(path.join(directory, 'build/app.js'), 'utf8')).replace(/<\/script/gi, '<\\/script'),
    '/*__OPENMOTION_INLINE_BOOTSTRAP__*/': json(bootstrap),
    '/*__OPENMOTION_INLINE_RECOMMENDATION__*/': json(recommendation),
  };
  for (const [marker, value] of Object.entries(parts)) {
    assert(fragment.includes(marker), 'Inline template marker is missing: ' + marker);
    fragment = fragment.replaceAll(marker, () => value);
  }
  assert(!fragment.includes('__OPENMOTION_INLINE_'), 'Inline template contains unresolved markers');
  const bytes = Buffer.byteLength(fragment);
  assert(bytes < 1_000_000, 'Inline onboarding exceeds the host document budget');
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, fragment, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  return { status: 'prepared', mode: 'inline-document', path: output, bytes,
    sha256: createHash('sha256').update(fragment).digest('hex'), resourceVersion: presentation.resourceVersion,
    templateIds: recommendation.cards.map(card => card.templateId), language,
    welcomeMarkdown: welcomeMarkdown(language),
    publicationRequired: true,
    draftBehavior: 'clipboard-copy; no task submission', nativeMcpSessionVerified: false,
    instructions: 'Complete onboarding in this same installation turn; never enqueue a user message or defer presentation. Initialize the browser and finish file reads/checks first. This runtime document needs publication with this script --publish-from PATH --sha256 SHA256 --host-directory DIRECTORY using the active chat\'s explicitly permitted visualization directory; runtime write access alone is insufficient. With the returned reference ready, prefer the direct IAB route in docs/install-onboarding.md: load preview.previewUrl in a hidden tab while preparing cards, then reveal the loaded tab and obtain its page state in one call. Do not reopen or inspect it again or repeat an open_in_codex opening. Complete mandatory browser bookkeeping next and immediately write inlinePresentation.welcomeMarkdown as normal final reply text followed by the published contentReference on its own line. The welcome streams as text; the document contains cards only. Preserve the production welcome/cards and full MP4s. Recreate copies the brief to the clipboard with a floating copied/paste Toast; no extra textbox or task submission. Preparation/publication is not visible delivery or native MCP discovery.' };
}

export async function publishInlineOnboarding({ source, expectedSHA256, hostDirectory }) {
  assert(typeof source === 'string' && path.isAbsolute(source) && source.endsWith('.html'), 'Pass an absolute prepared HTML source');
  assert(typeof hostDirectory === 'string' && path.isAbsolute(hostDirectory), 'Pass the active chat\'s explicitly permitted visualization directory');
  assert(/^[a-f0-9]{64}$/.test(expectedSHA256), 'Publication requires the prepared SHA256');
  const fragment = await readFile(source);
  assert(fragment.length < 1_000_000, 'Inline onboarding exceeds the host document budget');
  const sha256 = createHash('sha256').update(fragment).digest('hex');
  assert.equal(sha256, expectedSHA256, 'Prepared onboarding SHA256 mismatch');
  await mkdir(hostDirectory, { recursive: true });
  const output = path.join(hostDirectory, path.basename(source));
  try { await writeFile(output, fragment, { flag: 'wx', mode: 0o600 }); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    assert((await lstat(output)).isFile(), 'Refusing a non-regular host document');
    assert.equal(createHash('sha256').update(await readFile(output)).digest('hex'), sha256, 'Refusing to overwrite a different host document');
  }
  return { status: 'published', path: output, sha256, bytes: fragment.length,
    publicationRequired: false, nativeMcpSessionVerified: false,
    contentReference: 'visualize' + JSON.stringify({ path: output }) + '' };
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const { values } = parseArgs({ options: { output: { type: 'string' }, language: { type: 'string' },
    'publish-from': { type: 'string' }, sha256: { type: 'string' }, 'host-directory': { type: 'string' } } });
  if (values['publish-from']) {
    console.log(JSON.stringify(await publishInlineOnboarding({ source: values['publish-from'], expectedSHA256: values.sha256,
      hostDirectory: values['host-directory'] }), null, 2));
  } else {
    assert(values.output && path.isAbsolute(values.output) && values.output.endsWith('.html'), 'Pass --output with an absolute .html path');
    console.log(JSON.stringify(await renderInlineOnboarding({ appRoot: fileURLToPath(new URL('../', import.meta.url)), output: values.output, language: values.language }), null, 2));
  }
}
