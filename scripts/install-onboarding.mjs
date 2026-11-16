import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFile } from './runtime-assets.mjs';
import { prepareCodexHostHandoff } from './codex-host-handoff.mjs';

export async function installationInstructions(appRoot) {
  const guide = await readFile(path.join(appRoot, 'docs/install-onboarding.md'), 'utf8');
  const sections = [...guide.matchAll(/<!-- installation-onboarding:start -->([\s\S]*?)<!-- installation-onboarding:end -->/g)];
  assert.equal(sections.length, 1, 'Installation guide must contain one onboarding contract');
  assert(sections[0][1].trim(), 'Installation onboarding contract is empty');
  return sections[0][1].trim();
}

// Inspect shipped manifests and files only; never copy a project or download assets here.
export async function bundledOnboardingTemplates(appRoot) {
  const templates = [];
  // These unchanged examples have been reviewed for self-contained sample content.
  // A new bundled directory is not automatically a no-input/no-generation experience.
  const reviewed = new Set(['product-promo', 'nyt-graph', 'decision-tree']);
  const directory = path.join(appRoot, 'template-library');
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isDirectory() || !reviewed.has(entry.name)) continue;
    try {
      const root = path.join(directory, entry.name);
      const item = JSON.parse(await readFile(path.join(root, 'registry-item.json'), 'utf8'));
      assert.equal(item.name, entry.name);
      assert(item.title && Array.isArray(item.files) && item.files.some(file => file.target === 'index.html'));
      for (const file of item.files) {
        assert(typeof file.path === 'string' && !file.path.includes('\\') && !path.isAbsolute(file.path) && !file.path.split('/').includes('..'));
        await access(path.join(root, file.path));
      }
      await access(path.join(appRoot, 'node_modules/gsap/dist/gsap.min.js'));
      templates.push({ templateId: item.name, name: String(item.title).slice(0, 120),
        summary: String(item.description || '').slice(0, 240), durationSeconds: item.duration,
        kind: 'builtin', eligibility: 'confirmed', requirements: 'Unchanged bundled example; no user assets or paid generation required.' });
    } catch { /* An incomplete example must not become an eligible offer. */ }
  }
  return templates.sort((a, b) => a.templateId.localeCompare(b.templateId));
}

export async function prepareInstallationOnboarding({ appRoot, dataDirectory, templateEnvironment, host = 'codex', onboardingOutput,
  language = process.env.OPENMOTION_ONBOARDING_LANGUAGE || 'en' }) {
  // A missing canonical contract fails before host registration.
  const instructions = await installationInstructions(appRoot);
  const inline = (async () => {
    if (host !== 'codex') return undefined;
    try {
      if (!dataDirectory) {
        const { WorkspaceStore } = await import('../workspace.ts');
        dataDirectory = new WorkspaceStore().directory;
      }
      const { prepareInlineOnboarding } = await import('./inline-onboarding.mjs');
      return await prepareInlineOnboarding({ appRoot, language,
        output: onboardingOutput || path.join(dataDirectory, 'onboarding', `welcome-${randomUUID()}.html`) });
    } catch (error) { return { status: 'unavailable', warning: error.message }; }
  })();
  const bundled = await bundledOnboardingTemplates(appRoot);
  let catalog;
  try {
    catalog = JSON.parse(await runFile(process.execPath, ['--experimental-strip-types', path.join(appRoot, 'scripts/onboarding-catalog.ts'),
      ...(dataDirectory ? [dataDirectory] : [])], {
      cwd: appRoot, timeout: 5_000, killSignal: 'SIGKILL',
      env: { ...process.env, MOTION_TEMPLATE_ENV: templateEnvironment },
    }));
    assert(Array.isArray(catalog.templates), 'Invalid onboarding catalog');
  } catch {
    catalog = { source: 'bundled', environment: templateEnvironment, catalogVersion: null,
      catalogTotal: null, included: bundled.length, truncated: false, stale: false,
      warning: 'Remote catalog unavailable; using verified bundled examples only.', templates: bundled };
  }
  const inlinePresentation = await inline;
  return { hostSessionVerified: false, instructions, catalog,
    ...(inlinePresentation ? { inlinePresentation } : {}) };
}

export async function prepareInstallationPreview({ appRoot, dataDirectory }) {
  try {
    const preview = JSON.parse(await runFile(process.execPath, ['--experimental-strip-types', path.join(appRoot, 'scripts/open-template-library.ts')], {
      cwd: appRoot, timeout: 30_000, killSignal: 'SIGKILL',
      env: { ...process.env, ...(dataDirectory ? { MOTION_DATA_DIR: dataDirectory } : {}) },
    }));
    assert.equal(preview.target, 'templates');
    assert.equal(preview.projectCreated, false);
    assert.equal(new URL(preview.previewUrl).searchParams.get('templates'), '1');
    return { status: 'ready', ...preview };
  } catch (error) {
    return { status: 'unavailable', openedByHost: false, projectCreated: false,
      warning: 'Template library could not be prepared: ' + error.message,
      nextAction: 'Installation succeeded; report the preview failure and retry openmotion_open_preview with target=templates after connecting MCP. Do not create a placeholder project.' };
  }
}

