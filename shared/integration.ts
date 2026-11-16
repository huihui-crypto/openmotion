import { templatePrompts } from './template-prompts.ts';
import { catalogLocale } from './template-locale.ts';
import { workflowEntryGuide } from './workflow-entry.js';

export const integrationHosts = ['codex', 'claude', 'deepseek', 'chatgpt', 'mcp'] as const;
export type IntegrationHost = typeof integrationHosts[number];
export const hostNames: Record<IntegrationHost, string> = { codex: 'Codex', claude: 'Claude Code', deepseek: 'DeepSeek Harness', chatgpt: 'ChatGPT', mcp: 'MCP / CLI' };
export const hostDescriptions: Record<IntegrationHost, string> = {
  codex: '从 Codex 桌面端或 CLI 出发，把视频创作交给你的 Agent。',
  claude: '在 Claude Code 里，从参考视频到第一稿，再用对话继续打磨。',
  deepseek: '在 DeepSeek Harness 中连接创作工具，让长程任务一路做到成片。',
  chatgpt: '在熟悉的对话里开始创作。ChatGPT 云端接入需要远程工作区。',
  mcp: '连接你喜欢的 MCP 客户端，也可以从终端和脚本开始。',
};
export type IntegrationInfo = {
  templateSource?: 'repository' | 'cms';
  templateEnvironment?: 'dev' | 'prod';
  name: string; version: string; previewUrl: string; dataDirectory: string;
  transport: { type: 'stdio'; command: string; args: string[]; cwd: string; env: Record<string, string> };
  tools: { name: string; description: string }[];
};
export function integrationHost(value: string | null): IntegrationHost {
  return integrationHosts.includes(value as IntegrationHost) ? value as IntegrationHost : 'codex';
}
function shellQuote(value: string) { return "'" + value.replaceAll("'", "'\"'\"'") + "'"; }

// Harness loads a Cordis plugin entry, not an mcpServers JSON object.
// https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md
export function deepseekConfig(info: IntegrationInfo) {
  const { command, args, cwd, env } = info.transport;
  const entry = [
    '- id: mcp-openmotion', "  name: '@deepseek-ai/dsh-mcp-client'", '  config:',
    '    serverName: openmotion', '    transport: stdio', `    command: ${JSON.stringify(command)}`,
    `    args: ${JSON.stringify(args)}`, `    cwd: ${JSON.stringify(cwd)}`, '    env:',
    ...Object.entries(env).map(([key, value]) => `      ${key}: ${JSON.stringify(value)}`),
    '    failOnStartupError: true', '    toolCallTimeoutMs: 180000',
  ];
  return '- insert:\n' + entry.map(line => '    ' + line).join('\n') + '\n';
}

export function integrationConfig(info: IntegrationInfo, host: IntegrationHost) {
  if (host === 'chatgpt') throw new Error('当前工作区提供本机 stdio 服务，尚无可供 ChatGPT 云端连接的远程 MCP 地址。');
  if (host === 'deepseek') return { filename: 'openmotion-dsh.yaml', contentType: 'text/yaml; charset=utf-8', text: deepseekConfig(info) };
  const { command, args, cwd, env } = info.transport;
  if (host === 'codex') return {
    filename: 'openmotion-codex.toml', contentType: 'text/plain; charset=utf-8',
    text: `[mcp_servers.openmotion]\ncommand = ${JSON.stringify(command)}\nargs = ${JSON.stringify(args)}\ncwd = ${JSON.stringify(cwd)}\n\n[mcp_servers.openmotion.env]\n${Object.entries(env).map(([key, value]) => `${key} = ${JSON.stringify(value)}`).join('\n')}\n`,
  };
  return { filename: 'openmotion.mcp.json', contentType: 'application/json; charset=utf-8',
    text: JSON.stringify({ mcpServers: { openmotion: { type: 'stdio', command, args, env } } }, null, 2) + '\n' };
}

