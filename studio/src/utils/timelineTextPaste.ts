import type { TimelineElement } from "../player/store/playerStore";
import { resolveDropTrack } from "./timelineDropTrackInsert";
import { parseSavedSource } from "./authoredSource";
import { isTextBearingTag } from "../components/editor/domEditingDom";

/** Materialize a pasted text layer as an authored runtime clip. Timing is local
 * to the containing composition; wrappers retain their original coordinate space. */
export function timedTextPaste(
  html: string,
  source: string,
  playhead: number,
  selector?: string,
  selectorIndex = 0,
): string {
  const node = new DOMParser().parseFromString(html, "text/html").body.firstElementChild;
  if (!node || !isTextBearingTag(node.localName) || !node.textContent?.trim()) return html;
  if (node.hasAttribute("data-start")) return html;
  const doc = parseSavedSource(source);
  const root = doc.querySelector("[data-composition-id]");
  let origin: Element | undefined;
  try { origin = selector ? doc.querySelectorAll(selector)[selectorIndex] : undefined; } catch { /* foreign clipboard */ }
  const host = origin?.parentElement?.closest("[data-composition-id]") ?? root;
  const duration = Number(host?.getAttribute("data-duration")) || 5;
  let hostStart = 0;
  for (let parent = origin?.parentElement; parent && parent !== root; parent = parent.parentElement)
    hostStart += Number(parent.getAttribute("data-start")) || 0;
  const start = Math.max(0, Math.min(playhead - hostStart, Math.max(0, duration - 1 / 30)));
  const remaining = Math.max(1 / 30, duration - start);
  const tracks = Array.from(doc.querySelectorAll("[data-track-index]")).map(el => Number(el.getAttribute("data-track-index")) || 0);
  node.classList.add("clip");
  node.setAttribute("data-start", String(Math.round(start * 1000) / 1000));
  node.setAttribute("data-duration", String(Math.round(remaining * 1000) / 1000));
  node.setAttribute("data-track-index", String(Math.max(-1, ...tracks) + 1));
  node.setAttribute("data-timeline-label", node.textContent.trim().slice(0, 80));
  return node.outerHTML;
}

/** Both canvas paste and timeline duplicate open the same top text lane. */
export function openPastedTextTrack(source: string, html: string, elements: readonly TimelineElement[]): { source: string; html: string } {
  const copy = new DOMParser().parseFromString(html, "text/html").body.firstElementChild;
  if (!copy || !elements.length || !isTextBearingTag(copy.localName) || !copy.textContent?.trim() ||
    !Array.from(copy.children).every(child => child.localName === "br")) return { source, html };
  const start = Number(copy.getAttribute("data-start")) || 0;
  const duration = Number(copy.getAttribute("data-duration")) || 5;
  const opened = resolveDropTrack({ source, elements: [...elements],
    placement: { start, track: 0, newTrack: "top" },
    dropped: { id: copy.id || copy.getAttribute("data-hf-id")!, tag: copy.localName, start, duration },
  });
  copy.setAttribute("data-track-index", String(opened.track));
  const values = [...opened.source.matchAll(/z-index\s*:\s*(-?\d+)/gi)].map(match => Number(match[1]));
  (copy as HTMLElement).style.zIndex = String(Math.max(0, ...values) + 1);
  return { source: opened.source, html: copy.outerHTML };
}
