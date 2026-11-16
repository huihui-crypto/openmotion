/** Application pages live in the query; the project hash belongs to the editor. */
export const settingsSections = ['account', 'subscription', 'providers', 'models', 'local', 'general', 'appearance', 'privacy', 'about', 'help', 'mcp'] as const;
export type SettingsSection = typeof settingsSections[number];
export const mcpClients = ['codex', 'claude', 'cursor', 'deepseek', 'desktop', 'chatgpt', 'mcp'] as const;
export type McpClient = typeof mcpClients[number];
export type WorkspacePage = { settings: SettingsSection | null; assets: boolean; templates: boolean; client: McpClient; setup: 'agent' | 'manual'; provider: string | null; template: string | null };

export function readWorkspacePage(search: string): WorkspacePage {
  const query = new URLSearchParams(search), page = query.get('page'), section = query.get('section');
  const settings = page === 'mcp' ? 'mcp' : page === 'settings'
    ? settingsSections.find(value => value === section) ?? 'general' : null;
  return { settings, assets: page === 'assets', templates: query.get('templates') === '1',
    client: mcpClients.find(value => value === query.get('host')) ?? 'codex',
    setup: query.get('setup') === 'manual' ? 'manual' : 'agent',
    provider: settings === 'providers' ? query.get('provider') || null : null,
    template: query.get('templates') === '1' ? query.get('template') || null : null };
}

export function workspacePageHref(href: string, patch: Partial<WorkspacePage>): string {
  const url = new URL(href), page = { ...readWorkspacePage(url.search), ...patch };
  for (const key of ['page', 'section', 'templates', 'host', 'setup', 'provider', 'template']) url.searchParams.delete(key);
  if (patch.settings) page.assets = false;
  if (patch.assets) page.settings = null;
  if (page.assets) {
    url.searchParams.set('page', 'assets');
  } else if (page.settings === 'mcp') {
    url.searchParams.set('page', 'mcp');
    url.searchParams.set('host', page.client);
    if (page.setup === 'manual') url.searchParams.set('setup', 'manual');
  } else if (page.settings) {
    url.searchParams.set('page', 'settings');
    url.searchParams.set('section', page.settings);
    if (page.settings === 'providers' && page.provider) url.searchParams.set('provider', page.provider);
  }
  if (page.templates) {
    url.searchParams.set('templates', '1');
    if (page.template) url.searchParams.set('template', page.template);
  }
  return url.pathname + url.search + url.hash;
}
