import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
export const pushSupported =
  Platform.OS !== "web" &&
  Device.isDevice &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
export async function notifications() {
  if (!pushSupported) throw new Error("push-build-required");
  return import("expo-notifications");
}
export async function devicePushToken(
  projectId: string,
  askPermission: boolean,
): Promise<string | null> {
  const buildProject =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;
  if (buildProject !== projectId) throw new Error("push-project-mismatch");
  const n = await notifications();
  if (Platform.OS === "android")
    await n.setNotificationChannelAsync("business-updates", {
      name: "HAG business updates",
      importance: n.AndroidImportance.DEFAULT,
    });
  let permission = await n.getPermissionsAsync();
  if (permission.status !== "granted" && askPermission)
    permission = await n.requestPermissionsAsync();
  if (permission.status !== "granted") return null;
  return (await n.getExpoPushTokenAsync({ projectId })).data;
}
export async function clearDisplayedPush() {
  try {
    const n = await notifications();
    await n.dismissAllNotificationsAsync();
    await n.clearLastNotificationResponseAsync();
  } catch {}
}

const changeListeners = new Set<() => void>();
export function subscribePushChanges(listener: () => void) {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}
export function notifyPushChanges() {
  for (const listener of changeListeners) listener();
}