// Shared by packaged setup, source setup and the plugin's setup Skill. A ready
// artifact is an installation handoff, never proof of visible host delivery.
export async function prepareInstallationFlow(options) {
  if (!options.dataDirectory) {
    let configuration;
    try { configuration = JSON.parse(await readFile(path.join(options.appRoot, '.mcp.json'), 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const server = configuration?.mcpServers?.openmotion;
    const declared = server?.env?.MOTION_DATA_DIR;
    if (declared !== undefined && declared !== '') {
      const expand = value => {
        assert(typeof value === 'string', 'Invalid installed connection environment value');
        const result = value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key) => {
          if (key === 'PLUGIN_ROOT' || key === 'CLAUDE_PLUGIN_ROOT') return options.appRoot;
          assert(process.env[key] !== undefined, 'Resolve the installed connection environment before onboarding');
          return process.env[key];
        });
        assert(!result.includes('${'), 'Resolve the installed connection environment before onboarding');
        return result;
      };
      const resolved = expand(declared);
      const cwd = path.isAbsolute(resolved) ? '.' : expand(server.cwd || '.');
      if (resolved) options = { ...options, dataDirectory: path.isAbsolute(resolved) ? path.resolve(resolved) : path.resolve(options.appRoot, cwd, resolved) };
      else {
        const { WorkspaceStore } = await import('../workspace.ts');
        options = { ...options, dataDirectory: new WorkspaceStore().directory };
      }
    } else {
      const { WorkspaceStore } = await import('../workspace.ts');
      options = { ...options, dataDirectory: new WorkspaceStore().directory };
    }
  }
  const [onboarding, preview] = await Promise.all([
    prepareInstallationOnboarding(options), prepareInstallationPreview(options),
  ]);
  let hostHandoff;
  if ((options.host || 'codex') === 'codex' && onboarding.inlinePresentation?.status !== 'prepared') {
    hostHandoff = await prepareCodexHostHandoff({ dataDirectory: options.dataDirectory,
      expectedVersion: options.expectedVersion || JSON.parse(await readFile(path.join(options.appRoot, 'package.json'), 'utf8')).version,
      codex: options.codex });
  }
  return { ...onboarding, installationStatus: 'installed', applicationRoot: options.appRoot,
    dataDirectory: options.dataDirectory, preview,
    ...(hostHandoff ? { hostHandoff } : {}),
    onboardingStatus: preview.status !== 'ready' ? 'preview_unavailable'
      : onboarding.inlinePresentation?.status === 'prepared' ? 'awaiting_host_delivery' : hostHandoff?.status || 'awaiting_host_delivery',
    onboardingComplete: false, hostSessionVerified: hostHandoff?.hostSessionVerified || false };
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const appRoot = path.resolve(process.argv[2] || fileURLToPath(new URL('../', import.meta.url)));
  if (process.argv[3] === '--check-contract') {
    await installationInstructions(appRoot);
  } else {
    const defaults = JSON.parse(await readFile(path.join(appRoot, 'shared/template-config.json'), 'utf8'));
    const options = { appRoot, dataDirectory: process.env.MOTION_DATA_DIR, templateEnvironment: process.env.MOTION_TEMPLATE_ENV || defaults.environment };
    const result = await prepareInstallationFlow(options);
    const { hostHandoff, preview } = result;
    // Keep the decision and handoff visible instead of burying them after a long
    // quoted success contract. The full contract remains available for the Agent.
    if (process.argv.includes('--summary')) {
      const detailsFile = path.join(appRoot, '.artifacts/install', `onboarding-${Date.now()}-${process.pid}.json`);
      await mkdir(path.dirname(detailsFile), { recursive: true });
      await writeFile(detailsFile, JSON.stringify(result, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
      if (!result.onboardingComplete) console.error('ONBOARDING_PENDING: ' + (hostHandoff?.reason || result.onboardingStatus)
        + '. Installation is registered; welcome/cards delivery remains unverified. '
        + (result.inlinePresentation?.status === 'prepared'
          ? 'Continue in this same installation turn: initialize the browser, finish checks and publish the verified document in this chat\'s permitted visualization directory before opening the library. Prefer the direct IAB route in docs/install-onboarding.md: load preview.previewUrl in a hidden tab while preparing cards, then reveal that loaded tab and obtain its page state in one call; do not reopen or inspect it again. Complete mandatory browser bookkeeping next, then immediately write inlinePresentation.welcomeMarkdown as normal final reply text followed by the published contentReference on its own line. The welcome streams as text; the document contains cards only. '
          : 'Open the library and report the required host action. ')
        + 'Do not enqueue a user message, defer to another turn or send a separate success reply.');
      if (preview.status !== 'ready') console.error('ONBOARDING_PENDING: ' + preview.warning);
      console.log(JSON.stringify({ ...result, instructions: undefined, catalog: undefined, detailsFile }, null, 2));
    } else console.log(JSON.stringify(result, null, 2));
  }
}
