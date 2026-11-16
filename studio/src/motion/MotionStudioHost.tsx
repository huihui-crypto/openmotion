import { EditorLayoutMenu } from "./EditorLayoutMenu";
import { StudioErrorBoundary } from '../components/StudioErrorBoundary';
import { I18nProvider, useI18n } from "../i18n/I18n";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { useStudioShellContext } from '../contexts/StudioContext';
import { TimelineHistoryButtons } from '../components/TimelineHistoryButtons';
import { MotionHistoryPopover } from './MotionHistoryPopover';
import { isStudioEditSaving, subscribeStudioEditSaving } from '../utils/studioPendingEdits';
import { useStudioAutosave } from '../hooks/useStudioAutosave';
import { StudioHostContext, type StudioHost } from './StudioHost';
import { WorkspaceFrame, useOptionalWorkspaceChrome } from './WorkspaceFrame';
import { MotionHistoryProvider, useMotionHistoryOperation } from './MotionHistoryState';
import { MediaGatewayProvider } from './MediaGatewayContext';
import { usePlayerStore } from '../player/store/playerStore';
import { workspacePresentation } from '../../../shared/workspace-url';
import { WorkspaceProject } from './WorkspaceProject';
import { WorkspaceSaveStatus } from './WorkspaceSaveStatus';
import { trackMotion } from './tracking';
import { OpenMotionAgentTools } from './OpenMotionAgentTools';
import { ProjectAgentInstruction } from './ProjectAgentInstruction';

export function MotionEditorFrame({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { projectId, waitForPendingDomEditSaves, writeBlockedReason, renderQueue } = useStudioShellContext();
  const historyOperation = useMotionHistoryOperation();
  const chrome = useOptionalWorkspaceChrome();
  const register = chrome?.registerEditor;
  useEffect(() => {
    if (chrome?.settingsOpen) usePlayerStore.getState().requestPlayback(false);
  }, [chrome?.settingsOpen]);
  const saving = useSyncExternalStore(subscribeStudioEditSaving, isStudioEditSaving, isStudioEditSaving);
  const load = useRef({ id: crypto.randomUUID(), sent: false });
  useEffect(() => {
    if (load.current.sent) return;
    load.current.sent = true;
    void trackMotion('studio_load_result', { load_id: load.current.id, outcome: 'success',
      embedded: workspacePresentation(location.search).embedded, duration_ms: Math.min(86_400_000, Math.round(performance.now())) });
  }, []);
  const blocked = renderQueue.isRendering || historyOperation.busy || Boolean(writeBlockedReason);
  useStudioAutosave({ projectId, blocked, flush: () => waitForPendingDomEditSaves({ blur: false }) });
  const saveState = t(historyOperation.busy ? 'Updating version…' : renderQueue.isRendering ? 'Rendering…' : writeBlockedReason ? 'Needs attention' : saving ? 'Saving…' : '');
  useEffect(() => {
    register?.({ waitForSaves: waitForPendingDomEditSaves, blocked, saveState, message: writeBlockedReason || '' });
    return () => register?.(null);
  }, [register, waitForPendingDomEditSaves, blocked, saveState, writeBlockedReason]);
  const editor = <MediaGatewayProvider><HistoryRestoreFeedback />{children}</MediaGatewayProvider>;
  if (chrome) return editor;
  return <WorkspaceFrame projectId={projectId} waitForSaves={waitForPendingDomEditSaves} blocked={blocked} message={writeBlockedReason || ''} saveState={saveState}>{editor}</WorkspaceFrame>;
}

function HistoryRestoreFeedback() {
  const { projectId, showToast } = useStudioShellContext();
  const status = useOptionalWorkspaceChrome()?.workspace.status;
  const shown = useRef(new Set<string>());
  useEffect(() => {
    const error = status?.historyRestoreError;
    if (status?.projectId !== projectId || !error || shown.current.has(error.requestId)) return;
    shown.current.add(error.requestId);
    showToast(error.message, 'error');
  }, [projectId, status, showToast]);
  return null;
}

function WorkspaceHistoryActions() {
  const operation = useMotionHistoryOperation();
  return <div className="motion-history-actions motion-header-history-actions">
    <div className="motion-history-actions">
      <TimelineHistoryButtons canUndo={operation.busy ? false : undefined} canRedo={operation.busy ? false : undefined} />
    </div>
    <MotionHistoryPopover />
    <ProjectAgentInstruction />
  </div>;
}

const host: StudioHost = {
  mvpEditor: true,
  headerActions: <WorkspaceSaveStatus />,
  projectLabel: <WorkspaceProject />,
  communityAction: <></>,
  historyActions: <WorkspaceHistoryActions />,
  previewAction: <></>,
  windowMenu: <EditorLayoutMenu />,
  themeToggle: false,

  AppFrame: MotionEditorFrame,
  desktopLink: false,
  feedback: false,
};

export function MotionStudioHost({ children }: { children: ReactNode }) {
  return <I18nProvider><MotionHistoryProvider><StudioHostContext.Provider value={host}><StudioErrorBoundary><OpenMotionAgentTools />{children}</StudioErrorBoundary></StudioHostContext.Provider></MotionHistoryProvider></I18nProvider>;
}
