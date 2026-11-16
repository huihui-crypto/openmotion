import test from 'node:test';
import assert from 'node:assert/strict';
import { projectEditPrompt, projectEditorUrl, setupPrompt, setupGuideUrl, templatePrompt, type IntegrationInfo } from '../shared/integration.ts';

const info: IntegrationInfo = {
  name: 'OpenMotion', version: '1.0.0', templateSource: 'repository',
  previewUrl: 'http://127.0.0.1:49937', dataDirectory: '/private/project-data', tools: [],
  transport: { type: 'stdio', command: '/private/node', args: ['/private/mcp.ts'], cwd: '/private', env: { MOTION_DATA_DIR: '/private/project-data' } },
};

test('setup works before local discovery and never copies machine-local details', () => {
  for (const locale of ['en', 'zh-CN'] as const) {
    for (const host of ['codex', 'claude', 'deepseek', 'mcp'] as const) {
      for (const discovery of [null, info]) {
        const prompt = setupPrompt(discovery, host, locale);
        assert.match(prompt, /https:\/\/github.com\/nexu-io\/openmotion#quick-start/);
        assert.ok(prompt.includes(setupGuideUrl(discovery)));
        assert.match(prompt, /openmotion_get_project/);
        assert.doesNotMatch(prompt, /127\.0\.0\.1|localhost|\/connect\/guide|\/private|49937/);
      }
    }
  }
  const prompt = setupPrompt(null, 'codex', 'en');
  assert.match(prompt, /Reuse its workspace/);
  assert.match(prompt, /Install only if missing/);
  assert.match(prompt, /service is stopped/);
  assert.match(prompt, /Configuration alone does not prove connection/);
  assert.match(prompt, /Wait for my creative brief/);
  assert.match(prompt, /same turn/);
  assert.match(prompt, /prepare the welcome and video cards first/);
  assert.match(setupPrompt(null, 'codex', 'zh-CN'), /在本轮完成引导/);
  for (const host of ['claude', 'deepseek', 'mcp'] as const) {
    assert.doesNotMatch(setupPrompt(null, host, 'en'), /welcome and video cards/);
    assert.doesNotMatch(setupPrompt(null, host, 'zh-CN'), /视频卡片/);
  }
});

test('public setup retains repository and published catalog environments', () => {
  assert.equal(setupGuideUrl(null), 'https://github.com/nexu-io/openmotion/blob/main/install.md');
  assert.equal(setupGuideUrl(info), setupGuideUrl(null));
  const published: IntegrationInfo = { ...info, templateSource: 'cms' };
  assert.equal(setupGuideUrl(published), 'https://releases.open-design.ai/open-motion/install.md');
  assert.equal(setupGuideUrl({ ...published, templateEnvironment: 'dev' }), 'https://releases.open-design.ai/open-motion/dev/install.md');
  assert.equal(setupGuideUrl({ ...published, transport: { ...info.transport, env: { ...info.transport.env, MOTION_TEMPLATE_ENV: 'dev' } } }), 'https://releases.open-design.ai/open-motion/dev/install.md');
  assert.equal(setupGuideUrl({ ...info, templateEnvironment: 'dev' }), setupGuideUrl(null));
  assert.match(setupPrompt(null, 'chatgpt', 'en'), /requires a public HTTPS MCP service/);
});

test('template prompt reuses the shared published install guide', () => {
  const template = { id: 'prism-a', title: 'Prism A' };
  for (const published of [
    { ...info, templateSource: 'cms' } as IntegrationInfo,
    { ...info, templateSource: 'cms', templateEnvironment: 'dev' } as IntegrationInfo,
    { ...info, templateSource: 'cms', transport: { ...info.transport, env: { ...info.transport.env, MOTION_TEMPLATE_ENV: 'dev' } } } as IntegrationInfo,
  ]) {
    for (const locale of ['en', 'zh-CN']) {
      assert.ok(templatePrompt(published, 'codex', template, locale).includes(setupGuideUrl(published)));
    }
  }
});

test('project instruction pins the exact project and composes only public MCP operations', () => {
  const project = { id: '0f8fad5b-d9cb-469f-a165-70867728950e', title: 'Launch film' };
  for (const locale of ['en', 'zh-CN'] as const) {
    const prompt = projectEditPrompt(info, project, locale);
    assert.match(prompt, new RegExp(project.id));
    assert.match(prompt, /Launch film/);
    assert.ok(prompt.includes(info.dataDirectory));
    assert.ok(prompt.includes(projectEditorUrl(info, project.id)));
    for (const tool of ['openmotion_get_project', 'openmotion_open_preview', 'openmotion_edit_project']) assert.ok(prompt.includes(tool), `${locale}: ${tool}`);
    assert.match(prompt, /expectedRevision/);
    assert.doesNotMatch(prompt, /openmotion_create_project/);
    const offline = projectEditPrompt(null, { id: project.id, title: ' ' }, locale);
    assert.match(offline, new RegExp(project.id));
    assert.ok(offline.includes(setupGuideUrl(null)));
    assert.doesNotMatch(offline, /127\.0\.0\.1|project-data/);
  }
  assert.equal(projectEditorUrl({ ...info, previewUrl: 'http://127.0.0.1:49937/' }, 'project'), 'http://127.0.0.1:49937/?project=project#project/project');
});

test('project handoff checks returned identity fields and supplies retry-safe write identities in both locales', () => {
  for (const locale of ['en', 'zh-CN'] as const) {
    for (const integration of [info, null]) {
      const prompt = projectEditPrompt(integration, { id: 'project-a', title: 'Launch film' }, locale);
      const steps = prompt.split('\n');
      const check = steps.find(line => line.startsWith('2.'))!;
      const write = steps.find(line => line.startsWith('3.'))!;
      assert.match(check, /projectId/);
      assert.match(check, /dataDirectory/);
      assert.doesNotMatch(check, /title|标题/);
      assert.match(write, /openmotion_open_preview.*requestId=beginRequestId/);
      assert.match(write, /openmotion_edit_project.*requestId=saveRequestId/);
      assert.match(write, /expectedRevision.*expectedVersionId/);
      assert.match(write, locale === 'en' ? /distinct.*each round.*stable.*retrying/ : /每轮生成不同.*重试时保持对应值不变/);
      if (integration) {
        assert.match(check, locale === 'en' ? /Data directory lines above/ : /上面的 projectId 和数据目录/);
      } else {
        assert.doesNotMatch(prompt, /data directory above|Data directory:|Editor:|上面的数据目录|数据目录：|编辑器：/);
        assert.match(check, locale === 'en' ? /confirmed workspace data directory/ : /已确认的工作区数据目录/);
      }
    }
  }
});
