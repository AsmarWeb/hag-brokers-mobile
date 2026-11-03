import React, { useState } from "react";
import { Image, Pressable, View, ScrollView, Linking } from "react-native";
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Field,
  Icon,
  Loading,
  Row,
  Screen,
  Title,
  Txt,
  useApp,
  useLoad,
} from "../ui";
import { safeMedia } from "../core/api";
import type { Catalog, Listing, Page } from "../core/types";
import { label } from "../core/labels";
export function Market() {
  const { api, ar, t, go, c } = useApp();
  const [search, setSearch] = useState(""),
    [term, setTerm] = useState(""),
    [category, setCategory] = useState(""),
    [page, setPage] = useState(1);
  const catalog = useLoad("catalog-" + ar, () =>
    api.request<{ data: Catalog }>("/catalog", { auth: false }),
  );
  const q = useLoad(["market", term, category, page, ar].join("|"), () =>
    api.request<Page<Listing>>(
      "/opportunities?" +
        new URLSearchParams({
          search: term,
          category,
          page: String(page),
          per_page: "10",
        }),
      { auth: false },
    ),
  );
  return (
    <Screen>
      <Txt style={{ color: c.gold }} size={12}>
        {t("من الإمارات إلى العالم", "From the UAE to the world")}
      </Txt>
      <Title
        title={t(
          "فرص تجارية. علاقات تصنع الفرق.",
          "Business opportunities. Meaningful connections.",
        )}
        sub={t(
          "موردون وطلبات شراء وشراكات جديدة.",
          "Suppliers, buying requests and new partnerships.",
        )}
      />
      <Field
        title={t("البحث في السوق", "Search the marketplace")}
        value={search}
        set={setSearch}
      />
      <Button
        title={t("بحث", "Search")}
        onPress={() => {
          setTerm(search.trim());
          setPage(1);
        }}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginVertical: 15 }}
        contentContainerStyle={{
          gap: 8,
          flexDirection: ar ? "row-reverse" : "row",
        }}
      >
        {["", ...(catalog.data?.data.categories ?? [])].map((v) => (
          <Pressable
            accessibilityRole="button"
            key={v}
            onPress={() => {
              setCategory(v);
              setPage(1);
            }}
            style={{
              backgroundColor: category === v ? c.soft : c.panel,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: category === v ? c.gold : c.line,
            }}
          >
            <Txt size={12}>
              {v ? label(v, ar) : t("جميع القطاعات", "All sectors")}
            </Txt>
          </Pressable>
        ))}
      </ScrollView>
      <Row between>
        <Txt bold size={17}>
          {t("فرص تستحق الاكتشاف", "Worth discovering")}
        </Txt>
        {q.data && (
          <Txt muted size={12}>
            {q.data.meta.total} {t("فرصة", "opportunities")}
          </Txt>
        )}
      </Row>
      <View style={{ height: 12 }} />
      {q.busy ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} retry={q.reload} />
      ) : (
        <>
          {q.data?.data.map((o) => (
            <ListingCard
              key={o.id}
              o={o}
              onPress={() => go({ name: "detail", slug: o.slug })}
            />
          ))}
          {q.data?.data.length === 0 && (
            <Card>
              <Txt>
                {t(
                  "لا توجد فرص مطابقة حاليًا. جرّب قطاعًا أو كلمة أخرى.",
                  "No matching opportunities yet. Try another sector or search.",
                )}
              </Txt>
            </Card>
          )}
          <Row between>
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
          </Row>
        </>
      )}
    </Screen>
  );
}
export function ListingCard({
  o,
  onPress,
}: {
  o: Listing;
  onPress: () => void;
}) {
  const { api, t, ar, c } = useApp();
  const src = o.media.find((m) => m.type === "image");
  const url = src && safeMedia(api.origin, src.url);
  return (
    <Card onPress={onPress}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ height: 175, borderRadius: 12, marginBottom: 12 }}
          accessibilityLabel={o.title}
        />
      ) : (
        <View
          style={{
            height: 130,
            backgroundColor: "#102D43",
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <Icon
            name={o.category === "marine" ? "boat-outline" : "cube-outline"}
            size={60}
            color="#D9B879"
          />
        </View>
      )}
      <Row between>
        <Badge>{label(o.type, ar)}</Badge>
        {o.reviewed && (
          <Txt muted size={11}>
            {t("تمت المراجعة", "Reviewed")}
          </Txt>
        )}
      </Row>
      <Txt size={18} bold style={{ marginTop: 10 }}>
        {o.title}
      </Txt>
      <Txt muted size={12}>
        {[o.city, o.country].filter(Boolean).join(" · ")}
      </Txt>
      <Txt style={{ color: c.gold, marginTop: 8 }}>
        {o.price
          ? `${o.price} ${o.currency}`
          : t("السعر عند التفاوض", "Price on enquiry")}
      </Txt>
    </Card>
  );
}
export function Detail({ slug }: { slug: string }) {
  const { api, ar, t, go, c, user } = useApp();
  const q = useLoad("detail-" + slug + ar, () =>
    api.request<{ data: Listing }>(
      "/opportunities/" + encodeURIComponent(slug),
      { auth: false },
    ),
  );
  if (q.busy) return <Loading />;
  if (q.error || !q.data)
    return (
      <Screen>
        <ErrorBox error={q.error} retry={q.reload} />
      </Screen>
    );
  const o = q.data.data;
  const images = o.media.filter((m) => m.type === "image");
  const first = images[0] && safeMedia(api.origin, images[0].url);
  return (
    <Screen>
      {first ? (
        <Image
          source={{ uri: first }}
          style={{ height: 250, borderRadius: 18, marginBottom: 20 }}
          accessibilityLabel={o.title}
        />
      ) : (
        <View
          style={{
            height: 210,
            backgroundColor: "#102D43",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 18,
            marginBottom: 20,
          }}
        >
          <Icon
            name={o.category === "marine" ? "boat-outline" : "business-outline"}
            size={90}
            color="#D9B879"
          />
        </View>
      )}
      <Badge>
        {label(o.type, ar)} ·{" "}
        {o.category ? label(o.category, ar) : t("أعمال", "Business")}
      </Badge>
      <View style={{ height: 12 }} />
      <Title
        title={o.title}
        sub={[o.city, o.country].filter(Boolean).join(" · ")}
      />
      <Txt size={20} style={{ color: c.gold, marginBottom: 18 }}>
        {o.price
          ? o.price + " " + o.currency
          : t("الميزانية عند التفاوض", "Budget to be discussed")}
      </Txt>
      <Card>
        <Txt>{o.description}</Txt>
      </Card>
      {o.vessel && (
        <Card>
          <Txt bold>{t("المواصفات البحرية", "Marine specifications")}</Txt>
          {[
            "builder",
            "year_built",
            "length_m",
            "beam_m",
            "cabins",
            "guest_capacity",
          ]
            .filter((k) => o.vessel?.[k] != null)
            .map((k) => (
              <Row between key={k}>
                <Txt muted size={12}>
                  {
                    (
                      {
                        builder: t("الصانع", "Builder"),
                        year_built: t("سنة البناء", "Year built"),
                        length_m: t("الطول بالمتر", "Length, m"),
                        beam_m: t("العرض بالمتر", "Beam, m"),
                        cabins: t("الكبائن", "Cabins"),
                        guest_capacity: t("الضيوف", "Guests"),
                      } as Record<string, string>
                    )[k]
                  }
                </Txt>
                <Txt>{String(o.vessel?.[k])}</Txt>
              </Row>
            ))}
        </Card>
      )}
      {o.commercial_details && (
        <Card>
          <Txt bold>{t("التفاصيل التجارية", "Commercial details")}</Txt>
          {[
            "product_name",
            "specifications",
            "quantity",
            "unit",
            "payment_terms",
            "delivery_terms",
            "target_market",
          ]
            .filter((k) => o.commercial_details?.[k] != null)
            .map((k) => (
              <View key={k} style={{ marginTop: 9 }}>
                <Txt muted size={11}>
                  {
                    (
                      {
                        product_name: t("المنتج", "Product"),
                        specifications: t("المواصفات", "Specifications"),
                        quantity: t("الكمية", "Quantity"),
                        unit: t("الوحدة", "Unit"),
                        payment_terms: t("شروط الدفع", "Payment terms"),
                        delivery_terms: t("التسليم", "Delivery"),
                        target_market: t("السوق المستهدف", "Target market"),
                      } as Record<string, string>
                    )[k]
                  }
                </Txt>
                <Txt>{String(o.commercial_details?.[k])}</Txt>
              </View>
            ))}
        </Card>
      )}
      {images.length > 1 && (
        <ScrollView
          horizontal
          contentContainerStyle={{ gap: 10 }}
          style={{ marginBottom: 14 }}
        >
          {images.slice(1).map((m, i) => {
            const u = safeMedia(api.origin, m.url);
            return u ? (
              <Image
                key={i}
                source={{ uri: u }}
                style={{ width: 130, height: 95, borderRadius: 10 }}
                accessibilityLabel={o.title}
              />
            ) : null;
          })}
        </ScrollView>
      )}
      {o.media
        .filter((m) => m.type === "video")
        .map((m, i) => {
          const u = safeMedia(api.origin, m.url);
          return u ? (
            <Button
              key={i}
              secondary
              title={t("مشاهدة الفيديو", "Watch video")}
              onPress={() => {
                void Linking.openURL(u);
              }}
            />
          ) : null;
        })}
      {["buy", "service_request", "procurement"].includes(o.type) && (
        <Button
          title={t("تقديم عرض توريد", "Submit a supplier offer")}
          onPress={() =>
            go(user ? { name: "rfq", id: o.id } : { name: "auth" })
          }
        />
      )}
      {!user && (
        <Button
          secondary
          title={t("تسجيل الدخول للشركات", "Sign in to your company")}
          onPress={() => go({ name: "auth" })}
        />
      )}
    </Screen>
  );
}
