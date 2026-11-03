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
