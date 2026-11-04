import React, { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { ApiError } from "../core/api";
import {
  accountInput,
  type AccountRecord,
  type DeletionRequest,
  type LegalDocument,
} from "../core/accountCompletion";
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
  useApp,
  useLoad,
} from "../ui";

export function IdentityEditor() {
  const { api, user, t, ar, refreshUser, go } = useApp();
  const q = useLoad(`account-edit-${user?.id}-${ar}`, () =>
    api.request<{ data: AccountRecord }>("/auth/account"),
  );
  const [record, setRecord] = useState<AccountRecord | null>(null),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const working = useRef(false);
  useEffect(() => {
    if (q.data) {
      setRecord(q.data.data);
      setName(q.data.data.user.name);
      setEmail(q.data.data.user.email);
      setPassword("");
    }
  }, [q.data]);
  if (!user) return null;
  const body = record ? accountInput(name, email, password, record) : null;
  const changed = !!record && email.trim().toLowerCase() !== record.user.email;
  async function save() {
    if (!body || working.current) return;
    working.current = true;
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      const response = await api.request<{
        data: AccountRecord;
        meta: { email_changed: boolean; verification_requested: boolean };
      }>("/auth/account", { method: "PUT", body });
      setRecord(response.data);
      setPassword("");
      setNotice(
        response.meta.email_changed
          ? t(
              "تم حفظ البريد. وثّق العنوان الجديد من أمان الحساب لاستعادة وظائف الشركة. تم إنهاء رموز الأجهزة الأخرى.",
              "Email saved. Verify the new address in Account security to restore company features. Other API device tokens were revoked.",
            )
          : t("تم حفظ الاسم والبريد.", "Account details saved."),
      );
      await refreshUser();
    } catch (e) {
      setError(e);
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Title
        title={t("بيانات الحساب", "Account details")}
        sub={t("هوية واضحة، وتحديثات آمنة", "Your identity, securely updated")}
      />
      {q.busy ? <Loading /> : null}
      {q.error ? <ErrorBox error={q.error} retry={q.reload} /> : null}
      {notice ? (
        <Card>
          <Txt>{notice}</Txt>
        </Card>
      ) : null}
      {error ? (
        <ErrorBox
          error={error}
          summary={
            error instanceof ApiError && error.status === 409
              ? t(
                  "تغيّر الحساب في جلسة أخرى. أعد تحميل البيانات قبل الحفظ.",
                  "The account changed in another session. Reload before saving.",
                )
              : undefined
          }
        />
      ) : null}
      {record ? (
        <>
          <Card>
            <Icon name="person-circle-outline" size={36} />
            <Badge>
              {record.user.email_verified
                ? t("البريد موثّق", "Email verified")
                : t("البريد يحتاج توثيقًا", "Email verification needed")}
            </Badge>
            <Field title={t("الاسم", "Name")} value={name} set={setName} />
            <Field
              title={t("البريد الإلكتروني", "Email")}
              value={email}
              set={setEmail}
              email
            />
            {changed ? (
              <>
                <Txt muted>
                  {t(
                    "تغيير البريد يحتاج كلمة مرورك الحالية وإعادة توثيق العنوان الجديد. تبقى بيانات الشركة التجارية منفصلة عن بريد تسجيل الدخول.",
                    "Changing email requires your current password and verification of the new address. Company business details are separate from your sign-in email.",
                  )}
                </Txt>
                <Field
                  title={t("كلمة المرور الحالية", "Current password")}
                  value={password}
                  set={setPassword}
                  secret
                />
              </>
            ) : null}
          </Card>
          <Button
            disabled={busy || !body}
            title={
              busy
                ? t("جارٍ الحفظ…", "Saving…")
                : t("حفظ التغييرات", "Save changes")
            }
            onPress={() => void save()}
          />
          <Button
            secondary
            disabled={busy}
            title={t("إعادة تحميل البيانات", "Reload details")}
            onPress={q.reload}
          />
          <Button
            secondary
            title={t("أمان الحساب والتوثيق", "Security & verification")}
            onPress={() => go({ name: "security" })}
          />
        </>
      ) : null}
    </Screen>
  );
}
export function DeleteAccountRequest() {
  const { api, user, t, ar } = useApp();
  const q = useLoad(`deletion-${user?.id}-${ar}`, () =>
    api.request<{ data: DeletionRequest | null }>("/auth/deletion-request"),
  );
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [sent, setSent] = useState<DeletionRequest | null>(null);
  const working = useRef(false);
  if (!user) return null;
  const request = sent ?? q.data?.data;
  async function submit() {
    if (!confirm || !password || working.current) return;
    working.current = true;
    setBusy(true);
    setError(null);
    try {
      const response = await api.request<{ data: DeletionRequest }>(
        "/auth/deletion-request",
        { method: "POST", body: { current_password: password, confirm: true } },
      );
      setSent(response.data);
      setPassword("");
    } catch (e) {
      setError(e);
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  function ask() {
    Alert.alert(
      t("تأكيد طلب حذف الحساب", "Confirm account deletion request"),
      t(
        "سيُرسل الطلب للمراجعة. سيبقى حسابك فعالًا إلى أن تنفذ الإدارة الإجراء المناسب بعد مراجعة ارتباطاته.",
        "This submits a request for review. Your account stays active until the team reviews its links and fulfills the appropriate action.",
      ),
      [
        { text: t("إلغاء", "Cancel"), style: "cancel" },
        {
          text: t("إرسال الطلب", "Submit request"),
          style: "destructive",
          onPress: () => void submit(),
        },
      ],
    );
  }
  return (
    <Screen onRefresh={q.reload} refreshing={q.busy}>
      <Title title={t("طلب حذف الحساب", "Request account deletion")} />
      <Card>
        <Icon name="shield-checkmark-outline" size={32} />
        <Txt>
          {t(
            "راجع طلباتك وعضويتك في الشركة قبل المتابعة. إرسال الطلب لا يحذف حسابك فورًا، ولا يحذف سجلات الشركات أو الشحن أو العروض تلقائيًا.",
            "Review your requests and company membership before proceeding. Submitting does not delete your account immediately or automatically remove company, freight or offer records.",
          )}
        </Txt>
      </Card>
      {q.busy ? <Loading /> : null}
      {q.error ? <ErrorBox error={q.error} retry={q.reload} /> : null}
      {error ? <ErrorBox error={error} /> : null}
      {request ? (
        <Card>
          <Badge>
            {request.status === "reviewing"
              ? t("قيد المراجعة", "Under review")
              : t("بانتظار المراجعة", "Pending review")}
          </Badge>
          <Txt>{request.requested_at}</Txt>
          <Txt muted>
            {t(
              "تم تسجيل طلبك. ستتواصل معك الإدارة عبر بريد الحساب لاستكمال المعالجة.",
              "Your request is recorded. The team will contact you through your account email to complete processing.",
            )}
          </Txt>
        </Card>
      ) : q.data && !q.error ? (
        <>
          <Card>
            <Field
              title={t("كلمة المرور الحالية", "Current password")}
              value={password}
              set={setPassword}
              secret
            />
            <Button
              secondary
              disabled={busy}
              title={
                (confirm ? "✓ " : "○ ") +
                t(
                  "أفهم أن هذا طلب للمراجعة",
                  "I understand this submits a review request",
                )
              }
              onPress={() => setConfirm(!confirm)}
            />
          </Card>
          <Button
            disabled={busy || !password || !confirm}
            title={
              busy
                ? t("جارٍ الإرسال…", "Submitting…")
                : t("طلب حذف الحساب", "Request account deletion")
            }
            onPress={ask}
          />
        </>
      ) : null}
    </Screen>
  );
}
export function LegalPage({ slug }: { slug: "privacy" | "terms" }) {
  const { api, t, ar } = useApp();
  const q = useLoad(`legal-${slug}-${ar}`, () =>
    api.request<{ data: LegalDocument }>(
      `/legal/${slug}?lang=${ar ? "ar" : "en"}`,
      { auth: false },
    ),
  );
  return (
    <Screen onRefresh={q.reload} refreshing={q.busy}>
      <Title
        title={
          slug === "privacy"
            ? t("سياسة الخصوصية", "Privacy policy")
            : t("شروط الاستخدام", "Terms of use")
        }
      />
      {q.busy ? <Loading /> : null}
      {q.error ? (
        <ErrorBox
          error={q.error}
          retry={q.reload}
          summary={
            q.error instanceof ApiError && q.error.status === 404
              ? t(
                  "هذا المستند لم يُنشر بعد. تواصل مع دعم المنصة، أو أعد المحاولة بعد نشره.",
                  "This document has not been published yet. Contact platform support or try again after publication.",
                )
              : undefined
          }
        />
      ) : null}
      {q.data ? (
        <Card>
          <Badge>{t("الإصدار ", "Version ") + q.data.data.version}</Badge>
          <Txt bold size={22}>
            {q.data.data.title}
          </Txt>
          <Txt muted>{q.data.data.updated_at}</Txt>
          <Txt style={{ lineHeight: 28, marginTop: 18 }}>
            {q.data.data.body}
          </Txt>
        </Card>
      ) : null}
    </Screen>
  );
}
