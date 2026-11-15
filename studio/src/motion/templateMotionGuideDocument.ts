export type GuideAppearance = {
  theme: 'light' | 'dark';
  background: string;
  text: string;
  muted: string;
  surface: string;
  border: string;
};

// These selectors affect the guide's chrome, never the artwork in its nested demo frames.
const guideStyles = `
html[data-openmotion-guide] { color-scheme: var(--om-guide-scheme); }
html[data-openmotion-guide] body { background: var(--om-guide-background) !important; }
html[data-openmotion-guide="dark"] {
  --bg: var(--om-guide-background); --fg: var(--om-guide-text);
  --muted: var(--om-guide-muted); --line: var(--om-guide-border); --soft: var(--om-guide-surface);
}
html[data-openmotion-guide="dark"] body { color: var(--om-guide-text) !important; }
html[data-openmotion-guide="dark"] :is(.intro, .board-heading, .rule-label, .production, #source-view) :is(h1,h2,h3,strong),
html[data-openmotion-guide="dark"] :is(.quiet, .beat>span, .tab.active, .wordmark) { color: var(--om-guide-text) !important; }
html[data-openmotion-guide="dark"] :is(.type-sheet p, .swatch code, .intro-copy, .intro-copy p, .rule-copy p, .rule-copy ul, .production p, .production li, .board-heading p, .roles, .roles .label, .eyebrow, .tiny, .filmstrip figcaption, .rule-label>span, .beat b, .beat small, th, td, footer, footer p, .demo-controls button, .demo-controls output, .demo-controls select, .demo-params label, .demo-params input[type=text], .demo-presets button, .demo figcaption) { color: var(--om-guide-muted) !important; }
html[data-openmotion-guide="dark"] :is(.type-sheet, .palette, .overview, .shell, .rule.text-only, #source-view pre, .demo-controls, .demo-params, .demo figcaption) { background: var(--om-guide-surface) !important; }
html[data-openmotion-guide="dark"] :is(.identity, .palette, .overview, .type-baseline, .quiet, .shell, .rule, .roles, .roles span, .timeline-sheet, .beats, .beat, .production, .production-rules, footer, th, td, .demo, .demo-controls, .demo-params, .demo-presets button, .demo-params input) { border-color: var(--om-guide-border) !important; }
html[data-openmotion-guide] .om-look { background: var(--om-guide-surface); border-bottom: 1px solid var(--om-guide-border); }
html[data-openmotion-guide] .om-look .demo-params { display: flex; flex-direction: column; align-items: stretch; gap: 12px; padding: 0 22px 20px; background: none !important; border: 0; }
html[data-openmotion-guide] .om-look .demo-params label { display: flex; flex-direction: column; align-items: stretch; gap: 6px; font-size: 11px; }
html[data-openmotion-guide] .om-look .demo-params input[type=text] { width: 100%; font-size: 14px; padding: 8px 10px; border: 1px solid var(--om-guide-border); border-radius: 6px; background: var(--om-guide-background); color: var(--om-guide-text) !important; }
html[data-openmotion-guide] .om-look .demo-presets button { font-size: 11px; padding: 5px 10px; border-radius: 999px; }
html[data-openmotion-guide] .om-look-colors { display: flex; flex-wrap: wrap; gap: 6px; }
html[data-openmotion-guide] .om-look-colors button { width: 24px; height: 24px; padding: 0; border-radius: 50%; border: 1px solid var(--om-guide-border); background: var(--swatch); }
html[data-openmotion-guide] .om-look-colors button[aria-pressed=true] { outline: 2px solid var(--om-guide-text); outline-offset: 2px; }
html[data-openmotion-guide] .hero > .beats { padding: 0 14px; border-top: 1px solid var(--om-guide-border); background: var(--om-guide-surface); }
html[data-openmotion-guide] .beat[data-current] b { font-weight: 600; color: var(--om-guide-text) !important; }
html[data-openmotion-guide] .beat[data-current]::before { width: 9px; height: 9px; background: var(--accent); }
`;

