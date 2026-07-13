import { describe, expect, it } from 'vitest';

import { calculateSelectMenuPlacement } from '../../../src/worldbook_assistant_build/components/controls/selectPosition';

describe('calculateSelectMenuPlacement', () => {
  it('opens upward when downward space is insufficient', () => {
    const placement = calculateSelectMenuPlacement(
      { left: 20, right: 220, top: 650, bottom: 686, width: 200, height: 36 },
      { left: 0, right: 360, top: 0, bottom: 700, width: 360, height: 700 },
      700,
      280,
    );

    expect(placement.side).toBe('up');
    expect(placement.maxHeight).toBeLessThanOrEqual(280);
    expect(placement.top).toBeGreaterThanOrEqual(8);
  });

  it('uses the larger available side when neither fits the preferred height', () => {
    const placement = calculateSelectMenuPlacement(
      { left: 20, right: 220, top: 220, bottom: 256, width: 200, height: 36 },
      { left: 0, right: 360, top: 100, bottom: 400, width: 360, height: 300 },
      700,
      280,
    );

    expect(placement.side).toBe('down');
    expect(placement.maxHeight).toBe(136);
    expect(placement.top).toBe(156);
  });

  it('clamps horizontal placement inside the owner root and never narrows below the trigger when it fits', () => {
    const placement = calculateSelectMenuPlacement(
      { left: 430, right: 530, top: 100, bottom: 136, width: 100, height: 36 },
      { left: 100, right: 460, top: 0, bottom: 700, width: 360, height: 700 },
      700,
      280,
    );

    expect(placement.width).toBeGreaterThanOrEqual(100);
    expect(placement.left).toBe(252);
    expect(placement.left + placement.width).toBeLessThanOrEqual(352);
  });

  it('uses viewport intersection and root-relative coordinates', () => {
    const placement = calculateSelectMenuPlacement(
      { left: 120, right: 320, top: 560, bottom: 596, width: 200, height: 36 },
      { left: 100, right: 500, top: 200, bottom: 900, width: 400, height: 700 },
      620,
      280,
    );

    expect(placement.side).toBe('up');
    expect(placement.left).toBe(20);
    expect(placement.top).toBe(80);
    expect(placement.maxHeight).toBe(280);
  });
});
