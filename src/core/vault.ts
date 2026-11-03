import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
export const nativeSecureStorage = Platform.OS !== "web";
export async function vaultKey(origin: string, kind: string) {
  return (
    "hag." +
    kind +
    "." +
    (await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      origin,
    ))
  );
}
export async function readSecret(key: string) {
  if (!nativeSecureStorage) return null;
  return SecureStore.getItemAsync(key);
}
export async function writeSecret(key: string, value: string | null) {
  if (!nativeSecureStorage) throw new Error("Native storage required");
  if (value === null) await SecureStore.deleteItemAsync(key);
  else
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
}
export async function deviceName(origin: string) {
  const key = await vaultKey(origin, "device");
  let value = await readSecret(key);
  if (!value) {
    value = "HAG Mobile " + Crypto.randomUUID();
    await writeSecret(key, value);
  }
  return value;
}
