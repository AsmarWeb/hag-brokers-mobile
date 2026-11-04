import React, { useRef, useState } from "react";
import * as Crypto from "expo-crypto";
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
import { ApiError } from "../core/api";
import { MutationIntent } from "../core/intent";
import { isCompanyLeader } from "../core/account";
import {
  freightBody,
  freightStatus,
  type FreightPort,
  type FreightQuote,
} from "../core/freight";
import type { Page } from "../core/types";

function Access() {
  const { user, t, go } = useApp();
  return (
    <Screen>
      <Title title={t("الشحن البحري", "Sea freight")} />
      <Card>
        <Txt>
          {t(
            "طلب الشحن متاح لمسؤول الشركة بعد توثيق البريد وتفعيل ملف الشركة. تواصل مع الدعم لربط ملف عميل قائم.",
            "Freight requests require a verified company leader and an active customer profile. Contact support to link an existing customer profile.",
          )}
        </Txt>
      </Card>
      <Button
        title={
          user
            ? t("أمان الحساب", "Account security")
            : t("تسجيل الدخول", "Sign in")
        }
        onPress={() => go({ name: user ? "security" : "auth" })}
      />
    </Screen>
  );
}
export function FreightList() {
  const { api, user, t, ar, go } = useApp();
  const eligible = isCompanyLeader(user);
  const [page, setPage] = useState(1);
  const q = useLoad(`freight-${user?.id}-${page}-${ar}`, () =>
    eligible
      ? api.request<Page<FreightQuote>>(`/freight/quotations?page=${page}`)
      : Promise.resolve(null),
  );
  if (!eligible) return <Access />;
  return (
    <Screen onRefresh={q.reload} refreshing={q.busy}>
      <Title
        title={t("طلبات الشحن", "Freight requests")}
        sub={t(
          "متطلبات شحنتك، في مكان واحد",
          "Your shipping requirements, in one place",
        )}
      />
      <Button
        title={t("طلب عرض سعر للشحن", "Request a freight quote")}
        onPress={() => go({ name: "freight-create" })}
      />
      <Card>
        <Txt muted>
          {t(
            "هذا طلب مراجعة وتسعير من فريق HAG، وليس حجز شحن أو سعرًا مؤكدًا.",
            "This requests a quotation from HAG. It is not a shipping booking or a confirmed price.",
          )}
        </Txt>
      </Card>
      {q.busy ? <Loading /> : null}
      {q.error ? <ErrorBox error={q.error} retry={q.reload} /> : null}
      {!q.busy && q.data?.data.length === 0 ? (
        <Card>
          <Txt>{t("لم ترسل طلب شحن بعد.", "No freight requests yet.")}</Txt>
        </Card>
      ) : null}
      {q.data?.data.map((item) => (
        <Card key={item.id}>
          <Badge>{freightStatus(item.status, ar)}</Badge>
          <Txt bold>{item.reference}</Txt>
          <Txt>
            {item.origin.name} → {item.destination.name}
          </Txt>
          <Button
            secondary
            title={t("تفاصيل الطلب", "Request details")}
            onPress={() => go({ name: "freight-detail", id: item.id })}
          />
        </Card>
      ))}
      {page > 1 ? (
        <Button
          secondary
          title={t("السابق", "Previous")}
          onPress={() => setPage(page - 1)}
        />
      ) : null}
      {q.data && page < q.data.meta.last_page ? (
        <Button
          secondary
          title={t("التالي", "Next")}
          onPress={() => setPage(page + 1)}
        />
      ) : null}
    </Screen>
  );
}
export function FreightDetail({ id }: { id: number }) {
  const { api, user, t, ar } = useApp();
  const eligible = isCompanyLeader(user);
  const q = useLoad(`freight-detail-${user?.id}-${id}-${ar}`, () =>
    eligible
      ? api.request<{ data: FreightQuote }>(`/freight/quotations/${id}`)
      : Promise.resolve(null),
  );
  if (!eligible) return <Access />;
  const item = q.data?.data;
  return (
    <Screen onRefresh={q.reload} refreshing={q.busy}>
      <Title title={t("تفاصيل طلب الشحن", "Freight request details")} />
      {q.error ? <ErrorBox error={q.error} retry={q.reload} /> : null}
      {q.busy ? <Loading /> : null}
      {item ? (
        <>
          <Card>
            <Badge>{freightStatus(item.status, ar)}</Badge>
            <Txt bold size={22}>
              {item.reference}
            </Txt>
            <Txt>
              {item.origin.name} → {item.destination.name}
            </Txt>
          </Card>
          <Card>
            <Txt bold>{item.cargo_type}</Txt>
            <Txt>{item.container_type}</Txt>
            <Txt>{t("عدد الحاويات: ", "Containers: ") + item.quantity}</Txt>
            <Txt>
              {t("الوزن الإجمالي بالكيلوغرام: ", "Total weight in kg: ") +
                (item.weight ?? "—")}
            </Txt>
            <Txt>
              {t("التاريخ المفضل: ", "Preferred date: ") +
                (item.preferred_date ?? "—")}
            </Txt>
          </Card>
          <Txt muted>
            {t(
              "اسحب للتحديث ومتابعة حالة مراجعة الطلب. الأسعار والمستندات النهائية يراجعها فريق الشحن.",
              "Pull to refresh the request status. Final pricing and documents are reviewed by the freight team.",
            )}
          </Txt>
        </>
      ) : null}
    </Screen>
  );
}
function PortPicker({
  title,
  selected,
  choose,
  disabled,
}: {
  title: string;
  selected: FreightPort | null;
  choose: (port: FreightPort) => void;
  disabled: boolean;
}) {
  const { api, user, t } = useApp();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const q = useLoad(`ports-${user?.id}-${search}-${page}-${open}`, () =>
    open
      ? api.request<{ data: FreightPort[]; meta: { last_page: number } }>(
          `/freight/ports?search=${encodeURIComponent(search)}&page=${page}`,
        )
      : Promise.resolve(null),
  );
  return (
    <Card>
      <Txt bold>{title}</Txt>
      <Button
        secondary
        disabled={disabled}
        title={selected?.name ?? t("اختر ميناء", "Choose a port")}
        onPress={() => setOpen(!open)}
      />
      {open ? (
        <>
          <Field
            title={t("ابحث باسم الميناء", "Search by port name")}
            value={query}
            set={setQuery}
          />
          <Button
            secondary
            title={t("بحث", "Search")}
            onPress={() => {
              setPage(1);
              setSearch(query.trim());
            }}
          />
          {q.busy ? <Loading /> : null}
          {q.error ? <ErrorBox error={q.error} retry={q.reload} /> : null}
          {!q.busy && q.data?.data.length === 0 ? (
            <Txt>
              {t(
                "لا توجد موانئ مطابقة. جرّب اسمًا آخر أو تواصل مع الدعم.",
                "No matching ports. Try another name or contact support.",
              )}
            </Txt>
          ) : null}
          {q.data?.data.map((port) => (
            <Button
              key={port.id}
              secondary
              disabled={disabled}
              title={`${port.name} · ${port.country_code ?? ""}`}
              onPress={() => {
                choose(port);
                setOpen(false);
              }}
            />
          ))}
          {page > 1 ? (
            <Button
              secondary
              title={t("السابق", "Previous")}
              onPress={() => setPage(page - 1)}
            />
          ) : null}
          {q.data && page < q.data.meta.last_page ? (
            <Button
              secondary
              title={t("التالي", "Next")}
              onPress={() => setPage(page + 1)}
            />
          ) : null}
        </>
      ) : null}
    </Card>
  );
}
export function FreightCreate() {
  const { api, user, t, go } = useApp();
  const [step, setStep] = useState(0),
    [origin, setOrigin] = useState<FreightPort | null>(null),
    [destination, setDestination] = useState<FreightPort | null>(null);
  const [cargo, setCargo] = useState(""),
    [container, setContainer] = useState("40HC"),
    [quantity, setQuantity] = useState("1"),
    [weight, setWeight] = useState(""),
    [date, setDate] = useState("");
  const [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  const working = useRef(false),
    intent = useRef(new MutationIntent(Crypto.randomUUID));
  if (!isCompanyLeader(user)) return <Access />;
  const body = freightBody(
    origin,
    destination,
    cargo,
    container,
    quantity,
    weight,
    date,
  );
  async function submit() {
    if (!body || !confirmed || working.current) return;
    working.current = true;
    setBusy(true);
    setError(null);
    try {
      const key = intent.current.prepare(body);
      const response = await api.request<{ data: FreightQuote }>(
        "/freight/quotations",
        { method: "POST", body: { ...body, request_key: key } },
      );
      intent.current.succeeded();
      go({ name: "freight-detail", id: response.data.id });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      intent.current.failed(status);
      setUncertain(status === 0 || status >= 500);
      setError(e);
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Title
        title={t("طلب عرض سعر للشحن", "Request a freight quote")}
        sub={t("مسار الشحن · الشحنة · المراجعة", "Route · Cargo · Review")}
      />
      <Badge>{`${step + 1} / 3`}</Badge>
      {error ? (
        <ErrorBox
          error={error}
          summary={t(
            "تعذر إرسال الطلب. راجع التفاصيل أو أعد المحاولة بنفس الطلب.",
            "Unable to send. Check the details or retry the same request.",
          )}
        />
      ) : null}
      {uncertain ? (
        <Card>
          <Txt>
            {t(
              "لم نتأكد من نتيجة الإرسال. أعد إرسال نفس الطلب دون تغيير التفاصيل لتجنب التكرار.",
              "The result is uncertain. Retry the same request without changing its details to avoid duplicates.",
            )}
          </Txt>
        </Card>
      ) : null}
      {step === 0 ? (
        <>
          <PortPicker
            title={t("ميناء الانطلاق", "Origin port")}
            selected={origin}
            choose={setOrigin}
            disabled={busy}
          />
          <PortPicker
            title={t("ميناء الوصول", "Destination port")}
            selected={destination}
            choose={setDestination}
            disabled={busy}
          />
          {origin && destination && origin.id === destination.id ? (
            <Txt>
              {t(
                "اختر ميناء وصول مختلفًا.",
                "Choose a different destination port.",
              )}
            </Txt>
          ) : null}
        </>
      ) : null}
      {step === 1 ? (
        <Card>
          <Field
            title={t("نوع البضائع", "Cargo description")}
            value={cargo}
            set={setCargo}
          />
          <Field
            title={t(
              "نوع الحاوية (مثل 20GP أو 40HC)",
              "Container type (e.g. 20GP or 40HC)",
            )}
            value={container}
            set={setContainer}
          />
          <Field
            title={t("عدد الحاويات", "Number of containers")}
            value={quantity}
            set={setQuantity}
            decimal
          />
          <Field
            title={t(
              "الوزن الإجمالي بالكيلوغرام — اختياري",
              "Total weight in kg — optional",
            )}
            value={weight}
            set={setWeight}
            decimal
          />
          <Field
            title={t(
              "التاريخ المفضل YYYY-MM-DD — اختياري",
              "Preferred date YYYY-MM-DD — optional",
            )}
            value={date}
            set={setDate}
          />
        </Card>
      ) : null}
      {step === 2 ? (
        <Card>
          <Txt bold>
            {origin?.name} → {destination?.name}
          </Txt>
          <Txt>{cargo}</Txt>
          <Txt>{container + " × " + quantity}</Txt>
          <Txt>{t("الوزن (كغ): ", "Weight (kg): ") + (weight || "—")}</Txt>
          <Txt>{date || "—"}</Txt>
          <Txt muted>
            {t(
              "إرسال الطلب لا يؤكد سعرًا أو حجزًا. سيراجع فريق HAG متطلبات الشحنة.",
              "Submitting does not confirm a price or booking. HAG will review your shipment requirements.",
            )}
          </Txt>
          <Button
            secondary
            disabled={busy}
            title={
              (confirmed ? "✓ " : "○ ") +
              t("أؤكد صحة تفاصيل الطلب", "I confirm the request details")
            }
            onPress={() => setConfirmed(!confirmed)}
          />
        </Card>
      ) : null}
      {step > 0 ? (
        <Button
          secondary
          disabled={busy || uncertain}
          title={t("رجوع", "Back")}
          onPress={() => setStep(step - 1)}
        />
      ) : null}
      {step < 2 ? (
        <Button
          title={t("التالي", "Continue")}
          disabled={
            step === 0
              ? !origin || !destination || origin.id === destination.id
              : !body
          }
          onPress={() => setStep(step + 1)}
        />
      ) : (
        <Button
          title={
            busy
              ? t("جارٍ الإرسال…", "Sending…")
              : t("إرسال الطلب", "Submit request")
          }
          disabled={busy || !body || !confirmed}
          onPress={submit}
        />
      )}
    </Screen>
  );
}
