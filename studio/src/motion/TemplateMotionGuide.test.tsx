// @vitest-environment happy-dom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TemplateMotionGuide } from './TemplateMotionGuide';
import { prepareMotionGuide, type GuideAppearance } from './templateMotionGuideDocument';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const appearance: GuideAppearance = { theme: 'light', background: '#f5f5f5', text: '#494949', muted: '#5c5c5c', surface: '#fafafa', border: '#dbdbdb' };
const source = '<html><head><link rel="stylesheet" href="guide.css"></head><body style="--paper:#96d93c"><h1>Guide</h1><iframe src="demo.html"></iframe><script src="runtime.js"></script></body></html>';
const url = 'https://example.com/guides/one.html';
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  window.happyDOM.settings.enableIframePageLoading = false;
  document.documentElement.dataset.theme = 'paper';
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); document.documentElement.removeAttribute('data-theme'); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('preserves artwork, scripts and asset resolution inside the adapted guide', () => {
  const doc = new DOMParser().parseFromString(prepareMotionGuide(source, url, appearance), 'text/html');
  expect(doc.querySelector('base')?.href).toBe(url);
  expect(doc.querySelector('iframe')?.getAttribute('src')).toBe('demo.html');
  expect(doc.querySelector('script[src]')?.getAttribute('src')).toBe('runtime.js');
  expect(doc.body.style.getPropertyValue('--paper')).toBe('#96d93c');
  expect(doc.documentElement.style.getPropertyValue('--om-guide-background')).toBe('#f5f5f5');
  expect(doc.documentElement.dataset.openmotionGuide).toBe('light');
  expect(doc.querySelector('style')?.textContent).not.toMatch(/filter:|\.demo-stage.*background/);
});

it('moves the replaceable copy beside the demo and keeps beats in step with playback', () => {
  const guide = `<html lang="zh-CN"><body>
    <div class="overview"><section class="hero"><figure data-demo="{}"><input class="seek" value="0"><output>0</output>
      <div class="demo-params"><label>Title<input type="text" value="Nodes"></label><label>Accent<input type="color" value="#f52e92"></label></div></figure></section>
      <aside class="identity"><section class="palette"><button data-color="#F52E92"></button><button data-color="#3289fc"></button><button data-color="nope"></button></section></aside></div>
    <section class="timeline-sheet"><div class="board-heading"><h2>Sequence</h2><p>Click a beat</p></div>
      <div class="beats"><button data-time="0"></button><button data-time="4.8"></button></div></section></body></html>`;
  const prepared = new DOMParser().parseFromString(prepareMotionGuide(guide, url, appearance), 'text/html');
  const layout = [...prepared.querySelectorAll('script')].at(-1)!.textContent!;
  document.documentElement.lang = 'zh-CN';
  document.body.innerHTML = new DOMParser().parseFromString(guide, 'text/html').body.innerHTML;
  new Function(layout)();
  const panel = document.querySelector('.identity > .om-look')!;
  expect(panel.textContent).toContain('换成你的品牌');
  expect(panel.querySelector('.demo-params input[type=text]')).not.toBeNull();
  expect(document.querySelector('.hero > .beats')).not.toBeNull();
  expect(document.querySelector('.timeline-sheet .board-heading p')).toBeNull();
  const swatches = [...panel.querySelectorAll<HTMLButtonElement>('.om-look-colors button')];
  expect(swatches.map(button => button.dataset.color)).toEqual(['#f52e92', '#3289fc']);
  const accent = panel.querySelector<HTMLInputElement>('input[type=color]')!;
  const changed = vi.fn(); accent.addEventListener('input', changed);
  swatches[1].click();
  expect(accent.value).toBe('#3289fc');
  expect(changed).toHaveBeenCalled();
  expect(swatches[1].getAttribute('aria-pressed')).toBe('true');
  const seek = document.querySelector<HTMLInputElement>('.seek')!;
  seek.value = '5'; seek.dispatchEvent(new Event('input'));
  const beats = [...document.querySelectorAll('.beats button')];
  expect(beats.map(beat => beat.hasAttribute('data-current'))).toEqual([false, true]);
  document.body.innerHTML = ''; document.documentElement.removeAttribute('lang');
});

it('leaves guides without replaceable inputs or beats unchanged', () => {
  const prepared = new DOMParser().parseFromString(prepareMotionGuide(source, url, appearance), 'text/html');
  document.body.innerHTML = '<h1>Guide</h1>';
  expect(() => new Function([...prepared.querySelectorAll('script')].at(-1)!.textContent!)()).not.toThrow();
  expect(document.body.innerHTML).toBe('<h1>Guide</h1>');
  document.body.innerHTML = '';
});

it('syncs theme without re-fetching or replacing the guide document and keeps the sandbox', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(source, { headers: { 'content-type': 'text/html' } })));
  await act(async () => root.render(<TemplateMotionGuide url={url} title="Guide" />));
  const frame = host.querySelector('iframe')!;
  const html = frame.srcdoc;
  const postMessage = vi.spyOn(frame.contentWindow!, 'postMessage');
  expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
  expect(frame.getAttribute('referrerpolicy')).toBe('no-referrer');
  expect(frame.hasAttribute('src')).toBe(false);
  expect(fetch).toHaveBeenCalledWith(url, expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }));
  await act(async () => { document.documentElement.removeAttribute('data-theme'); });
  expect(postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'openmotion:guide-appearance', appearance: expect.objectContaining({ theme: 'dark' }) }), '*');
  expect(frame.srcdoc).toBe(html);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('falls back to the untouched remote iframe when CORS or the fetch fails', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  await act(async () => root.render(<TemplateMotionGuide url={url} title="Guide" />));
  const frame = host.querySelector('iframe')!;
  expect(frame.getAttribute('src')).toBe(url);
  expect(frame.hasAttribute('srcdoc')).toBe(false);
  expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
});

it('aborts a stale guide and cannot overwrite a newer selection', async () => {
  let resolveFirst!: (value: Response) => void;
  const fetcher = vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { resolveFirst = resolve; })).mockResolvedValue(new Response(source.replace('Guide', 'Second'), { headers: { 'content-type': 'text/html' } }));
  vi.stubGlobal('fetch', fetcher);
  await act(async () => root.render(<TemplateMotionGuide url={url} title="Guide" />));
  const signal = fetcher.mock.calls[0][1].signal as AbortSignal;
  await act(async () => root.render(<TemplateMotionGuide url="https://example.com/second.html" title="Second" />));
  expect(signal.aborted).toBe(true);
  await act(async () => resolveFirst(new Response(source, { headers: { 'content-type': 'text/html' } })));
  expect(host.querySelector('iframe')?.srcdoc).toContain('<h1>Second</h1>');
});

it.each(['./assets/', '../assets/', '', 'https://cdn.example.com/assets/'])('resolves an existing base %j against the final response URL', async base => {
  const finalUrl = 'https://example.com/redirected/guide.html';
  const response = new Response(`<base href="${base}"><img src="poster.png">`, { headers: { 'content-type': 'text/html' } });
  Object.defineProperty(response, 'url', { value: finalUrl });
  vi.stubGlobal('fetch', vi.fn(async () => response));
  await act(async () => root.render(<TemplateMotionGuide url={url} title="Guide" />));
  const doc = new DOMParser().parseFromString(host.querySelector('iframe')!.srcdoc, 'text/html');
  expect(doc.querySelector('base')?.getAttribute('href')).toBe(new URL(base, finalUrl).href);
  expect(doc.querySelector('img')?.getAttribute('src')).toBe('poster.png');
});
