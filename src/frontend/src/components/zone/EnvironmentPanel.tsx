import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import cx from 'clsx';
import type { ZoneSnapshot, ZoneControlSetpoints } from '@/types/simulation';
import type { SimulationBridge } from '@/facade/systemFacade';
import { Icon } from '@/components/common/Icon';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { formatNumber } from '@/utils/formatNumber';
import { EnvironmentBadgeRow } from './EnvironmentBadgeRow';
import type { EnvironmentBadgeDescriptor } from './environmentBadges';
import { buildEnvironmentBadgeDescriptors } from './environmentBadges';

type SetpointMetric = 'temperature' | 'relativeHumidity' | 'co2' | 'ppfd';

interface EnvironmentPanelProps {
  zone: ZoneSnapshot;
  setpoints?: ZoneControlSetpoints;
  bridge: SimulationBridge;
  defaultExpanded?: boolean;
  variant?: 'standalone' | 'embedded';
  className?: string;
  renderBadges?: (badges: EnvironmentBadgeDescriptor[]) => ReactNode;
}

const SETPOINT_DEBOUNCE_MS = 250;

const defaultRenderBadges = (badges: EnvironmentBadgeDescriptor[]) => (
  <EnvironmentBadgeRow badges={badges} />
);

const createDeviceMatcher = (zone: ZoneSnapshot) => {
  const deviceKinds = zone.devices.map((device) => device.kind?.toLowerCase?.() ?? '');
  return (keywords: string[]): boolean =>
    deviceKinds.some((kind) => keywords.some((keyword) => kind.includes(keyword)));
};

const HUMIDITY_DEVICE_KINDS = new Set(['humiditycontrolunit', 'dehumidifier']);

const temperatureRange = { min: 16, max: 32, step: 0.5 } as const;
const humidityRange = { min: 35, max: 90, step: 1 } as const;
const co2Range = { min: 400, max: 1600, step: 25 } as const;
const photoperiodRange = { min: 1, max: 23, step: 1 } as const;
const MINIMUM_DARK_HOURS = 1;
const DEFAULT_LIGHT_HOURS = 18;

const clampPhotoperiodHours = (value: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_LIGHT_HOURS;
  }
  const clamped = Math.min(Math.max(value, photoperiodRange.min), photoperiodRange.max);
  return Math.round(clamped);
};

const resolvePhotoperiodLightHours = (zone: ZoneSnapshot): number => {
  const photoperiod = zone.lighting?.photoperiodHours;
  if (photoperiod) {
    const { on, off } = photoperiod;
    if (typeof on === 'number') {
      return clampPhotoperiodHours(on);
    }
    if (typeof off === 'number') {
      return clampPhotoperiodHours(24 - off);
    }
  }
  return DEFAULT_LIGHT_HOURS;
};

const normaliseHours = (value: number): number => Number.parseFloat(value.toFixed(2));

const SliderLabel = ({ icon, children }: { icon: string; children: string }) => (
  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
    <Icon name={icon} size={18} className="text-text-muted" />
    {children}
  </span>
);

