import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { ApiClient, ApiError } from "../core/api";
import { isCompanyLeader } from "../core/account";
import type { User, Notice, Page } from "../core/types";
export function useCompanyNotices(
  api: ApiClient,
  user: User | null,
  ar: boolean,
  page = 1,
  perPage = 20,
) {
  const enabled = isCompanyLeader(user);
  const key = [
    user?.id,
    user?.company?.workspace_id,
    enabled,
    ar,
    page,
    perPage,
  ].join("|");
  const [state, setState] = useState<{
    key: string;
    data: Page<Notice> | null;
    error: unknown;
    busy: boolean;
  }>({ key: "", data: null, error: null, busy: false });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    if (!enabled) return;
    let alive = true,
      working = false,
      active =
        AppState.currentState !== "background" &&
        AppState.currentState !== "inactive",
      blocked = false,
      retryAt = 0;
    const controller = new AbortController();
    async function poll() {
      if (!alive || !active || working || blocked || Date.now() < retryAt)
        return;
      working = true;
      setState((s) => ({
        key,
        data: s.key === key ? s.data : null,
        error: null,
        busy: true,
      }));
      try {
        const data = await api.request<Page<Notice>>(
          `/company/notifications?page=${page}&per_page=${perPage}`,
          { signal: controller.signal },
        );
        if (
          !Array.isArray(data.data) ||
          !Number.isSafeInteger(data.meta?.unread) ||
          (data.meta.unread ?? -1) < 0
        )
          throw new ApiError(502);
        if (alive) setState({ key, data, error: null, busy: false });
      } catch (error) {
        if (error instanceof ApiError && [401, 403].includes(error.status))
          blocked = true;
        retryAt =
          Date.now() +
          Math.max(20, error instanceof ApiError ? error.retryAfter : 0) * 1000;
        if (alive) setState({ key, data: null, error, busy: false });
      } finally {
        working = false;
      }
    }
    const sub = AppState.addEventListener("change", (status) => {
      active = status === "active";
      if (active) void poll();
    });
    void poll();
    const timer = setInterval(() => void poll(), 20000);
    return () => {
      alive = false;
      controller.abort();
      sub.remove();
      clearInterval(timer);
    };
  }, [api, key, version, enabled, page, perPage]);
  return {
    enabled,
    data: enabled && state.key === key ? state.data : null,
    error: enabled && state.key === key ? state.error : null,
    busy: enabled && (state.key !== key || state.busy),
    reload,
  };
}