export function manualConnection(info: IntegrationInfo, host: IntegrationHost, locale: 'zh-CN' | 'en' = 'zh-CN') {
  if (host === 'deepseek') return deepseekConfig(info);
  if (host === 'chatgpt' && locale === 'en') return 'Current workspace: local stdio\nChatGPT cloud requires an accessible HTTPS MCP service with compatible authorization.\nThis version has no remote MCP endpoint. Use Codex, Claude Code, or DeepSeek Harness locally.';
  if (host === 'chatgpt') return '当前工作区：本机 stdio\nChatGPT 云端需要：可访问的 HTTPS MCP 服务与兼容的授权方式\n此版本尚未提供远程 MCP 端点，可先使用 Codex、Claude Code 或 DeepSeek Harness。';
  if (host === 'mcp') return integrationConfig(info, host).text;
  const { command, args, env } = info.transport;
  const prefix = host === 'codex' ? 'codex mcp add openmotion' : 'claude mcp add --transport stdio openmotion';
  const environment = Object.entries(env).map(([key, value]) => `--env ${shellQuote(`${key}=${value}`)}`).join(' ');
  return `${prefix} ${environment} -- ${[command, ...args].map(shellQuote).join(' ')}\n${host === 'codex' ? 'codex' : 'claude'} mcp get openmotion`;
}

export function apiDiscoveryCommand(info: IntegrationInfo) {
  return `curl --fail-with-body ${shellQuote(info.previewUrl + '/api/integration')}\ncurl --fail-with-body ${shellQuote(info.previewUrl + '/api/project/status')}`;
}

export function guideUrl(info: IntegrationInfo, host: IntegrationHost, templateId?: string) { return `${info.previewUrl}/connect/guide?host=${host}${templateId ? '&template=' + encodeURIComponent(templateId) : ''}`; }
export const setupReadmeUrl = 'https://github.com/nexu-io/openmotion#quick-start';
export function setupGuideUrl(info: IntegrationInfo | null) {
  if (!info || info.templateSource === 'repository') return 'https://github.com/nexu-io/openmotion/blob/main/install.md';
  const environment = info.templateEnvironment ?? info.transport.env.MOTION_TEMPLATE_ENV ?? 'prod';
  return `https://releases.open-design.ai/open-motion/${environment === 'dev' ? 'dev/' : ''}install.md`;
}

