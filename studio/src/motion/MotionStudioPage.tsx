import { useRef } from 'react';
import { useI18n } from '../i18n/I18n';
import { RemixIcon } from '../icons/RemixIcons';
import { StudioTemplateShelf } from './StudioTemplateShelf';
import { reportCreativeClick } from './exploreTracking';
import motionPoster from './skill-covers/bubble-field.webp?url';

export function MotionStudioPage({ active, onExplore, onOpenEditor }: {
  active: boolean; onExplore: () => void; onOpenEditor: () => void;
}) {
  const { t, locale } = useI18n();
  const root = useRef<HTMLElement>(null);
  return <main ref={root} className="om-explore" aria-label={t('Motion Studio')}><div className="om-discovery-page">
    <div><button className="om-nav-item" onClick={() => { reportCreativeClick('creative_studio', 'studio_bar', 'back_to_explore', { studio: 'motion' }); onExplore(); }}><RemixIcon name="arrow-left-line" size={16} />{t('Back to Explore')}</button></div>
    <section className="om-discovery-hero"><img src={motionPoster} alt="" />
      <div className="om-discovery-hero-copy"><h1>{t('Motion Studio')}</h1><p>{t('Start with an editable motion template or open your timeline.')}</p>
        <button className="om-button" data-primary onClick={() => { reportCreativeClick('creative_studio', 'studio_bar', 'open_editor', { studio: 'motion' }); onOpenEditor(); }}>{t('Open editor')}<RemixIcon name="arrow-right-line" size={16} /></button>
      </div>
    </section>
    <StudioTemplateShelf key={locale} studio="motion" root={root} active={active} />
  </div></main>;
}
