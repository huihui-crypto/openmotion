// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { ModelEditor } from './ModelEditor';
import { ModelCatalog } from './ModelCatalog';
import { I18nProvider } from '../i18n/I18n';
import type { DirectoryModel, ProviderConnection } from '../../../shared/provider-directory';
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ''; vi.restoreAllMocks(); });
async function mount(child: React.ReactNode, locale: 'en' | 'zh-CN' = 'en') { const host = document.createElement('div'); document.body.append(host); root = createRoot(host); await act(async () => root.render(<I18nProvider initialLocale={locale}>{child}</I18nProvider>)); }
function button(label: string) { const value = [...document.querySelectorAll<HTMLButtonElement>('button')].find(item => item.getAttribute('aria-label') === label || item.textContent?.trim() === label); expect(value).toBeTruthy(); return value!; }
async function fill(label: string, value: string) { await act(async () => { const input = document.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); }); }
const provider = { id: 'test', label: 'Test', protocol: 'openai', kinds: ['text'] } as ProviderConnection;
it('saves grouping, classification, exact token limits and default parameters through one model form', async () => {
  const save = vi.fn(async () => true), close = vi.fn();
  await mount(<ModelEditor provider={provider} save={save} onClose={close} />);
  await fill('Model ID', 'test-model'); await fill('Display name', 'My model'); await fill('Group name', 'Research');
  await act(async () => button('More settings').click());
  await act(async () => button('Reasoning').click()); await act(async () => button('Vision').click());
  await act(async () => button('Context window: 200000').click()); await act(async () => button('Max output tokens: 65536').click());
  await act(async () => document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ modelId: 'test-model', label: 'My model', group: 'Research', capabilities: ['reasoning'], inputs: ['vision'], contextWindow: 200000, maxOutputTokens: 65536, defaults: {} })); expect(close).toHaveBeenCalledOnce();
});
it('combines independent model filters, removes chips and retains group expansion', async () => {
  const models = [{ id: 'a', modelId: 'a', label: 'Reasoning model', kind: 'text', group: 'Research', capabilities: ['reasoning'], enabled: true, source: 'live' }, { id: 'b', modelId: 'b', label: 'Image model', kind: 'image', group: 'Creative', enabled: true, source: 'custom' }, { id: 'c', modelId: 'c', label: 'Disabled model', kind: 'text', group: 'Research', enabled: false, source: 'live' }] as DirectoryModel[];
  await mount(<ModelCatalog models={models} render={model => <p key={model.id} data-model={model.id}>{model.label}</p>} />);
  await act(async () => button('Filter models').click());
  await act(async () => [...document.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]')].find(el => el.textContent === 'Language')!.click());
  await act(async () => [...document.querySelectorAll<HTMLElement>('[role="menuitemcheckbox"]')].find(el => el.textContent === 'Enabled')!.click());
  expect([...document.querySelectorAll('[data-model]')].map(el => el.getAttribute('data-model'))).toEqual(['a']);
  await act(async () => button('Remove Language filter').click());
  expect(document.querySelectorAll('[data-model]')).toHaveLength(2);
  await act(async () => button('Clear filters').click());
  await act(async () => button('Collapse all groups').click()); expect(document.querySelectorAll('[data-model]')).toHaveLength(0);
  await act(async () => button('Expand all groups').click()); expect(document.querySelectorAll('[data-model]')).toHaveLength(3);
});

async function fillDefaults(value: string) {
  await act(async () => {
    const input = document.querySelector('textarea')!;
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submitModel() {
  await act(async () => document.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}
it.each(['{', '[]', 'null', '42', '"text"', 'true', ''])('keeps invalid JSON %j beside its field without saving', async value => {
  const save = vi.fn(async () => true), close = vi.fn();
  await mount(<ModelEditor provider={provider} save={save} onClose={close} />);
  await fill('Model ID', 'test-model');
  await act(async () => button('More settings').click());
  await fillDefaults(value);
  await submitModel();
  const input = document.querySelector('textarea')!;
  const error = document.querySelector('[role="alert"]')!;
  expect(error.textContent).toBe('Enter a valid JSON object.');
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(error.id);
  expect(input.value).toBe(value);
  expect(document.activeElement).toBe(input);
  expect(save).not.toHaveBeenCalled();
  expect(close).not.toHaveBeenCalled();
});
it.each([false, true])('expands and focuses hidden invalid JSON on every submit (editing: %s)', async editing => {
  const save = vi.fn(async () => true), close = vi.fn();
  const model = editing ? { id: 'test:model', modelId: 'model', defaults: {} } as DirectoryModel : undefined;
  await mount(<ModelEditor provider={provider} model={model} save={save} onClose={close} />);
  if (!editing) {
    await fill('Model ID', 'model');
    await act(async () => button('More settings').click());
  }
  await fillDefaults('{"temperature":');
  for (let attempt = 0; attempt < 2; attempt++) {
    await act(async () => button('More settings').click());
    expect(document.querySelector('textarea')).toBeNull();
    await submitModel();
    expect(button('More settings').getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(document.querySelector('textarea'));
    expect(document.querySelector('textarea')!.value).toBe('{"temperature":');
    expect(document.querySelectorAll('[role="alert"]')).toHaveLength(1);
  }
  await fillDefaults('[]');
  expect(document.querySelector('[role="alert"]')).not.toBeNull();
  await fillDefaults('{"temperature":0.7}');
  expect(document.querySelector('[role="alert"]')).toBeNull();
  expect(document.querySelector('textarea')!.hasAttribute('aria-invalid')).toBe(false);
  await submitModel();
  expect(save).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ defaults: { temperature: 0.7 } }));
  expect(close).toHaveBeenCalledOnce();
});
it('localizes the inline error in Chinese and retains valid input when saving fails', async () => {
  const save = vi.fn(async () => false), close = vi.fn();
  await mount(<ModelEditor provider={provider} model={{ id: 'test:model', modelId: 'model' } as DirectoryModel} save={save} onClose={close} />, 'zh-CN');
  await fillDefaults('null');
  await submitModel();
  expect(document.querySelector('[role="alert"]')!.textContent).toBe('请输入有效的 JSON 对象。');
  await fillDefaults('{"temperature":0.5}');
  await submitModel();
  expect(save).toHaveBeenCalledOnce();
  expect(close).not.toHaveBeenCalled();
  expect(document.querySelector('[role="alert"]')).toBeNull();
  expect(document.querySelector('textarea')!.value).toBe('{"temperature":0.5}');
});
it.each(['-1', '0', '1.5', '100000001', 'abc', '-', '1e', '1e309'])('retains invalid token draft %j and focuses its field even when collapsed', async value => {
  const save = vi.fn(async () => true);
  await mount(<ModelEditor provider={provider} model={{ id: 'test:model', modelId: 'model' } as DirectoryModel} save={save} onClose={vi.fn()} />);
  await fill('Context window', value);
  expect(document.querySelector('[role="alert"]')).toBeNull();
  await act(async () => button('More settings').click());
  await submitModel();
  const input = document.querySelector<HTMLInputElement>('[aria-label="Context window"]')!;
  expect(input.value).toBe(value);
  expect(document.activeElement).toBe(input);
  expect(input.getAttribute('aria-invalid')).toBe('true');
  const error = document.getElementById(input.getAttribute('aria-describedby')!)!;
  expect(error.textContent).toBe(value === '100000001' ? 'The value cannot exceed 100,000,000.' : 'Enter an integer between 1 and 100,000,000.');
  expect(save).not.toHaveBeenCalled();
});
it.each([false, true])('shows all token relationship errors and revalidates them when context changes (editing: %s)', async editing => {
  const save = vi.fn(async () => true), close = vi.fn();
  await mount(<ModelEditor provider={provider} model={editing ? { id: 'test:model', modelId: 'model' } as DirectoryModel : undefined} save={save} onClose={close} />);
  if (!editing) { await fill('Model ID', 'model'); await act(async () => button('More settings').click()); }
  await fill('Context window', '128000'); await fill('Max input tokens', '200000'); await fill('Max output tokens', '256000');
  for (let attempt = 0; attempt < 2; attempt++) {
    await act(async () => button('More settings').click()); await submitModel();
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Max input tokens');
    expect([...document.querySelectorAll('[role="alert"]')].map(el => el.textContent)).toEqual([
      'Max input tokens cannot exceed the context window (currently 128,000).',
      'Max output tokens cannot exceed the context window (currently 128,000).',
    ]);
    expect(save).not.toHaveBeenCalled();
  }
  await act(async () => button('Context window: 200000').click());
  expect(document.querySelectorAll('[role="alert"]')).toHaveLength(1);
  expect(document.querySelector('[role="alert"]')!.textContent).toContain('currently 200,000');
  await fill('Max output tokens', '200000');
  expect(document.querySelector('[role="alert"]')).toBeNull();
  await submitModel();
  expect(save).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ contextWindow: 200000, maxInputTokens: 200000, maxOutputTokens: 200000 }));
  expect(close).toHaveBeenCalledOnce();
});
it('allows optional empty token limits and valid integer boundaries', async () => {
  const save = vi.fn(async () => false);
  await mount(<ModelEditor provider={provider} model={{ id: 'test:model', modelId: 'model' } as DirectoryModel} save={save} onClose={vi.fn()} />);
  await fill('Context window', ' '); await submitModel();
  expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ contextWindow: null, maxInputTokens: null, maxOutputTokens: null }));
  await fill('Context window', '100000000'); await fill('Max input tokens', '1'); await fill('Max output tokens', '100000000'); await submitModel();
  expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ contextWindow: 100000000, maxInputTokens: 1, maxOutputTokens: 100000000 }));
  expect(document.querySelector('[role="alert"]')).toBeNull();
});
it('shows Chinese token errors beside each field along with an independent JSON error', async () => {
  await mount(<ModelEditor provider={provider} model={{ id: 'test:model', modelId: 'model' } as DirectoryModel} save={vi.fn()} onClose={vi.fn()} />, 'zh-CN');
  await fill('上下文窗口', '128000'); await fill('最大输入 Token', '200000'); await fill('最大输出 Token', '-1'); await fillDefaults('[]'); await submitModel();
  expect([...document.querySelectorAll('[role="alert"]')].map(el => el.textContent)).toEqual([
    '最大输入 Token 不能超过上下文窗口（当前为 128,000）。', '请输入 1～100,000,000 之间的整数。', '请输入有效的 JSON 对象。',
  ]);
  await fill('上下文窗口', ''); await fill('最大输出 Token', '100000001');
  expect([...document.querySelectorAll('[role="alert"]')].map(el => el.textContent)).toEqual(['数值不能超过 100,000,000。', '请输入有效的 JSON 对象。']);
});

