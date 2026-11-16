// @vitest-environment happy-dom
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SkillsPage } from './SkillsPage';
import { motionSkills, skillPrompt } from './skillCatalog';
import { readWorkspacePage, workspacePageHref } from './workspacePageRouting';
import { isWorkspaceSettingsPage } from '../../../shared/workspace-url';

vi.mock('../i18n/I18n', () => ({ useI18n: () => ({ locale: 'en', t: (text: string, values?: { count: number }) => text.replace('{count}', String(values?.count)) }) }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root: Root, container: HTMLDivElement;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); });

function Host() {
  const [skill, setSkill] = useState<string | null>(null);
  return <SkillsPage skillId={skill} onSkillChange={setSkill} />;
}
const button = (label: string) => [...container.querySelectorAll('button')].find(node => node.textContent?.includes(label))!;

it('lists every curated skill with its upstream repository', () => {
  act(() => root.render(<Host />));
  expect(container.querySelectorAll('.om-skill-card')).toHaveLength(motionSkills.length);
  expect(motionSkills).toHaveLength(19);
  for (const skill of motionSkills) expect(skill.repository).toMatch(/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/);
  expect(new Set(motionSkills.map(skill => skill.id)).size).toBe(motionSkills.length);
});

it('filters by category and search', () => {
  act(() => root.render(<Host />));
  act(() => button('3D scenes').click());
  expect(container.querySelectorAll('.om-skill-card').length).toBe(motionSkills.filter(skill => skill.category === '3D scenes').length);
  act(() => button('All').click());
  const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;
  act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'particle'); input.dispatchEvent(new Event('input', { bubbles: true })); });
  expect([...container.querySelectorAll('.om-skill-card strong')].map(node => node.textContent)).toEqual(['Proton']);
});

it('fills the brief and copies an MCP instruction for the Agent', async () => {
  const write = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: write } });
  act(() => root.render(<Host />));
  act(() => button('Anime.js').click());
  act(() => button('9:16').click());
  act(() => button('30s').click());
  await act(async () => button('Copy for Agent').click());
  const text = write.mock.calls[0][0] as string;
  expect(text).toContain('https://github.com/juliangarnier/anime');
  expect(text).toContain('Duration: 30s; aspect ratio: 9:16');
  expect(text).toContain('openmotion_get_project');
  expect(text).toContain('openmotion_create_project');
  expect(text).toContain('openmotion_edit_project');
  expect(text).not.toMatch(/openmotion_(create_session|write_files|create_artifact)/);
});

it('localizes the instruction and keeps the user brief', () => {
  const text = skillPrompt(motionSkills[0], { subject: '新品发布', duration: 10, aspect: '1:1', style: '' }, 'zh-CN');
  expect(text).toContain('内容：新品发布');
  expect(text).not.toContain('风格');
});

it('routes the skills page and selected skill through the query', () => {
  const href = workspacePageHref('http://local/?page=assets', { skills: true, skill: 'manim' });
  expect(href).toBe('/?page=skills&skill=manim');
  expect(readWorkspacePage('?page=skills&skill=manim')).toMatchObject({ skills: true, skill: 'manim', assets: false, settings: null });
  expect(readWorkspacePage(workspacePageHref('http://local' + href, { assets: true }).slice(1))).toMatchObject({ assets: true, skills: false, skill: null });
  expect(isWorkspaceSettingsPage('?page=skills')).toBe(true);
});