// Bootstrap instructions must work before an installation or local server exists.
// Exact local paths belong only to manual configuration and the running service's guide.
export function setupPrompt(info: IntegrationInfo | null, host: IntegrationHost, locale: 'zh-CN' | 'en' = 'zh-CN') {
  if (locale === 'en') {
    if (host === 'chatgpt') return 'ChatGPT cloud requires a public HTTPS MCP service. This workspace uses local stdio. Choose Codex, Claude Code, or DeepSeek Harness to start creating.';
    return `Help me install and connect OpenMotion in ${hostNames[host]}.
Read the GitHub README: ${setupReadmeUrl}
Follow the installation guide: ${setupGuideUrl(info)}

1. Check for an existing installation and connection first. Reuse its workspace; preserve projects, credentials and other MCP settings.
2. Install only if missing. If the existing service is stopped, start it following its guide and use the actual startup URL, never a guessed port.
3. Discover OpenMotion tools in this Agent and call openmotion_get_project to verify the workspace. Configuration alone does not prove connection; report any blocker.
4. ${host === 'codex' ? 'Complete onboarding in this same turn: prepare the welcome and video cards first, then open the template library and immediately present the ready content. Do not send internal instructions as another user message.' : 'Once connected, open the template library.'} Wait for my creative brief before creating or changing a project.`;
  }
  if (host === 'chatgpt') return 'ChatGPT 云端需要公开 HTTPS MCP 服务。当前工作区使用本机 stdio，可先选择 Codex、Claude Code 或 DeepSeek Harness 开始创作。';
  return `帮我在 ${hostNames[host]} 中安装并接入 OpenMotion。
先阅读 GitHub README：${setupReadmeUrl}
再按安装指南操作：${setupGuideUrl(info)}

1. 先检查是否已经安装和连接，优先复用现有工作区，保留工程、凭据及其他 MCP 配置。
2. 未安装时再安装；已安装但服务未启动时，按对应指南启动，使用实际返回的地址，不猜测端口。
3. 在当前 Agent 中发现 OpenMotion 工具，调用 openmotion_get_project 验证工作区。仅写入配置不代表连接成功；遇到阻碍请说明。
4. ${host === 'codex' ? '在本轮完成引导：先准备好欢迎语和视频卡片，再打开模板库并立即展示已就绪的内容，不把内部指令发成新的用户消息。' : '接入后打开模板库，'}等我给出创作要求后再创建或修改工程。`;
}
export type ProjectInstructionTarget = { id: string; title: string };
export function projectEditorUrl(info: IntegrationInfo, projectId: string) {
  const id = encodeURIComponent(projectId);
  return `${info.previewUrl.replace(/\/$/, '')}/?project=${id}#project/${id}`;
}
// Project-level handoff: another Agent session reopens this exact project through the public MCP tools.
// Composes existing operations only; it never creates, switches or overwrites another project.
export function projectEditPrompt(info: IntegrationInfo | null, project: ProjectInstructionTarget, locale: 'zh-CN' | 'en' = 'zh-CN') {
  const title = project.title.trim() || (locale === 'en' ? 'Untitled' : '未命名');
  const guide = setupGuideUrl(info);
  if (locale === 'en') return [
    `Use OpenMotion MCP to continue editing this project: ${title}`,
    `projectId: ${project.id}`,
    ...(info ? [`Data directory: ${info.dataDirectory}`, `Editor: ${projectEditorUrl(info, project.id)}`] : []),
    '',
    `1. Confirm this Agent can discover the OpenMotion tools. If not, install and connect it following ${guide}; ${info ? 'reuse the data directory above' : 'confirm the existing workspace data directory with me before editing'} and preserve existing projects and other MCP settings.`,
    `2. Call openmotion_get_project with the projectId above and check the returned projectId and dataDirectory${info ? ' against the projectId and Data directory lines above' : ' against the projectId above and the confirmed workspace data directory'}. If they do not match, stop and tell me; never edit another project.`,
    '3. After I describe the change, begin a round with openmotion_open_preview (action=begin, mode=modify, same projectId, requestId=beginRequestId), then save with openmotion_edit_project using requestId=saveRequestId and the latest expectedRevision and expectedVersionId. Generate a new requestId for each distinct write call (the begin and every save, including a save retried after re-reading); reuse a requestId only for a byte-identical retry. On a conflict, read again; never overwrite edits made in Studio.',
    '4. When done, follow previewHandoff to show the editor preview in this conversation and confirm the visible result changed.',
    '',
    'My changes:',
    '',
  ].join('\n');
  return [
    `使用 OpenMotion MCP 继续编辑这个项目：${title}`,
    `projectId：${project.id}`,
    ...(info ? [`数据目录：${info.dataDirectory}`, `编辑器：${projectEditorUrl(info, project.id)}`] : []),
    '',
    `1. 先确认当前 Agent 能发现 OpenMotion 工具。未接入时按 ${guide} 安装并接入，${info ? '复用上面的数据目录' : '编辑前先和我确认已有工作区的数据目录'}，保留已有工程和其他 MCP 配置。`,
    `2. 用上面的 projectId 调用 openmotion_get_project，核对返回的 projectId 和 dataDirectory${info ? ' 是否与上面的 projectId 和数据目录一致' : ' 是否与上面的 projectId 和已确认的工作区数据目录一致'}；对不上就停下告诉我，不改其他项目。`,
    '3. 收到我的修改要求后，用 openmotion_open_preview（action=begin、mode=modify、同一 projectId、requestId=beginRequestId）开始本轮修改，再用 openmotion_edit_project 保存，带上 requestId=saveRequestId 及最新的 expectedRevision 和 expectedVersionId。每次不同的写入调用（开始本轮和每次保存，包括冲突后重新读取再保存）都生成新的 requestId，只有完全相同的重试才复用；冲突时重新读取，不覆盖 Studio 里的改动。',
    '4. 改完按 previewHandoff 在当前会话打开编辑器预览，确认画面已经更新。',
    '',
    '我的修改要求：',
    '',
  ].join('\n');
}
export function templatePrompt(_info: IntegrationInfo, _host: IntegrationHost, template: { id: string; title: string }, locale = 'zh-CN') {
  const message = templatePrompts[catalogLocale(Object.keys(templatePrompts), locale, 'en')];
  const values = { installUrl: 'https://github.com/nexu-io/openmotion', name: template.title, id: template.id };
  return message.replace(/\{(installUrl|name|id)\}/g, (_, key: keyof typeof values) => values[key]);
}

