import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EnvironmentPanel } from './EnvironmentPanel';
import type { SimulationBridge } from '@/facade/systemFacade';
import { quickstartSnapshot } from '@/data/mockTelemetry';

const buildBridge = (overrides: Partial<SimulationBridge> = {}): SimulationBridge => ({
  connect: () => undefined,
  loadQuickStart: async () => ({ ok: true }),
  getStructureBlueprints: async () => ({ ok: true, data: [] }),
  getStrainBlueprints: async () => ({ ok: true, data: [] }),
  getDeviceBlueprints: async () => ({ ok: true, data: [] }),
  getDifficultyConfig: async () => ({ ok: true }),
  sendControl: async () => ({ ok: true }),
  sendConfigUpdate: async () => ({ ok: true }),
  sendIntent: async () => ({ ok: true }),
  subscribeToUpdates: () => () => undefined,
  plants: { addPlanting: async () => ({ ok: true }) },
  devices: {
    installDevice: async () => ({ ok: true }),
    adjustLightingCycle: async () => ({ ok: true }),
    moveDevice: async () => ({ ok: true }),
    removeDevice: async () => ({ ok: true }),
  },
  ...overrides,
});

describe('EnvironmentPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseZone = () => structuredClone(quickstartSnapshot.zones[0]);

  it('shows VPD summary but no direct VPD control', () => {
    const zone = baseZone();
    const bridge = buildBridge();

    render(
      <EnvironmentPanel
        zone={zone}
        setpoints={zone.control?.setpoints}
        bridge={bridge}
        defaultExpanded
      />,
    );

    const panel = within(screen.getAllByTestId('environment-panel-root').at(-1)!);
    expect(panel.queryByTestId('vpd-slider')).not.toBeInTheDocument();

    const header = panel.getByTestId('environment-panel-toggle');
    expect(within(header).getByText('VPD')).toBeInTheDocument();
  });

  it('supports custom badge rendering', () => {
    const zone = baseZone();
    const bridge = buildBridge();

    render(
      <EnvironmentPanel
        zone={zone}
        setpoints={zone.control?.setpoints}
        bridge={bridge}
        defaultExpanded
        renderBadges={(badges) => (
          <div data-testid="custom-badge-row">{badges.map((badge) => badge.label).join(',')}</div>
        )}
      />,
    );

    const panel = within(screen.getAllByTestId('environment-panel-root').at(-1)!);
    const header = panel.getByTestId('environment-panel-toggle');
    expect(within(header).getByTestId('custom-badge-row')).toHaveTextContent(
      'Temp,Humidity,VPD,CO₂,PPFD,Cycle',
    );
  });

  it('dispatches temperature updates through the simulation bridge', async () => {
    const zone = baseZone();
    const sendConfigUpdate = vi.fn(async () => ({ ok: true }));
    const bridge = buildBridge({ sendConfigUpdate });

    render(
      <EnvironmentPanel
        zone={zone}
        setpoints={zone.control?.setpoints}
        bridge={bridge}
        defaultExpanded
      />,
    );

    const panel = within(screen.getAllByTestId('environment-panel-root').at(-1)!);
    const slider = panel.getAllByTestId('temperature-slider').at(-1) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(slider, { target: { value: '27' } });
      fireEvent.mouseUp(slider);
    });

    await waitFor(() => expect(sendConfigUpdate).toHaveBeenCalled());
    expect(sendConfigUpdate).toHaveBeenLastCalledWith({
      type: 'setpoint',
      zoneId: zone.id,
      metric: 'temperature',
      value: 27,
    });
  });

  it('converts humidity slider values to fractional setpoints', async () => {
    const zone = baseZone();
    const sendConfigUpdate = vi.fn(async () => ({ ok: true }));
    const bridge = buildBridge({ sendConfigUpdate });

    render(
      <EnvironmentPanel
        zone={zone}
        setpoints={zone.control?.setpoints}
        bridge={bridge}
        defaultExpanded
      />,
    );

    const panel = within(screen.getAllByTestId('environment-panel-root').at(-1)!);
    const humiditySlider = panel.getAllByTestId('humidity-slider').at(-1) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(humiditySlider, { target: { value: '55' } });
      fireEvent.mouseUp(humiditySlider);
    });

    await waitFor(() => expect(sendConfigUpdate).toHaveBeenCalled());
    expect(sendConfigUpdate).toHaveBeenLastCalledWith({
      type: 'setpoint',
      zoneId: zone.id,
      metric: 'relativeHumidity',
      value: 0.55,
    });
  });

  it('disables CO₂ controls when enrichment devices are absent', async () => {
    const zone = baseZone();
    zone.devices = zone.devices.filter((device) => !device.kind.toLowerCase().includes('co2'));
    const bridge = buildBridge();

    render(
      <EnvironmentPanel
        zone={zone}
        setpoints={zone.control?.setpoints}
        bridge={bridge}
        defaultExpanded
      />,
    );

    const panel = within(screen.getAllByTestId('environment-panel-root').at(-1)!);
    const co2Slider = panel.getAllByTestId('co2-slider').at(-1) as HTMLInputElement;
    expect(co2Slider).toBeDisabled();
  });

  it('omits the PPFD slider but allows toggling lighting and surfaces warnings', async () => {
    const zone = baseZone();
    zone.environment.ppfd = 620;
    zone.control = {
      ...zone.control,
      setpoints: {
        ...zone.control?.setpoints,
        ppfd: 620,
      },
    };

    const sendConfigUpdate = vi.fn(async () => ({
      ok: true,
      warnings: ['Value clamped to safe range.'],
    }));
    const bridge = buildBridge({ sendConfigUpdate });

    render(
      <EnvironmentPanel
        zone={zone}
        setpoints={zone.control?.setpoints}
        bridge={bridge}
        defaultExpanded
      />,
    );

    const panel = within(screen.getAllByTestId('environment-panel-root').at(-1)!);
    expect(panel.queryByTestId('ppfd-slider')).not.toBeInTheDocument();

    const toggleButton = panel.getByRole('button', { name: /turn lights off/i });
    await act(async () => {
      fireEvent.click(toggleButton);
    });

    await waitFor(() => expect(sendConfigUpdate).toHaveBeenCalled());
    expect(sendConfigUpdate).toHaveBeenLastCalledWith({
      type: 'setpoint',
      zoneId: zone.id,
      metric: 'ppfd',
      value: 0,
    });
    expect(panel.getByText('Value clamped to safe range.')).toBeInTheDocument();

    const turnOnButton = panel.getByRole('button', { name: /turn lights on/i });
    await act(async () => {
      fireEvent.click(turnOnButton);
    });

    await waitFor(() => expect(sendConfigUpdate).toHaveBeenCalledTimes(2));
    expect(sendConfigUpdate).toHaveBeenLastCalledWith({
      type: 'setpoint',
      zoneId: zone.id,
      metric: 'ppfd',
      value: 620,
    });
  });

  it('dispatches lighting cycle adjustments through the simulation bridge', async () => {
    const zone = baseZone();
    const adjustLightingCycle = vi.fn(async () => ({ ok: true }));
    const bridge = buildBridge({
      devices: {
        installDevice: async () => ({ ok: true }),
        adjustLightingCycle:
          adjustLightingCycle as SimulationBridge['devices']['adjustLightingCycle'],
        moveDevice: async () => ({ ok: true }),
        removeDevice: async () => ({ ok: true }),
      },
    });

    render(
      <EnvironmentPanel
        zone={zone}
        setpoints={zone.control?.setpoints}
        bridge={bridge}
        defaultExpanded
      />,
    );

    const panel = within(screen.getAllByTestId('environment-panel-root').at(-1)!);
    const slider = panel.getByTestId('lighting-cycle-slider') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(slider, { target: { value: '19' } });
      fireEvent.mouseUp(slider);
    });

    await waitFor(() => expect(adjustLightingCycle).toHaveBeenCalled());
    expect(adjustLightingCycle).toHaveBeenLastCalledWith({
      zoneId: zone.id,
      photoperiodHours: {
        on: 19,
        off: 5,
      },
    });
  });

  it('surfaces lighting cycle warnings inline and syncs badge updates', async () => {
    const zone = baseZone();
    const adjustLightingCycle = vi.fn(async () => ({
      ok: true,
      warnings: ['Cycle clamped to device coverage.'],
    }));
    const bridge = buildBridge({
      devices: {
        installDevice: async () => ({ ok: true }),
        adjustLightingCycle:
          adjustLightingCycle as SimulationBridge['devices']['adjustLightingCycle'],
        moveDevice: async () => ({ ok: true }),
        removeDevice: async () => ({ ok: true }),
      },
    });

    const { rerender } = render(
      <EnvironmentPanel
        zone={zone}
        setpoints={zone.control?.setpoints}
        bridge={bridge}
        defaultExpanded
      />,
    );

    const panel = within(screen.getAllByTestId('environment-panel-root').at(-1)!);
    const slider = panel.getByTestId('lighting-cycle-slider') as HTMLInputElement;

    await act(async () => {
      fireEvent.change(slider, { target: { value: '17' } });
      fireEvent.mouseUp(slider);
    });

    await waitFor(() => expect(adjustLightingCycle).toHaveBeenCalled());
    expect(panel.getByText('Cycle clamped to device coverage.')).toBeInTheDocument();

    const updatedZone = structuredClone(zone);
    updatedZone.lighting = {
      ...(updatedZone.lighting ?? {}),
      photoperiodHours: { on: 16, off: 8 },
    };

    rerender(
      <EnvironmentPanel
        zone={updatedZone}
        setpoints={updatedZone.control?.setpoints}
        bridge={bridge}
        defaultExpanded
      />,
    );

    expect(panel.getByText('16 h light / 8 h dark')).toBeInTheDocument();
    expect(
      panel.getByText(/dark period adjusts automatically to maintain a 24h day/i),
    ).toBeInTheDocument();
    const updatedSlider = panel.getByTestId('lighting-cycle-slider') as HTMLInputElement;
    expect(updatedSlider.value).toBe('16');
  });

  it('debounces rapid slider updates before calling the simulation bridge', async () => {
    vi.useFakeTimers();

    const zone = baseZone();
    const sendConfigUpdate = vi.fn(async () => ({ ok: true }));
    const bridge = buildBridge({ sendConfigUpdate });

    render(
      <EnvironmentPanel
        zone={zone}
        setpoints={zone.control?.setpoints}
        bridge={bridge}
        defaultExpanded
      />,
    );

    const panel = within(screen.getAllByTestId('environment-panel-root').at(-1)!);
    const slider = panel.getAllByTestId('temperature-slider').at(-1) as HTMLInputElement;

    act(() => {
      fireEvent.change(slider, { target: { value: '26' } });
      fireEvent.change(slider, { target: { value: '27' } });
    });

    expect(sendConfigUpdate).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(sendConfigUpdate).toHaveBeenCalledTimes(1);
    expect(sendConfigUpdate).toHaveBeenLastCalledWith({
      type: 'setpoint',
      zoneId: zone.id,
      metric: 'temperature',
      value: 27,
    });
  });

  it('renders the embedded variant without the standalone section wrapper', () => {
    const zone = baseZone();
    const bridge = buildBridge();

    render(
      <EnvironmentPanel
        zone={zone}
        setpoints={zone.control?.setpoints}
        bridge={bridge}
        variant="embedded"
      />,
    );

    const roots = screen.getAllByTestId('environment-panel-root');
    expect(roots.at(-1)?.tagName).toBe('DIV');
  });
});
