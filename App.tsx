import {
  IdentityEditor,
  DeleteAccountRequest,
  LegalPage,
} from "./src/screens/AccountCompletion";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BackHandler,
  Platform,
  Pressable,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { OrderedSessionStore } from "./src/core/sessionStore";
import { ApiClient, validatedOrigin, invalidSession } from "./src/core/api";
import {
  readSecret,
  writeSecret,
  vaultKey,
  nativeSecureStorage,
} from "./src/core/vault";
import type { User } from "./src/core/types";
import {
  Context,
  Icon,
  Loading,
  ErrorBox,
  palettes,
  Row,
  Txt,
  type Route,
} from "./src/ui";
import {
  FreightList,
  FreightCreate,
  FreightDetail,
} from "./src/screens/Freight";
import { Market, Detail } from "./src/screens/Market";
import {
  Auth,
  Account,
  LanguageSettings,
  AppearanceSettings,
  SecuritySettings,
  ForgotPassword,
  Support,
} from "./src/screens/Account";
import { Workspace } from "./src/screens/Workspace";
import { Publish, Manage } from "./src/screens/Publish";
import { Offers, OfferDetail, Room, Notices, Rfq } from "./src/screens/Trades";
import { useCompanyNotices } from "./src/hooks/useCompanyNotices";
import { Welcome } from "./src/screens/Welcome";
import { useRemoteAppConfig } from "./src/hooks/useRemoteAppConfig";
const rawOrigin =
  process.env.EXPO_PUBLIC_API_ORIGIN || "https://hagbrokers.net";
