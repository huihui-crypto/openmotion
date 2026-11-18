import { useCallback, useEffect, useRef, useState } from 'react';
import type { CaptionTrack } from '../../../shared/transcript-captions';
import type { CaptionSettings } from '../../../shared/caption-style';
import { useStudioShellContext } from '../contexts/StudioContext';
import { useI18n } from '../i18n/I18n';
import { transcriptRequest } from './transcriptClient';
import { gatewayRequest } from './gatewayClient';
import { useCaptionWorkspace } from './captionWorkspace';

export function useCaptionTracks(visible: boolean, previewRevision?: number) {
  const shell = useStudioShellContext(), { t } = useI18n();
  const projectId = shell.projectId, compositionPath = shell.activeCompPath || 'index.html';
  const epoch = useCaptionWorkspace(s => s.epoch);
  const [tracks, setTracks] = useState<CaptionTrack[]>([]), [loading, setLoading] = useState(true), [failed, setFailed] = useState(false), [busy, setBusy] = useState(false);
  const mounted = useRef(true), sequence = useRef(0), active = useRef(false), latest = useRef(shell); latest.current = shell;
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const result = await transcriptRequest<{ tracks: CaptionTrack[] }>({ command: 'caption_tracks', projectId, compositionPath });
      if (mounted.current && request === sequence.current) { setTracks(result.tracks); setFailed(false); setLoading(false); }
    } catch { if (mounted.current && request === sequence.current) { setFailed(true); setLoading(false); } }
  }, [projectId, compositionPath]);
  useEffect(() => { mounted.current = true; setTracks([]); setLoading(true); return () => { mounted.current = false; sequence.current++; }; }, [refresh]);
  useEffect(() => { if (visible) void refresh(); }, [visible, refresh, epoch, previewRevision]);
  const disabled = busy || Boolean(shell.writeBlockedReason) || shell.renderQueue.isRendering;
  const change = async (id: string, settings?: Partial<CaptionSettings>, remove = false) => {
    if (active.current || disabled) return false;
    active.current = true; setBusy(true);
    const valid = () => mounted.current && latest.current.projectId === projectId && (latest.current.activeCompPath || 'index.html') === compositionPath && !latest.current.writeBlockedReason && !latest.current.renderQueue.isRendering;
    try {
      await shell.waitForPendingDomEditSaves(); if (!valid()) return false;
      const detail = await gatewayRequest<{ revision: string; currentVersionId: string }>('phase1/call', 'POST', { name: 'openmotion_get_project', arguments: { projectId } });
      if (!valid()) return false;
      await transcriptRequest({ command: 'caption_update', projectId, compositionPath, transcriptId: id, captionSettings: settings, remove, expectedRevision: detail.revision, expectedVersionId: detail.currentVersionId, requestId: crypto.randomUUID() });
      if (valid()) { useCaptionWorkspace.getState().changed(); shell.showToast(t(remove ? 'Caption track removed' : 'Captions updated'), 'info'); }
      return true;
    } catch (error) { if (valid()) shell.showToast(t(error instanceof Error ? error.message : 'Caption update failed'), 'error'); return false; }
    finally { active.current = false; if (mounted.current) setBusy(false); }
  };
  return { tracks, loading, failed, refresh, change, disabled };
}
