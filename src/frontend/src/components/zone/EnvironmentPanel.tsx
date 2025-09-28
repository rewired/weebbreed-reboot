import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import cx from 'clsx';
import type { ZoneSnapshot, ZoneControlSetpoints } from '@/types/simulation';
import type { SimulationBridge } from '@/facade/systemFacade';
import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { formatNumber } from '@/utils/formatNumber';

type SetpointMetric = 'temperature' | 'relativeHumidity' | 'co2' | 'ppfd';

interface EnvironmentPanelProps {
  zone: ZoneSnapshot;
  setpoints?: ZoneControlSetpoints;
  bridge: SimulationBridge;
  defaultExpanded?: boolean;
}

type BadgeTone = 'default' | 'success' | 'warning' | 'danger';

const SETPOINT_DEBOUNCE_MS = 250;

const determineTone = (
  current: number,
  target?: number,
  thresholds?: { success: number; warning: number },
): BadgeTone => {
  if (typeof target !== 'number') {
    return 'default';
  }
  const delta = Math.abs(current - target);
  if (!thresholds) {
    return delta < Number.EPSILON ? 'success' : 'default';
  }
  if (delta <= thresholds.success) {
    return 'success';
  }
  if (delta <= thresholds.warning) {
    return 'warning';
  }
  return 'danger';
};

const createDeviceMatcher = (zone: ZoneSnapshot) => {
  const deviceKinds = zone.devices.map((device) => device.kind?.toLowerCase?.() ?? '');
  return (keywords: string[]): boolean =>
    deviceKinds.some((kind) => keywords.some((keyword) => kind.includes(keyword)));
};

const temperatureRange = { min: 16, max: 32, step: 0.5 } as const;
const humidityRange = { min: 35, max: 90, step: 1 } as const;
const co2Range = { min: 400, max: 1600, step: 25 } as const;
const ppfdRange = { min: 0, max: 1200, step: 10 } as const;

const SliderLabel = ({ icon, children }: { icon: string; children: string }) => (
  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
    <Icon name={icon} size={18} className="text-text-muted" />
    {children}
  </span>
);

const KpiBadge = ({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  tone: BadgeTone;
}) => (
  <Badge
    tone={tone === 'default' ? 'default' : tone}
    className="flex items-center gap-1 px-3 py-1 text-[11px]"
  >
    <Icon name={icon} size={16} className="text-xs text-inherit" />
    <span>{label}</span>
    <span className="normal-case font-semibold tracking-tight text-text">{value}</span>
  </Badge>
);

