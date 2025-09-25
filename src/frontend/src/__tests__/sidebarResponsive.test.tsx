// @vitest-environment jsdom
import { describe, beforeEach, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Sidebar } from '@/components/navigation/Sidebar';
import { useSimulationStore } from '@/store/simulation';
import { useNavigationStore } from '@/store/navigation';
import { quickstartSnapshot } from '@/data/mockTelemetry';

describe('Sidebar responsive behaviour', () => {
  beforeEach(() => {
    useSimulationStore.getState().reset();
    useNavigationStore.getState().reset();
    useSimulationStore.getState().hydrate({ snapshot: quickstartSnapshot });
    useNavigationStore.getState().enterDashboard();
  });

  it('toggles visibility on mobile trigger', () => {
    const { getByLabelText } = render(<Sidebar />);
    const toggle = getByLabelText(/toggle sidebar/i);
    const aside = document.querySelector('aside');
    expect(aside?.className).toContain('-translate-x-full');
    fireEvent.click(toggle);
    expect(useNavigationStore.getState().isSidebarOpen).toBe(true);
    expect(aside?.className).toContain('translate-x-0');
    fireEvent.click(toggle);
    expect(useNavigationStore.getState().isSidebarOpen).toBe(false);
  });
});
