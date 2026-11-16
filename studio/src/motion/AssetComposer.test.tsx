// @vitest-environment happy-dom
import { act, useState, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AssetComposer, type AssetDraft } from './AssetComposer';
import type { Model } from '../../../shared/gateway';
const { generate, loadGateway } = vi.hoisted(() => ({ generate: vi.fn(), loadGateway: vi.fn() }));
vi.mock('./assetClient', () => ({ assetRequest: generate }));
vi.mock('./gatewayClient', () => ({ loadGateway }));
vi.mock('./AssetConversation', () => ({ AssetConversation: () => null }));
vi.mock('../i18n/I18n', () => ({ useI18n: () => ({ t: (text: string) => text }) }));
vi.mock('./WorkspaceFrame', () => ({ useWorkspaceChrome: () => ({ openModelSettings: vi.fn() }) }));
const model: Model = { id: 'codex:image', provider: 'codex', modelId: 'image', label: 'Codex Image', modality: 'image', source: 'builtin', mode: 'text-to-image' };
let root: Root, container: HTMLDivElement;
const created = vi.fn();
const props: ComponentProps<typeof AssetComposer> = {
  active: true, draft: { modality: 'image', model: model.id, prompt: 'Continue the original', parameters: { size: '1536x1024', custom: { value: 7 } }, references: [] },
  setDraft: vi.fn(), agentReferences: [], setAgentReferences: vi.fn(), jobs: [], mode: 'direct', onMode: vi.fn(), taskIds: {},
  history: { tasks: [], loading: false, onRetry: vi.fn(), onSelect: vi.fn() }, selectingTask: false,
  onNew: vi.fn(), onChatChanged: vi.fn(), onChatStarted: vi.fn(), onCancel: vi.fn(), onView: vi.fn(), onReference: vi.fn(), onCreated: created, onError: vi.fn(), onClose: vi.fn(),
};
beforeEach(() => { vi.clearAllMocks(); loadGateway.mockResolvedValue({ models: [model], status: { providers: [{ id: 'codex', available: true }], routes: {} } }); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
it('temporarily hides the Agent tab and keeps direct generation available when viewing a conversation', async () => {
  await act(async () => root.render(<AssetComposer {...props} mode="agent" />));
  expect(container.querySelector('button[aria-label="Agent conversation"]')).toBeNull();
  const direct = container.querySelector<HTMLButtonElement>('button[aria-label="Direct generation"]')!;
  expect(direct.textContent).toBe('Generate');
  expect(direct.getAttribute('aria-pressed')).toBe('false');
  await act(async () => direct.click());
  expect(props.onMode).toHaveBeenCalledExactlyOnceWith('direct');
});
it('restores native and custom parameters without submitting until explicitly requested', async () => {
  generate.mockResolvedValue({ job: { id: 'new-job' } });
  await act(async () => root.render(<AssetComposer {...props} />));
  expect(container.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('Continue the original');
  expect(generate).not.toHaveBeenCalled();
  await act(async () => container.querySelector<HTMLButtonElement>('.om-creation-submit-button')!.click());
  expect(generate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ action: 'generate', model: model.id, prompt: 'Continue the original', parameters: props.draft.parameters }));
  expect(created).toHaveBeenCalledWith({ id: 'new-job' });
});
it('does not silently replace the historical model with an available default', async () => {
  await act(async () => root.render(<AssetComposer {...props} draft={{ ...props.draft, model: 'missing:model' }} />));
  expect(container.textContent).toContain('This task’s model is unavailable');
  expect(container.querySelector<HTMLButtonElement>('.om-creation-submit-button')?.disabled).toBe(true);
  expect(generate).not.toHaveBeenCalled();
});
it.each([
  ['prompt', { prompt: 'A new idea typed while waiting' }],
  ['model', { model: 'other:image' }],
  ['references', { references: [{ name: 'New reference', reference: { assetId: 'asset', versionId: 'version' } }] }],
  ['parameters', { parameters: { size: '1024x1024' } }],
] as const)('preserves pending %s edits while recording the submitted job', async (_field, changes) => {
  let resolve!: (value: unknown) => void;
  generate.mockImplementation(() => new Promise(done => { resolve = done; }));
  let latest!: AssetDraft, update!: ComponentProps<typeof AssetComposer>['setDraft'];
  function Harness() {
    const [draft, setDraft] = useState(props.draft); latest = draft; update = setDraft;
    return <AssetComposer {...props} draft={draft} setDraft={setDraft} />;
  }
  await act(async () => root.render(<Harness />));
  await act(async () => container.querySelector<HTMLButtonElement>('.om-creation-submit-button')!.click());
  const edited = { ...props.draft, ...structuredClone(changes) } as AssetDraft;
  await act(async () => update(edited));
  await act(async () => resolve({ job: { id: 'submitted-job' } }));
  expect(latest).toBe(edited);
  expect(created).toHaveBeenCalledExactlyOnceWith({ id: 'submitted-job' });
  expect(generate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ prompt: props.draft.prompt, model: model.id, parameters: props.draft.parameters, references: [] }));
});
it('sends one reference to an account image model that reports editing support', async () => {
  const account: Model = { id: 'account:image', provider: 'account', modelId: 'image', label: 'Account Image', modality: 'image', source: 'live', mode: 'text-to-image', supportsImageReference: true };
  const basic: Model = { ...account, id: 'account:basic', modelId: 'basic', label: 'Account Basic', supportsImageReference: undefined };
  loadGateway.mockResolvedValue({ models: [account, basic], status: { providers: [{ id: 'account', available: true }], routes: {} } });
  generate.mockResolvedValue({ job: { id: 'edit-job' } });
  const references = [{ name: 'Cup', reference: { assetId: 'asset', versionId: 'version' } }];
  const draft = { ...props.draft, model: basic.id, parameters: {}, references };
  await act(async () => root.render(<AssetComposer {...props} draft={draft} />));
  expect(container.textContent).toContain('This model cannot use asset references');
  expect(container.querySelector<HTMLButtonElement>('.om-creation-submit-button')?.disabled).toBe(true);
  await act(async () => root.render(<AssetComposer {...props} draft={{ ...draft, model: account.id }} />));
  expect(container.textContent).toContain('This model edits one image reference.');
  await act(async () => container.querySelector<HTMLButtonElement>('.om-creation-submit-button')!.click());
  expect(generate).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ action: 'generate', model: account.id, mode: 'text-to-image', references: [references[0].reference] }));
});
