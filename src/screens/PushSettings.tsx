import React, { useRef, useState } from "react";
import { Linking } from "react-native";
import { isCompanyLeader } from "../core/account";
import {
  devicePushToken,
  pushSupported,
  clearDisplayedPush,
  notifyPushChanges,
} from "../core/nativePush";
import type { PushSettings as Settings } from "../core/push";
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Loading,
  Screen,
  Title,
  Txt,
  useApp,
  useLoad,
} from "../ui";
export function PushSettings() {
  const { api, user, ar, t, go } = useApp();
  const eligible = isCompanyLeader(user);
  const q = useLoad(`push-${user?.id}-${ar}`, () =>
    eligible
      ? api.request<{ data: Settings }>("/push/settings")
      : Promise.resolve(null),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [success, setSuccess] = useState("");
  const working = useRef(false);
  const settings = q.data?.data;
  async function save(offers: boolean, messages: boolean) {
    if (!settings?.project_id || working.current) return;
    working.current = true;
    setBusy(true);
    setError(null);
    setSuccess("");
    try {
      const token = await devicePushToken(settings.project_id, true);
      if (!token) {
        await api.request("/push/device", { method: "DELETE" });
        setSuccess(
          t(
            "الإذن غير مفعّل. يمكنك تغييره من إعدادات الجهاز.",
            "Permission is not enabled. You can change it in device settings.",
          ),
        );
        notifyPushChanges();
        q.reload();
        return;
      }
      await api.request("/push/device", {
        method: "PUT",
        body: {
          expo_token: token,
          project_id: settings.project_id,
          offers,
          messages,
          locale: ar ? "ar" : "en",
        },
      });
      setSuccess(
        t("حُفظت إعدادات هذا الجهاز.", "Settings saved for this device."),
      );
      notifyPushChanges();
      q.reload();
    } catch (e) {
      setError(e);
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  async function disable() {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError(null);
    try {
      await api.request("/push/device", { method: "DELETE" });
      await clearDisplayedPush();
      setSuccess(
        t(
          "تم تعطيل الربط لهذا الجهاز.",
          "Push registration disabled for this device.",
        ),
      );
      notifyPushChanges();
      q.reload();
    } catch (e) {
      setError(e);
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  return (
    <Screen onRefresh={q.reload} refreshing={q.busy}>
      <Title
        title={t("إشعارات الهاتف", "Phone notifications")}
        sub={t(
          "اختر التحديثات المناسبة لك",
          "Choose the updates that matter to you",
        )}
      />
      <Card>
        <Txt>
          {t(
            "الإشعارات عامة ولا تعرض نص الرسالة أو السعر. افتح التطبيق لقراءة التفاصيل بعد التحقق من حسابك.",
            "Notifications are generic and do not display message text or prices. Open the app to view details after account verification.",
          )}
        </Txt>
      </Card>
      {!eligible ? (
        <>
          <Txt>
            {t(
              "هذه الميزة لمسؤولي الشركات الموثقين والنشطين.",
              "This feature is for verified active company leaders.",
            )}
          </Txt>
          <Button
            title={t("أمان الحساب", "Account security")}
            onPress={() => go({ name: user ? "security" : "auth" })}
          />
        </>
      ) : !pushSupported ? (
        <Card>
          <Txt>
            {t(
              "جرّب الميزة في نسخة HAG مستقلة على هاتف حقيقي. لا تتوفر هذه التجربة في Expo Go أو المتصفح.",
              "Use a standalone HAG build on a physical phone. This feature is unavailable in Expo Go or the browser.",
            )}
          </Txt>
        </Card>
      ) : (
        <>
          {q.busy ? <Loading /> : null}
          {q.error ? <ErrorBox error={q.error} retry={q.reload} /> : null}
          {error ? (
            <ErrorBox
              error={error}
              summary={t(
                "تعذر حفظ الإشعارات. تحقق من الاتصال وصلاحيات الجهاز وإعداد النسخة.",
                "Unable to save notifications. Check connectivity, device permission and build configuration.",
              )}
            />
          ) : null}
          {success ? (
            <Card>
              <Txt>{success}</Txt>
            </Card>
          ) : null}
          {settings && !settings.available ? (
            <Card>
              <Txt>
                {t(
                  "إشعارات الهاتف لم تُفعّل على الخادم بعد. تبقى تنبيهات التطبيق متاحة أثناء الاستخدام.",
                  "Phone push is not enabled on the server yet. In-app notices remain available while using the app.",
                )}
              </Txt>
            </Card>
          ) : null}
          {settings?.available ? (
            <Card>
              <Badge>
                {settings.device?.enabled
                  ? t("مفعّل لهذا الجهاز", "Enabled for this device")
                  : t("غير مفعّل", "Not enabled")}
              </Badge>
              {!settings.device?.enabled ? (
                <Button
                  disabled={busy}
                  title={t(
                    "تفعيل إشعارات الهاتف",
                    "Enable phone notifications",
                  )}
                  onPress={() => void save(true, true)}
                />
              ) : (
                <>
                  <Button
                    secondary
                    disabled={busy}
                    title={
                      (settings.device.offers ? "✓ " : "○ ") +
                      t("تحديثات العروض", "Offer updates")
                    }
                    onPress={() =>
                      void save(
                        !settings.device!.offers,
                        settings.device!.messages,
                      )
                    }
                  />
                  <Button
                    secondary
                    disabled={busy}
                    title={
                      (settings.device.messages ? "✓ " : "○ ") +
                      t("رسائل التفاوض", "Negotiation messages")
                    }
                    onPress={() =>
                      void save(
                        settings.device!.offers,
                        !settings.device!.messages,
                      )
                    }
                  />
                  <Button
                    secondary
                    disabled={busy}
                    title={t("تعطيل على هذا الجهاز", "Disable on this device")}
                    onPress={() => void disable()}
                  />
                </>
              )}
              <Button
                secondary
                title={t("إعدادات الهاتف", "Device settings")}
                onPress={() => void Linking.openSettings().catch(setError)}
              />
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}
