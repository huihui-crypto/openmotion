// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const showToast = vi.fn();
const openConnections = vi.fn();
vi.mock('../contexts/StudioContext', () => ({ useStudioShellContext: () => ({ projectId: '0f8fad5b-d9cb-469f-a165-70867728950e', showToast }) }));
vi.mock('./WorkspaceFrame', () => ({ useOptionalWorkspaceChrome: () => ({
  openConnections,
  workspace: { projects: [{ id: '0f8fad5b-d9cb-469f-a165-70867728950e', title: 'Launch film' }], status: null },
}) }));
const integrationInfo = {
  name: 'OpenMotion', version: '1.0.0', templateSource: 'repository', previewUrl: 'http://127.0.0.1:49937', dataDirectory: '/private/project-data', tools: [],
  transport: { type: 'stdio', command: 'node', args: [], cwd: '/', env: { MOTION_DATA_DIR: '/private/project-data' } },
};

import { ProjectAgentInstruction } from './ProjectAgentInstruction';

let root: Root | undefined;
beforeEach(() => vi.stubGlobal('fetch', vi.fn(async () => Response.json(integrationInfo))));
afterEach(() => { act(() => root?.unmount()); root = undefined; document.body.replaceChildren(); vi.clearAllMocks(); vi.unstubAllGlobals(); });

it('copies a project-scoped MCP instruction with a floating toast', async () => {
  const writeText = vi.fn(async () => {});
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(<ProjectAgentInstruction />));
  const trigger = host.querySelector<HTMLButtonElement>('button[aria-label="MCP instruction"]')!;
  expect(trigger).not.toBeNull();
  await act(async () => trigger.click());
  const popover = await vi.waitFor(() => document.querySelector('[data-testid="project-mcp-popover"]')!);
  expect(popover.textContent).toContain('Launch film');
  const copy = [...popover.querySelectorAll('button')].find(button => button.textContent === 'Copy instruction')!;
  await act(async () => copy.click());
  expect(writeText).toHaveBeenCalledOnce();
  const text = writeText.mock.calls[0]![0] as string;
  expect(text).toContain('0f8fad5b-d9cb-469f-a165-70867728950e');
  expect(text).toContain('openmotion_get_project');
  expect(text).toContain('http://127.0.0.1:49937/?project=');
  expect(showToast).toHaveBeenCalledWith('Project instruction copied. Paste it into another Agent session.', 'info');
  const connect = [...popover.querySelectorAll('button')].find(button => button.textContent === 'Not connected yet? Connect Agent')!;
  await act(async () => connect.click());
  expect(openConnections).toHaveBeenCalledOnce();
});

it('blocks incomplete instructions and recovers after a failed integration fetch', async () => {
  const writeText = vi.fn(async (_text: string) => {});
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
  let finish!: (response: Response) => void;
  const fetcher = vi.fn()
    .mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }))
    .mockResolvedValueOnce(Response.json(integrationInfo));
  vi.stubGlobal('fetch', fetcher);
  const host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(<ProjectAgentInstruction />));
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="MCP instruction"]')!.click());
  const popover = document.querySelector('[data-testid="project-mcp-popover"]')!;
  const copy = [...popover.querySelectorAll('button')].find(button => button.textContent === 'Copy instruction')!;
  expect(popover.querySelector('[role="status"]')).not.toBeNull();
  expect(popover.querySelector('pre')).toBeNull();
  expect(copy.disabled).toBe(true);
  await act(async () => copy.click());
  expect(writeText).not.toHaveBeenCalled();
  await act(async () => finish(Response.json({ error: 'Unavailable' }, { status: 503 })));
  expect(popover.querySelector('[role="status"]')).toBeNull();
  expect(popover.querySelector('[role="alert"]')?.textContent).toContain('Could not load settings');
  expect(popover.querySelector('pre')).toBeNull();
  expect(copy.disabled).toBe(true);
  await act(async () => copy.click());
  expect(writeText).not.toHaveBeenCalled();
  const retry = [...popover.querySelectorAll('button')].find(button => button.textContent === 'Retry')!;
  await act(async () => retry.click());
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher).toHaveBeenLastCalledWith('/motion-api/integration', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(popover.querySelector('[role="alert"]')).toBeNull();
  expect(copy.disabled).toBe(false);
  await act(async () => copy.click());
  expect(writeText).toHaveBeenCalledOnce();
  expect(writeText.mock.calls[0]![0]).toContain('Data directory: /private/project-data');
  expect(writeText.mock.calls[0]![0]).toContain('Editor: http://127.0.0.1:49937/?project=');
});
