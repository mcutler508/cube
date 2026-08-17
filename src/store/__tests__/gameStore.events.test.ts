import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../gameStore';
import { gameEvents } from '../../game/events';
import { parseSequence } from '../../cube/notation';
import type { GameEvent } from '../../types/game';

/**
 * Sprint 2 acceptance: after every player move, the store diffs the
 * accomplishment snapshot (faces / rows / crosses / layers) and emits the
 * corresponding {xCompleted, xBroken} events. These tests capture the event
 * stream and verify meaningful transitions land in it.
 */

function recordEvents(): { events: GameEvent[]; stop: () => void } {
  const events: GameEvent[] = [];
  const unsub = gameEvents.subscribe((e) => events.push(e));
  return { events, stop: () => unsub() };
}

function scrambleToState(sequence: string) {
  const store = useGameStore.getState();
  store.reset();
  for (const move of parseSequence(sequence)) {
    useGameStore.getState().commitScrambleMove(move);
  }
}

describe('gameStore accomplishment events', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('emits faceCompleted when a player move completes a face', () => {
    // R breaks the U face; the inverse R' completes it back.
    scrambleToState('R');
    expect(useGameStore.getState().solvedFaces).not.toContain('U');

    const rec = recordEvents();
    useGameStore.getState().commitPlayerMove({ face: 'R', turns: -1 });
    rec.stop();

    const faceEvents = rec.events.filter((e) => e.type === 'faceCompleted');
    expect(faceEvents.some((e) => e.type === 'faceCompleted' && e.face === 'U')).toBe(true);
  });

  it('emits rowCompleted when a player move completes a row', () => {
    // R breaks F's right column. R' restores it — F row 0 becomes uniform green again.
    scrambleToState('R');
    expect(useGameStore.getState().solvedRows).not.toContain('F0');

    const rec = recordEvents();
    useGameStore.getState().commitPlayerMove({ face: 'R', turns: -1 });
    rec.stop();

    const rowEvents = rec.events.filter((e) => e.type === 'rowCompleted');
    // At least one row on F should be newly reported as complete.
    expect(rowEvents.some((e) => e.type === 'rowCompleted' && e.face === 'F')).toBe(true);
  });

  it('emits crossCompleted and layerCompleted when the top layer is restored', () => {
    // R U R' U' scramble; the inverse U R U' R' restores.
    scrambleToState("R U R' U'");
    expect(useGameStore.getState().solvedLayers).not.toContain('U');
    expect(useGameStore.getState().solvedCrosses).not.toContain('U');

    const rec = recordEvents();
    for (const move of parseSequence("U R U' R'")) {
      useGameStore.getState().commitPlayerMove(move);
    }
    rec.stop();

    const crossEvents = rec.events.filter(
      (e) => e.type === 'crossCompleted' && e.face === 'U',
    );
    const layerEvents = rec.events.filter(
      (e) => e.type === 'layerCompleted' && e.face === 'U',
    );
    expect(crossEvents.length).toBeGreaterThan(0);
    expect(layerEvents.length).toBeGreaterThan(0);
  });

  it('emits xBroken when a completion is undone by the next move', () => {
    // Scramble = D2 F. Player move F' immediately cancels the F (F F' = id),
    // leaving the cube at D2 — U layer intact, cube not fully solved. Then
    // player move F breaks the U layer again, emitting layerBroken.
    scrambleToState('D2 F');
    useGameStore.getState().commitPlayerMove({ face: 'F', turns: -1 });
    expect(useGameStore.getState().solvedLayers).toContain('U');
    expect(useGameStore.getState().phase).not.toBe('solved');

    const rec = recordEvents();
    useGameStore.getState().commitPlayerMove({ face: 'F', turns: 1 });
    rec.stop();

    const layerBroken = rec.events.filter(
      (e) => e.type === 'layerBroken' && e.face === 'U',
    );
    expect(layerBroken.length).toBeGreaterThan(0);
  });

  it('does not re-emit for accomplishments that were already complete', () => {
    // Reset -> solved cube. A U turn keeps U face uniform. Since U face was
    // already in the solved set, we should NOT emit faceCompleted for U.
    const rec = recordEvents();
    useGameStore.getState().commitPlayerMove({ face: 'U', turns: 1 });
    rec.stop();

    const uFaceCompleted = rec.events.filter(
      (e) => e.type === 'faceCompleted' && e.face === 'U',
    );
    expect(uFaceCompleted.length).toBe(0);
  });
});
