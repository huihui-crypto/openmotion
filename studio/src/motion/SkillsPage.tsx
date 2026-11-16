import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { useI18n } from '../i18n/I18n';
import { RemixIcon } from '../icons/RemixIcons';
import { useToast } from '../hooks/useToast';
import { StudioToastViewport } from '../components/StudioToastViewport';
import { aspectRatios, durations, motionSkills, skillCategories, skillPrompt, type MotionSkill, type SkillCategory, type SkillMotif, type SkillParameters } from './skillCatalog';
import { GitHubMark } from '../../../packages/design-system/react/GitHubMark';
import './skills.css';

/** Short source shown on cards: owner/repo (plus skill folder) or OpenMotion. */
const sourceLabel = (skill: MotionSkill) => skill.repository?.replace('https://github.com/', '').replace('/tree/main/', ' / ') ?? 'OpenMotion';

/** Upstream project names stay verbatim; only OpenMotion-authored skill names are translated. */
const displayNameOf = (t: (text: string) => string) => (skill: MotionSkill) => skill.repository ? skill.name : t(skill.name);

const defaults: SkillParameters = { subject: '', duration: 10, aspect: '16:9', style: '' };

/** Open-source motion techniques the user can hand to an Agent through OpenMotion MCP. */
export function SkillsPage({ skillId, onSkillChange }: { skillId: string | null; onSkillChange: (id: string | null) => void }) {
  const { t, locale } = useI18n(), toast = useToast(), displayName = displayNameOf(t);
  const [query, setQuery] = useState(''), [category, setCategory] = useState<SkillCategory | null>(null);
  const [parameters, setParameters] = useState<SkillParameters>(defaults), [manualCopy, setManualCopy] = useState('');
  const instruction = useRef<HTMLPreElement>(null);
  // When the clipboard is unavailable, select the whole instruction so one ⌘C copies it.
  useEffect(() => { if (manualCopy && instruction.current) { instruction.current.focus(); window.getSelection()?.selectAllChildren(instruction.current); } }, [manualCopy]);
  const selected = motionSkills.find(skill => skill.id === skillId) ?? null;
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return motionSkills.filter(skill => (!category || skill.category === category)
      && (!needle || [skill.name, displayName(skill), skill.tagline, t(skill.tagline), skill.repository ?? 'OpenMotion'].some(value => value.toLocaleLowerCase().includes(needle))));
  }, [query, category, t]);
  // The instruction follows the interface language, including the example brief and borrowed technique.
  const prompt = selected ? skillPrompt({ ...selected, name: displayName(selected), example: t(selected.example), technique: t(selected.technique) }, parameters, locale) : '';
  const open = (skill: MotionSkill) => { setManualCopy(''); setParameters(defaults); onSkillChange(skill.id); };
  async function copy() {
    if (!selected) return;
    try { await navigator.clipboard.writeText(prompt); setManualCopy(''); toast.showToast(t('Copied. Paste into your Agent.'), 'info'); }
    catch { setManualCopy(prompt); toast.showToast(t('Copy failed. Select and copy the instruction below.'), 'error', 'feedback'); }
  }
  return <div className="om-skills-page" data-detail={Boolean(selected)}>
    <StudioToastViewport {...toast} />
    <main className="om-skills-main">
      <header className="om-skills-heading">
        <div><h1 className="om-title">{t('Skills')}</h1><p className="om-muted">{t('Open-source motion techniques. Fill in the brief, copy the instruction and your Agent builds an editable project through OpenMotion MCP.')}</p></div>
        <label className="om-field om-skills-search"><RemixIcon name="search-line" size={16} /><input type="search" maxLength={200} value={query} onChange={event => setQuery(event.target.value)} placeholder={t('Search skills...')} aria-label={t('Search skills')} /></label>
      </header>
      <div className="om-skills-categories" role="group" aria-label={t('Skill category')}>
        <button className="om-nav-item" aria-pressed={!category} onClick={() => setCategory(null)}>{t('All')}</button>
        {skillCategories.map(value => <button key={value} className="om-nav-item" aria-pressed={category === value} onClick={() => setCategory(value)}>{t(value)}</button>)}
      </div>
      {visible.length ? <ul className="om-skills-grid" aria-label={t('Skills')}>
        {visible.map(skill => <li key={skill.id}><button className="om-card om-skill-card" aria-pressed={skill.id === skillId} onClick={() => open(skill)}>
          <SkillCover motif={skill.motif} name={skill.name} />
          <span className="om-skill-card-caption"><strong>{displayName(skill)}</strong><span className="om-muted">{t(skill.tagline)}</span><span className="om-skill-meta"><span className="om-badge">{t(skill.category)}</span><span>{sourceLabel(skill)}</span></span></span>
        </button></li>)}
      </ul> : <p className="om-empty">{t('No matching skills.')}</p>}
      <p className="om-muted om-skills-note">{t('Open-source skills link to their upstream repository and license. OpenMotion borrows the workflow or technique; it does not bundle upstream code.')}</p>
    </main>
    {selected && <aside className="om-skill-detail om-surface-divider" aria-label={displayName(selected)}>
      <header className="om-skill-detail-header"><h2 className="om-subtitle">{displayName(selected)}</h2><button className="motion-icon-button" aria-label={t('Close skill')} onClick={() => onSkillChange(null)}><RemixIcon name="close-line" size={18} /></button></header>
      <SkillCover motif={selected.motif} name={selected.name} large />
      <p className="om-muted">{t(selected.tagline)}</p>
      {selected.repository ? <a className="om-skill-source" href={selected.repository} target="_blank" rel="noopener noreferrer"><GitHubMark width={14} height={14} /><span>{selected.repository.replace('https://', '')}</span><span className="om-badge">{selected.license}</span><RemixIcon name="external-link-line" size={14} /></a>
        : <p className="om-skill-source"><RemixIcon name="flashlight-line" size={16} /><span>{t('OpenMotion skill')}</span></p>}
      <section className="om-skill-form" aria-label={t('Brief')}>
        <label><span>{t('What to make')}</span><span className="om-field"><textarea rows={2} maxLength={500} value={parameters.subject} placeholder={t(selected.example)} onChange={event => setParameters({ ...parameters, subject: event.target.value })} /></span></label>
        <fieldset><legend>{t('Duration')}</legend><div className="om-skill-options">{durations.map(value => <button key={value} className="om-nav-item" aria-pressed={parameters.duration === value} onClick={() => setParameters({ ...parameters, duration: value })}>{t('{count}s', { count: value })}</button>)}</div></fieldset>
        <fieldset><legend>{t('Aspect ratio')}</legend><div className="om-skill-options">{aspectRatios.map(value => <button key={value} className="om-nav-item" aria-pressed={parameters.aspect === value} onClick={() => setParameters({ ...parameters, aspect: value })}>{value}</button>)}</div></fieldset>
        <label><span>{t('Style (optional)')}</span><span className="om-field"><input maxLength={200} value={parameters.style} placeholder={t('e.g. dark background, neon green accents')} onChange={event => setParameters({ ...parameters, style: event.target.value })} /></span></label>
      </section>
      <section className="om-skill-prompt" aria-label={t('Agent instruction')}>
        <span className="om-subtitle">{t('Agent instruction')}</span>
        <pre ref={instruction} data-manual={Boolean(manualCopy)} tabIndex={0}>{prompt}</pre>
      </section>
      <button className="om-button" data-primary onClick={() => void copy()}><RemixIcon name="file-copy-line" size={16} />{t('Copy for Agent')}</button>
      <p className="om-muted">{t('Paste it into Codex, Claude Code or another Agent connected to OpenMotion MCP.')}</p>
    </aside>}
  </div>;
}

