import { useEffect, useState } from 'react';
import type { GalleryTemplate, TemplatePage } from '../../../shared/catalog';
import { useI18n } from '../i18n/I18n';
import { RemixIcon } from '../icons/RemixIcons';
import { TemplateGalleryCard } from './TemplateGalleryCard';
import { motionApi } from './useWorkspace';
import { useWorkspaceChrome } from './WorkspaceChromeContext';

// Each Explore collection owns its loaded pages. New pages append to the existing collection.
export function useExploreTemplates(category: string | undefined, locale: string, search = '') {
  const [pages, setPages] = useState<TemplatePage[]>([]);
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(Boolean(category));
  useEffect(() => {
    if (!category) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ category, locale, covered: 'true', limit: '8', offset: String(offset) });
    if (search) query.set('query', search);
    motionApi<TemplatePage>('/template-catalog?' + query, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
    }).then(page => {
      if (!Array.isArray(page.items)) throw new Error('Invalid template page');
      if (controller.signal.aborted) return;
      setPages(previous => {
        const seen = new Set(previous.flatMap(group => group.items.map(item => item.id)));
        const items = page.items.filter(item => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
        return [...previous, { ...page, items }];
      });
    }).catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [category, locale, offset, attempt, search]);
  const next = pages.at(-1)?.next;
  function loadMore() {
    if (loading || next == null || next <= offset) return;
    setLoading(true);
    setOffset(next);
  }
  function retry() {
    setLoading(true);
    setError(false);
    setAttempt(value => value + 1);
  }
  return { pages, loading, error, hasMore: next != null && next > offset, retry, loadMore };
}

export function TemplatePromptAction({ item, onTry }: { item: GalleryTemplate; onTry: (prompt: string) => void }) {
  const { t } = useI18n();
  const prompt = [item.description?.trim(), item.styleDescription?.trim()].filter(Boolean).join('\n\n');
  if (!prompt) return null;
  return <button className="om-nav-item" onClick={() => onTry(prompt)}>
    <RemixIcon name="movie-line" size={15} />{t('Try as a video prompt')}<RemixIcon name="arrow-right-line" size={15} />
  </button>;
}

export function ExploreTemplateCard({ item, active, onPriority, onTry, onOpen }: {
  item: GalleryTemplate; active: boolean; onPriority: (id: string | null) => void; onTry: (prompt: string) => void; onOpen?: () => void;
}) {
  const { openLibrary } = useWorkspaceChrome();
  return <TemplateGalleryCard template={item} active={active} onPriority={onPriority}
    onSelect={(template, trigger) => { onOpen?.(); openLibrary(trigger, template.id); }}
    footer={<div className="om-feed-template-copy">
      <strong>{item.title}</strong>
      {item.description && <p>{item.description}</p>}
      <TemplatePromptAction item={item} onTry={onTry} />
    </div>} />;
}
