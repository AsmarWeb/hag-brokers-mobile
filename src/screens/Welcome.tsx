import React, { useEffect, useState } from "react";
import {
  ImageBackground,
  View,
  Text,
  Pressable,
  ScrollView,
} from "react-native";
import { useApp, Button, Icon } from "../ui";
export function BrandImage({
  uri,
  children,
  height,
}: {
  uri?: string | null;
  children?: React.ReactNode;
  height?: number;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return (
    <ImageBackground
      source={
        uri && !failed ? { uri } : require("../../assets/maritime-welcome.jpg")
      }
      onError={() => setFailed(true)}
      resizeMode="cover"
      style={{
        flex: height ? undefined : 1,
        height,
        backgroundColor: "#0B2433",
      }}
      imageStyle={{ borderRadius: height ? 24 : 0 }}
    >
      {children}
    </ImageBackground>
  );
}
export function Welcome({
  onContinue,
  loading = false,
}: {
  onContinue: () => void;
  loading?: boolean;
}) {
  const { appConfig: s, ar, t } = useApp();
  return (
    <BrandImage uri={s.welcome_image}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(3,20,31,0.12)",
          justifyContent: "space-between",
          padding: 26,
        }}
      >
        <View style={{ alignItems: "center", paddingTop: 35 }}>
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 24,
              fontWeight: "700",
              letterSpacing: 2,
            }}
          >
            {s.app_name}
          </Text>
          <Text
            style={{
              color: "#E8D6AE",
              fontSize: 11,
              letterSpacing: 3,
              marginTop: 8,
            }}
          >
            TRADE · CONNECT · GROW
          </Text>
        </View>
        <ScrollView
          style={{ flexGrow: 0, maxHeight: "52%" }}
          contentContainerStyle={{
            padding: 22,
            borderRadius: 24,
            backgroundColor: "rgba(5,23,35,0.88)",
          }}
        >
          <Icon name="boat-outline" size={30} color="#D9B879" />
          <Text
            style={{
              fontSize: 32,
              lineHeight: 43,
              fontWeight: "700",
              color: "#FFFFFF",
              textAlign: ar ? "right" : "left",
              marginVertical: 12,
            }}
          >
            {ar ? s.welcome_title_ar : s.welcome_title_en}
          </Text>
          <Text
            style={{
              fontSize: 15,
              lineHeight: 25,
              color: "#DFE9EE",
              textAlign: ar ? "right" : "left",
              marginBottom: 17,
            }}
          >
            {ar ? s.welcome_body_ar : s.welcome_body_en}
          </Text>
          <Button
            title={
              loading
                ? t("جارٍ التجهيز…", "Getting ready…")
                : t("اكتشف الفرص", "Discover opportunities")
            }
            disabled={loading}
            onPress={onContinue}
          />
          <Text
            style={{
              color: "#CED9E0",
              textAlign: "center",
              fontSize: 11,
              marginTop: 10,
            }}
          >
            {t(
              "تصفّح دون حساب • اللغة والمظهر في حسابي",
              "Browse without an account • Language and appearance in Account",
            )}
          </Text>
        </ScrollView>
      </View>
    </BrandImage>
  );
}
export function Preferences() {
  const { ar, t, theme, setLanguage, setAppearance, c, showWelcome } = useApp();
  return (
    <View
      style={{
        backgroundColor: c.panel,
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: c.line,
      }}
    >
      <Text
        style={{
          color: c.text,
          fontSize: 19,
          fontWeight: "700",
          textAlign: ar ? "right" : "left",
          marginBottom: 16,
        }}
      >
        {t("إعدادات التطبيق", "App preferences")}
      </Text>
      <Text
        style={{
          color: c.muted,
          textAlign: ar ? "right" : "left",
          marginBottom: 8,
        }}
      >
        {t("اللغة", "Language")}
      </Text>
      <View
        style={{
          flexDirection: ar ? "row-reverse" : "row",
          gap: 8,
          marginBottom: 18,
        }}
      >
        {[
          { value: true, label: "العربية" },
          { value: false, label: "English" },
        ].map((o) => (
          <Pressable
            key={o.label}
            accessibilityRole="radio"
            accessibilityState={{ selected: ar === o.value }}
            onPress={() => setLanguage(o.value)}
            style={{
              flex: 1,
              padding: 13,
              borderRadius: 14,
              alignItems: "center",
              backgroundColor: ar === o.value ? c.soft : c.bg,
              borderWidth: 1,
              borderColor: ar === o.value ? c.gold : c.line,
            }}
          >
            <Text style={{ color: c.text }}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text
        style={{
          color: c.muted,
          textAlign: ar ? "right" : "left",
          marginBottom: 8,
        }}
      >
        {t("المظهر", "Appearance")}
      </Text>
      <View style={{ flexDirection: ar ? "row-reverse" : "row", gap: 8 }}>
        {(["system", "light", "dark"] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ selected: theme === value }}
            onPress={() => setAppearance(value)}
            style={{
              flex: 1,
              padding: 12,
              minHeight: 48,
              borderRadius: 14,
              alignItems: "center",
              backgroundColor: theme === value ? c.soft : c.bg,
              borderWidth: 1,
              borderColor: theme === value ? c.gold : c.line,
            }}
          >
            <Text style={{ color: c.text, fontSize: 12 }}>
              {value === "system"
                ? t("تلقائي", "System")
                : value === "light"
                  ? t("نهاري", "Light")
                  : t("ليلي", "Dark")}
            </Text>
          </Pressable>
        ))}
      </View>
      <Button
        secondary
        title={t("عرض شاشة الترحيب", "View welcome screen")}
        onPress={showWelcome}
      />
    </View>
  );
}
