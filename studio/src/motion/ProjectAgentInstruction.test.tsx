// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';

const showToast = vi.fn();
const openConnections = vi.fn();
vi.mock('../contexts/StudioContext', () => ({ useStudioShellContext: () => ({ projectId: '0f8fad5b-d9cb-469f-a165-70867728950e', showToast }) }));
vi.mock('./WorkspaceFrame', () => ({ useOptionalWorkspaceChrome: () => ({
  openConnections,
  workspace: { projects: [{ id: '0f8fad5b-d9cb-469f-a165-70867728950e', title: 'Launch film' }], status: null },
}) }));
vi.mock('./useIntegrationInfo', () => ({ useIntegrationInfo: () => ({ info: {
  name: 'OpenMotion', version: '1.0.0', templateSource: 'repository', previewUrl: 'http://127.0.0.1:49937', dataDirectory: '/private/project-data', tools: [],
  transport: { type: 'stdio', command: 'node', args: [], cwd: '/', env: { MOTION_DATA_DIR: '/private/project-data' } },
}, failed: false, retry() {} }) }));

import { ProjectAgentInstruction } from './ProjectAgentInstruction';

let root: Root | undefined;
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