export default function App() {
  return (
    <SafeAreaProvider>
      <Application />
    </SafeAreaProvider>
  );
}
function Application() {
  const system = useColorScheme();
  const [ar, setAr] = useState(true),
    [theme, setTheme] = useState<"system" | "light" | "dark">("system"),
    [user, setUser] = useState<User | null>(null),
    [boot, setBoot] = useState(true),
    [restoreError, setRestoreError] = useState<unknown>(null),
    [restoreVersion, setRestoreVersion] = useState(0),
    [stack, setStack] = useState<Route[]>([{ name: "market" }]);
  const [intro, setIntro] = useState(false);
  const [manualWelcome, setManualWelcome] = useState(false);
  const lost = useRef(() => {}),
    sessionVersion = useRef(0);
  const config = useMemo(() => {
    try {
      return {
        origin: validatedOrigin(
          rawOrigin,
          __DEV__,
          process.env.EXPO_PUBLIC_ALLOW_LOCAL_HTTP === "1",
        ),
        error: false,
      };
    } catch {
      return { origin: "https://hagbrokers.net", error: true };
    }
  }, []);
  const api = useMemo(
    () => new ApiClient(config.origin, fetch, () => lost.current()),
    [config.origin],
  );
  const {
    config: appConfig,
    status: configStatus,
    refresh: reloadAppConfig,
  } = useRemoteAppConfig(api);
  function dismissWelcome() {
    setIntro(false);
    setManualWelcome(false);
    if (nativeSecureStorage)
      void vaultKey(api.origin, "welcome-v1")
        .then((k) => writeSecret(k, "seen"))
        .catch(() => {});
  }
  const persistence = useMemo(
    () =>
      new OrderedSessionStore(async (token) => {
        if (nativeSecureStorage)
          await writeSecret(await vaultKey(api.origin, "token"), token);
      }),
    [api],
  );
  const reset = useCallback(() => {
    sessionVersion.current++;
    api.setToken(null);
    setUser(null);
    setRestoreError(null);
    setStack([{ name: "market" }]);
    void persistence.save(null).catch(() => {});
  }, [api, persistence]);
  lost.current = reset;
  useEffect(() => {
    let active = true;
    const generation = sessionVersion.current;
    async function init() {
      setBoot(true);
      setRestoreError(null);
      if (config.error) {
        setBoot(false);
        return;
      }
      try {
        const pref = await readSecret(
          await vaultKey(api.origin, "preferences"),
        );
        if (pref && active) {
          try {
            const parsed = JSON.parse(pref);
            setAr(parsed.lang !== "en");
            if (["system", "light", "dark"].includes(parsed.theme))
              setTheme(parsed.theme);
          } catch {}
        }
        const seen = await readSecret(await vaultKey(api.origin, "welcome-v1"));
        if (active) setIntro(seen !== "seen");
        const token = await readSecret(await vaultKey(api.origin, "token"));
        if (token && active && generation === sessionVersion.current) {
          api.setToken(token);
          try {
            const me = await api.request<{ data: User }>("/me");
            if (active && generation === sessionVersion.current)
              setUser(me.data);
          } catch (error) {
            if (active) {
              if (invalidSession(error)) reset();
              else setRestoreError(error);
            }
          }
        }
      } catch (error) {
        if (active) setRestoreError(error);
      } finally {
        if (active) setBoot(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [api, config.error, reset, restoreVersion]);
  useEffect(() => {
    api.setLanguage(ar);
    if (!boot && nativeSecureStorage)
      void vaultKey(api.origin, "preferences")
        .then((k) =>
          writeSecret(k, JSON.stringify({ lang: ar ? "ar" : "en", theme })),
        )
        .catch(() => {});
  }, [ar, theme, api, boot]);
  const notices = useCompanyNotices(api, user, ar, 1, 1);
  const go = useCallback(
    (r: Route) => {
      const gated = ![
        "market",
        "detail",
        "auth",
        "register",
        "account",
        "language",
        "appearance",
        "forgot",
        "support",
      ].includes(r.name);
      setStack((old) => [...old, !user && gated ? { name: "auth" } : r]);
    },
    [user],
  );
  const back = useCallback(
    () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
    [],
  );
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stack.length > 1) {
        back();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [back, stack.length]);
  async function signIn(token: string, identity: User) {
    const version = ++sessionVersion.current;
    const saved = await persistence.save(token);
    if (!saved || version !== sessionVersion.current) return;
    api.setToken(token);
    setUser(identity);
    setRestoreError(null);
    setStack([{ name: "account" }]);
  }
  async function logout() {
    try {
      await api.request("/auth/logout", { method: "POST" });
    } catch {}
    sessionVersion.current++;
    api.setToken(null);
    setUser(null);
    setRestoreError(null);
    setStack([{ name: "market" }]);
    await persistence.save(null);
  }
  async function refreshUser() {
    const version = sessionVersion.current;
    const me = await api.request<{ data: User }>("/me");
    if (version === sessionVersion.current) setUser(me.data);
  }
  const dark = theme === "dark" || (theme === "system" && system === "dark"),
    c = palettes[dark ? "dark" : "light"];
  const t = (a: string, e: string) => (ar ? a : e);
  const route = stack[stack.length - 1];
  const context = {
    unread: notices.data?.meta.unread ?? null,
    refreshNotices: notices.reload,
    appConfig,
    reloadAppConfig,
    configStatus,
    theme,
    setLanguage: setAr,
    setAppearance: setTheme,
    showWelcome: () => {
      setManualWelcome(true);
      setIntro(true);
    },
    ar,
    dark,
    c,
    t,
    api,
    user,
    go,
    back,
    signIn,
    logout,
    refreshUser,
  };
  const tabs = [
    {
      route: "market" as const,
      label: t("السوق", "Discover"),
      icon: "compass-outline" as const,
    },
    {
      route: "workspace" as const,
      label: t("شركتي", "Company"),
      icon: "business-outline" as const,
    },
    {
      route: "offers" as const,
      label: t("العروض", "Offers"),
      icon: "chatbubbles-outline" as const,
    },
    {
      route: "account" as const,
      label: t("حسابي", "Account"),
      icon: "person-circle-outline" as const,
    },
  ];
  function content() {
    if (boot) return <Loading />;
    switch (route.name) {
      case "freight":
        return <FreightList />;
      case "freight-create":
        return <FreightCreate />;
      case "freight-detail":
        return <FreightDetail id={route.id!} />;
      case "market":
        return <Market />;
      case "detail":
        return <Detail slug={route.slug!} />;
      case "auth":
        return <Auth />;
      case "register":
        return <Auth register />;
      case "account":
        return <Account />;
      case "language":
        return <LanguageSettings />;
      case "appearance":
        return <AppearanceSettings />;
      case "security":
        return user ? <SecuritySettings /> : <Auth />;
      case "privacy":
        return <LegalPage slug="privacy" />;
      case "terms":
        return <LegalPage slug="terms" />;
      case "deletion-request":
        return user ? <DeleteAccountRequest /> : <Auth />;
      case "identity":
        return user ? <IdentityEditor /> : <Auth />;
      case "forgot":
        return <ForgotPassword />;
      case "support":
        return <Support />;
      case "workspace":
        return <Workspace />;
      case "create":
        return <Publish />;
      case "manage":
        return <Manage id={route.id!} />;
      case "offers":
        return <Offers />;
      case "offer":
        return <OfferDetail id={route.id!} />;
      case "room":
        return <Room id={route.id!} />;
      case "notices":
        return <Notices />;
      case "rfq":
        return <Rfq id={route.id!} />;
    }
  }
  if (config.error)
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", padding: 30 }}>
        <Text>
          Invalid EXPO_PUBLIC_API_ORIGIN. Use an HTTPS origin without a path or
          credentials.
        </Text>
      </SafeAreaView>
    );
  return (
    <Context.Provider value={context}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <StatusBar style={dark ? "light" : "dark"} />
        {!(boot || (intro && (appConfig.welcome_enabled || manualWelcome))) && (
          <>
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 13,
                backgroundColor: c.panel,
                borderBottomWidth: 1,
                borderColor: c.line,
              }}
            >
              <View
                style={{
                  minHeight: 46,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <View style={{ paddingHorizontal: 56, alignItems: "center" }}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={{
                      fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
                      fontSize: 25,
                      fontWeight: "700",
                      letterSpacing: 1,
                      color: c.text,
                    }}
                  >
                    {appConfig.app_name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 8,
                      letterSpacing: 3,
                      color: c.gold,
                      marginTop: 3,
                    }}
                  >
                    TRADE · CONNECT · GROW
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("التنبيهات", "Notifications")}
                  onPress={() => go({ name: "notices" })}
                  style={{
                    position: "absolute",
                    [ar ? "left" : "right"]: 0,
                    width: 46,
                    height: 46,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 16,
                    backgroundColor: c.bg,
                  }}
                >
                  <Icon name="notifications-outline" />
                  {(notices.data?.meta.unread ?? 0) > 0 && (
                    <View
                      accessibilityLabel={t(
                        "تنبيهات غير مقروءة",
                        "Unread notifications",
                      )}
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        minWidth: 19,
                        height: 19,
                        paddingHorizontal: 4,
                        borderRadius: 10,
                        backgroundColor: "#BA493A",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: "white",
                          fontSize: 10,
                          fontWeight: "700",
                        }}
                      >
                        {Math.min(notices.data!.meta.unread!, 99)}
                        {notices.data!.meta.unread! > 99 ? "+" : ""}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
              {stack.length > 1 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("عودة", "Back")}
                  onPress={back}
                  style={{ paddingTop: 12, minHeight: 40 }}
                >
                  <Txt muted size={12}>
                    {ar ? "→ عودة" : "← Back"}
                  </Txt>
                </Pressable>
              )}
            </View>
            {restoreError != null && !user && (
              <View style={{ paddingHorizontal: 20 }}>
                <ErrorBox
                  error={restoreError}
                  retry={() => setRestoreVersion((x) => x + 1)}
                />
              </View>
            )}
          </>
        )}
        {boot || (intro && (appConfig.welcome_enabled || manualWelcome)) ? (
          <Welcome loading={boot} onContinue={dismissWelcome} />
        ) : (
          <>
            <View
              key={
                route.name +
                "-" +
                route.id +
                "-" +
                route.slug +
                "-" +
                (user?.id ?? "guest")
              }
              style={{ flex: 1 }}
            >
              {content()}
            </View>
            <View
              style={{
                flexDirection: ar ? "row-reverse" : "row",
                borderTopWidth: 1,
                borderColor: c.line,
                marginHorizontal: 12,
                borderRadius: 24,
                marginBottom: 8,
                paddingVertical: 10,
                backgroundColor: c.panel,
              }}
            >
              {tabs.map((tab) => {
                const selected =
                  route.name === tab.route ||
                  (tab.route === "account" &&
                    [
                      "language",
                      "appearance",
                      "security",
                      "identity",
                      "forgot",
                      "support",
                      "auth",
                      "register",
                    ].includes(route.name)) ||
                  (tab.route === "offers" &&
                    ["offer", "room", "rfq"].includes(route.name)) ||
                  (tab.route === "workspace" &&
                    ["create", "manage"].includes(route.name));
                return (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    key={tab.route}
                    onPress={() =>
                      setStack([
                        {
                          name:
                            !user && ["workspace", "offers"].includes(tab.route)
                              ? "auth"
                              : tab.route,
                        },
                      ])
                    }
                    style={{
                      flex: 1,
                      minHeight: 48,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                    }}
                  >
                    <Icon name={tab.icon} color={selected ? c.gold : c.muted} />
                    <Text
                      style={{
                        fontSize: 11,
                        color: selected ? c.gold : c.muted,
                      }}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </SafeAreaView>
    </Context.Provider>
  );
}
