import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultConfig, parseAppConfig } from "../src/core/appConfig";
const origin = "https://hagbrokers.net";
test("missing and malformed app configuration keeps usable local defaults", () => {
  for (const raw of [null, undefined, [], false, "bad"])
    assert.deepEqual(parseAppConfig(raw, origin), defaultConfig);
  const data = parseAppConfig(
    {
      app_name: "x".repeat(41),
      welcome_enabled: "false",
      home_title_ar: [],
      version: -1,
    },
    origin,
  );
  assert.deepEqual(data, defaultConfig);
});
test("remote configuration cannot inject external images or unsafe shortcuts", () => {
  const data = parseAppConfig(
    {
      home_image: "https://evil.test/x.jpg",
      welcome_image: "javascript:alert(1)",
      categories: ["marine", "marine", "../../admin", "food", "FOOD"],
      token: "secret",
    },
    origin,
  );
  assert.equal(data.home_image, null);
  assert.equal(data.welcome_image, null);
  assert.deepEqual(data.categories, ["marine", "food"]);
  assert.equal("token" in data, false);
});
test("valid bilingual content and same origin uploads are supported without changing language preference", () => {
  const data = parseAppConfig(
    {
      home_image: "/storage/mobile-app/a.jpg",
      home_title_ar: "فرص الإمارات",
      home_title_en: "UAE opportunities",
      show_marine: false,
      version: 2,
    },
    origin,
  );
  assert.equal(data.home_image, origin + "/storage/mobile-app/a.jpg");
  assert.equal(data.home_title_ar, "فرص الإمارات");
  assert.equal(data.home_title_en, "UAE opportunities");
  assert.equal(data.show_marine, false);
  assert.equal(data.version, 2);
});

test("admin-managed category cards are validated, sorted and localized", () => {
  const data = parseAppConfig(
    {
      category_cards: [
        {
          code: "food",
          title_ar: "الأغذية",
          title_en: "Food",
          description_ar: "فرص المنتجات الغذائية",
          description_en: "Food supply opportunities",
          image: "/storage/mobile-app/categories/food.jpg",
          enabled: true,
          featured: true,
          sort_order: 5,
        },
        {
          code: "agriculture",
          title_ar: "الزراعة",
          title_en: "Agriculture",
          description_ar: "",
          description_en: "Agricultural products",
          image: null,
          enabled: true,
          featured: false,
          sort_order: 1,
        },
      ],
    },
    origin,
  );

  assert.deepEqual(
    data.category_cards.map((card) => card.code),
    ["agriculture", "food"],
  );
  assert.equal(data.category_cards[1].title_ar, "الأغذية");
  assert.equal(data.category_cards[1].title_en, "Food");
  assert.equal(
    data.category_cards[1].image,
    origin + "/storage/mobile-app/categories/food.jpg",
  );
  assert.equal(data.category_cards[1].featured, true);
});

test("disabled, duplicate and malformed category cards are ignored", () => {
  const data = parseAppConfig(
    {
      category_cards: [
        {
          code: "food",
          title_en: "Food",
          enabled: true,
          sort_order: 2,
        },
        {
          code: "food",
          title_en: "Duplicate",
          enabled: true,
          sort_order: 1,
        },
        {
          code: "marine",
          title_en: "Marine",
          enabled: false,
        },
        {
          code: "../../admin",
          title_en: "Unsafe",
          enabled: true,
        },
        null,
        "invalid",
      ],
    },
    origin,
  );

  assert.equal(data.category_cards.length, 1);
  assert.equal(data.category_cards[0].code, "food");
  assert.equal(data.category_cards[0].title_en, "Food");
});

test("category cards reject external images and constrain text and sort values", () => {
  const data = parseAppConfig(
    {
      category_cards: [
        {
          code: "electronics",
          title_ar: "x".repeat(101),
          title_en: "Electronics",
          description_ar: "x".repeat(241),
          description_en: "Safe description",
          image: "https://evil.test/category.jpg",
          enabled: true,
          featured: "yes",
          sort_order: -5,
        },
        {
          code: "machinery",
          title_en: "Machinery",
          image: "javascript:alert(1)",
          enabled: true,
          sort_order: 1000,
        },
      ],
    },
    origin,
  );

  const electronics = data.category_cards[0];
  assert.equal(electronics.title_ar, "");
  assert.equal(electronics.title_en, "Electronics");
  assert.equal(electronics.description_ar, "");
  assert.equal(electronics.description_en, "Safe description");
  assert.equal(electronics.image, null);
  assert.equal(electronics.featured, false);
  assert.equal(electronics.sort_order, 999);

  assert.equal(data.category_cards[1].image, null);
  assert.equal(data.category_cards[1].sort_order, 999);
});

test("missing category cards preserve the empty local default", () => {
  const data = parseAppConfig({ version: 4, app_name: "HAG Brokers" }, origin);

  assert.deepEqual(data.category_cards, []);
});
