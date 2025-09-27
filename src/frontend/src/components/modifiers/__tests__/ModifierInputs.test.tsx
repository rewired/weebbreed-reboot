import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

import { ModifierInputs } from '../ModifierInputs';
import type { DifficultyModifiers } from '../../../types/difficulty';

describe('ModifierInputs', () => {
  it('formats currency values below 1000 with two decimal places', () => {
    const modifiers: DifficultyModifiers = {
      plantStress: {
        optimalRangeMultiplier: 1,
        stressAccumulationMultiplier: 1,
      },
      deviceFailure: {
        mtbfMultiplier: 1,
      },
      economics: {
        initialCapital: 123.456,
        itemPriceMultiplier: 1,
        harvestPriceMultiplier: 1,
        rentPerSqmStructurePerTick: 0.5,
        rentPerSqmRoomPerTick: 0.5,
      },
    };

    render(<ModifierInputs modifiers={modifiers} onChange={vi.fn()} />);

    expect(screen.getByText('€123.46')).toBeInTheDocument();
  });
});
