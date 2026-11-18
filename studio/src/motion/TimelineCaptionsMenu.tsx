import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Skeleton } from '../components/ui/Skeleton';
import { Popover } from '../components/ui/Popover';
import { RemixIcon } from '../icons/RemixIcons';
import { useI18n } from '../i18n/I18n';
import { useStudioShellContext, useStudioPlaybackContext } from '../contexts/StudioContext';
import { captionTrackCode, captionTrackText, useCaptionWorkspace, type CaptionMode } from './captionWorkspace';
import { useCaptionTracks } from './useCaptionTracks';
import { useCaptionSurfaceActive } from './useCaptionSurfaceActive';

export function TimelineCaptionsMenu() {
  const { t } = useI18n();
  const visible = useCaptionSurfaceActive('timeline');
  const { projectId, activeCompPath } = useStudioShellContext();
  const { timelineElements, refreshKey } = useStudioPlaybackContext();
  const { tracks, loading, failed, refresh, change, disabled } = useCaptionTracks(visible, refreshKey);
  const label = (track: typeof tracks[number]) => `${captionTrackCode(track, tracks, timelineElements)} · ${captionTrackText(track, timelineElements) || t(track.label)}`;
  const on = tracks.some(track => track.settings.visible);
  const [open, setOpen] = useState(false);
  const go = (mode: CaptionMode, trackId?: string) => { setOpen(false); useCaptionWorkspace.getState().open(projectId, { compositionPath: activeCompPath || 'index.html', mode, trackId }); };
  return <Popover open={open} onOpenChange={setOpen} side="top" align="end" tooltip={t(tracks.length ? on ? 'Captions on' : 'Captions off' : 'Captions')} aria-label={t('Caption visibility')} trigger={<IconButton variant={on ? 'secondary' : 'ghost'} aria-label={t('Caption visibility')} aria-pressed={on} icon={<RemixIcon name="closed-captioning-line" size={16} />} />}>
    <div className="flex w-56 max-w-[calc(100vw-3rem)] flex-col gap-2">
      <h3 className="text-step-12 font-semibold">{t('Captions')}</h3>
      {failed ? <Button size="sm" onClick={() => void refresh()}>{t('Retry')}</Button> : loading ? <Skeleton className="h-8 w-full" /> : tracks.map(track => <div key={track.id} className="flex min-w-0 items-center gap-1">
        <Button size="sm" variant="ghost" className="min-w-0 flex-1 justify-start" onClick={() => go('style', track.id)}><span className="truncate">{label(track)}</span></Button>
        <IconButton aria-label={t(track.settings.visible ? 'Hide {track}' : 'Show {track}', { track: label(track) })} disabled={disabled || track.locked} aria-pressed={track.settings.visible} icon={<RemixIcon name={track.settings.visible ? 'eye-line' : 'eye-off-line'} size={14} />} onClick={() => void change(track.id, { visible: !track.settings.visible })} />
      </div>)}
      <div className="flex flex-col gap-1 border-t border-border pt-2">
        <Button size="sm" variant="ghost" className="justify-start" onClick={() => go('auto')}><RemixIcon name="closed-captioning-line" size={14} />{t('Auto captions')}</Button>
        <Button size="sm" variant="ghost" className="justify-start" onClick={() => go('manual')}><RemixIcon name="text" size={14} />{t('Add captions')}</Button>
      </div>
    </div>
  </Popover>;
}
