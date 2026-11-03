import React, { useState } from "react";
import { View } from "react-native";
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Field,
  Loading,
  Screen,
  Title,
  Txt,
  useApp,
  useLoad,
} from "../ui";
import { nativeSecureStorage, deviceName } from "../core/vault";
import { ApiError } from "../core/api";
import type { User } from "../core/types";
import { Preferences } from "./Welcome";
import { label } from "../core/labels";
export function Auth({ register = false }: { register?: boolean }) {
  const { api, t, ar, go, signIn } = useApp();
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
    [notice, setNotice] = useState(false);
  async function submit() {
    if (busy || !nativeSecureStorage) return;
    setBusy(true);
    setError(null);
    try {
      const device = await deviceName(api.origin);
      const body = register
        ? {
            account_type: company ? "company" : "individual",
            name,
            email: email.trim().toLowerCase(),
            password,
            password_confirmation: confirmation,
            device_name: device,
            ...(company
              ? {
                  company_name: business,
                  phone,
                  country_code: country.toUpperCase(),
                }
              : {}),
          }
        : { email: email.trim().toLowerCase(), password, device_name: device };
      const res = await api.request<{
        data: { access_token: string; user: User };
      }>("/auth/" + (register ? "register" : "login"), {
        method: "POST",
        auth: false,
        body,
      });
      await signIn(res.data.access_token, res.data.user);
      setPassword("");
      setConfirmation("");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function forgot() {
    setBusy(true);
    setError(null);
    try {
      await api.request("/auth/forgot-password", {
        method: "POST",
        auth: false,
        body: { email: email.trim().toLowerCase() },
      });
      setNotice(true);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Title
        title={
          register
            ? t("انضم إلى شبكة HAG", "Join the HAG network")
            : t("مرحبًا بعودتك", "Welcome back")
        }
        sub={t("علاقات تجارية تبدأ بخطوة.", "Business connections start here.")}
      />
      {!nativeSecureStorage && (
        <Card>
          <Txt>
            {t(
              "تسجيل الدخول متاح في تطبيق Android وiOS؛ معاينة الويب للتصفح فقط.",
              "Sign-in is available on Android and iOS. The web preview supports browsing only.",
            )}
          </Txt>
        </Card>
      )}
      {register && (
        <View style={{ gap: 7 }}>
          <Button
            secondary={!company}
            title={t("حساب شركة", "Company account")}
            onPress={() => setCompany(true)}
          />
          <Button
            secondary={company}
            title={t("حساب فردي للتصفح", "Individual browsing account")}
            onPress={() => setCompany(false)}
          />
          <Field title={t("اسمك", "Your name")} value={name} set={setName} />
          {company && (
            <>
              <Field
                title={t("اسم الشركة", "Company name")}
                value={business}
                set={setBusiness}
              />
              <Field
                title={t("الهاتف الدولي", "International phone")}
                value={phone}
                set={setPhone}
              />
              <Field
                title={t(
                  "رمز الدولة من حرفين، مثال AE",
                  "Two-letter country code, e.g. AE",
                )}
                value={country}
                set={setCountry}
              />
            </>
          )}
        </View>
      )}
      <Field
        title={t("البريد الإلكتروني", "Email")}
        value={email}
        set={setEmail}
        email
      />
      <Field
        title={
          register
            ? t(
                "كلمة مرور جديدة: 12 حرفًا على الأقل",
                "New password: at least 12 characters",
              )
            : t("كلمة المرور", "Password")
        }
        value={password}
        set={setPassword}
        secret
      />
      {register && (
        <Field
          title={t("تأكيد كلمة المرور", "Confirm password")}
          value={confirmation}
          set={setConfirmation}
          secret
        />
      )}
      {error != null && (
        <>
          <ErrorBox error={error} />
          {error instanceof ApiError && error.status === 422 && (
            <Card>
              {Object.entries(error.fields).map(([field, messages]) => (
                <View key={field}>
                  <Txt bold size={12}>
                    {field}
                  </Txt>
                  {Array.isArray(messages) &&
                    messages.slice(0, 2).map((m, i) => (
                      <Txt muted size={12} key={i}>
                        {String(m)}
                      </Txt>
                    ))}
                </View>
              ))}
            </Card>
          )}
        </>
      )}
      {notice && (
        <Card>
          <Txt>
            {t(
              "إذا كان الحساب موجودًا فستصلك تعليمات الاستعادة عبر البريد.",
              "If the account exists, reset instructions will arrive by email.",
            )}
          </Txt>
        </Card>
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
      <Button
        secondary
        disabled={busy}
        title={
          register
            ? t("لدي حساب بالفعل", "I already have an account")
            : t("إنشاء حساب جديد", "Create an account")
        }
        onPress={() => go({ name: register ? "auth" : "register" })}
      />
      {!register && (
        <Button
          secondary
          disabled={busy || !email}
          title={t("نسيت كلمة المرور", "Forgot password")}
          onPress={() => void forgot()}
        />
      )}
    </Screen>
  );
}
export function Account() {
  const { api, user, go, logout, t, ar, refreshUser } = useApp();
  const [error, setError] = useState<unknown>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const devices = useLoad("devices-" + (user?.id ?? "guest"), () =>
    user
      ? api.request<{
          data: {
            id: number;
            device_name: string;
            current: boolean;
            expires_at: string;
          }[];
        }>("/auth/devices")
      : Promise.resolve({ data: [] }),
  );
  async function verify() {
    setBusy(true);
    setError(null);
    try {
      await api.request("/auth/verification-email", { method: "POST" });
      setNotice(
        t(
          "طُلب إرسال رابط التأكيد إلى بريدك.",
          "A verification email was requested.",
        ),
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function revoke(id: number, current: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api.request("/auth/devices/" + id, { method: "DELETE" });
      if (current) await logout();
      else devices.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Title title={t("حسابك في HAG", "Your HAG account")} />
      <Preferences />
      {!user ? (
        <>
          <Card>
            <Txt>
              {t(
                "يمكنك تصفح السوق دون حساب. سجّل الدخول لإدارة شركتك وعروضك.",
                "Browse without an account. Sign in to manage your company and offers.",
              )}
            </Txt>
          </Card>
          <Button
            title={t("تسجيل الدخول", "Sign in")}
            onPress={() => go({ name: "auth" })}
          />
          <Button
            secondary
            title={t("إنشاء حساب", "Create account")}
            onPress={() => go({ name: "register" })}
          />
        </>
      ) : (
        <>
          <Card>
            <Txt size={20} bold>
              {user.name}
            </Txt>
            <Txt muted>{user.email}</Txt>
            <Badge>
              {user.account_type === "company"
                ? t("حساب شركة", "Company account")
                : t("حساب فردي", "Individual account")}
            </Badge>
            <View style={{ height: 10 }} />
            <Txt muted>
              {user.email_verified
                ? t("البريد مؤكد", "Email verified")
                : t("البريد بحاجة إلى تأكيد", "Email verification required")}
            </Txt>
            {user.company && (
              <Txt muted>
                {label(user.company.role, ar)} ·{" "}
                {label(user.company.status, ar)}
              </Txt>
            )}
          </Card>
          {!user.email_verified && (
            <>
              <Button
                disabled={busy}
                title={t("إرسال رابط تأكيد البريد", "Send verification email")}
                onPress={() => void verify()}
              />
              <Button
                secondary
                title={t(
                  "تحقّق مجددًا بعد التأكيد",
                  "Refresh after verification",
                )}
                onPress={() => void refreshUser().catch(setError)}
              />
            </>
          )}
          {notice !== "" && (
            <Card>
              <Txt>{notice}</Txt>
            </Card>
          )}
          {error != null && <ErrorBox error={error} />}
          <Title title={t("أجهزتك", "Your devices")} />
          {devices.busy ? (
            <Loading />
          ) : devices.error ? (
            <ErrorBox error={devices.error} retry={devices.reload} />
          ) : (
            devices.data?.data.map((d) => (
              <Card key={d.id}>
                <Txt>{d.device_name}</Txt>
                <Txt muted>
                  {d.current
                    ? t("هذا الجهاز", "This device")
                    : t("جهاز آخر", "Another device")}
                </Txt>
                <Button
                  secondary
                  disabled={busy}
                  title={t("إنهاء جلسة الجهاز", "Revoke device session")}
                  onPress={() => void revoke(d.id, d.current)}
                />
              </Card>
            ))
          )}
          <Button
            secondary
            title={t("تسجيل الخروج", "Sign out")}
            onPress={() => void logout().catch(setError)}
          />
        </>
      )}
    </Screen>
  );
}
