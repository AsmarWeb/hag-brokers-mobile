import React, { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, View } from "react-native";
import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { ApiError } from "../core/api";
import { dubaiDate, MutationIntent } from "../core/intent";
import type { Catalog, OwnListing } from "../core/types";
import { label } from "../core/labels";
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Field,
  Loading,
  Row,
  Screen,
  Title,
  Txt,
  useApp,
  useLoad,
} from "../ui";
type Upload = { uri: string; name: string; type: string; size: number };
export function addFields(form: FormData, value: unknown, key: string) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => addFields(form, v, `${key}[${i}]`));
  } else if (value !== null && typeof value === "object") {
    Object.entries(value).forEach(([k, v]) =>
      addFields(form, v, key ? `${key}[${k}]` : k),
    );
  } else if (value !== undefined) {
    form.append(key, value === null ? "" : String(value));
  }
}
export function Chips({
  values,
  value,
  set,
}: {
  values: string[];
  value: string;
  set: (v: string) => void;
}) {
  const { c, ar } = useApp();
  return (
    <View
      style={{
        flexDirection: ar ? "row-reverse" : "row",
        flexWrap: "wrap",
        gap: 8,
        marginVertical: 12,
      }}
    >
      {values.map((v) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: value === v }}
          key={v}
          onPress={() => set(v)}
          style={{
            borderWidth: 1,
            borderColor: value === v ? c.gold : c.line,
            backgroundColor: value === v ? c.soft : c.panel,
            padding: 12,
            borderRadius: 12,
          }}
        >
          <Txt size={12}>{label(v, ar)}</Txt>
        </Pressable>
      ))}
    </View>
  );
}
export function Publish() {
  const { api, t, ar, go } = useApp();
  const [step, setStep] = useState(0),
    [type, setType] = useState("sell"),
    [category, setCategory] = useState(""),
    [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [country, setCountry] = useState("United Arab Emirates"),
    [city, setCity] = useState(""),
    [price, setPrice] = useState(""),
    [currency, setCurrency] = useState("AED"),
    [expiry, setExpiry] = useState(dubaiDate(30)),
    [vessel, setVessel] = useState("yacht"),
    [length, setLength] = useState(""),
    [files, setFiles] = useState<Upload[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [uncertain, setUncertain] = useState(false);
  const intent = useRef(new MutationIntent(Crypto.randomUUID));
  const catalog = useLoad("publish-catalog", () =>
    api.request<{ data: Catalog }>("/catalog", { auth: false }),
  );
  const marine = category === "marine" && ["sell", "buy"].includes(type);
  async function pick() {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.85,
      });
      if (res.canceled) return;
      const additions = res.assets.map((a) => ({
        uri: a.uri,
        name:
          a.fileName ??
          `upload-${a.assetId ?? Crypto.randomUUID()}.${a.type === "video" ? "mp4" : "jpg"}`,
        type: a.mimeType ?? (a.type === "video" ? "video/mp4" : "image/jpeg"),
        size: a.fileSize ?? new File(a.uri).size,
      }));
      const merged = [
        ...files,
        ...additions.filter((a) => !files.some((f) => f.uri === a.uri)),
      ];
      if (
        merged.length > 10 ||
        merged.some(
          (a) =>
            ![
              "image/jpeg",
              "image/png",
              "image/webp",
              "video/mp4",
              "video/quicktime",
              "video/webm",
            ].includes(a.type),
        ) ||
        merged.reduce((n, f) => n + f.size, 0) > 20 * 1024 * 1024
      )
        throw new ApiError(422);
      setFiles(merged);
    } catch (e) {
      setError(e);
    }
  }
  async function publish() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const body = {
      title,
      description,
      opportunity_type: type,
      category: category || null,
      country,
      city,
      currency,
      estimated_value: price || null,
      expires_at: expiry,
      ...(marine
        ? {
            commercial_details: {
              subcategory:
                vessel === "yacht"
                  ? "yachts"
                  : vessel === "boat"
                    ? "boats"
                    : "commercial_vessels",
            },
            vessel: {
              listing_type: type === "buy" ? "wanted" : "sale",
              vessel_category: vessel,
              length_m: length || null,
            },
          }
        : {}),
    };
    try {
      const key = intent.current.prepare({ body, files });
      const form = new FormData();
      addFields(form, { ...body, request_key: key }, "");
      files.forEach((f) =>
        form.append("media[]", {
          uri: f.uri,
          name: f.name,
          type: f.type,
        } as unknown as Blob),
      );
      const res = await api.request<{ data: OwnListing }>(
        "/company/opportunities",
        {
          method: "POST",
          ...(files.length
            ? { form }
            : { body: { ...body, request_key: key } }),
        },
      );
      intent.current.succeeded();
      go({ name: "manage", id: res.data.id });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      intent.current.failed(status);
      setUncertain(status === 0 || status >= 500);
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const titles = [
    t("ماذا تريد أن تنشر؟", "What would you like to publish?"),
    t("اختر القطاع", "Choose your sector"),
    t("تفاصيل تجعل فرصتك واضحة", "Make your opportunity clear"),
    t("أضف الصور والفيديو", "Add photos and video"),
    t("راجع قبل النشر", "Review before publishing"),
  ];
  return (
    <Screen>
      <Badge>
        {t("خطوة", "Step")} {step + 1} / 5
      </Badge>
      <View style={{ height: 12 }} />
      <Title title={titles[step]} />
      {uncertain && (
        <Card>
          <Txt>
            {t(
              "قد يكون الطلب وصل للخادم. أعد نفس الطلب دون تغيير، أو افحص فرص الشركة قبل بدء طلب جديد.",
              "The server may have received the request. Retry unchanged, or check company opportunities before starting another.",
            )}
          </Txt>
        </Card>
      )}
      <View pointerEvents={busy || uncertain ? "none" : "auto"}>
        {step === 0 && (
          <Chips
            values={[
              "sell",
              "buy",
              "service_offer",
              "service_request",
              "partnership",
              "distribution",
            ]}
            value={type}
            set={setType}
          />
        )}
        {step === 1 &&
          (catalog.busy ? (
            <Loading />
          ) : catalog.error ? (
            <ErrorBox error={catalog.error} retry={catalog.reload} />
          ) : (
            <Chips
              values={catalog.data?.data.categories ?? []}
              value={category}
              set={setCategory}
            />
          ))}
        {step === 2 && (
          <>
            <Field
              title={t("عنوان الفرصة", "Opportunity title")}
              value={title}
              set={setTitle}
            />
            <Field
              title={t(
                "وصف واضح لا يقل عن 20 حرفًا",
                "Clear description, at least 20 characters",
              )}
              value={description}
              set={setDescription}
              multiline
            />
            <Field
              title={t("الدولة", "Country")}
              value={country}
              set={setCountry}
            />
            <Field title={t("المدينة", "City")} value={city} set={setCity} />
            <Field
              title={t(
                "القيمة التقديرية، اختياري",
                "Estimated value, optional",
              )}
              value={price}
              set={setPrice}
              decimal
            />
            <Chips
              values={catalog.data?.data.currencies ?? ["AED", "USD", "EUR"]}
              value={currency}
              set={setCurrency}
            />
            <Field
              title={t(
                "آخر يوم للنشر: YYYY-MM-DD، بتوقيت دبي",
                "Expiry: YYYY-MM-DD, Dubai calendar day",
              )}
              value={expiry}
              set={setExpiry}
            />
            {marine && (
              <>
                <Txt>{t("المواصفات البحرية", "Marine specifications")}</Txt>
                <Chips
                  values={["yacht", "boat", "commercial_vessel"]}
                  value={vessel}
                  set={setVessel}
                />
                <Field
                  title={t(
                    "الطول بالمتر، اختياري",
                    "Length in metres, optional",
                  )}
                  value={length}
                  set={setLength}
                  decimal
                />
              </>
            )}
          </>
        )}
        {step === 3 && (
          <>
            <Card>
              <Txt>
                {t(
                  "حتى 10 ملفات، وبحجم إجمالي 20MB. اختر JPG أو PNG أو WEBP أو MP4 أو MOV أو WEBM.",
                  "Up to 10 files, 20MB total. Choose JPG, PNG, WEBP, MP4, MOV or WEBM.",
                )}
              </Txt>
            </Card>
            <Button
              secondary
              title={t("اختيار الصور والفيديو", "Choose photos & video")}
              onPress={() => void pick()}
            />
            {files.map((f, i) => (
              <Card key={f.uri + String(i)}>
                {f.type.startsWith("image/") && (
                  <Image
                    source={{ uri: f.uri }}
                    style={{ height: 140, borderRadius: 10 }}
                  />
                )}
                <Txt size={12}>{f.name}</Txt>
                <Button
                  secondary
                  title={t("إزالة", "Remove")}
                  onPress={() => setFiles((x) => x.filter((_, j) => i !== j))}
                />
              </Card>
            ))}
          </>
        )}
        {step === 4 && (
          <Card>
            <Txt size={20} bold>
              {title}
            </Txt>
            <Txt>
              {label(type, ar)} · {label(category, ar)}
            </Txt>
            <Txt muted>
              {country} · {city}
            </Txt>
            <Txt>
              {price
                ? price + " " + currency
                : t("القيمة غير محددة", "Value not specified")}
            </Txt>
            <Txt>{description}</Txt>
            <Txt muted>
              {files.length} {t("ملفات", "files")} · {expiry}
            </Txt>
            <View style={{ height: 14 }} />
            <Txt>
              {t(
                "بالنشر تصبح الفرصة عامة وفق أهلية المنصة وتستهلك حصة من خطتك.",
                "Publishing makes the opportunity public under platform eligibility rules and uses a plan slot.",
              )}
            </Txt>
          </Card>
        )}
      </View>
      {error != null && <ErrorBox error={error} />}
      {step < 4 ? (
        <Button
          disabled={
            busy ||
            (step === 1 && !category) ||
            (step === 2 && (!title.trim() || description.trim().length < 20))
          }
          title={t("التالي", "Continue")}
          onPress={() => {
            setError(null);
            setStep((x) => x + 1);
          }}
        />
      ) : (
        <Button
          disabled={busy}
          title={
            busy
              ? t("جارٍ النشر…", "Publishing…")
              : t("تأكيد ونشر الفرصة", "Confirm & publish")
          }
          onPress={() => void publish()}
        />
      )}
      {step > 0 && !uncertain && (
        <Button
          secondary
          disabled={busy}
          title={t("السابق", "Back")}
          onPress={() => setStep((x) => x - 1)}
        />
      )}
    </Screen>
  );
}
export function Manage({ id }: { id: number }) {
  const { api, t } = useApp();
  const q = useLoad("manage-" + id, () =>
    api.request<{ data: OwnListing }>("/company/opportunities/" + id),
  );
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [notes, setNotes] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (q.data) {
      setTitle(q.data.data.title);
      setDescription(q.data.data.description);
      setNotes(q.data.data.notes ?? "");
    }
  }, [q.data]);
  async function save(close = false) {
    if (!q.data || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.request(
        "/company/opportunities/" + id + (close ? "/close" : ""),
        {
          method: close ? "POST" : "PATCH",
          body: close
            ? { revision: q.data.data.revision, confirmation: true }
            : { revision: q.data.data.revision, title, description, notes },
        },
      );
      q.reload();
    } catch (e) {
      setError(e);
    } finally {
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
  return (
    <Screen>
      <Title title={t("إدارة الفرصة", "Manage opportunity")} />
      <Badge>
        {o.is_public
          ? t("ظاهرة في السوق", "Visible in marketplace")
          : t("غير ظاهرة حاليًا", "Not currently public")}
      </Badge>
      <Card>
        <Txt muted>
          {t(
            "المبالغ والنوع والتواريخ لا تتغير من شاشة تعديل النص.",
            "Amounts, type and dates stay unchanged when editing text.",
          )}
        </Txt>
        <Txt>
          {o.estimated_value} {o.currency}
        </Txt>
      </Card>
      <Field title={t("العنوان", "Title")} value={title} set={setTitle} />
      <Field
        title={t("الوصف", "Description")}
        value={description}
        set={setDescription}
        multiline
      />
      <Field
        title={t("ملاحظات الشركة الخاصة", "Private company notes")}
        value={notes}
        set={setNotes}
        multiline
      />
      {error != null && <ErrorBox error={error} retry={q.reload} />}
      <Button
        disabled={busy || o.marketplace_state === "closed"}
        title={t("حفظ التعديل", "Save changes")}
        onPress={() => void save()}
      />
      {o.marketplace_state !== "closed" && (
        <Button
          secondary
          disabled={busy}
          title={t("إغلاق الفرصة", "Close opportunity")}
          onPress={() =>
            Alert.alert(
              t("إغلاق الفرصة؟", "Close this opportunity?"),
              t(
                "ستختفي من السوق دون حذف السجل.",
                "It will leave the marketplace; history is retained.",
              ),
              [
                { text: t("إلغاء", "Cancel"), style: "cancel" },
                {
                  text: t("تأكيد الإغلاق", "Confirm close"),
                  onPress: () => void save(true),
                },
              ],
            )
          }
        />
      )}
    </Screen>
  );
}
