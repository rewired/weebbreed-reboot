import { describe, beforeEach, it, expect } from 'vitest';
import { act } from '@testing-library/react';
import { useNavigationStore } from '@/store/navigation';

describe('navigation store', () => {
  beforeEach(() => {
    act(() => {
      useNavigationStore.getState().reset();
    });
  });

  it('enters dashboard from start', () => {
    expect(useNavigationStore.getState().currentView).toBe('start');
    act(() => {
      useNavigationStore.getState().enterDashboard();
    });
    expect(useNavigationStore.getState().currentView).toBe('dashboard');
  });

  it('opens structure and resets subordinate selections', () => {
    act(() => {
      useNavigationStore.getState().openStructure('structure-1');
    });
    const state = useNavigationStore.getState();
    expect(state.currentView).toBe('structure');
    expect(state.selectedStructureId).toBe('structure-1');
    expect(state.selectedRoomId).toBeUndefined();
    expect(state.selectedZoneId).toBeUndefined();
  });

  it('toggles sidebar visibility responsively', () => {
    expect(useNavigationStore.getState().isSidebarOpen).toBe(false);
    act(() => {
      useNavigationStore.getState().toggleSidebar(true);
    });
    expect(useNavigationStore.getState().isSidebarOpen).toBe(true);
    act(() => {
      useNavigationStore.getState().toggleSidebar(false);
    });
    expect(useNavigationStore.getState().isSidebarOpen).toBe(false);
  });
});
