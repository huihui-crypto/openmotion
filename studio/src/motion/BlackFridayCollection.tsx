import { useEffect, useId, useRef } from 'react';
import type { GalleryTemplate } from '../../../shared/catalog';
import { blackFridaySkillIds, blackFridaySourceLinks, blackFridayTemplates } from '../../../shared/black-friday-collection';
import { useI18n } from '../i18n/I18n';
import { MotionIcon } from './icons';
import { reportSkillCardOpened } from './pageTracking';
import { SkillMedia } from './SkillMedia';
import { motionSkills } from './skillCatalog';
import { TemplateGalleryCard } from './TemplateGalleryCard';
import styles from './BlackFridayCollection.module.css';

export function BlackFridayCollection({ stages, active, onPreview, onPriority, onOpenSkill }: {
  stages: ReturnType<typeof blackFridayTemplates>;
  active: Set<string>;
  onPreview: (template: GalleryTemplate, trigger: HTMLButtonElement) => void;
  onPriority: (id: string | null) => void;
  onOpenSkill?: (id: string, trigger: HTMLButtonElement) => void;
}) {
  const { t } = useI18n();
  const prefix = useId();
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus({ preventScroll: true }), []);
  const sections = useRef(new Map<string, HTMLElement>());
  const skills = blackFridaySkillIds.flatMap(id => motionSkills.filter(skill => skill.id === id));
  const jump = (id: string) => {
    const section = sections.current.get(id);
    section?.querySelector('h2')?.focus({ preventScroll: true });
    section?.scrollIntoView({ block: 'nearest' });
  };
  const hero = stages.flatMap(stage => stage.items.slice(0, 1));

  return <main className={styles.collection} aria-labelledby={prefix + 'title'} data-black-friday="">
    <div className={styles.banner} data-motion-ui="" data-theme="dark">
      <div className={styles.bannerText}>
        <p>11.27–11.30</p>
        <h1 id={prefix + 'title'} ref={title} tabIndex={-1}>Black Friday<span>.</span></h1>
        <p>{t('Find a reference from the first teaser to the last call.')}</p>
      </div>
      <div className={styles.bannerArtwork} aria-hidden="true">
        {hero.map(item => <img key={item.id} src={item.posterUrl} alt="" />)}
      </div>
    </div>
    <nav className={styles.jumps} aria-label={t('Black Friday collection')}>
      {stages.map(stage => <button key={stage.id} className="om-button om-filter-pill" onClick={() => jump(stage.id)}>{t(stage.title)}</button>)}
      {onOpenSkill && <button className="om-button om-filter-pill" onClick={() => jump('skills')}>{t('Black Friday Skills')}</button>}
    </nav>
    {stages.map(stage => <section key={stage.id} className={styles.stage} aria-labelledby={prefix + stage.id}
      ref={section => { if (section) sections.current.set(stage.id, section); }}>
      <div>
        <h2 id={prefix + stage.id} tabIndex={-1}>{t(stage.title)}</h2>
        <p>{t(stage.description)}</p>
      </div>
      <div className={styles.stageResources}>
        <div className={styles.cards}>
          {stage.items.map(item => <TemplateGalleryCard key={item.id} template={item} onSelect={onPreview} active={active.has(item.id)} onPriority={onPriority} />)}
        </div>
        <div className={styles.sourceLinks}>
          {blackFridaySourceLinks.filter(item => item.stage === stage.id).map(item => <a key={item.url} className="ui-text-link" href={item.url} target="_blank" rel="noopener noreferrer">
            {item.author} · {item.title}<MotionIcon name="arrow-up-right" size={14} />
          </a>)}
        </div>
      </div>
    </section>)}
    {onOpenSkill && <section className={styles.skills} aria-labelledby={prefix + 'skills'}
      ref={section => { if (section) sections.current.set('skills', section); }}>
      <h2 id={prefix + 'skills'} tabIndex={-1}>{t('Black Friday Skills')}</h2>
      <div className={styles.skillCards}>
        {skills.map((skill, index) => <button key={skill.id} type="button" className="om-card om-skill-gallery-card" data-interactive=""
          onClick={event => { reportSkillCardOpened(skill, index + 1, undefined, 'black_friday'); onOpenSkill(skill.id, event.currentTarget); }}>
          <span className="om-gallery-cover om-skill-card-demo"><SkillMedia skill={skill} /></span>
          <span className="om-skill-card-meta">
            <span className="om-skill-card-heading"><strong>{t(skill.title)}</strong></span>
            <span className={styles.skillPurpose}>{t(skill.useWhen)}</span>
            <span className={styles.skillPurpose}>{t(skill.output)}</span>
          </span>
        </button>)}
      </div>
    </section>}
  </main>;
}
