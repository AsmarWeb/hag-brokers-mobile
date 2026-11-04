import { useEffect, useRef, useState, useCallback } from "react";
import { AppState } from "react-native";
import { ApiClient } from "../core/api";
import { defaultConfig } from "../core/appConfig";
import { ConfigSync, type ConfigStatus } from "../core/configSync";
export function useRemoteAppConfig(api: ApiClient) {
  const [config, setConfig] = useState(defaultConfig);
  const [status, setStatus] = useState<ConfigStatus>({
    busy: true,
    lastUpdated: null,
    error: null,
  });
  const engine = useRef<ConfigSync | null>(null);
  const refresh = useCallback(() => {
    void engine.current?.refresh();
  }, []);
  useEffect(() => {
    const sync = new ConfigSync(api, setConfig, setStatus);
    engine.current = sync;
    setConfig(defaultConfig);
    let active =
      AppState.currentState !== "background" &&
      AppState.currentState !== "inactive";
    const sub = AppState.addEventListener("change", (state) => {
      active = state === "active";
      if (active) void sync.refresh();
    });
    if (active) void sync.refresh();
    const timer = setInterval(() => {
      if (active) void sync.refresh();
    }, 20000);
    return () => {
      sync.dispose();
      sub.remove();
      clearInterval(timer);
      if (engine.current === sync) engine.current = null;
    };
  }, [api]);
  return { config, status, refresh };
}