export const EnvironmentPanel = ({
  zone,
  setpoints,
  bridge,
  defaultExpanded = false,
}: EnvironmentPanelProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pendingMetric, setPendingMetric] = useState<SetpointMetric | null>(null);

  const matchDevice = useMemo(() => createDeviceMatcher(zone), [zone]);

  const canControlTemperature = matchDevice(['climate', 'hvac', 'cool', 'heat']);
  const canControlHumidity = matchDevice(['humid', 'dehumid', 'climate']);
  const canControlCo2 = matchDevice(['co2', 'scrub', 'inject']);
  const canControlLighting = matchDevice(['light', 'lamp']);

  const temperatureTarget = setpoints?.temperature ?? zone.environment.temperature;
  const humidityTargetPercent =
    ((setpoints?.humidity ?? zone.environment.relativeHumidity) || 0) * 100;
  const co2Target = setpoints?.co2 ?? zone.environment.co2;
  const ppfdTarget = setpoints?.ppfd ?? zone.environment.ppfd;

  const [temperatureValue, setTemperatureValue] = useState<number>(temperatureTarget);
  const [humidityValue, setHumidityValue] = useState<number>(humidityTargetPercent);
  const [co2Value, setCo2Value] = useState<number>(co2Target);
  const [ppfdValue, setPpfdValue] = useState<number>(ppfdTarget);

  const lastNonZeroPpfd = useRef<number>(ppfdTarget > 0 ? ppfdTarget : 400);

  useEffect(() => {
    setTemperatureValue(temperatureTarget);
  }, [temperatureTarget]);

  useEffect(() => {
    setHumidityValue(humidityTargetPercent);
  }, [humidityTargetPercent]);

  useEffect(() => {
    setCo2Value(co2Target);
  }, [co2Target]);

  useEffect(() => {
    setPpfdValue(ppfdTarget);
    if (ppfdTarget > 0) {
      lastNonZeroPpfd.current = ppfdTarget;
    }
  }, [ppfdTarget]);

  const handleSetpointChange = useCallback(
    async (metric: SetpointMetric, value: number) => {
      setPendingMetric(metric);
      setWarnings([]);
      try {
        const response = await bridge.sendConfigUpdate({
          type: 'setpoint',
          zoneId: zone.id,
          metric,
          value,
        });

        if (!response.ok) {
          const message = response.errors?.[0]?.message ?? 'Failed to update setpoint.';
          setWarnings([message]);
        } else if (response.warnings?.length) {
          setWarnings(response.warnings);
        }
      } catch (error) {
        console.error('Failed to update zone setpoint', error);
        setWarnings(['Failed to update setpoint.']);
      } finally {
        setPendingMetric(null);
      }
    },
    [bridge, zone.id],
  );

  const debouncedSetpoint = useMemo(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let lastCall: { metric: SetpointMetric; value: number } | null = null;

    const flush = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      if (lastCall) {
        const call = lastCall;
        lastCall = null;
        void handleSetpointChange(call.metric, call.value);
      }
    };

    return {
      schedule(metric: SetpointMetric, value: number) {
        lastCall = { metric, value };
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
          timeout = null;
          const call = lastCall;
          lastCall = null;
          if (call) {
            void handleSetpointChange(call.metric, call.value);
          }
        }, SETPOINT_DEBOUNCE_MS);
      },
      flush,
      cancel() {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        lastCall = null;
      },
    };
  }, [handleSetpointChange]);

  const { schedule, flush, cancel } = debouncedSetpoint;

  useEffect(() => () => cancel(), [cancel]);

  const toggleLights = async () => {
    if (!canControlLighting) {
      return;
    }
    const isOn = ppfdValue > 0;
    const nextValue = isOn ? 0 : lastNonZeroPpfd.current > 0 ? lastNonZeroPpfd.current : 400;
    if (!isOn && nextValue > 0) {
      lastNonZeroPpfd.current = nextValue;
    }
    setPpfdValue(nextValue);
    if (nextValue > 0) {
      lastNonZeroPpfd.current = nextValue;
    }
    cancel();
    await handleSetpointChange('ppfd', nextValue);
  };

  const chips = [
    {
      key: 'temp',
      icon: 'thermostat',
      label: 'Temp',
      value: `${formatNumber(zone.environment.temperature, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      })}°C`,
      tone: determineTone(zone.environment.temperature, setpoints?.temperature, {
        success: 1,
        warning: 3,
      }),
    },
    {
      key: 'humidity',
      icon: 'water_drop',
      label: 'Humidity',
      value: `${formatNumber(zone.environment.relativeHumidity * 100, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}%`,
      tone: determineTone(
        zone.environment.relativeHumidity * 100,
        setpoints?.humidity ? setpoints.humidity * 100 : undefined,
        {
          success: 5,
          warning: 10,
        },
      ),
    },
    {
      key: 'vpd',
      icon: 'science',
      label: 'VPD',
      value: `${formatNumber(zone.environment.vpd, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} kPa`,
      tone: determineTone(zone.environment.vpd, setpoints?.vpd, {
        success: 0.15,
        warning: 0.35,
      }),
    },
    {
      key: 'co2',
      icon: 'co2',
      label: 'CO₂',
      value: `${formatNumber(zone.environment.co2, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })} ppm`,
      tone: determineTone(zone.environment.co2, setpoints?.co2, {
        success: 100,
        warning: 250,
      }),
    },
    {
      key: 'ppfd',
      icon: 'sunny',
      label: 'PPFD',
      value: `${formatNumber(zone.environment.ppfd, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })} µmol`,
      tone: determineTone(zone.environment.ppfd, setpoints?.ppfd, {
        success: 50,
        warning: 150,
      }),
    },
    {
      key: 'cycle',
      icon: 'schedule',
      label: 'Cycle',
      value:
        zone.lighting?.photoperiodHours?.on !== undefined &&
        zone.lighting?.photoperiodHours?.off !== undefined
          ? `${zone.lighting.photoperiodHours.on}h/${zone.lighting.photoperiodHours.off}h`
          : '—',
      tone: 'default' as BadgeTone,
    },
  ];

  const isLightsOn = ppfdValue > 0;

  return (
    <section
      className="rounded-3xl border border-border/50 bg-surface-elevated/70"
      data-testid="environment-panel-root"
    >
      <button
        type="button"
        className="flex w-full flex-col gap-4 rounded-3xl px-6 py-4 text-left transition hover:bg-surface-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        data-testid="environment-panel-toggle"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text">
            <Icon name="monitor_heart" size={20} className="text-primary" />
            Environment Controls
          </div>
          <Icon
            name={expanded ? 'expand_less' : 'expand_more'}
            size={24}
            className="text-text-muted"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <KpiBadge
              key={chip.key}
              icon={chip.icon}
              label={chip.label}
              value={chip.value}
              tone={chip.tone}
            />
          ))}
        </div>
      </button>
      {expanded ? (
        <div className="grid gap-6 border-t border-border/50 px-6 pb-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor={`temperature-${zone.id}`}>
                <SliderLabel icon="thermostat">Temperature Target</SliderLabel>
              </label>
              <div className="flex items-center gap-3">
                <input
                  id={`temperature-${zone.id}`}
                  type="range"
                  min={temperatureRange.min}
                  max={temperatureRange.max}
                  step={temperatureRange.step}
                  value={temperatureValue}
                  disabled={!canControlTemperature || pendingMetric === 'temperature'}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    setTemperatureValue(nextValue);
                    schedule('temperature', nextValue);
                  }}
                  onBlur={() => flush()}
                  onMouseUp={() => flush()}
                  onTouchEnd={() => flush()}
                  className="flex-1 accent-primary"
                  data-testid="temperature-slider"
                />
                <span className="min-w-[64px] text-right text-sm font-semibold text-text">
                  {formatNumber(temperatureValue, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
                  °C
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor={`humidity-${zone.id}`}>
                <SliderLabel icon="water_drop">Relative Humidity</SliderLabel>
              </label>
              <div className="flex items-center gap-3">
                <input
                  id={`humidity-${zone.id}`}
                  type="range"
                  min={humidityRange.min}
                  max={humidityRange.max}
                  step={humidityRange.step}
                  value={humidityValue}
                  disabled={!canControlHumidity || pendingMetric === 'relativeHumidity'}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    setHumidityValue(nextValue);
                    schedule('relativeHumidity', nextValue / 100);
                  }}
                  onBlur={() => flush()}
                  onMouseUp={() => flush()}
                  onTouchEnd={() => flush()}
                  className="flex-1 accent-primary"
                  data-testid="humidity-slider"
                />
                <span className="min-w-[64px] text-right text-sm font-semibold text-text">
                  {formatNumber(humidityValue, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                  %
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor={`co2-${zone.id}`}>
                <SliderLabel icon="co2">CO₂ Enrichment</SliderLabel>
              </label>
              <div className="flex items-center gap-3">
                <input
                  id={`co2-${zone.id}`}
                  type="range"
                  min={co2Range.min}
                  max={co2Range.max}
                  step={co2Range.step}
                  value={co2Value}
                  disabled={!canControlCo2 || pendingMetric === 'co2'}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    setCo2Value(nextValue);
                    schedule('co2', nextValue);
                  }}
                  onBlur={() => flush()}
                  onMouseUp={() => flush()}
                  onTouchEnd={() => flush()}
                  className="flex-1 accent-primary"
                  data-testid="co2-slider"
                />
                <span className="min-w-[64px] text-right text-sm font-semibold text-text">
                  {formatNumber(co2Value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}{' '}
                  ppm
                </span>
              </div>
            </div>

            <div className="grid gap-2 md:col-span-2">
              <label htmlFor={`ppfd-${zone.id}`}>
                <SliderLabel icon="sunny">PPFD Target</SliderLabel>
              </label>
              <div className="flex items-center gap-3">
                <input
                  id={`ppfd-${zone.id}`}
                  type="range"
                  min={ppfdRange.min}
                  max={ppfdRange.max}
                  step={ppfdRange.step}
                  value={ppfdValue}
                  disabled={!canControlLighting || pendingMetric === 'ppfd'}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    setPpfdValue(nextValue);
                    if (nextValue > 0) {
                      lastNonZeroPpfd.current = nextValue;
                    }
                    schedule('ppfd', nextValue);
                  }}
                  onBlur={() => flush()}
                  onMouseUp={() => flush()}
                  onTouchEnd={() => flush()}
                  className="flex-1 accent-primary"
                  data-testid="ppfd-slider"
                />
                <span className="min-w-[64px] text-right text-sm font-semibold text-text">
                  {formatNumber(ppfdValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}{' '}
                  µmol
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/40 bg-surface-muted/40 px-4 py-3">
            <div className="flex items-center gap-3 text-sm text-text-muted">
              <Icon
                name="light_mode"
                size={20}
                className={cx('text-text-muted', isLightsOn ? 'text-primary' : undefined)}
              />
              <span>Lighting</span>
              <Badge tone={isLightsOn ? 'success' : 'default'} className="px-2 py-0 text-[10px]">
                <span className="normal-case font-semibold">{isLightsOn ? 'On' : 'Off'}</span>
              </Badge>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void toggleLights()}
              disabled={!canControlLighting || pendingMetric === 'ppfd'}
              icon={<Icon name={isLightsOn ? 'power_settings_new' : 'bolt'} size={18} />}
            >
              {isLightsOn ? 'Turn Lights Off' : 'Turn Lights On'}
            </Button>
          </div>

          {warnings.length ? (
            <div
              className="space-y-1 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning"
              aria-live="polite"
            >
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
