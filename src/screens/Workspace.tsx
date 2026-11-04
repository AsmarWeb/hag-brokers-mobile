import React from "react";
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
import type {
  OwnListing,
  Page,
  Workspace as WorkspaceData,
} from "../core/types";
export function Workspace() {
  const { api, user, go, t, ar } = useApp();
  const eligible = !!user?.email_verified && user.company?.status === "active";
  const leader =
    !!user?.company && ["owner", "manager"].includes(user.company.role);
  const q = useLoad("workspace-" + user?.id + ar, () =>
    eligible
      ? api.request<{ data: WorkspaceData }>("/company/workspace")
      : Promise.resolve(null),
  );
  const own = useLoad("own-" + user?.id, () =>
    eligible && leader
      ? api.request<Page<OwnListing>>("/company/opportunities?per_page=20")
      : Promise.resolve(null),
  );
  if (!user)
    return (
      <Screen>
        <Title title={t("مساحة أعمالك", "Your business workspace")} />
        <Card>
          <Txt>
            {t(
              "ادخل بحساب شركتك لإدارة الفرص والعروض.",
              "Sign in with your company account to manage opportunities and offers.",
            )}
          </Txt>
        </Card>
        <Button
          title={t("تسجيل الدخول", "Sign in")}
          onPress={() => go({ name: "auth" })}
        />
      </Screen>
    );
  if (!user.company)
    return (
      <Screen>
        <Title title={t("حسابك الفردي", "Your individual account")} />
        <Card>
          <Txt>
            {t(
              "حسابك متاح للتصفح. النشر والعروض والتفاوض تتطلب عضوية في شركة؛ لا يمنح الحساب الفردي صفة شركة موثقة.",
              "Your account supports browsing. Publishing, offers and negotiation require company membership. An individual account is not a verified company.",
            )}
          </Txt>
        </Card>
        <Button
          title={t("استكشف السوق", "Explore marketplace")}
          onPress={() => go({ name: "market" })}
        />
      </Screen>
    );
  if (!eligible)
    return (
      <Screen>
        <Title title={t("مساحة الشركة", "Company workspace")} />
        <Card>
          <Txt>
            {!user.email_verified
              ? t(
                  "وثّق بريدك من أمان الحساب لبدء استخدام وظائف الشركة.",
                  "Verify your email in Account security to use company features.",
                )
              : t(
                  "مساحة الشركة غير نشطة حاليًا. راجع حالة شركتك مع المنصة.",
                  "Your workspace is not active. Review your company status with the platform.",
                )}
          </Txt>
        </Card>
        <Button
          title={t("أمان الحساب", "Account security")}
          onPress={() => go({ name: "security" })}
        />
      </Screen>
    );
  return (
    <Screen>
      <Title
        title={t("مساحة أعمالك", "Your business, connected")}
        sub={user.name}
      />
      {q.busy ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} retry={q.reload} />
      ) : (
        q.data && (
          <Card>
            <Badge>
              {ar ? q.data.data.plan.name_ar : q.data.data.plan.name_en}
            </Badge>
            <Txt style={{ marginTop: 13 }}>
              {t("الفرص النشطة المسموحة", "Active opportunity limit")}:{" "}
              {q.data.data.plan.active_opportunities}
            </Txt>
            <Txt>
              {t("طلبات التقديم الشهرية", "Monthly application limit")}:{" "}
              {q.data.data.plan.monthly_applications}
            </Txt>
            <Txt muted>
              {t("أعضاء الفريق", "Team seats")}: {q.data.data.plan.seats}
            </Txt>
          </Card>
        )
      )}
      {leader && q.data && (
        <>
          <Button
            title={t("أضف فرصة جديدة", "Publish an opportunity")}
            onPress={() => go({ name: "create" })}
          />
          <Button
            secondary
            title={t("العروض الواردة والمرسلة", "Received & sent offers")}
            onPress={() => go({ name: "offers" })}
          />
          <Button
            secondary
            title={t("التنبيهات", "Notifications")}
            onPress={() => go({ name: "notices" })}
          />
          <Title title={t("فرص شركتك", "Your company opportunities")} />
          {own.busy ? (
            <Loading />
          ) : own.error ? (
            <ErrorBox error={own.error} retry={own.reload} />
          ) : (
            <>
              {own.data?.data.map((o) => (
                <Card key={o.id}>
                  <Txt bold>{o.title}</Txt>
                  <Txt muted>
                    {o.is_public
                      ? t("ظاهرة في السوق", "Visible in marketplace")
                      : t("غير ظاهرة حاليًا", "Not currently public")}
                  </Txt>
                  <Button
                    secondary
                    title={t("فتح التفاصيل الخاصة", "Open company details")}
                    onPress={() => go({ name: "manage", id: o.id })}
                  />
                </Card>
              ))}
              {own.data?.data.length === 0 && (
                <Card>
                  <Txt>
                    {t(
                      "ابدأ بنشر أول فرصة تجارية لشركتك.",
                      "Publish your company’s first commercial opportunity.",
                    )}
                  </Txt>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </Screen>
  );
}