/** Package-token illustration: one motif per technique, animated only when motion is allowed. */
export function SkillCover({ motif, name, large = false }: { motif: SkillMotif; name: string; large?: boolean }) {
  return <span className="om-skill-cover om-media-surface" data-motif={motif} data-large={large} role="img" aria-label={name}>
    <svg viewBox="0 0 160 90" aria-hidden="true">{motifShapes[motif]}</svg>
  </span>;
}

const dots = (count: number, y: number) => Array.from({ length: count }, (_, index) => <circle key={`${y}-${index}`} className="om-skill-dot" style={{ animationDelay: `${index * 0.12}s` }} cx={24 + index * 16} cy={y} r="4" />);
const motifShapes: Record<SkillMotif, ReactElement> = {
  agent: <><rect className="om-skill-line" x="28" y="22" width="104" height="46" rx="8" /><path className="om-skill-stroke" d="M44 38h40M44 50h64" /><circle className="om-skill-pulse" cx="118" cy="36" r="6" /></>,
  scene: <><rect className="om-skill-line" x="18" y="20" width="36" height="50" rx="6" /><rect className="om-skill-fill om-skill-slide" x="62" y="20" width="36" height="50" rx="6" /><rect className="om-skill-line" x="106" y="20" width="36" height="50" rx="6" /></>,
  layout: <><rect className="om-skill-fill om-skill-morph" x="20" y="18" width="56" height="54" rx="8" /><rect className="om-skill-line" x="86" y="18" width="54" height="24" rx="6" /><rect className="om-skill-line" x="86" y="48" width="54" height="24" rx="6" /></>,
  curve: <><path className="om-skill-line" d="M16 74H146M16 74V14" /><path className="om-skill-stroke om-skill-draw" d="M16 74C60 74 70 18 146 18" /><circle className="om-skill-pulse" cx="146" cy="18" r="5" /></>,
  stagger: <>{dots(8, 30)}{dots(8, 46)}{dots(8, 62)}</>,
  math: <><path className="om-skill-line" d="M12 45H148M80 10V80" /><path className="om-skill-stroke om-skill-draw" d="M12 45C24 20 36 20 48 45S72 70 84 45 108 20 120 45 144 70 148 60" /><circle className="om-skill-line" cx="80" cy="45" r="18" /></>,
  vector: <><polygon className="om-skill-fill om-skill-spin" points="50,20 70,58 30,58" /><circle className="om-skill-line om-skill-pulse" cx="96" cy="44" r="18" /><rect className="om-skill-fill om-skill-slide" x="118" y="30" width="26" height="26" rx="4" /></>,
  playback: <><path className="om-skill-line" d="M20 64H140" /><circle className="om-skill-fill om-skill-scrub" cx="20" cy="64" r="6" /><path className="om-skill-fill" d="M70 22l24 14-24 14z" /></>,
  depth: <><path className="om-skill-line" d="M80 14l40 20v32L80 86 40 66V34z" /><path className="om-skill-line" d="M40 34l40 20 40-20M80 54v32" /><path className="om-skill-fill om-skill-float" d="M80 14l40 20-40 20-40-20z" /></>,
  frames: <><rect className="om-skill-line" x="18" y="24" width="30" height="42" rx="4" /><rect className="om-skill-line" x="54" y="24" width="30" height="42" rx="4" /><rect className="om-skill-line" x="90" y="24" width="30" height="42" rx="4" /><rect className="om-skill-fill om-skill-frame" x="18" y="24" width="30" height="42" rx="4" /><path className="om-skill-stroke" d="M128 45h16" /></>,
  canvas: <><rect className="om-skill-line" x="14" y="14" width="132" height="62" rx="6" /><rect className="om-skill-fill om-skill-drag" x="28" y="28" width="34" height="22" rx="4" /><rect className="om-skill-line" x="98" y="44" width="34" height="22" rx="4" /><path className="om-skill-stroke" d="M62 39C80 39 80 55 98 55" /></>,
  icon: <><circle className="om-skill-line" cx="80" cy="45" r="26" /><path className="om-skill-stroke om-skill-draw" d="M66 46l10 10 20-22" /></>,
  sequence: <><path className="om-skill-line" d="M16 72H144" /><rect className="om-skill-fill om-skill-dot" style={{ animationDelay: '0s' }} x="20" y="22" width="34" height="10" rx="5" /><rect className="om-skill-fill om-skill-dot" style={{ animationDelay: '.3s' }} x="58" y="38" width="44" height="10" rx="5" /><rect className="om-skill-fill om-skill-dot" style={{ animationDelay: '.6s' }} x="106" y="54" width="34" height="10" rx="5" /></>,
  character: <><circle className="om-skill-fill" cx="80" cy="24" r="9" /><path className="om-skill-stroke" d="M80 34v24M80 58l-12 18M80 58l12 18M80 42l-16 8" /><path className="om-skill-stroke om-skill-wave" d="M80 42l16-12" /></>,
  globe: <><circle className="om-skill-line" cx="80" cy="45" r="30" /><ellipse className="om-skill-line om-skill-turn" cx="80" cy="45" rx="12" ry="30" /><path className="om-skill-line" d="M50 45h60" /><path className="om-skill-stroke om-skill-draw" d="M60 30C80 6 110 20 104 50" /></>,
  levelup: <><rect className="om-skill-line" x="24" y="56" width="112" height="12" rx="6" /><rect className="om-skill-fill om-skill-grow" x="24" y="56" width="112" height="12" rx="6" /><path className="om-skill-fill om-skill-pulse" d="M80 14l6 12 13 2-9 9 2 13-12-6-12 6 2-13-9-9 13-2z" /></>,
  orbit: <><ellipse className="om-skill-line" cx="80" cy="45" rx="54" ry="18" /><circle className="om-skill-fill" cx="80" cy="45" r="14" /><circle className="om-skill-fill om-skill-orbit" cx="134" cy="45" r="5" /></>,
  promo: <><rect className="om-skill-line" x="22" y="18" width="116" height="54" rx="6" /><rect className="om-skill-fill om-skill-dot" style={{ animationDelay: '0s' }} x="32" y="28" width="28" height="34" rx="3" /><rect className="om-skill-fill om-skill-dot" style={{ animationDelay: '.25s' }} x="66" y="28" width="28" height="34" rx="3" /><rect className="om-skill-fill om-skill-dot" style={{ animationDelay: '.5s' }} x="100" y="28" width="28" height="34" rx="3" /><path className="om-skill-stroke" d="M22 82h116" /><circle className="om-skill-fill om-skill-scrub" cx="22" cy="82" r="3" /></>,
  sale: <><rect className="om-skill-fill om-skill-pulse" x="50" y="14" width="60" height="34" rx="6" /><path className="om-skill-line" d="M40 62h80" /><rect className="om-skill-line" x="44" y="56" width="20" height="20" rx="3" /><rect className="om-skill-line" x="70" y="56" width="20" height="20" rx="3" /><rect className="om-skill-line" x="96" y="56" width="20" height="20" rx="3" /></>,
  photo: <><ellipse className="om-skill-line" cx="80" cy="72" rx="34" ry="7" /><rect className="om-skill-fill om-skill-float" x="64" y="24" width="32" height="42" rx="8" /><path className="om-skill-stroke" d="M22 20l14 10M138 20l-14 10" /></>,
  listing: <><rect className="om-skill-fill" x="18" y="16" width="56" height="58" rx="5" /><rect className="om-skill-line om-skill-dot" style={{ animationDelay: '0s' }} x="82" y="16" width="26" height="26" rx="4" /><rect className="om-skill-line om-skill-dot" style={{ animationDelay: '.2s' }} x="114" y="16" width="26" height="26" rx="4" /><rect className="om-skill-line om-skill-dot" style={{ animationDelay: '.4s' }} x="82" y="48" width="58" height="26" rx="4" /></>,
  narration: <><rect className="om-skill-line" x="20" y="16" width="120" height="44" rx="6" /><path className="om-skill-stroke om-skill-draw" d="M36 46l18-14 16 10 20-16 18 12" />{[0, 1, 2, 3, 4, 5, 6, 7, 8].map(index => <rect key={index} className="om-skill-fill om-skill-dot" style={{ animationDelay: `${index * 0.1}s` }} x={44 + index * 8} y={70 - (index % 3) * 3} width="4" height={8 + (index % 3) * 6} rx="2" />)}</>,
  brand: <><circle className="om-skill-fill om-skill-spin" cx="48" cy="45" r="18" /><rect className="om-skill-fill" x="84" y="26" width="16" height="38" rx="3" /><rect className="om-skill-line" x="104" y="26" width="16" height="38" rx="3" /><rect className="om-skill-line" x="124" y="26" width="16" height="38" rx="3" /></>,
  thumbnail: <><rect className="om-skill-line" x="18" y="14" width="124" height="62" rx="6" /><circle className="om-skill-fill" cx="112" cy="46" r="20" /><path className="om-skill-stroke om-skill-pulse" d="M30 34h44M30 50h30" /></>,
  generate: <><rect className="om-skill-line" x="20" y="18" width="36" height="54" rx="4" /><rect className="om-skill-fill om-skill-frame" x="20" y="18" width="36" height="54" rx="4" /><rect className="om-skill-line" x="62" y="18" width="36" height="54" rx="4" /><rect className="om-skill-line" x="104" y="18" width="36" height="54" rx="4" /><path className="om-skill-fill om-skill-pulse" d="M80 36l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" /></>,
  identity: <><circle className="om-skill-line" cx="40" cy="45" r="18" /><circle className="om-skill-fill om-skill-pulse" cx="80" cy="45" r="18" /><circle className="om-skill-line" cx="120" cy="45" r="18" /></>,
  particles: <>{Array.from({ length: 14 }, (_, index) => <circle key={index} className="om-skill-dot om-skill-burst" style={{ animationDelay: `${(index % 7) * 0.15}s`, transformOrigin: '80px 45px', ['--angle' as string]: `${index * 26}deg` }} cx="80" cy="45" r={index % 3 + 2} />)}</>,
};
