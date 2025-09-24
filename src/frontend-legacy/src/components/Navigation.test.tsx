import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Navigation from './Navigation';
import type { NavigationItem } from './Navigation';

const baseItems: NavigationItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'world', label: 'World', badge: 3 },
  { id: 'personnel', label: 'Personnel', disabled: true, tooltip: 'Permission required' },
];

describe('Navigation', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders navigation items with active state and badges', () => {
    render(<Navigation items={baseItems} activeItemId="world" />);

    const worldButton = screen.getByRole('button', { name: /World/ });
    expect(worldButton.getAttribute('aria-pressed')).toBe('true');
    expect(worldButton.textContent).toContain('3');

    const overviewButton = screen.getByRole('button', { name: 'Overview' });
    expect(overviewButton.getAttribute('aria-pressed')).toBe('false');

    const personnelButton = screen.getByRole('button', { name: 'Personnel' });
    expect(personnelButton.getAttribute('aria-disabled')).toBe('true');
    expect(personnelButton.getAttribute('title')).toBe('Permission required');
  });

  it('invokes the selection handler for enabled items only', () => {
    const handleSelect = vi.fn();
    render(<Navigation items={baseItems} activeItemId="overview" onSelect={handleSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
    fireEvent.click(screen.getByRole('button', { name: /World/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Personnel' }));

    expect(handleSelect.mock.calls).toHaveLength(2);
    expect(handleSelect.mock.calls.at(0)).toEqual(['overview']);
    expect(handleSelect.mock.calls.at(1)).toEqual(['world']);
  });

  it('matches the snapshot for vertical layout', () => {
    const { container } = render(<Navigation items={baseItems} layout="vertical" />);

    expect(container.firstChild).toMatchSnapshot();
  });
});
