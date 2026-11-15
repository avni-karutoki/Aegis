import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { api, type PruneStats } from '../lib/api';

interface BackendContextValue {
  /** True when the backend answered the last health check. */
  online: boolean;
  stats: PruneStats | null;
  /** Last health payload (shows which mode Gemini is in). */
  layers: Record<string, string> | null;
  /** Manually re-check the backend + refresh gateway stats. */
  refresh: () => Promise<void>;
}

const BackendContext = createContext<BackendContextValue | null>(null);

export const BackendProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [online, setOnline] = useState(false);
  const [stats, setStats] = useState<PruneStats | null>(null);
  const [layers, setLayers] = useState<Record<string, string> | null>(null);
  const onlineRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const health = await api.health();
      setOnline(true);
      onlineRef.current = true;
      setLayers(health.layers as unknown as Record<string, string>);
      setStats(await api.pruneStats());
    } catch {
      setOnline(false);
      onlineRef.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 5_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  return (
    <BackendContext.Provider value={{ online, stats, layers, refresh }}>
      {children}
    </BackendContext.Provider>
  );
};

export function useBackend(): BackendContextValue {
  const ctx = useContext(BackendContext);
  if (!ctx) {
    throw new Error('useBackend must be used inside BackendProvider');
  }
  return ctx;
}