// Runs after the guide's own scripts have built its demo controls, so moved nodes keep their listeners.
// Puts the replaceable copy and accent beside the playing demo and the beats directly under it.
const guideLayout = `(() => {
  const zh = /^zh/i.test(document.documentElement.lang || '');
  const hero = document.querySelector('.overview .hero');
  const identity = document.querySelector('.overview .identity');
  const card = hero && hero.querySelector('[data-demo]');
  const params = card && card.querySelector('.demo-params');
  if (identity && params && params.querySelector('input')) {
    const panel = document.createElement('section');
    panel.className = 'om-look';
    const label = document.createElement('div');
    label.className = 'tile-label';
    const hint = document.createElement('span');
    hint.textContent = zh ? '左侧实时预览' : 'Live preview';
    label.append(zh ? '换成你的品牌' : 'Make it yours', hint);
    panel.append(label, params);
    const accent = params.querySelector('input[type=color]');
    const colors = [...new Set([...document.querySelectorAll('.palette [data-color]')].map(b => (b.dataset.color || '').toLowerCase()))].filter(c => /^#[0-9a-f]{6}$/.test(c));
    if (accent && colors.length) {
      const row = document.createElement('div');
      row.className = 'om-look-colors';
      const mark = () => row.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.color === accent.value.toLowerCase())));
      for (const color of colors) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.color = color;
        button.style.setProperty('--swatch', color);
        button.setAttribute('aria-label', (zh ? '强调色 ' : 'Accent ') + color);
        button.onclick = () => { accent.value = color; accent.dispatchEvent(new Event('input')); };
        row.append(button);
      }
      (accent.closest('label') || accent).after(row);
      accent.addEventListener('input', mark);
      mark();
    }
    identity.prepend(panel);
  }
  const beats = document.querySelector('.timeline-sheet .beats');
  const seek = card && card.querySelector('.seek');
  if (hero && beats && seek) {
    hero.append(beats);
    const note = document.querySelector('.timeline-sheet .board-heading p');
    if (note) note.remove();
    const items = [...beats.querySelectorAll('[data-time]')];
    const sync = () => {
      const time = Number(seek.value);
      let current = -1;
      items.forEach((item, index) => { if (time >= Number(item.dataset.time) - 1e-6) current = index; });
      items.forEach((item, index) => item.toggleAttribute('data-current', index === current));
    };
    const output = card.querySelector('output');
    if (output) new MutationObserver(sync).observe(output, { childList: true, characterData: true, subtree: true });
    seek.addEventListener('input', sync);
    sync();
  }
})();`;

/** Keep the remote document and its resource base intact inside the existing opaque-origin sandbox. */
export function prepareMotionGuide(source: string, url: string, appearance: GuideAppearance): string {
  const doc = new DOMParser().parseFromString(source, 'text/html');
  const base = doc.querySelector<HTMLBaseElement>('base[href]') ?? doc.createElement('base');
  base.href = new URL(base.getAttribute('href') ?? url, url).href;
  if (!base.parentNode) doc.head.prepend(base);
  const root = doc.documentElement;
  root.dataset.openmotionGuide = appearance.theme;
  root.style.setProperty('--om-guide-scheme', appearance.theme);
  for (const key of ['background', 'text', 'muted', 'surface', 'border'] as const) {
    root.style.setProperty(`--om-guide-${key}`, appearance[key]);
  }
  const style = doc.createElement('style');
  style.textContent = guideStyles;
  doc.head.append(style);
  const bridge = doc.createElement('script');
  bridge.textContent = `(() => {
    window.addEventListener('message', event => {
      if (event.source !== parent || event.data?.type !== 'openmotion:guide-appearance') return;
      const value = event.data.appearance;
      if (!value || !['light', 'dark'].includes(value.theme)) return;
      const root = document.documentElement;
      root.dataset.openmotionGuide = value.theme;
      root.style.setProperty('--om-guide-scheme', value.theme);
      for (const key of ['background', 'text', 'muted', 'surface', 'border']) {
        if (typeof value[key] === 'string' && CSS.supports('color', value[key])) root.style.setProperty('--om-guide-' + key, value[key]);
      }
    });
  })();`;
  doc.body.append(bridge);
  const layout = doc.createElement('script');
  layout.textContent = guideLayout;
  doc.body.append(layout);
  return '<!doctype html>' + root.outerHTML;
}