export function agentGuide(info: IntegrationInfo, host: IntegrationHost) {
  if (host === 'chatgpt') return `# OpenMotion · ChatGPT 接入\n\n${manualConnection(info, host)}\n\n本地工作区：${info.previewUrl}\n请从 MCP 接入页面选择可用的本机客户端。\n`;
  return `# OpenMotion · ${hostNames[host]} 接入指引

OpenMotion — Agent 会话、动效模板与可编辑产物。
Hyperframes 原生动画与视频工作室。
在对话中编辑，在本地工作区预览，保留可继续修改的工程。

## 当前工作区

- 编辑器：${info.previewUrl}
- 数据目录：${JSON.stringify(info.dataDirectory)}
- 版本：${info.version}
- MCP：本机 stdio，由客户端启动 Node.js 进程。编辑器 URL 不是 HTTP MCP 端点。
- 使用同一台电脑上的 Codex、Claude Code、DeepSeek Harness 或支持 stdio 的 MCP 客户端。

## 接入

先检查已有的 openmotion 服务（或旧 motion 兼容配置）或 OpenMotion 插件；已经指向同一工作区时直接使用。
用户要求连接时，可合并以下配置，保留其他 MCP 服务。若同名服务指向其他工作区，先说明区别，不直接覆盖。

\`\`\`${host === 'deepseek' ? 'yaml' : host === 'mcp' ? 'json' : 'sh'}
${manualConnection(info, host)}
\`\`\`

客户端配置文件片段：

\`\`\`${host === 'deepseek' ? 'yaml' : host === 'codex' ? 'toml' : 'json'}
${integrationConfig(info, host).text}\`\`\`

配置中的绝对路径、MOTION_DATA_DIR 和 PORT 来自正在运行的服务，不要换成其他副本。必要时新建会话加载工具。
通过 initialize 和 tools/list 确认工具加载，再调用 openmotion_get_project，核对返回的 dataDirectory。
网页可达或复制配置不代表 MCP 已连接。只验证接入时不要修改工程。
If tools are missing, inspect this host's server status and startup output before authoring. Follow the connection diagnosis and recovery section in the shared production guide. A separate command-line probe cannot reconnect or verify this chat; after the host reconnects, read the expected data directory and original project/version through its actual MCP connection.
${host === 'deepseek' ? '\n将上方条目合并到 Harness 当前配置，保留其他插件。配置模型后重新加载会话，验证工具 mcp__openmotion__openmotion_get_project；以工具列表中的实际名称为准。MCP 启动不需要 DeepSeek 模型 API Key，模型凭据由 Harness 自身管理。官方配置：https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md\n' : ''}

## 工具

${info.tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

## API / Skill

可通过以下本地只读接口发现工具与工程状态：
\`\`\`sh
${apiDiscoveryCommand(info)}
\`\`\`
Use the public OpenMotion Tools returned by tools/list; the current registry determines the available set. 按本轮意图选择已安装的专业/通用工程入口，已有任务直接续用。安装的 Skill 文档或 resources/list、resources/read 读取相同指引；专业短 ID 为 director/template/recreate/video-to-template，production/start 保留工程入口与兼容导航。固定引擎指南为 openmotion://engine/SKILL.md。

${workflowEntryGuide}

## 创建与编辑

新项目用 openmotion_create_project，提供 requestId、projectType、title、requirements。模板可从 Studio 选择，或调用 openmotion_list_templates 取得本地 JSONL 索引路径后用本机工具检索，再用 openmotion_get_template 读取详情。已知 ID 可直接读详情。内置及 Prism 模板用 projectType=template 创建；参考视频创建的是重建载体，由宿主 Agent 看参考并编写内容，不宣称已经生成影片。现有项目先 openmotion_get_project 列表/详情核对 projectId、sessionId、revision 与 currentVersionId。

Workspace Assets use openmotion_assets_use (openmotion_assets remains compatible): list/get (metadata), read (bounded media at explicit assetId/versionId), import, generate, jobs/status/cancel/retry_save, update (rename, trash/restore, current version) and import_to_project. Upload and generation do not require a project. References pin assetId + versionId; editing appends a version. Import a chosen version into an explicit project before composing. Studio Assets supports direct models; external local Agents use the same asset operations through MCP.
Local fonts use openmotion://fonts/index and per-family resources for selection and on-demand preparation; openmotion_import_assets imports the selected local files and optional licenses with actual metadata and relative CSS. Check required copy and mixed-script rendering before delivery. 素材通过 openmotion_import_assets 批量持久导入实际本机附件，检查逐项结果；再用 openmotion_edit_project 保存原生 HTML/CSS/JS 和可选需求，传 expectedRevision、expectedVersionId 及稳定 requestId。冲突时重新读，不盲目覆盖 GUI 修改。媒体生成使用 openmotion_media_use：先 inspect，读取选中供应商 reference，再查 models 和 schema；明确 projectId、稳定 requestId、provider、model、modality 后 generate，用同一 jobId 查 status 或 cancel。没有可用供应商时，用 openmotion_open_preview 的 target=providers 打开模型供应商页面并完成宿主交接，引导用户选择供应商、填入 Key 并保存，配置好后告诉 Agent；确认后再次 inspect 并接续原需求。已有可用供应商时，按已有需求继续，或了解要生成的内容和参考视频。供应商和 Key 只在 Studio 的模型供应商设置中配置，不把凭据放进对话。完成结果自动保存到本机工作区资产库，同时保留项目原有文件路径；libraryAssets 返回固定 assetId/versionId。savePending 为 true 时，用原 projectId/jobId 和稳定 requestId 调 retry_save，仅重试本地保存，不重新调用模型。完成素材不自动编排进时间轴；费用由实际供应商决定，不自动付费回退或重新提交。

After each content edit or restore, follow previewHandoff and production/native#continuing-edits. Request the same project on the calling chat's right panel, preserving embed/query/hash and reusing the actual native Tab ID. Default foreground preserves the current chat: queue while inactive, resolve the latest version on return, and verify actual visibility and changed live content before action=record_display. Codex IAB visibility synchronization is scoped to the calling chat and does not navigate. queued is only an acknowledgment, not proof that the calling chat is inactive. Apply the same visibility checks to first delivery; hidden automation tabs, markDeliverable and completed MP4 export do not replace the editor handoff. Use visibility=queued only for confirmed inactive-chat deferral; otherwise report the display failure. Only this turn's explicit show-now request permits presentation=now and switching back; background skips presentation. Never guess a project from another chat or workspace.

## 版本与导出

openmotion_list_versions 每页5条内容快照；openmotion_restore_version 恢复旧快照为新版本并保留后续历史。需要成片时才 openmotion_export_request，传 projectId、versionId、expectedRevision、requestId 和 audio 策略；后台冻结本地源文件/媒体，渲染 MP4 并自动技术验证。用 openmotion_get_project 的 exportJobId 查同一任务，只有 completed 才返回实际视频。openmotion_export_cancel 区分 cancelling 与 cancelled；宿主停止对话不等于任务取消。

观看最终画面、声音和真实播放器的播放/跳转/重播。可用预览/导出的 record_review 记录真实证据；未执行的检查记 not_run，技术验证不替代审片或用户验收。
`;
}
