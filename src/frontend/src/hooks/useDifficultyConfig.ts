import { useCallback, useEffect, useRef, useState } from 'react';
import { getSimulationBridge } from '@/facade/systemFacade';
import type { DifficultyConfig } from '@/types/difficulty';

interface UseDifficultyConfigResult {
  config: DifficultyConfig | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

let cachedDifficultyConfig: DifficultyConfig | null = null;
let inflightDifficultyConfig: Promise<DifficultyConfig> | null = null;

const loadDifficultyConfig = async (): Promise<DifficultyConfig> => {
  if (cachedDifficultyConfig) {
    return cachedDifficultyConfig;
  }

  if (!inflightDifficultyConfig) {
    inflightDifficultyConfig = (async () => {
      const bridge = getSimulationBridge();
      const response = await bridge.getDifficultyConfig();
      if (!response.ok || !response.data) {
        const detail =
          response.errors?.[0]?.message ??
          response.warnings?.[0] ??
          'Failed to load difficulty configuration.';
        throw new Error(detail);
      }
      cachedDifficultyConfig = response.data;
      return response.data;
    })().finally(() => {
      inflightDifficultyConfig = null;
    });
  }

  return inflightDifficultyConfig;
};

export const useDifficultyConfig = (): UseDifficultyConfigResult => {
  const [config, setConfig] = useState<DifficultyConfig | null>(cachedDifficultyConfig);
  const [loading, setLoading] = useState<boolean>(!cachedDifficultyConfig);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!mountedRef.current) {
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const next = await loadDifficultyConfig();
      if (!mountedRef.current) {
        return;
      }
      setConfig(next);
    } catch (exception) {
      if (!mountedRef.current) {
        return;
      }
      const message =
        exception instanceof Error ? exception.message : 'Failed to load difficulty configuration.';
      setError(message);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!cachedDifficultyConfig) {
      void refresh();
    }
  }, [refresh]);

  return { config, loading, error, refresh };
};
