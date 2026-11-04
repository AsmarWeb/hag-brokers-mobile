import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { ApiClient } from "../core/api";
import { isCompanyLeader } from "../core/account";
import {
  notifications,
  devicePushToken,
  pushSupported,
  subscribePushChanges,
} from "../core/nativePush";
import { pushEnvelope, pushRoute, type PushSettings } from "../core/push";
import type { User } from "../core/types";
import type { Route } from "../ui";
export function usePushReceiver(
  api: ApiClient,
  user: User | null,
  ar: boolean,
  go: (r: Route) => void,
  refresh: () => void,
) {
  const callbacks = useRef({ go, refresh });
  callbacks.current = { go, refresh };
  const eligible = isCompanyLeader(user);
  useEffect(() => {
    if (!eligible || !pushSupported) return;
    let active = true,
      working = false,
      binding: string | null = null;
    let responseSub: { remove: () => void } | undefined,
      tokenSub: { remove: () => void } | undefined;
    async function sync() {
      if (working || !active || AppState.currentState !== "active") return;
      working = true;
      try {
        const settings = (
          await api.request<{ data: PushSettings }>("/push/settings")
        ).data;
        binding = settings.device?.enabled ? settings.device.binding : null;
        if (
          !settings.available ||
          !settings.device?.enabled ||
          !settings.project_id
        )
          return;
        const token = await devicePushToken(settings.project_id, false);
        if (!active) return;
        if (!token) {
          await api.request("/push/device", { method: "DELETE" });
          binding = null;
          return;
        }
        const saved = await api.request<{ data: { binding: string } }>(
          "/push/device",
          {
            method: "PUT",
            body: {
              expo_token: token,
              project_id: settings.project_id,
              offers: settings.device.offers,
              messages: settings.device.messages,
              locale: ar ? "ar" : "en",
            },
          },
        );
        if (active) binding = saved.data.binding;
      } catch {
        binding = null;
      } finally {
        working = false;
      }
    }
    async function open(data: unknown) {
      const envelope = pushEnvelope(data);
      if (!active || !envelope) return;
      try {
        const result = await api.request<{ data: unknown }>(
          `/push/resolve?binding=${encodeURIComponent(envelope.binding)}&notice_id=${encodeURIComponent(envelope.notice_id)}`,
        );
        const route = pushRoute(result.data);
        if (active && route) {
          callbacks.current.go(route);
          callbacks.current.refresh();
        }
      } catch {} // Stale or other-account notifications never navigate or reveal previous account content.
    }
    async function init() {
      try {
        const n = await notifications();
        if (!active) return;
        n.setNotificationHandler({
          handleNotification: async (notification) => {
            const data = pushEnvelope(notification.request.content.data);
            const show = !!data && binding === data.binding && active;
            return {
              shouldShowBanner: show,
              shouldShowList: show,
              shouldPlaySound: false,
              shouldSetBadge: false,
            };
          },
        });
        responseSub = n.addNotificationResponseReceivedListener((response) => {
          void open(response.notification.request.content.data).finally(() =>
            n.clearLastNotificationResponseAsync(),
          );
        });
        tokenSub = n.addPushTokenListener(() => void sync());
        await sync();
        if (!active) return;
        const last = await n.getLastNotificationResponseAsync();
        if (last) {
          await open(last.notification.request.content.data);
          await n.clearLastNotificationResponseAsync();
        }
      } catch {}
    }
    const unsubscribe = subscribePushChanges(() => void sync());
    void init();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void sync();
    });
    return () => {
      unsubscribe();
      active = false;
      binding = null;
      responseSub?.remove();
      tokenSub?.remove();
      sub.remove();
    };
  }, [api, user?.id, user?.company?.workspace_id, eligible, ar]);
}