it('shows all basic field errors, focuses the first and preserves drafts until corrected', async () => {
  const save = vi.fn(async () => true);
  await mount(<ModelEditor provider={provider} save={save} onClose={() => {}} />);
  await fill('Model ID', 'bad id'); await fill('Display name', 'x'.repeat(181)); await fill('Group name', 'x'.repeat(81));
  await submitModel();
  expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(3);
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Model ID');
  expect(document.querySelector<HTMLInputElement>('[aria-label="Group name"]')!.value).toHaveLength(81);
  expect(save).not.toHaveBeenCalled();
  await fill('Model ID', 'vendor/model:v1'); await fill('Display name', 'x'.repeat(180)); await fill('Group name', 'x'.repeat(80));
  expect(document.querySelectorAll('[role="alert"]')).toHaveLength(0);
  await submitModel(); expect(save).toHaveBeenCalledOnce();
});
it('explains empty and overlong model IDs at the field', async () => {
  const save = vi.fn(async () => true);
  await mount(<ModelEditor provider={provider} save={save} onClose={() => {}} />);
  expect(button('Add model').disabled).toBe(false);
  await submitModel(); expect(document.body.textContent).toContain('Enter a model ID.');
  await fill('Model ID', 'x'.repeat(181));
  expect(document.body.textContent).toContain('Model ID cannot exceed 180 characters.');
  await fill('Model ID', 'x'.repeat(180)); await submitModel(); expect(save).toHaveBeenCalledOnce();
});
it.each([false, true])('validates reserved fields and serialized JSON size, including hidden settings (editing: %s)', async editing => {
  const save = vi.fn(async () => true);
  await mount(<ModelEditor provider={provider} model={editing ? { id: 'test:model', modelId: 'model', defaults: {} } as DirectoryModel : undefined} save={save} onClose={() => {}} />, 'zh-CN');
  if (!editing) { await fill('模型 ID', 'model'); await act(async () => button('更多设置').click()); }
  await fillDefaults('{"MODEL":"example"}');
  await act(async () => button('更多设置').click()); await submitModel();
  expect(document.body.textContent).toContain('默认参数不能包含保留字段“MODEL”，请移除该字段。');
  expect(document.activeElement).toBe(document.querySelector('textarea'));
  const long = JSON.stringify({ x: 'a'.repeat(63993) }); // 64,001 serialized characters
  await fillDefaults(long);
  expect(document.body.textContent).toContain('64,000');
  expect(document.querySelector('textarea')!.value).toBe(long);
  expect(save).not.toHaveBeenCalled();
  await fillDefaults(JSON.stringify({ x: 'a'.repeat(63992) }, null, 2));
  expect(document.querySelector('[role="alert"]')).toBeNull();
  await submitModel(); expect(save).toHaveBeenCalledOnce();
});
