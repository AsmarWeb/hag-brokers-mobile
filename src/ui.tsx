import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ApiClient, ApiError, errorText } from "./core/api";
import type { User } from "./core/types";
export const palettes = {
  dark: {
    bg: "#09131F",
    panel: "#122033",
    text: "#EFF1F5",
    muted: "#ACB9C8",
    line: "#29394D",
    gold: "#D9B879",
    soft: "#302C24",
    danger: "#F6A7A7",
  },
  light: {
    bg: "#F5F7F8",
    panel: "#FFFFFF",
    text: "#14253A",
    muted: "#5C6B7B",
    line: "#DFE5EB",
    gold: "#8D642C",
    soft: "#F1E7D4",
    danger: "#A72C38",
  },
};
export type Route = {
  name:
    | "market"
    | "detail"
    | "auth"
    | "register"
    | "workspace"
    | "offers"
    | "offer"
    | "room"
    | "notices"
    | "account"
    | "create"
    | "rfq"
    | "manage"
    | "language"
    | "appearance"
    | "security"
    | "identity"
    | "forgot"
    | "support";
  id?: number;
  slug?: string;
};
type Ctx = {
  appConfig: import("./core/appConfig").AppConfig;
  reloadAppConfig: () => void;
  configStatus: import("./core/configSync").ConfigStatus;
  unread: number | null;
  refreshNotices: () => void;
  theme: "system" | "light" | "dark";
  setLanguage: (ar: boolean) => void;
  setAppearance: (theme: "system" | "light" | "dark") => void;
  showWelcome: () => void;
  ar: boolean;
  dark: boolean;
  c: typeof palettes.dark;
  t: (ar: string, en: string) => string;
  api: ApiClient;
  user: User | null;
  go: (r: Route) => void;
  back: () => void;
  signIn: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};
export const Context = createContext<Ctx>(null!);
export const useApp = () => useContext(Context);
export function Txt({
  children,
  muted = false,
  size = 14,
  bold = false,
  ...rest
}: {
  children: React.ReactNode;
  muted?: boolean;
  size?: number;
  bold?: boolean;
  style?: object;
  numberOfLines?: number;
}) {
  const { c, ar } = useApp();
  return (
    <Text
      {...rest}
      style={[
        {
          flexShrink: 1,
          color: muted ? c.muted : c.text,
          fontSize: size,
          lineHeight: size * 1.6,
          textAlign: ar ? "right" : "left",
          fontWeight: bold ? "600" : "400",
        },
        rest.style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Row({
  children,
  between = false,
}: {
  children: React.ReactNode;
  between?: boolean;
}) {
  const { ar } = useApp();
  return (
    <View
      style={{
        flexDirection: ar ? "row-reverse" : "row",
        alignItems: "center",
        gap: 10,
        justifyContent: between ? "space-between" : undefined,
      }}
    >
      {children}
    </View>
  );
}
export function Card({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
}) {
  const { c } = useApp();
  const style = {
    backgroundColor: c.panel,
    borderColor: c.line,
    borderWidth: 1,
    borderRadius: 17,
    padding: 16,
    marginBottom: 12,
  };
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={style}>
      {children}
    </Pressable>
  ) : (
    <View style={style}>{children}</View>
  );
}
export function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const { c } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        borderRadius: 12,
        padding: 13,
        alignItems: "center",
        justifyContent: "center",
        marginVertical: 5,
        backgroundColor: secondary ? c.panel : "#CBA76A",
        borderWidth: secondary ? 1 : 0,
        borderColor: c.line,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          color: secondary ? c.text : "#122033",
          fontSize: 14,
          fontWeight: "600",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({
  title,
  value,
  set,
  secret = false,
  multiline = false,
  email = false,
  decimal = false,
  errorMessage,
}: {
  title: string;
  value: string;
  set: (s: string) => void;
  secret?: boolean;
  multiline?: boolean;
  email?: boolean;
  decimal?: boolean;
  errorMessage?: string;
}) {
  const { c, ar } = useApp();
  return (
    <View style={{ marginVertical: 8 }}>
      <Txt muted size={12}>
        {title}
      </Txt>
      <TextInput
        accessibilityLabel={title}
        value={value}
        onChangeText={set}
        secureTextEntry={secret}
        multiline={multiline}
        autoCapitalize={email ? "none" : "sentences"}
        autoCorrect={!email && !secret}
        keyboardType={
          email ? "email-address" : decimal ? "decimal-pad" : "default"
        }
        style={{
          borderWidth: 1,
          borderColor: errorMessage ? c.danger : c.line,
          borderRadius: 11,
          backgroundColor: c.panel,
          color: c.text,
          padding: 13,
          fontSize: 16,
          minHeight: multiline ? 110 : 48,
          textAlign: email || decimal ? "left" : ar ? "right" : "left",
          textAlignVertical: "top",
        }}
      />
      {errorMessage && (
        <Txt size={12} style={{ color: c.danger, marginTop: 5 }}>
          {errorMessage}
        </Txt>
      )}
    </View>
  );
}
export function Icon({
  name,
  size = 21,
  color,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  size?: number;
  color?: string;
}) {
  const { c } = useApp();
  return <Ionicons name={name} size={size} color={color ?? c.gold} />;
}
export function Badge({ children }: { children: React.ReactNode }) {
  const { c } = useApp();
  return (
    <View
      style={{
        backgroundColor: c.soft,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 7,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: c.gold, fontSize: 11 }}>{children}</Text>
    </View>
  );
}
export function Screen({
  children,
  refreshing = false,
  onRefresh,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const { c } = useApp();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.gold}
            />
          ) : undefined
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: 35,
          backgroundColor: c.bg,
        }}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export function ErrorBox({
  error,
  retry,
  summary,
}: {
  error: unknown;
  retry?: () => void;
  summary?: string;
}) {
  const { ar, t, c } = useApp();
  return (
    <Card>
      <Txt style={{ color: c.danger }}>{summary ?? errorText(error, ar)}</Txt>
      {error instanceof ApiError &&
        error.status === 422 &&
        Object.entries(error.fields)
          .slice(0, 8)
          .map(([field, messages]) =>
            Array.isArray(messages) ? (
              <View key={field} style={{ marginTop: 8 }}>
                {messages.slice(0, 2).map((message, i) => (
                  <Txt key={i} muted size={12}>
                    {String(message).slice(0, 400)}
                  </Txt>
                ))}
              </View>
            ) : null,
          )}
      {retry && (
        <Button
          secondary
          title={t("إعادة المحاولة", "Retry")}
          onPress={retry}
        />
      )}
    </Card>
  );
}
export function Loading() {
  const { c } = useApp();
  return <ActivityIndicator color={c.gold} style={{ padding: 30 }} />;
}
export function Title({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Txt size={25} bold>
        {title}
      </Txt>
      {sub && <Txt muted>{sub}</Txt>}
    </View>
  );
}
export function useLoad<T>(key: string, load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(true),
    [version, setVersion] = useState(0);
  const ref = useRef(load);
  ref.current = load;
  useEffect(() => {
    let active = true;
    setBusy(true);
    setData(null);
    setError(null);
    ref
      .current()
      .then((x) => {
        if (active) setData(x);
      })
      .catch((e) => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [key, version]);
  return { data, error, busy, reload: () => setVersion((x) => x + 1) };
}
