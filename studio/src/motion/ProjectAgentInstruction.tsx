import { Popover } from '@base-ui/react/popover';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { projectEditPrompt } from '../../../shared/integration';
import { useStudioShellContext } from '../contexts/StudioContext';
import { Button, Tooltip } from '../components/ui';
import { RemixIcon } from '../icons/RemixIcons';
import { useI18n } from '../i18n/I18n';
import { SettingsError, SettingsLoading } from './settingsPrimitives';
import { useIntegrationInfo } from './useIntegrationInfo';
import { useOptionalWorkspaceChrome } from './WorkspaceFrame';

/** Project-level MCP handoff: copy one instruction that lets another Agent session keep editing this exact project. */
export function ProjectAgentInstruction() {
  const { t, locale } = useI18n();
  const { projectId, showToast } = useStudioShellContext();
  const chrome = useOptionalWorkspaceChrome();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const copyRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [projectId]);
  if (!projectId) return null;
  const title = chrome?.workspace.projects.find(item => item.id === projectId)?.title
    || (chrome?.workspace.status?.projectId === projectId ? chrome.workspace.status.projectTitle : '') || '';
  return <Popover.Root open={open} onOpenChange={setOpen}>
    <Tooltip label={t('Copy a project instruction to keep editing in another Agent session')}>
      <Popover.Trigger render={<Button ref={triggerRef} variant="ghost" size="sm" className="motion-project-mcp-trigger text-text-0"
        aria-label={t('MCP instruction')} icon={<RemixIcon name="terminal-box-line" size={16} />} />}>
        <span className="max-[1000px]:hidden">{t('MCP instruction')}</span>
      </Popover.Trigger>
    </Tooltip>
    <Popover.Portal>
      <Popover.Positioner side="bottom" align="end" sideOffset={8} collisionPadding={12}
        collisionAvoidance={{ side: 'none', align: 'shift' }} positionMethod="fixed" className="z-150">
        <Popover.Popup data-testid="project-mcp-popover" finalFocus={triggerRef} initialFocus={copyRef}
          className="hf-floating-motion flex w-[min(400px,calc(100vw-24px))] flex-col gap-3 rounded-xl border border-border bg-surface p-3 text-text-1 shadow-menu outline-none">
          {open && <ProjectInstructionBody projectId={projectId} title={title} locale={locale === 'zh-CN' ? 'zh-CN' : 'en'}
            copyRef={copyRef} showToast={showToast} onConnect={chrome ? () => { setOpen(false); chrome.openConnections(); } : undefined} />}
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  </Popover.Root>;
}

function ProjectInstructionBody({ projectId, title, locale, copyRef, showToast, onConnect }: {
  projectId: string; title: string; locale: 'zh-CN' | 'en'; copyRef: RefObject<HTMLButtonElement | null>;
  showToast: (message: string, tone?: 'error' | 'info') => void; onConnect?: () => void;
}) {
  const { t } = useI18n();
  const { info, failed, retry } = useIntegrationInfo();
  const prompt = projectEditPrompt(info, { id: projectId, title }, locale);
  async function copy() {
    if (!info) return;
    try {
      await navigator.clipboard.writeText(prompt);
      showToast(t('Project instruction copied. Paste it into another Agent session.'), 'info');
    } catch { showToast(t('Could not copy. Select and copy the text manually.'), 'error'); }
  }
  return <>
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <Popover.Title className="text-step-14 font-semibold text-text-0">{t('Continue editing in another Agent')}</Popover.Title>
        <Popover.Description className="mt-1 text-step-12 text-text-3">{t('Paste this instruction into Codex, Claude Code or any session connected to OpenMotion MCP. It opens this exact project and keeps Studio edits safe.')}</Popover.Description>
      </div>
    </div>
    <div className="flex min-w-0 items-center gap-2 text-step-12 text-text-3">
      <span className="truncate font-medium text-text-1" title={title || t('Untitled')}>{title || t('Untitled')}</span>
      <code className="truncate rounded-md bg-bg-2 px-1.5 py-0.5 font-mono text-step-11" title={projectId}>{projectId}</code>
    </div>
    {failed ? <SettingsError retry={retry} /> : !info ? <SettingsLoading /> : <pre className="om-code-block max-h-[220px] overflow-auto whitespace-pre-wrap break-words" aria-label={t('MCP instruction')}>{prompt}</pre>}
    <div className="flex items-center justify-between gap-2">
      {onConnect ? <button type="button" className="om-text-link cursor-pointer border-0 bg-transparent p-0" onClick={onConnect}>{t('Not connected yet? Connect Agent')}</button> : <span />}
      <Button ref={copyRef} variant="primary" size="sm" disabled={!info} icon={<RemixIcon name="file-copy-line" size={15} />} onClick={() => void copy()}>{t('Copy instruction')}</Button>
    </div>
  </>;
}
