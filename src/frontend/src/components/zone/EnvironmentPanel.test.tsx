import { describe, it, expect, beforeEach, vi } from 'vitest';
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
  devices: { installDevice: async () => ({ ok: true }) },
  ...overrides,
});

describe('EnvironmentPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const baseZone = () => structuredClone(quickstartSnapshot.zones[0]);

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

  it('surfaces warnings returned from the simulation bridge', async () => {
    const zone = baseZone();
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
    const ppfdSlider = panel.getAllByTestId('ppfd-slider').at(-1) as HTMLInputElement;
    await act(async () => {
      fireEvent.change(ppfdSlider, { target: { value: '620' } });
    });

    await waitFor(() => expect(sendConfigUpdate).toHaveBeenCalled());
    expect(panel.getByText('Value clamped to safe range.')).toBeInTheDocument();
  });
});
