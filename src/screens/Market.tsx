import React, { useState } from "react";
import {
  Image,
  Pressable,
  View,
  ScrollView,
  Linking,
  useWindowDimensions,
  TextInput,
  Text,
} from "react-native";
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
import { BrandImage } from "./Welcome";
import { safeMedia } from "../core/api";
import type { Catalog, Listing, Page } from "../core/types";
import { label } from "../core/labels";
const sectorIcons: Record<string, React.ComponentProps<typeof Icon>["name"]> = {
  marine: "boat-outline",
  sea_freight: "boat-outline",
  machinery: "construct-outline",
  healthcare: "medkit-outline",
  agriculture: "leaf-outline",
  logistics: "cube-outline",
  automotive: "car-outline",
  real_estate: "home-outline",
  construction: "construct-outline",
  food: "restaurant-outline",
  technology: "hardware-chip-outline",
  energy: "flash-outline",
  consumer_goods: "bag-handle-outline",
  services: "briefcase-outline",
  industrial: "cog-outline",
};
export function Market() {
  const { width, fontScale } = useWindowDimensions();
  const columns = width >= 370 && fontScale <= 1.3 ? 2 : 1;
  const {
    api,
    ar,
    t,
    go,
    c,
    user,
    appConfig: config,
    reloadAppConfig,
    configStatus,
  } = useApp();
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
  const marine = useLoad("marine-" + ar + config.show_marine, () =>
    config.show_marine
      ? api.request<Page<Listing>>(
          "/opportunities?category=marine&per_page=5",
          { auth: false },
        )
      : Promise.resolve({
          data: [],
          meta: { current_page: 1, last_page: 1, total: 0, per_page: 5 },
        }),
  );
  const sectors = (catalog.data?.data.categories ?? []).filter(
    (v) => !config.categories.length || config.categories.includes(v),
  );
  const categoryCards = config.category_cards;
  function refresh() {
    q.reload();
    catalog.reload();
    marine.reload();
    reloadAppConfig();
  }
  function submit() {
    setTerm(search.trim());
    setPage(1);
  }
  return (
    <Screen refreshing={q.busy && !!q.data} onRefresh={refresh}>
      <Row between>
        <View style={{ flex: 1 }}>
          <Txt muted size={12}>
            {t("مرحبًا بك", "Welcome")}
            {user ? "، " + user.name.split(" ")[0] : ""}
          </Txt>
          <Txt bold size={25}>
            {ar ? config.home_title_ar : config.home_title_en}
          </Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("حسابي", "My account")}
          onPress={() => go({ name: "account" })}
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: c.soft,
            borderWidth: 1,
            borderColor: c.line,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="person-outline" />
        </Pressable>
      </Row>
      <View
        style={{
          marginTop: 18,
          marginBottom: 18,
          borderRadius: 24,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: c.line,
          elevation: 3,
        }}
      >
        <BrandImage uri={config.home_image} height={245}>
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              padding: 22,
              backgroundColor: "rgba(2,24,38,0.38)",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                color: "#F2DEB5",
                letterSpacing: 2,
                textAlign: ar ? "right" : "left",
              }}
            >
              HAG BROKERS · UAE
            </Text>
            <Text
              style={{
                fontSize: 25,
                fontWeight: "700",
                lineHeight: 34,
                color: "white",
                textAlign: ar ? "right" : "left",
                marginTop: 8,
              }}
            >
              {t("حيث تلتقي التجارة بالفرص", "Where trade meets opportunity")}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#EAF1F4",
                lineHeight: 22,
                textAlign: ar ? "right" : "left",
                marginTop: 8,
              }}
            >
              {ar ? config.home_body_ar : config.home_body_en}
            </Text>
          </View>
        </BrandImage>
      </View>
      <View
        style={{
          flexDirection: ar ? "row-reverse" : "row",
          alignItems: "center",
          backgroundColor: c.panel,
          borderRadius: 19,
          borderWidth: 1,
          borderColor: c.line,
          paddingHorizontal: 10,
          paddingVertical: 6,
          gap: 10,
          elevation: 2,
        }}
      >
        <Icon name="search-outline" size={22} color={c.gold} />
        <TextInput
          accessibilityLabel={t("البحث في الفرص", "Search opportunities")}
          placeholder={t("عن أي فرصة تبحث؟", "What are you looking for?")}
          placeholderTextColor={c.muted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={submit}
          returnKeyType="search"
          maxLength={150}
          style={{
            flex: 1,
            color: c.text,
            textAlign: ar ? "right" : "left",
            minHeight: 50,
            fontSize: 14,
            paddingVertical: 8,
          }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("بحث", "Search")}
          onPress={submit}
          style={{
            minHeight: 44,
            minWidth: 44,
            borderRadius: 13,
            backgroundColor: "#D9B879",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon
            name={ar ? "arrow-back" : "arrow-forward"}
            color="#102033"
            size={20}
          />
        </Pressable>
      </View>
      {(ar ? config.announcement_ar : config.announcement_en) ? (
        <View
          style={{
            marginTop: 16,
            padding: 16,
            backgroundColor: c.soft,
            borderRadius: 18,
          }}
        >
          <Txt size={13}>
            {ar ? config.announcement_ar : config.announcement_en}
          </Txt>
        </View>
      ) : null}
      {categoryCards.length > 0 && (
        <View style={{ marginTop: 24, marginBottom: 8 }}>
          <Row between>
            <View style={{ flex: 1 }}>
              <Txt bold size={20}>
                {t("استكشف المجالات", "Explore business sectors")}
              </Txt>
              <Txt muted size={12} style={{ marginTop: 4 }}>
                {t(
                  "اكتشف المنتجات والفرص حسب مجال عملك",
                  "Discover products and opportunities by sector",
                )}
              </Txt>
            </View>
            {category !== "" && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setCategory("");
                  setPage(1);
                }}
                style={{ padding: 8 }}
              >
                <Txt size={12} style={{ color: c.gold }}>
                  {t("عرض الكل", "View all")}
                </Txt>
              </Pressable>
            )}
          </Row>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 14 }}
            contentContainerStyle={{
              gap: 14,
              flexDirection: ar ? "row-reverse" : "row",
              paddingBottom: 8,
            }}
          >
            {categoryCards.map((item) => {
              const selected = category === item.code;
              const title =
                (ar ? item.title_ar : item.title_en) || label(item.code, ar);
              const description = ar
                ? item.description_ar
                : item.description_en;

              return (
                <Pressable
                  key={item.code}
                  accessibilityRole="button"
                  accessibilityLabel={title}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setCategory(selected ? "" : item.code);
                    setPage(1);
                  }}
                  style={{
                    width: 258,
                    height: 190,
                    borderRadius: 22,
                    overflow: "hidden",
                    backgroundColor: "#102D43",
                    borderWidth: selected ? 2 : 1,
                    borderColor: selected ? c.gold : c.line,
                  }}
                >
                  {item.image ? (
                    <Image
                      source={{ uri: item.image }}
                      resizeMode="cover"
                      style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon
                        name={sectorIcons[item.code] ?? "grid-outline"}
                        size={62}
                        color="#D9B879"
                      />
                    </View>
                  )}
                  <View
                    style={{
                      flex: 1,
                      justifyContent: "flex-end",
                      padding: 15,
                      backgroundColor: "rgba(3,20,33,0.55)",
                    }}
                  >
                    {item.featured && (
                      <View
                        style={{
                          alignSelf: ar ? "flex-end" : "flex-start",
                          backgroundColor: "#D9B879",
                          paddingHorizontal: 9,
                          paddingVertical: 4,
                          borderRadius: 20,
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          style={{
                            color: "#102D43",
                            fontSize: 10,
                            fontWeight: "700",
                          }}
                        >
                          {t("مميز", "FEATURED")}
                        </Text>
                      </View>
                    )}
                    <Text
                      numberOfLines={1}
                      style={{
                        color: "white",
                        fontSize: 19,
                        fontWeight: "700",
                        textAlign: ar ? "right" : "left",
                      }}
                    >
                      {title}
                    </Text>
                    {!!description && (
                      <Text
                        numberOfLines={2}
                        style={{
                          color: "#EAF1F4",
                          fontSize: 12,
                          lineHeight: 18,
                          marginTop: 5,
                          textAlign: ar ? "right" : "left",
                        }}
                      >
                        {description}
                      </Text>
                    )}
                    <Text
                      style={{
                        color: "#F2DEB5",
                        fontSize: 11,
                        fontWeight: "600",
                        marginTop: 8,
                        textAlign: ar ? "right" : "left",
                      }}
                    >
                      {selected
                        ? t("المجال المحدد", "Selected sector")
                        : t("استكشف الفرص", "Explore opportunities")}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {categoryCards.length === 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginVertical: 20 }}
          contentContainerStyle={{
            gap: 10,
            flexDirection: ar ? "row-reverse" : "row",
          }}
        >
          {["", ...sectors].map((v) => (
            <Pressable
              key={v}
              accessibilityRole="button"
              accessibilityState={{ selected: category === v }}
              onPress={() => {
                setCategory(v);
                setPage(1);
              }}
              style={{
                alignItems: "center",
                padding: 12,
                minWidth: 86,
                maxWidth: 135,
                borderRadius: 18,
                backgroundColor: category === v ? c.soft : c.panel,
                borderWidth: 1,
                borderColor: category === v ? c.gold : c.line,
                gap: 8,
              }}
            >
              <Icon name={sectorIcons[v] ?? "grid-outline"} size={25} />
              <Txt size={11}>{v ? label(v, ar) : t("الكل", "All")}</Txt>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {config.show_marine &&
        !category &&
        !term &&
        page === 1 &&
        (marine.data?.data.length ?? 0) > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Row between>
              <Txt bold size={20}>
                {t("عالم البحر", "The marine collection")}
              </Txt>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setCategory("marine");
                  setPage(1);
                }}
                style={{ padding: 10 }}
              >
                <Txt size={12} style={{ color: c.gold }}>
                  {t("عرض الكل", "View all")}
                </Txt>
              </Pressable>
            </Row>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 14,
                flexDirection: ar ? "row-reverse" : "row",
                paddingTop: 12,
              }}
            >
              {marine.data?.data.map((o) => (
                <View key={o.id} style={{ width: 270 }}>
                  <ListingCard
                    o={o}
                    onPress={() => go({ name: "detail", slug: o.slug })}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      <Row between>
        <Txt bold size={20}>
          {term || category
            ? t("نتائج البحث", "Search results")
            : t("أحدث الفرص", "Latest opportunities")}
        </Txt>
        {q.data && (
          <Txt muted size={12}>
            {q.data.meta.total} {t("فرصة", "opportunities")}
          </Txt>
        )}
      </Row>
      <View style={{ height: 14 }} />
      {catalog.error != null && (
        <ErrorBox error={catalog.error} retry={catalog.reload} />
      )}
      {q.busy && !q.data ? (
        <Loading />
      ) : q.error ? (
        <ErrorBox error={q.error} retry={q.reload} />
      ) : (
        <>
          <View
            style={{
              flexDirection: ar ? "row-reverse" : "row",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            {q.data?.data.map((o) => (
              <View
                key={o.id}
                style={{ width: columns === 2 ? "48%" : "100%" }}
              >
                <ListingCard
                  compact={columns === 2}
                  o={o}
                  onPress={() => go({ name: "detail", slug: o.slug })}
                />
              </View>
            ))}
          </View>
          {q.data?.data.length === 0 && (
            <View
              style={{
                marginTop: 8,
                marginBottom: 18,
                padding: 22,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: c.line,
                backgroundColor: c.panel,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: c.soft,
                  marginBottom: 16,
                }}
              >
                <Icon name="compass-outline" size={29} color={c.gold} />
              </View>
              <Txt bold size={19}>
                {t("اكتشف المزيد من المجالات", "Discover more sectors")}
              </Txt>
              <Txt muted style={{ marginTop: 8, lineHeight: 22 }}>
                {t(
                  "لا توجد فرص منشورة ضمن هذا الاختيار حالياً. استكشف المجالات الأخرى أو اعرض جميع الفرص.",
                  "There are no published opportunities in this selection right now. Explore other sectors or browse all opportunities.",
                )}
              </Txt>
              <View style={{ marginTop: 18 }}>
                <Button
                  secondary
                  title={t(
                    "استكشاف جميع المجالات والفرص",
                    "Explore all sectors & opportunities",
                  )}
                  onPress={() => {
                    setSearch("");
                    setTerm("");
                    setCategory("");
                    setPage(1);
                  }}
                />
              </View>
            </View>
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
  compact = false,
}: {
  compact?: boolean;
  o: Listing;
  onPress: () => void;
}) {
  const { api, t, ar, c } = useApp();
  const src = o.media.find((m) => m.type === "image");
  const url = src && safeMedia(api.origin, src.url);
  const location = [o.city, o.country].filter(Boolean).join(" · ");

  return (
    <Card onPress={onPress}>
      <View
        style={{
          height: compact ? 148 : 218,
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: "#102D43",
          marginBottom: 14,
          position: "relative",
        }}
      >
        {url ? (
          <Image
            source={{ uri: url }}
            resizeMode="cover"
            style={{ width: "100%", height: "100%" }}
            accessibilityLabel={o.title}
          />
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#102D43",
            }}
          >
            <Icon
              name={o.category === "marine" ? "boat-outline" : "cube-outline"}
              size={compact ? 48 : 62}
              color="#D9B879"
            />
            <Text
              style={{
                color: "#E8D5B0",
                fontSize: 10,
                letterSpacing: 2,
                marginTop: 8,
              }}
            >
              HAG BROKERS
            </Text>
          </View>
        )}

        {o.reviewed ? (
          <View
            style={{
              position: "absolute",
              top: 10,
              left: ar ? undefined : 10,
              right: ar ? 10 : undefined,
              backgroundColor: "rgba(9,19,31,0.84)",
              borderColor: "rgba(217,184,121,0.65)",
              borderWidth: 1,
              borderRadius: 20,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: "#F2DEB5", fontSize: 10, fontWeight: "600" }}>
              {t("فرصة تمت مراجعتها", "REVIEWED OPPORTUNITY")}
            </Text>
          </View>
        ) : null}

        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 58,
            backgroundColor: "rgba(3,20,33,0.42)",
            justifyContent: "center",
            paddingHorizontal: 13,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: "#FFFFFF",
              fontSize: 11,
              fontWeight: "600",
              textAlign: ar ? "right" : "left",
            }}
          >
            {o.category
              ? label(o.category, ar)
              : t("فرصة تجارية", "Business opportunity")}
          </Text>
        </View>
      </View>

      <Row between>
        <Badge>{label(o.type, ar)}</Badge>
        <Txt muted size={10}>
          {t("فرصة تجارية", "BUSINESS LISTING")}
        </Txt>
      </Row>

      <Txt
        numberOfLines={compact ? 2 : 3}
        size={compact ? 14 : 17}
        bold
        style={{ marginTop: 11, minHeight: compact ? 44 : 52 }}
      >
        {o.title}
      </Txt>

      {location ? (
        <View
          style={{
            flexDirection: ar ? "row-reverse" : "row",
            alignItems: "center",
            gap: 5,
            marginTop: 5,
          }}
        >
          <Icon name="location-outline" size={14} color={c.muted} />
          <Txt muted size={11} numberOfLines={1}>
            {location}
          </Txt>
        </View>
      ) : null}

      <View
        style={{
          marginTop: 13,
          paddingHorizontal: 11,
          paddingVertical: 9,
          borderRadius: 11,
          backgroundColor: c.soft,
          borderWidth: 1,
          borderColor: c.line,
          flexDirection: ar ? "row-reverse" : "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <Txt muted size={10}>
          {t("القيمة", "INDICATIVE PRICE")}
        </Txt>
        <Text
          numberOfLines={1}
          style={{
            color: c.gold,
            fontSize: compact ? 11 : 13,
            fontWeight: "700",
            flexShrink: 1,
            textAlign: ar ? "left" : "right",
          }}
        >
          {o.price
            ? `${o.price} ${o.currency}`
            : t("السعر عند التفاوض", "Price on enquiry")}
        </Text>
      </View>
    </Card>
  );
}
export function Detail({ slug }: { slug: string }) {
  const { api, ar, t, go, c, user } = useApp();
  const [selectedImage, setSelectedImage] = useState(0);
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
  const image = images[selectedImage] ?? images[0];
  const first = image && safeMedia(api.origin, image.url);
  return (
    <Screen>
      {first ? (
        <Image
          source={{ uri: first }}
          style={{ height: 350, borderRadius: 24, marginBottom: 20 }}
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
          {images.map((m, i) => {
            const u = safeMedia(api.origin, m.url);
            return u ? (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={t("عرض الصورة ", "Show image ") + (i + 1)}
                accessibilityState={{ selected: selectedImage === i }}
                onPress={() => setSelectedImage(i)}
                style={{
                  padding: 3,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: selectedImage === i ? c.gold : "transparent",
                }}
              >
                <Image
                  source={{ uri: u }}
                  style={{ width: 100, height: 78, borderRadius: 10 }}
                />
              </Pressable>
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