export const EnvironmentPanel = ({
  zone,
  setpoints,
  bridge,
  defaultExpanded = false,
  variant = 'standalone',
  className,
  renderBadges,
}: EnvironmentPanelProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pendingMetric, setPendingMetric] = useState<SetpointMetric | 'lightingCycle' | null>(null);

  const matchDevice = useMemo(() => createDeviceMatcher(zone), [zone]);
  const hasHumidityDevice = useMemo(
    () =>
      zone.devices.some((device) => HUMIDITY_DEVICE_KINDS.has(device.kind?.toLowerCase?.() ?? '')),
    [zone],
  );

  const canControlTemperature = matchDevice(['climate', 'hvac', 'cool', 'heat']);
  const canControlHumidity = hasHumidityDevice || matchDevice(['humid', 'dehumid', 'climate']);
  const canControlCo2 = matchDevice(['co2', 'scrub', 'inject']);
  const canControlLighting = matchDevice(['light', 'lamp']);

  const temperatureTarget = setpoints?.temperature ?? zone.environment.temperature;
  const humidityTargetPercent =
    ((setpoints?.humidity ?? zone.environment.relativeHumidity) || 0) * 100;
  const co2Target = setpoints?.co2 ?? zone.environment.co2;
  const ppfdTarget = setpoints?.ppfd ?? zone.environment.ppfd;
  const resolvedPhotoperiodOnHours = useMemo(() => resolvePhotoperiodLightHours(zone), [zone]);
  const badgeDescriptors = useMemo(
    () => buildEnvironmentBadgeDescriptors(zone, setpoints),
    [zone, setpoints],
  );
  const badgesContent = useMemo(() => {
    const renderer = renderBadges ?? defaultRenderBadges;
    return renderer(badgeDescriptors);
  }, [renderBadges, badgeDescriptors]);

  const [temperatureValue, setTemperatureValue] = useState<number>(temperatureTarget);
  const [humidityValue, setHumidityValue] = useState<number>(humidityTargetPercent);
  const [co2Value, setCo2Value] = useState<number>(co2Target);
  const [pendingPpfd, setPendingPpfd] = useState<number | null>(null);
  const [photoperiodValue, setPhotoperiodValue] = useState<number>(resolvedPhotoperiodOnHours);
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
    setPendingPpfd(null);
    if (ppfdTarget > 0) {
      lastNonZeroPpfd.current = ppfdTarget;
    }
  }, [ppfdTarget]);

  useEffect(() => {
    setPhotoperiodValue(resolvedPhotoperiodOnHours);
  }, [resolvedPhotoperiodOnHours]);

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

  const handleLightingCycleChange = useCallback(
    async (lightHours: number) => {
      if (!canControlLighting) {
        return;
      }

      const clampedLightHours = clampPhotoperiodHours(lightHours);
      const darkHours = Math.max(24 - clampedLightHours, MINIMUM_DARK_HOURS);

      setPendingMetric('lightingCycle');
      setWarnings([]);
      try {
        const response = await bridge.devices.adjustLightingCycle({
          zoneId: zone.id,
          photoperiodHours: {
            on: normaliseHours(clampedLightHours),
            off: normaliseHours(darkHours),
          },
        });

        if (!response.ok) {
          const message = response.errors?.[0]?.message ?? 'Failed to update lighting cycle.';
          setWarnings([message]);
        } else if (response.warnings?.length) {
          setWarnings(response.warnings);
        }
      } catch (error) {
        console.error('Failed to adjust lighting cycle', error);
        setWarnings(['Failed to update lighting cycle.']);
      } finally {
        setPendingMetric(null);
      }
    },
    [bridge, zone.id, canControlLighting],
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

  const photoperiodController = useMemo(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let lastValue: number | null = null;

    const flush = () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      if (lastValue !== null) {
        const value = lastValue;
        lastValue = null;
        void handleLightingCycleChange(value);
      }
    };

    return {
      schedule(value: number) {
        lastValue = value;
        if (timeout) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
          timeout = null;
          const pendingValue = lastValue;
          lastValue = null;
          if (pendingValue !== null) {
            void handleLightingCycleChange(pendingValue);
          }
        }, SETPOINT_DEBOUNCE_MS);
      },
      flush,
      cancel() {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        lastValue = null;
      },
    };
  }, [handleLightingCycleChange]);

  const {
    schedule: scheduleLighting,
    flush: flushLighting,
    cancel: cancelLighting,
  } = photoperiodController;

  useEffect(() => () => cancelLighting(), [cancelLighting]);

  const toggleLights = useCallback(async () => {
    if (!canControlLighting) {
      return;
    }
    const currentPpfd = pendingPpfd ?? ppfdTarget;
    const isOn = currentPpfd > 0;
    const fallbackPpfd = lastNonZeroPpfd.current > 0 ? lastNonZeroPpfd.current : 400;
    const nextValue = isOn ? 0 : fallbackPpfd;

    if (nextValue > 0) {
      lastNonZeroPpfd.current = nextValue;
    }

    setPendingPpfd(nextValue);
    cancel();
    cancelLighting();
    await handleSetpointChange('ppfd', nextValue);
  }, [canControlLighting, cancel, cancelLighting, handleSetpointChange, pendingPpfd, ppfdTarget]);

  const effectivePpfdTarget = pendingPpfd ?? ppfdTarget;
  const isLightsOn = effectivePpfdTarget > 0;
  const photoperiodDarkHours = Math.round(Math.max(24 - photoperiodValue, MINIMUM_DARK_HOURS));
  const photoperiodLightHoursLabel = formatNumber(photoperiodValue, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const photoperiodDarkHoursLabel = formatNumber(photoperiodDarkHours, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const photoperiodSummaryLabel = `${photoperiodLightHoursLabel} h light / ${photoperiodDarkHoursLabel} h dark`;

  const Container: 'section' | 'div' = variant === 'standalone' ? 'section' : 'div';
  const containerClasses = cx(
    variant === 'standalone'
      ? 'rounded-3xl border border-border/50 bg-surface-elevated/70'
      : 'rounded-2xl border border-border/40 bg-surface-muted/30',
    className,
  );
  const toggleClasses = cx(
    'flex w-full flex-col gap-4 text-left transition hover:bg-surface-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
    variant === 'standalone' ? 'rounded-3xl px-6 py-4' : 'rounded-2xl px-5 py-4',
  );
  const bodyClasses = cx(
    'grid gap-6 border-t',
    variant === 'standalone' ? 'border-border/50 px-6 pb-6' : 'border-border/40 px-5 pb-5',
  );

  return (
    <Container className={containerClasses} data-testid="environment-panel-root">
      <button
        type="button"
        className={toggleClasses}
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
        {badgesContent}
      </button>
      {expanded ? (
        <div className={bodyClasses}>
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
              <label htmlFor={`photoperiod-${zone.id}`}>
                <SliderLabel icon="schedule">Lighting Cycle</SliderLabel>
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  id={`photoperiod-${zone.id}`}
                  type="range"
                  min={photoperiodRange.min}
                  max={photoperiodRange.max}
                  step={photoperiodRange.step}
                  value={photoperiodValue}
                  disabled={!canControlLighting || pendingMetric === 'lightingCycle'}
                  onChange={(event) => {
                    const nextValue = clampPhotoperiodHours(Number(event.target.value));
                    setPhotoperiodValue(nextValue);
                    scheduleLighting(nextValue);
                  }}
                  onBlur={() => flushLighting()}
                  onMouseUp={() => flushLighting()}
                  onTouchEnd={() => flushLighting()}
                  className="flex-1 accent-primary"
                  data-testid="lighting-cycle-slider"
                />
                <div className="flex flex-col items-end gap-1 text-right">
                  <span className="flex items-center gap-1 text-sm text-text-muted">
                    <span className="font-semibold text-text">{photoperiodLightHoursLabel} h</span>{' '}
                    <span className="text-xs uppercase tracking-wide text-text-muted">light</span>{' '}
                    <span className="text-text-muted">/</span>{' '}
                    <span className="font-semibold text-text">{photoperiodDarkHoursLabel} h</span>{' '}
                    <span className="text-xs uppercase tracking-wide text-text-muted">dark</span>
                    <span className="sr-only">{photoperiodSummaryLabel}</span>
                  </span>
                </div>
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
    </Container>
  );
};
