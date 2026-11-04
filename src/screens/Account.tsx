import React, { useState } from "react";
import { Alert, Linking, Pressable, View, Text } from "react-native";
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Field,
  Icon,
  Loading,
  Screen,
  Title,
  Txt,
  Row,
  useApp,
  useLoad,
  type Route,
} from "../ui";
import { nativeSecureStorage, deviceName } from "../core/vault";
import { ApiError } from "../core/api";
import { isCompanyLeader, parseSession } from "../core/account";
import { validateAuth, authFieldMessage } from "../core/authValidation";
import { label } from "../core/labels";

function MenuRow({
  title,
  sub,
  icon,
  onPress,
  danger = false,
}: {
  title: string;
  sub?: string;
  icon: React.ComponentProps<typeof Icon>["name"];
  onPress: () => void;
  danger?: boolean;
}) {
  const { c, ar } = useApp();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 17,
        paddingHorizontal: 15,
        minHeight: 70,
        flexDirection: ar ? "row-reverse" : "row",
        alignItems: "center",
        gap: 13,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <View
        style={{
          width: 43,
          height: 43,
          borderRadius: 15,
          backgroundColor: c.soft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} color={danger ? c.danger : c.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt bold size={14} style={danger ? { color: c.danger } : undefined}>
          {title}
        </Txt>
        {sub ? (
          <Txt muted size={11}>
            {sub}
          </Txt>
        ) : null}
      </View>
      <Icon
        name={ar ? "chevron-back" : "chevron-forward"}
        size={17}
        color={c.muted}
      />
    </Pressable>
  );
}
function MenuGroup({ children }: { children: React.ReactNode }) {
  const { c } = useApp();
  return (
    <View
      style={{
        borderRadius: 24,
        backgroundColor: c.panel,
        borderWidth: 1,
        borderColor: c.line,
        marginBottom: 17,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}
function GroupLabel({ title }: { title: string }) {
  return (
    <Txt size={12} muted style={{ marginBottom: 8, marginHorizontal: 8 }}>
      {title}
    </Txt>
  );
}
export function Account() {
  const {
    user,
    t,
    ar,
    c,
    go,
    theme,
    unread,
    logout,
    refreshUser,
    refreshNotices,
  } = useApp();
  const [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  async function refresh() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await refreshUser();
      refreshNotices();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function exit() {
    setBusy(true);
    try {
      await logout();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  function confirmExit() {
    Alert.alert(
      t("تسجيل الخروج", "Sign out"),
      t(
        "هل تريد إنهاء جلستك على هذا الجهاز؟",
        "End your session on this device?",
      ),
      [
        { text: t("إلغاء", "Cancel"), style: "cancel" },
        {
          text: t("تسجيل الخروج", "Sign out"),
          style: "destructive",
          onPress: () => void exit(),
        },
      ],
    );
  }
  return (
    <Screen
      refreshing={busy}
      onRefresh={user ? () => void refresh() : undefined}
    >
      <Title
        title={t("حسابي", "My account")}
        sub={t(
          "مساحتك لإدارة علاقاتك التجارية",
          "Your space for business connections",
        )}
      />
      <View
        style={{
          borderRadius: 28,
          padding: 23,
          backgroundColor: "#102A3A",
          marginBottom: 22,
        }}
      >
        <Row>
          <View
            style={{
              width: 66,
              height: 66,
              borderRadius: 24,
              backgroundColor: "#D9B879",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {user ? (
              <Text
                style={{ fontSize: 27, fontWeight: "700", color: "#112D3F" }}
              >
                {user.name.trim().slice(0, 1).toUpperCase()}
              </Text>
            ) : (
              <Icon name="person-outline" size={32} color="#112D3F" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Txt bold size={21} style={{ color: "#FFFFFF" }}>
              {user?.name ?? t("مرحبًا بك في HAG", "Welcome to HAG")}
            </Txt>
            <Txt size={12} style={{ color: "#CFDCE3" }}>
              {user?.email ??
                t(
                  "تجارة أوسع. علاقات أقرب.",
                  "Wider trade. Closer connections.",
                )}
            </Txt>
          </View>
        </Row>
        {user ? (
          <View style={{ marginTop: 17, gap: 7 }}>
            <Text
              style={{
                color: "#E8D2A8",
                fontSize: 12,
                textAlign: ar ? "right" : "left",
              }}
            >
              {user.account_type === "company"
                ? t("حساب شركة", "Company account")
                : t("حساب فردي", "Individual account")}
              {user.company ? " · " + label(user.company.role, ar) : ""}
            </Text>
            <Text
              style={{
                color: "#DDE7E9",
                fontSize: 12,
                textAlign: ar ? "right" : "left",
              }}
            >
              {user.email_verified
                ? t("البريد الإلكتروني موثّق", "Email verified")
                : t(
                    "أكمل توثيق البريد من أمان الحساب",
                    "Verify your email in Account security",
                  )}
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 18 }}>
            <Button
              title={t("تسجيل الدخول", "Sign in")}
              onPress={() => go({ name: "auth" })}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => go({ name: "register" })}
              style={{ padding: 12, minHeight: 44, alignItems: "center" }}
            >
              <Text style={{ color: "#F4E1B9", fontSize: 13 }}>
                {t("جديد هنا؟ أنشئ حسابك", "New here? Create an account")}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
      {user?.company && (
        <>
          <GroupLabel title={t("أعمالك", "Your business")} />
          <MenuGroup>
            <MenuRow
              icon="business-outline"
              title={t("مساحة الشركة", "Company workspace")}
              sub={label(user.company.status, ar)}
              onPress={() => go({ name: "workspace" })}
            />
            {isCompanyLeader(user) && (
              <MenuRow
                icon="chatbubbles-outline"
                title={t("العروض والمفاوضات", "Offers & negotiations")}
                sub={t(
                  "العروض الواردة والمرسلة والمحادثات",
                  "Incoming offers, sent offers and conversations",
                )}
                onPress={() => go({ name: "offers" })}
              />
            )}
          </MenuGroup>
        </>
      )}
      {user && (
        <>
          <GroupLabel title={t("حسابك وأمانك", "Your account & security")} />
          <MenuGroup>
            <MenuRow
              icon="person-circle-outline"
              title={t("بيانات الحساب", "Account details")}
              sub={t(
                "الهوية ونوع الحساب وحالة البريد",
                "Identity, account type and email status",
              )}
              onPress={() => go({ name: "identity" })}
            />
            <MenuRow
              icon="shield-checkmark-outline"
              title={t("أمان الحساب", "Account security")}
              sub={t(
                "كلمة المرور والأجهزة وتوثيق البريد",
                "Password, devices and email verification",
              )}
              onPress={() => go({ name: "security" })}
            />
            {isCompanyLeader(user) && (
              <MenuRow
                icon="notifications-outline"
                title={t("التنبيهات", "Notifications")}
                sub={
                  unread === null
                    ? t("تحديثات العروض والرسائل", "Offer and message updates")
                    : String(unread) + " " + t("غير مقروء", "unread")
                }
                onPress={() => go({ name: "notices" })}
              />
            )}
          </MenuGroup>
        </>
      )}
      <GroupLabel title={t("تفضيلات التطبيق", "App preferences")} />
      <MenuGroup>
        <MenuRow
          icon="language-outline"
          title={t("اللغة", "Language")}
          sub={ar ? "العربية" : "English"}
          onPress={() => go({ name: "language" })}
        />
        <MenuRow
          icon="color-palette-outline"
          title={t("المظهر", "Appearance")}
          sub={
            theme === "system"
              ? t("حسب الجهاز", "Follow device")
              : theme === "dark"
                ? t("ليلي", "Dark")
                : t("نهاري", "Light")
          }
          onPress={() => go({ name: "appearance" })}
        />
      </MenuGroup>
      <MenuGroup>
        <MenuRow
          icon="help-circle-outline"
          title={t("المساعدة والتواصل", "Help & support")}
          sub={t(
            "دليل سريع لاستخدام المنصة",
            "A quick guide to using the platform",
          )}
          onPress={() => go({ name: "support" })}
        />
      </MenuGroup>
      {user && (
        <Button
          secondary
          disabled={busy}
          title={
            busy
              ? t("جارٍ الخروج…", "Signing out…")
              : t("تسجيل الخروج", "Sign out")
          }
          onPress={confirmExit}
        />
      )}
      {error != null && <ErrorBox error={error} />}
      <Txt muted size={10} style={{ textAlign: "center", marginTop: 17 }}>
        HAG Brokers · UAE
      </Txt>
    </Screen>
  );
}
function Choice({
  title,
  sub,
  icon,
  selected,
  onPress,
}: {
  title: string;
  sub: string;
  icon: React.ComponentProps<typeof Icon>["name"];
  selected: boolean;
  onPress: () => void;
}) {
  const { c, ar } = useApp();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      onPress={onPress}
      style={{
        padding: 20,
        borderRadius: 22,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? c.gold : c.line,
        backgroundColor: selected ? c.soft : c.panel,
        marginBottom: 13,
        flexDirection: ar ? "row-reverse" : "row",
        alignItems: "center",
        gap: 14,
      }}
    >
      <Icon name={icon} size={27} />
      <View style={{ flex: 1 }}>
        <Txt bold size={16}>
          {title}
        </Txt>
        <Txt muted size={12}>
          {sub}
        </Txt>
      </View>
      <Icon
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={23}
      />
    </Pressable>
  );
}
export function LanguageSettings() {
  const { ar, t, setLanguage } = useApp();
  return (
    <Screen>
      <Title
        title={t("لغة التطبيق", "App language")}
        sub={t(
          "اختر لغتك المفضلة. تُحفظ تلقائيًا على هذا الجهاز.",
          "Choose your language. Saved automatically on this device.",
        )}
      />
      <Choice
        title="العربية"
        sub="واجهة عربية واتجاه من اليمين إلى اليسار"
        icon="language-outline"
        selected={ar}
        onPress={() => setLanguage(true)}
      />
      <Choice
        title="English"
        sub="English interface and left-to-right layout"
        icon="globe-outline"
        selected={!ar}
        onPress={() => setLanguage(false)}
      />
    </Screen>
  );
}
export function AppearanceSettings() {
  const { theme, t, setAppearance, showWelcome } = useApp();
  return (
    <Screen>
      <Title
        title={t("المظهر", "Appearance")}
        sub={t(
          "راحة لعينيك، وهوية واحدة للمنصة.",
          "Comfort for your eyes. One HAG identity.",
        )}
      />
      {(["system", "light", "dark"] as const).map((value) => (
        <Choice
          key={value}
          title={
            value === "system"
              ? t("حسب الجهاز", "Follow device")
              : value === "light"
                ? t("نهاري", "Light")
                : t("ليلي", "Dark")
          }
          sub={
            value === "system"
              ? t(
                  "يتبع إعدادات هاتفك تلقائيًا",
                  "Automatically follows your phone",
                )
              : value === "light"
                ? t(
                    "خلفية فاتحة ومساحات مريحة",
                    "Light surfaces and calm spacing",
                  )
                : t("كحلي عميق ولمسات ذهبية", "Deep navy with gold accents")
          }
          icon={
            value === "system"
              ? "phone-portrait-outline"
              : value === "light"
                ? "sunny-outline"
                : "moon-outline"
          }
          selected={theme === value}
          onPress={() => setAppearance(value)}
        />
      ))}
      <Button
        secondary
        title={t("إعادة عرض الترحيب", "View welcome screen")}
        onPress={showWelcome}
      />
    </Screen>
  );
}
export function Auth({ register = false }: { register?: boolean }) {
  const { api, t, ar, go, signIn, c } = useApp();
  const [company, setCompany] = useState(true),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [business, setBusiness] = useState(""),
    [phone, setPhone] = useState(""),
    [country, setCountry] = useState("AE"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [visible, setVisible] = useState(false);
  async function submit() {
    if (busy || !nativeSecureStorage) return;
    const fields = validateAuth(
      {
        name,
        email,
        password,
        confirmation,
        company,
        business,
        phone,
        country,
      },
      register,
      ar,
    );
    if (Object.keys(fields).length) {
      setError(new ApiError(422, fields));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const device = await deviceName(api.origin);
      const body = register
        ? {
            account_type: company ? "company" : "individual",
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            password_confirmation: confirmation,
            device_name: device,
            ...(company
              ? {
                  company_name: business.trim(),
                  phone: phone.trim(),
                  country_code: country.trim().toUpperCase(),
                }
              : {}),
          }
        : { email: email.trim().toLowerCase(), password, device_name: device };
      const response = await api.request<unknown>(
        "/auth/" + (register ? "register" : "login"),
        { method: "POST", auth: false, body },
      );
      const session = parseSession(response);
      await signIn(session.access_token, session.user);
      setPassword("");
      setConfirmation("");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const fieldError = (key: string) =>
    error instanceof ApiError && error.status === 422 && error.fields[key]?.[0]
      ? authFieldMessage(key, error.fields[key][0], ar)
      : undefined;
  return (
    <Screen>
      <View style={{ alignItems: "center", marginVertical: 17, gap: 12 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 25,
            backgroundColor: c.soft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon
            name={register ? "business-outline" : "boat-outline"}
            size={36}
          />
        </View>
        <Txt bold size={28}>
          {register
            ? t("ابدأ رحلتك التجارية", "Start your business journey")
            : t("مرحبًا بعودتك", "Welcome back")}
        </Txt>
        <Txt muted size={13}>
          {t(
            "الشحن البحري والفرص التجارية، في مكان واحد.",
            "Sea freight and commercial opportunities, together.",
          )}
        </Txt>
      </View>
      {!nativeSecureStorage && (
        <Card>
          <Txt>
            {t(
              "افتح التطبيق في Expo Go على هاتف Android أو iPhone لتسجيل الدخول. معاينة المتصفح للتصفح فقط.",
              "Open the app in Expo Go on Android or iPhone to sign in. Browser preview supports browsing only.",
            )}
          </Txt>
        </Card>
      )}
      <Card>
        {register && (
          <>
            <Row>
              <Button
                secondary={!company}
                title={t("شركة", "Company")}
                onPress={() => setCompany(true)}
              />
              <Button
                secondary={company}
                title={t("فرد", "Individual")}
                onPress={() => setCompany(false)}
              />
            </Row>
            <Field
              title={t("الاسم الكامل", "Full name")}
              errorMessage={fieldError("name")}
              value={name}
              set={setName}
            />
            {company && (
              <>
                <Field
                  title={t("اسم الشركة", "Company name")}
                  errorMessage={fieldError("company_name")}
                  value={business}
                  set={setBusiness}
                />
                <Field
                  title={t("الهاتف الدولي", "International phone")}
                  errorMessage={fieldError("phone")}
                  value={phone}
                  set={setPhone}
                />
                <Field
                  title={t("رمز الدولة، مثال AE", "Country code, e.g. AE")}
                  errorMessage={fieldError("country_code")}
                  value={country}
                  set={setCountry}
                />
              </>
            )}
          </>
        )}
        <Field
          title={t("البريد الإلكتروني", "Email address")}
          errorMessage={fieldError("email")}
          value={email}
          set={setEmail}
          email
        />
        <Field
          title={
            register
              ? t(
                  "كلمة المرور — 12 حرفًا على الأقل",
                  "Password — at least 12 characters",
                )
              : t("كلمة المرور", "Password")
          }
          errorMessage={fieldError("password")}
          value={password}
          set={setPassword}
          secret={!visible}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setVisible((v) => !v)}
          style={{ padding: 10, minHeight: 44 }}
        >
          <Txt size={12} muted>
            {visible
              ? t("إخفاء كلمة المرور", "Hide password")
              : t("إظهار كلمة المرور", "Show password")}
          </Txt>
        </Pressable>
        {register && (
          <Field
            title={t("تأكيد كلمة المرور", "Confirm password")}
            errorMessage={fieldError("password_confirmation")}
            value={confirmation}
            set={setConfirmation}
            secret
          />
        )}
        {!register && (
          <Pressable
            accessibilityRole="button"
            onPress={() => go({ name: "forgot" })}
            style={{ padding: 10, minHeight: 44 }}
          >
            <Txt size={12} style={{ color: c.gold }}>
              {t("نسيت كلمة المرور؟", "Forgot password?")}
            </Txt>
          </Pressable>
        )}
        {error != null && (
          <ErrorBox
            error={error}
            summary={
              error instanceof ApiError && error.status === 422
                ? register
                  ? t(
                      "تعذّر إنشاء الحساب. راجع الملاحظات بجوار الحقول.",
                      "Unable to create the account. Review the notes beside each field.",
                    )
                  : t(
                      "تعذّر تسجيل الدخول. راجع الحقول الموضحة.",
                      "Unable to sign in. Review the highlighted fields.",
                    )
                : undefined
            }
          />
        )}
        {error instanceof ApiError && error.status === 403 && (
          <Txt muted size={12}>
            {t(
              "إذا كان هذا حساب Admin أو Super Admin، استخدم لوحة إدارة الموقع. التطبيق مخصص لحسابات الشركات والأفراد.",
              "For Admin or Super Admin accounts, use the website dashboard. This app is for company and individual accounts.",
            )}
          </Txt>
        )}
        <Button
          disabled={busy || !nativeSecureStorage}
          title={
            busy
              ? t("جارٍ المتابعة…", "Please wait…")
              : register
                ? t("إنشاء حساب", "Create account")
                : t("تسجيل الدخول", "Sign in")
          }
          onPress={() => void submit()}
        />
      </Card>
      <Button
        secondary
        title={
          register
            ? t("لديك حساب؟ تسجيل الدخول", "Already registered? Sign in")
            : t("جديد هنا؟ إنشاء حساب", "New here? Create account")
        }
        onPress={() => go({ name: register ? "auth" : "register" })}
      />
      <Txt muted size={11}>
        {t(
          "حسابات إدارة المنصة تستخدم لوحة الإدارة على الموقع.",
          "Platform administrators use the web dashboard.",
        )}
      </Txt>
    </Screen>
  );
}
export function ForgotPassword() {
  const { api, t } = useApp();
  const [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function send() {
    if (busy || !email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.request("/auth/forgot-password", {
        method: "POST",
        auth: false,
        body: { email: email.trim().toLowerCase() },
      });
      setSent(true);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Title
        title={t("استعادة كلمة المرور", "Reset password")}
        sub={t(
          "نرسل تعليمات الاستعادة إلى بريد الحساب.",
          "We send reset instructions to the account email.",
        )}
      />
      <Field
        title={t("البريد الإلكتروني", "Email address")}
        value={email}
        set={setEmail}
        email
      />
      {sent && (
        <Card>
          <Txt>
            {t(
              "إذا كان الحساب موجودًا فستصلك تعليمات الاستعادة.",
              "If the account exists, reset instructions will arrive.",
            )}
          </Txt>
        </Card>
      )}
      {error != null && <ErrorBox error={error} />}
      <Button
        disabled={busy || !email.trim()}
        title={t("إرسال التعليمات", "Send instructions")}
        onPress={() => void send()}
      />
    </Screen>
  );
}
export function IdentityDetails() {
  const { user, t, ar } = useApp();
  if (!user) return null;
  return (
    <Screen>
      <Title title={t("بيانات حسابك", "Account details")} />
      <Card>
        <Txt muted size={12}>
          {t("الاسم", "Name")}
        </Txt>
        <Txt bold size={19}>
          {user.name}
        </Txt>
        <Txt muted size={12} style={{ marginTop: 15 }}>
          {t("البريد الإلكتروني", "Email")}
        </Txt>
        <Txt>{user.email}</Txt>
        <Txt muted size={12} style={{ marginTop: 15 }}>
          {t("نوع الحساب", "Account type")}
        </Txt>
        <Txt>
          {user.account_type === "company"
            ? t("شركة", "Company")
            : t("فرد", "Individual")}
        </Txt>
        {user.company && (
          <Txt muted>
            {label(user.company.role, ar)} · {label(user.company.status, ar)}
          </Txt>
        )}
      </Card>
      <Txt muted>
        {t(
          "حالة الحساب مرتبطة بسجلات المنصة. استخدم أمان الحساب لتوثيق البريد وإدارة الأجهزة.",
          "Your account reflects platform records. Use Account security to verify email and manage devices.",
        )}
      </Txt>
    </Screen>
  );
}
export function SecuritySettings() {
  const { api, user, logout, t, refreshUser } = useApp();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [notice, setNotice] = useState(""),
    [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState("");
  const devices = useLoad("devices-" + user?.id, () =>
    api.request<{
      data: {
        id: number;
        device_name: string;
        current: boolean;
        expires_at: string;
      }[];
    }>("/auth/devices"),
  );
  async function verify() {
    setBusy(true);
    setError(null);
    try {
      await api.request("/auth/verification-email", { method: "POST" });
      setNotice(
        t(
          "طُلب إرسال رابط تأكيد البريد.",
          "A verification email was requested.",
        ),
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function revoke(id: number, isCurrent: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api.request("/auth/devices/" + id, { method: "DELETE" });
      if (isCurrent) await logout();
      else devices.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function change() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.request("/auth/password", {
        method: "PUT",
        body: {
          current_password: current,
          password,
          password_confirmation: confirmation,
        },
      });
      setCurrent("");
      setPassword("");
      setConfirmation("");
      setNotice(
        t(
          "تم تغيير كلمة المرور وإنهاء الجلسات الأخرى.",
          "Password changed. Other sessions were revoked.",
        ),
      );
      devices.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (!user) return null;
  return (
    <Screen>
      <Title
        title={t("أمان الحساب", "Account security")}
        sub={t(
          "تحكم في الوصول إلى حسابك بثقة.",
          "Manage access to your account with confidence.",
        )}
      />
      <Card>
        <Row>
          <Icon
            name={
              user.email_verified
                ? "shield-checkmark-outline"
                : "mail-unread-outline"
            }
            size={29}
          />
          <Txt bold>
            {user.email_verified
              ? t("البريد موثّق", "Email verified")
              : t("تأكيد البريد الإلكتروني", "Verify your email")}
          </Txt>
        </Row>
        <Txt muted>{user.email}</Txt>
        {!user.email_verified && (
          <>
            <Button
              disabled={busy}
              title={t("إرسال رابط التوثيق", "Send verification link")}
              onPress={() => void verify()}
            />
            <Button
              secondary
              disabled={busy}
              title={t("تحقّق بعد التوثيق", "Refresh verification")}
              onPress={() => void refreshUser().catch(setError)}
            />
          </>
        )}
      </Card>
      {notice !== "" && (
        <Card>
          <Txt>{notice}</Txt>
        </Card>
      )}
      {error != null && <ErrorBox error={error} />}
      <Card>
        <Txt bold size={18}>
          {t("تغيير كلمة المرور", "Change password")}
        </Txt>
        <Field
          title={t("كلمة المرور الحالية", "Current password")}
          value={current}
          set={setCurrent}
          secret
        />
        <Field
          title={t(
            "كلمة مرور جديدة — 12 حرفًا على الأقل",
            "New password — at least 12 characters",
          )}
          value={password}
          set={setPassword}
          secret
        />
        <Field
          title={t("تأكيد كلمة المرور", "Confirm password")}
          value={confirmation}
          set={setConfirmation}
          secret
        />
        <Txt muted size={11}>
          {t(
            "سيبقى هذا الجهاز متصلًا، وتُنهى جلسات التطبيقات والتكاملات الأخرى.",
            "This device stays signed in; other app and integration sessions are revoked.",
          )}
        </Txt>
        <Button
          disabled={
            busy ||
            !current ||
            password.length < 12 ||
            password !== confirmation ||
            current === password
          }
          title={t("حفظ كلمة المرور", "Save password")}
          onPress={() => void change()}
        />
      </Card>
      <Title title={t("الأجهزة المتصلة", "Signed-in devices")} />
      {devices.busy ? (
        <Loading />
      ) : devices.error ? (
        <ErrorBox error={devices.error} retry={devices.reload} />
      ) : (
        devices.data?.data.map((d) => (
          <Card key={d.id}>
            <Row>
              <Icon name="phone-portrait-outline" />
              <View style={{ flex: 1 }}>
                <Txt bold>
                  {d.current
                    ? t("هذا الجهاز", "This device")
                    : t("جهاز آخر", "Another device")}
                </Txt>
                <Txt muted size={10}>
                  {d.device_name}
                </Txt>
              </View>
            </Row>
            <Button
              secondary
              disabled={busy}
              title={t("إنهاء جلسة الجهاز", "Revoke device session")}
              onPress={() =>
                Alert.alert(
                  t("إنهاء الجلسة", "Revoke session"),
                  t(
                    "سيحتاج هذا الجهاز إلى تسجيل الدخول مجددًا.",
                    "This device will need to sign in again.",
                  ),
                  [
                    { text: t("إلغاء", "Cancel"), style: "cancel" },
                    {
                      text: t("إنهاء الجلسة", "Revoke"),
                      style: "destructive",
                      onPress: () => void revoke(d.id, d.current),
                    },
                  ],
                )
              }
            />
          </Card>
        ))
      )}
    </Screen>
  );
}
export function Support() {
  const { api, t, ar, appConfig, configStatus, reloadAppConfig } = useApp();
  return (
    <Screen>
      <Title title={t("المساعدة والتواصل", "Help & support")} />
      <Card>
        <Txt bold size={19}>
          {t(
            "من الفرصة إلى العلاقة التجارية",
            "From opportunity to business connection",
          )}
        </Txt>
        <Txt muted>
          {t(
            "تصفّح الفرص دون حساب. أنشئ حساب شركة لنشر فرصك وتبادل العروض. أكمل توثيق البريد للوصول إلى وظائف الشركة، ثم تابع الرسائل من العروض والمفاوضات.",
            "Browse without an account. Register a company to publish and exchange offers. Verify your email to use company features, then follow conversations through Offers & negotiations.",
          )}
        </Txt>
      </Card>
      <Card>
        <Txt>
          {t(
            "تنبيهات التطبيق تتحدث أثناء الاستخدام. تنبيهات النظام عند إغلاق التطبيق لم تُفعّل بعد.",
            "In-app notifications update while using the app. System push notifications while the app is closed are not enabled yet.",
          )}
        </Txt>
      </Card>
      <Card>
        <Txt bold>{t("اتصال محتوى التطبيق", "App content connection")}</Txt>
        <Txt muted size={12}>
          {t("مصدر المحتوى: ", "Content source: ") + api.origin}
        </Txt>
        <Txt muted size={12}>
          {t("إصدار المحتوى: ", "Content version: ") + appConfig.version}
        </Txt>
        <Txt muted size={12}>
          {t(
            "لغة العرض: العربية — احفظ حقول العربية في لوحة الإدارة.",
            "Display language: English — save the English fields in the admin dashboard.",
          )}
        </Txt>
        <Txt muted size={12}>
          {configStatus.busy
            ? t("جارٍ تحديث المحتوى…", "Updating content…")
            : configStatus.error
              ? t(
                  "تعذر جلب التحديث. يُعرض آخر محتوى متاح.",
                  "Could not refresh. Showing the last available content.",
                )
              : t(
                  "تم الاتصال بالمصدر بنجاح.",
                  "Connected to the content source.",
                )}
        </Txt>
        {configStatus.lastUpdated && (
          <Txt muted size={11}>
            {t("آخر مزامنة: ", "Last sync: ") +
              new Date(configStatus.lastUpdated).toLocaleString(
                ar ? "ar-AE" : "en-AE",
              )}
          </Txt>
        )}
        <Button
          secondary
          disabled={configStatus.busy}
          title={t("تحديث المحتوى الآن", "Refresh content now")}
          onPress={reloadAppConfig}
        />
        <Txt muted size={11}>
          {t(
            "يجب أن تكون لوحة الإدارة والتطبيق متصلين بالخادم نفسه. تغييرات localhost لا تصل إلى خادم الموقع.",
            "The app and admin dashboard must use the same server. Localhost changes do not update the live website.",
          )}
        </Txt>
      </Card>
      <Button
        secondary
        title={t("زيارة موقع HAG Brokers", "Visit HAG Brokers")}
        onPress={() => void Linking.openURL(api.origin)}
      />
    </Screen>
  );
}
