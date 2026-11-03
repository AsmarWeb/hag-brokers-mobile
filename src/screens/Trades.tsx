import React, { useEffect, useRef, useState } from "react";
import { Alert, AppState, View } from "react-native";
import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { ApiError, mergeMessages } from "../core/api";
import { dubaiDate, MutationIntent } from "../core/intent";
import type { Feed, Message, Notice, Offer, Page } from "../core/types";
import { label } from "../core/labels";
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
import { addFields, Chips } from "./Publish";
export function Offers() {
  const { api, t, ar, user, go } = useApp();
  const [page, setPage] = useState(1),
    [direction, setDirection] = useState("received");
  const q = useLoad("offers-" + user?.id + page + direction, () =>
    api.request<Page<Offer>>(
      "/company/trade-offers?" +
        new URLSearchParams({ page: String(page), direction, per_page: "15" }),
    ),
  );
  return (
    <Screen>
      <Title title={t("عروض شركتك", "Your company offers")} />
      <Button
        secondary
        title={
          direction === "received"
            ? t("الواردة • التبديل إلى المرسلة", "Received • switch to sent")
            : t("المرسلة • التبديل إلى الواردة", "Sent • switch to received")
        }
        onPress={() => {
          setDirection((x) => (x === "received" ? "sent" : "received"));
          setPage(1);
        }}
      />
      {q.busy ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} retry={q.reload} />
      ) : (
        <>
          {q.data?.data.map((o) => (
            <Card key={o.id} onPress={() => go({ name: "offer", id: o.id })}>
              {o.integrity ? (
                <>
                  <Badge>{label(o.status, ar)}</Badge>
                  <Txt size={18} bold>
                    {o.snapshot.title}
                  </Txt>
                  <Txt muted>
                    {direction === "received"
                      ? o.snapshot.sender
                      : o.snapshot.publisher}
                  </Txt>
                  <Txt>
                    {o.base_amount} {o.currency}
                  </Txt>
                </>
              ) : (
                <Txt>
                  {t(
                    "تعذّر التحقق من سلامة العرض",
                    "Offer integrity verification failed",
                  )}
                </Txt>
              )}
            </Card>
          ))}
          {q.data?.data.length === 0 && (
            <Card>
              <Txt>
                {t(
                  "لا توجد عروض في هذه القائمة بعد.",
                  "No offers in this list yet.",
                )}
              </Txt>
            </Card>
          )}
          {page > 1 && (
            <Button
              secondary
              title={t("السابق", "Previous")}
              onPress={() => setPage((x) => x - 1)}
            />
          )}
          {q.data && page < q.data.meta.last_page && (
            <Button
              secondary
              title={t("التالي", "Next")}
              onPress={() => setPage((x) => x + 1)}
            />
          )}
        </>
      )}
    </Screen>
  );
}
export function OfferDetail({ id }: { id: number }) {
  const { api, t, ar, user, go } = useApp();
  const q = useLoad("offer-" + id, () =>
    api.request<{ data: Offer }>("/company/trade-offers/" + id),
  );
  const [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  async function decide(action: string) {
    if (!q.data || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.request("/company/trade-offers/" + id + "/decision", {
        method: "POST",
        body: { action, version: q.data.data.version, reason, confirmed: true },
      });
      q.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function download(index: number) {
    setBusy(true);
    setError(null);
    let file: File | undefined;
    try {
      const data = await api.request<{
        bytes: Uint8Array;
        contentType: string;
      }>(`/company/trade-offers/${id}/attachments/${index}`, { binary: true });
      const ext = data.contentType.startsWith("application/pdf")
        ? "pdf"
        : data.contentType.startsWith("image/png")
          ? "png"
          : "jpg";
      file = new File(Paths.cache, `hag-private-${Crypto.randomUUID()}.${ext}`);
      await file.write(data.bytes);
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(file.uri, { mimeType: data.contentType });
      else throw new Error("sharing unavailable");
    } catch (e) {
      setError(e);
    } finally {
      if (file?.exists) file.delete();
      setBusy(false);
    }
  }
  if (q.busy) return <Loading />;
  if (q.error || !q.data)
    return (
      <Screen>
        <ErrorBox error={q.error} retry={q.reload} />
      </Screen>
    );
  const o = q.data.data;
  if (!o.integrity)
    return (
      <Screen>
        <ErrorBox error={new ApiError(409)} retry={q.reload} />
      </Screen>
    );
  const buyer = user?.company?.workspace_id === o.publisher_workspace_id;
  const active = ["submitted", "selected"].includes(o.status);
  return (
    <Screen>
      <Title
        title={o.snapshot.title}
        sub={buyer ? o.snapshot.sender : o.snapshot.publisher}
      />
      <Badge>{label(o.status, ar)}</Badge>
      <Card>
        <Txt size={25} bold>
          {o.base_amount} {o.currency}
        </Txt>
        <Txt muted>
          {t(
            "قيمة العرض الأساسية؛ ليست فاتورة أو مبلغًا محصلًا.",
            "Base offer value; not an invoice or collected payment.",
          )}
        </Txt>
        <Txt>
          {o.quantity} {label(o.unit, ar)} × {o.unit_price} {o.currency}
        </Txt>
        <Txt>
          {t("الصلاحية", "Valid until")}: {o.valid_until}
        </Txt>
        <Txt>
          {t("مدة التوريد بالأيام", "Delivery days")}: {o.delivery_days}
        </Txt>
        <Txt>
          {t("أساس الضريبة", "Tax basis")}: {label(o.tax_basis, ar)}
        </Txt>
        <Txt>{o.payment_terms}</Txt>
        {o.notes && <Txt muted>{o.notes}</Txt>}
      </Card>
      {o.attachments.map((f) => (
        <Button
          secondary
          disabled={busy}
          key={f.index}
          title={
            t("فتح المرفق الخاص", "Open private attachment") +
            " " +
            (f.index + 1)
          }
          onPress={() => void download(f.index)}
        />
      ))}
      <Button
        title={t("فتح غرفة التفاوض", "Open negotiation room")}
        onPress={() => go({ name: "room", id })}
      />
      {active && (
        <Card>
          <Field
            title={t(
              "سبب القرار، 10 أحرف على الأقل",
              "Decision reason, at least 10 characters",
            )}
            value={reason}
            set={setReason}
            multiline
          />
          {(buyer
            ? o.status === "submitted"
              ? ["selected", "declined"]
              : ["declined"]
            : ["withdrawn"]
          ).map((action) => (
            <Button
              key={action}
              secondary
              disabled={busy || reason.trim().length < 10}
              title={label(action, ar)}
              onPress={() =>
                Alert.alert(
                  t("تأكيد القرار", "Confirm decision"),
                  t(
                    "اختيار العرض لا ينشئ عقدًا أو دفعًا تلقائيًا.",
                    "Selecting an offer does not create a contract or payment.",
                  ),
                  [
                    { text: t("إلغاء", "Cancel"), style: "cancel" },
                    {
                      text: t("تأكيد", "Confirm"),
                      onPress: () => void decide(action),
                    },
                  ],
                )
              }
            />
          ))}
        </Card>
      )}
      {error != null && <ErrorBox error={error} retry={q.reload} />}
    </Screen>
  );
}
export function Rfq({ id }: { id: number }) {
  const { api, t, go } = useApp();
  const [quantity, setQuantity] = useState("1"),
    [price, setPrice] = useState(""),
    [unit, setUnit] = useState("piece"),
    [currency, setCurrency] = useState("AED"),
    [tax, setTax] = useState("not_specified"),
    [days, setDays] = useState("7"),
    [valid, setValid] = useState(dubaiDate(10)),
    [terms, setTerms] = useState(""),
    [notes, setNotes] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [confirmed, setConfirmed] = useState(false),
    [files, setFiles] = useState<
      { uri: string; name: string; mimeType?: string; size?: number }[]
    >([]);
  const intent = useRef(new MutationIntent(Crypto.randomUUID));
  useEffect(
    () => setConfirmed(false),
    [quantity, price, unit, currency, tax, days, valid, terms, notes, files],
  );
  async function pick() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const all = [...files, ...res.assets];
      if (
        all.length > 3 ||
        all.some((f) => (f.size ?? new File(f.uri).size) > 5 * 1024 * 1024) ||
        all.reduce((n, f) => n + (f.size ?? new File(f.uri).size), 0) >
          10 * 1024 * 1024
      )
        throw new ApiError(422);
      setFiles(all);
    } catch (e) {
      setError(e);
    }
  }
  async function send() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const body = {
      quantity,
      unit,
      unit_price: price,
      currency,
      tax_basis: tax,
      delivery_days: Number(days),
      valid_until: valid,
      payment_terms: terms,
      notes,
      confirmed: true,
    };
    try {
      const key = intent.current.prepare({ body, files });
      const form = new FormData();
      addFields(form, { ...body, request_key: key }, "");
      files.forEach((f) =>
        form.append("attachments[]", {
          uri: f.uri,
          name: f.name,
          type: f.mimeType ?? "application/pdf",
        } as unknown as Blob),
      );
      const res = await api.request<{ data: Offer }>(
        `/company/opportunities/${id}/offers`,
        {
          method: "POST",
          ...(files.length
            ? { form }
            : { body: { ...body, request_key: key } }),
        },
      );
      intent.current.succeeded();
      go({ name: "offer", id: res.data.id });
    } catch (e) {
      intent.current.failed(e instanceof ApiError ? e.status : 0);
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Title
        title={t("قدّم عرضًا تجاريًا واضحًا", "Make a clear commercial offer")}
        sub={t(
          "الشروط محفوظة بعد الإرسال؛ راجعها بعناية.",
          "Terms are frozen after submission; review carefully.",
        )}
      />
      <Field
        title={t("الكمية", "Quantity")}
        value={quantity}
        set={setQuantity}
        decimal
      />
      <Chips
        values={["piece", "kg", "tonne", "litre", "metre", "set", "service"]}
        value={unit}
        set={setUnit}
      />
      <Field
        title={t("سعر الوحدة", "Unit price")}
        value={price}
        set={setPrice}
        decimal
      />
      <Chips
        values={[
          "AED",
          "USD",
          "EUR",
          "GBP",
          "SAR",
          "QAR",
          "KWD",
          "OMR",
          "BHD",
          "INR",
          "CNY",
        ]}
        value={currency}
        set={setCurrency}
      />
      <Txt>{t("أساس الضريبة", "Tax basis")}</Txt>
      <Chips
        values={["exclusive", "inclusive", "not_specified"]}
        value={tax}
        set={setTax}
      />
      <Field
        title={t("أيام التوريد", "Delivery days")}
        value={days}
        set={setDays}
        decimal
      />
      <Field
        title={t(
          "صالح حتى YYYY-MM-DD بتوقيت دبي",
          "Valid until YYYY-MM-DD, Dubai calendar day",
        )}
        value={valid}
        set={setValid}
      />
      <Field
        title={t("شروط الدفع", "Payment terms")}
        value={terms}
        set={setTerms}
        multiline
      />
      <Field
        title={t("ملاحظات، اختيارية", "Notes, optional")}
        value={notes}
        set={setNotes}
        multiline
      />
      <Button
        secondary
        title={t("إضافة مرفقات خاصة", "Add private attachments")}
        onPress={() => void pick()}
      />
      {files.map((f, i) => (
        <Card key={f.uri + i}>
          <Txt>{f.name}</Txt>
          <Button
            secondary
            title={t("إزالة", "Remove")}
            onPress={() => setFiles((x) => x.filter((_, j) => j !== i))}
          />
        </Card>
      ))}
      <Button
        secondary
        title={
          confirmed
            ? t(
                "✓ راجعت الشروط وأوافق على إرسالها",
                "✓ Terms reviewed and confirmed",
              )
            : t(
                "تأكيد مراجعة الشروط قبل الإرسال",
                "Confirm that you reviewed the terms",
              )
        }
        onPress={() => setConfirmed((x) => !x)}
      />
      {error != null && <ErrorBox error={error} />}
      <Button
        disabled={busy || !confirmed || terms.trim().length < 10 || !price}
        title={
          busy
            ? t("جارٍ الإرسال…", "Sending…")
            : t("إرسال العرض", "Submit offer")
        }
        onPress={() => void send()}
      />
    </Screen>
  );
}
export function Room({ id }: { id: number }) {
  const { api, t, c, user } = useApp();
  const [messages, setMessages] = useState<Message[]>([]),
    [room, setRoom] = useState<Feed["room"] | null>(null),
    [older, setOlder] = useState(false),
    [busy, setBusy] = useState(false),
    [draft, setDraft] = useState(""),
    [error, setError] = useState<unknown>(null),
    [restart, setRestart] = useState(0);
  const cursor = useRef(0),
    draftRef = useRef(""),
    intent = useRef(new MutationIntent(Crypto.randomUUID));
  draftRef.current = draft;
  useEffect(() => {
    let alive = true,
      working = false,
      active = AppState.currentState === "active",
      blocked = false,
      retryAt = 0;
    const ctrl = new AbortController();
    cursor.current = 0;
    setMessages([]);
    setRoom(null);
    setError(null);
    const poll = async () => {
      if (!alive || working || !active || blocked || Date.now() < retryAt)
        return;
      working = true;
      try {
        let batches = 0;
        while (alive && batches++ < 3) {
          const initial = cursor.current === 0;
          const res = await api.request<Feed>(
            `/company/trade-offers/${id}/messages` +
              (initial ? "" : `?after_id=${cursor.current}`),
            { signal: ctrl.signal },
          );
          if (!alive) return;
          setMessages((old) => mergeMessages(old, res.data));
          setRoom(res.room);
          if (initial) setOlder(res.meta.has_more);
          if (res.meta.last_id)
            cursor.current = Math.max(cursor.current, res.meta.last_id);
          setError(null);
          if (initial || !res.meta.has_more) break;
        }
      } catch (e) {
        if (alive) {
          setError(e);
          if (e instanceof ApiError) {
            blocked = [401, 403, 404, 409].includes(e.status);
            if (e.status === 429)
              retryAt = Date.now() + Math.max(10, e.retryAfter) * 1000;
          }
        }
      } finally {
        working = false;
      }
    };
    const sub = AppState.addEventListener("change", (s) => {
      active = s === "active";
      if (active) void poll();
    });
    void poll();
    const timer = setInterval(() => void poll(), 8000);
    return () => {
      alive = false;
      ctrl.abort();
      sub.remove();
      clearInterval(timer);
    };
  }, [id, user?.id, restart, api]);
  async function old() {
    if (busy || !messages.length) return;
    setBusy(true);
    try {
      const res = await api.request<Feed>(
        `/company/trade-offers/${id}/messages?before_id=${messages[0].id}`,
      );
      setMessages((x) => mergeMessages(x, res.data));
      setOlder(res.meta.has_more);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    if (busy || !draft.trim()) return;
    const body = draft;
    setBusy(true);
    setError(null);
    try {
      const key = intent.current.prepare(body);
      const res = await api.request<{ data: Message }>(
        `/company/trade-offers/${id}/messages`,
        { method: "POST", body: { request_key: key, body } },
      );
      intent.current.succeeded();
      setMessages((x) => mergeMessages(x, [res.data]));
      if (draftRef.current === body) setDraft("");
    } catch (e) {
      intent.current.failed(e instanceof ApiError ? e.status : 0);
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  async function read() {
    if (!messages.length) return;
    setBusy(true);
    try {
      await api.request(`/company/trade-offers/${id}/read`, {
        method: "POST",
        body: { up_to: messages[messages.length - 1].id },
      });
      setRoom((x) =>
        x
          ? {
              ...x,
              own_read_up_to: messages[messages.length - 1].id,
              unread: 0,
            }
          : x,
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Title
        title={t("غرفة التفاوض", "Negotiation room")}
        sub={t(
          "محادثة خاصة بين الشركتين",
          "Private conversation between both companies",
        )}
      />
      {error != null && (
        <ErrorBox error={error} retry={() => setRestart((x) => x + 1)} />
      )}
      {!room && !error && <Loading />}
      {older && (
        <Button
          secondary
          disabled={busy}
          title={t("تحميل الرسائل الأقدم", "Load older messages")}
          onPress={() => void old()}
        />
      )}
      {messages.map((m) => (
        <View
          key={m.id}
          style={{
            alignSelf: m.mine ? "flex-end" : "flex-start",
            maxWidth: "90%",
            padding: 14,
            borderRadius: 15,
            backgroundColor: m.mine ? "#16324C" : c.panel,
            marginVertical: 6,
            borderWidth: 1,
            borderColor: m.mine ? "#24445F" : c.line,
          }}
        >
          <Txt muted size={11} style={m.mine ? { color: "#C1CFDA" } : {}}>
            {m.author_name}
          </Txt>
          <Txt style={m.mine ? { color: "#F3EEE4" } : {}}>{m.body}</Txt>
          <Txt muted size={11} style={m.mine ? { color: "#C1CFDA" } : {}}>
            {new Date(m.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {m.mine && room && m.id <= room.other_read_up_to
              ? " · " + t("مقروء", "Read")
              : ""}
          </Txt>
        </View>
      ))}
      {room && room.unread > 0 && (
        <Button
          secondary
          disabled={busy}
          title={t(
            "تأكيد قراءة الرسائل المعروضة",
            "Acknowledge displayed messages",
          )}
          onPress={() => void read()}
        />
      )}
      {room?.writable ? (
        <>
          <Field
            title={t("رسالتك", "Your message")}
            value={draft}
            set={setDraft}
            multiline
          />
          <Button
            disabled={busy || !draft.trim()}
            title={t("إرسال", "Send")}
            onPress={() => void send()}
          />
        </>
      ) : (
        room && (
          <Card>
            <Txt>
              {t(
                "الغرفة للقراءة فقط حاليًا.",
                "This room is currently read-only.",
              )}
            </Txt>
          </Card>
        )
      )}
    </Screen>
  );
}
export function Notices() {
  const { api, user, t, go, ar } = useApp();
  const [page, setPage] = useState(1),
    [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  const q = useLoad("notices-" + user?.id + page, () =>
    api.request<Page<Notice>>(
      "/company/notifications?page=" + page + "&per_page=20",
    ),
  );
  async function mark(id: string) {
    setBusy(true);
    try {
      await api.request("/company/notifications/" + id + "/read", {
        method: "PATCH",
      });
      q.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Title
        title={t("تنبيهات الشركة", "Company notifications")}
        sub={
          q.data
            ? t("غير المقروء: ", "Unread: ") + q.data.meta.unread
            : undefined
        }
      />
      {q.busy ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} retry={q.reload} />
      ) : (
        <>
          {q.data?.data.map((n) => (
            <Card key={n.id}>
              <Badge>{n.read_at ? t("مقروء", "Read") : t("جديد", "New")}</Badge>
              <Txt bold>{n.title}</Txt>
              <Txt muted size={12}>
                {label(n.type, ar)}
              </Txt>
              {n.offer_id && (
                <Button
                  secondary
                  title={t("فتح العرض", "Open offer")}
                  onPress={() => go({ name: "offer", id: n.offer_id! })}
                />
              )}
              {n.opportunity_id && (
                <Button
                  secondary
                  title={t("فتح الفرصة الخاصة", "Open company opportunity")}
                  onPress={() => go({ name: "manage", id: n.opportunity_id! })}
                />
              )}
              {!n.read_at && (
                <Button
                  secondary
                  disabled={busy}
                  title={t("تعليم كمقروء", "Mark read")}
                  onPress={() => void mark(n.id)}
                />
              )}
            </Card>
          ))}
          {q.data?.data.length === 0 && (
            <Card>
              <Txt>
                {t(
                  "لا توجد تنبيهات مؤهلة حاليًا.",
                  "No eligible notifications yet.",
                )}
              </Txt>
            </Card>
          )}
          {page > 1 && (
            <Button
              secondary
              title={t("السابق", "Previous")}
              onPress={() => setPage((x) => x - 1)}
            />
          )}
          {q.data && page < q.data.meta.last_page && (
            <Button
              secondary
              title={t("التالي", "Next")}
              onPress={() => setPage((x) => x + 1)}
            />
          )}
        </>
      )}
      {error != null && <ErrorBox error={error} />}
    </Screen>
  );
}
