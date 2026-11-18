import type { TimelineElement } from '../store/timelineElement';
export type TrackIdentity = { kind: 'C' | 'A' | 'V' | 'T'; label: string; code: string };
export function trackKind(elements: readonly TimelineElement[]): TrackIdentity['kind'] {
  if (elements.length && elements.every(e => e.timelineRole === 'caption' || /^transcript-[a-f0-9-]{36}-/.test(e.domId || e.id))) return 'C';
  if (elements.length && elements.every(e => e.tag === 'audio')) return 'A';
  if (elements.length && elements.every(e => e.timelineRole === 'text' || e.text || /^(h[1-6]|p|span|strong)$/.test(e.tag))) return 'T';
  return 'V';
}
export function trackIdentities(order: readonly number[], tracks: ReadonlyMap<number, readonly TimelineElement[]>): Map<number, TrackIdentity> {
  const counts = { C: 0, A: 0, V: 0, T: 0 }, result = new Map<number, TrackIdentity>();
  for (const track of [...order].sort((a, b) => a - b)) {
    const kind = trackKind(tracks.get(track) || []);
    result.set(track, { kind, code: `${kind}${++counts[kind]}`, label: ({ C: 'Caption track', A: 'Audio track', V: 'Video track', T: 'Text track' })[kind] });
  }
  return result;
}
