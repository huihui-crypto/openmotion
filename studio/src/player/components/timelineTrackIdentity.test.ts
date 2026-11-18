import { expect, it } from 'vitest';
import { trackIdentities } from './timelineTrackIdentity';
import type { TimelineElement } from '../store/timelineElement';
it('numbers each media kind independently and keeps identifiers stable when rows are reordered', () => {
  const tracks = new Map([[3, [{ tag: 'audio' }]], [1, [{ tag: 'video' }]], [8, [{ tag: 'div', id: 'transcript-11111111-1111-4111-8111-111111111111-a' }]], [5, [{ tag: 'audio' }]], [7, [{ tag: 'p', text: 'title' }]]]) as Map<number, TimelineElement[]>;
  const ids = trackIdentities([8, 7, 5, 3, 1], tracks);
  expect([...ids.values()].map(value => value.code)).toEqual(['V1', 'A1', 'A2', 'T1', 'C1']);
  expect(trackIdentities([1, 3, 5, 7, 8], tracks)).toEqual(ids);
});
