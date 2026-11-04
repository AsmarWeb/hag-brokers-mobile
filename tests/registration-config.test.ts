import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateAuth,
  authFieldMessage,
  type AuthForm,
} from "../src/core/authValidation";
import { ConfigSync, type ConfigStatus } from "../src/core/configSync";
import { ApiClient, ApiError } from "../src/core/api";
import type { AppConfig } from "../src/core/appConfig";
const origin = "https://hagbrokers.net";
const form: AuthForm = {
  name: "Owner",
  email: "owner@example.test",
  password: "A-strong-password12",
  confirmation: "A-strong-password12",
  company: true,
  business: "UAE Trade",
  phone: "+971501234567",
  country: "AE",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
test("registration identifies the exact invalid fields instead of a plan quota error", () => {
  const errors = validateAuth(
    {
      ...form,
      password: "short",
      confirmation: "different",
      phone: "",
      country: "الإمارات",
    },
    true,
    true,
  );
  assert.deepEqual(
    Object.keys(errors).sort(),
    ["password", "password_confirmation", "phone", "country_code"].sort(),
  );
  assert.match(errors.password[0], /12/);
  assert.match(errors.country_code[0], /AE/);
  assert.doesNotMatch(JSON.stringify(errors), /quota|حصة|خطة/);
});
test("valid company and individual forms match the server minimum requirements", () => {
  assert.deepEqual(validateAuth(form, true, true), {});
  assert.deepEqual(
    validateAuth(
      { ...form, company: false, business: "", phone: "", country: "" },
      true,
      false,
    ),
    {},
  );
  assert.deepEqual(
    validateAuth(
      {
        ...form,
        password: "old-pass",
        confirmation: "",
        name: "",
        business: "",
        company: false,
      },
      false,
      true,
    ),
    {},
  );
});
test("unicode passwords count characters consistently and server email conflicts are understandable", () => {
  const errors = validateAuth(
    { ...form, password: "🚢".repeat(6), confirmation: "🚢".repeat(6) },
    true,
    true,
  );
  assert.ok(errors.password);
  assert.deepEqual(
    validateAuth(
      { ...form, password: "🚢".repeat(12), confirmation: "🚢".repeat(12) },
      true,
      true,
    ),
    {},
  );
  assert.match(
    authFieldMessage("email", "The email has already been taken.", true),
    /مسجل مسبقًا/,
  );
});
test("configuration refresh coalesces overlapping calls and never sends a bearer token", async () => {
  let release!: (response: Response) => void,
    calls = 0;
  const client = new ApiClient(origin, async (input, init) => {
    calls++;
    assert.match(String(input), /app-config\?_sync=/);
    assert.equal(new Headers(init?.headers).has("Authorization"), false);
    return new Promise<Response>((resolve) => (release = resolve));
  });
  client.setToken("private-token");
  const values: AppConfig[] = [];
  const sync = new ConfigSync(
    client,
    (value) => values.push(value),
    () => {},
  );
  const a = sync.refresh(),
    b = sync.refresh();
  assert.equal(calls, 1);
  assert.equal(a, b);
  release(json({ data: { version: 3, app_name: "HAG Updated" } }));
  await a;
  assert.equal(values[0].version, 3);
  assert.equal(values[0].app_name, "HAG Updated");
  sync.dispose();
});
test("failed or stale configuration cannot overwrite the last good version", async () => {
  let call = 0;
  const values: AppConfig[] = [],
    states: ConfigStatus[] = [];
  const client = new ApiClient(origin, async () => {
    call++;
    return call === 1
      ? json({ data: { version: 5, home_title_ar: "عنوان جديد" } })
      : call === 2
        ? json({ data: { version: 1 } })
        : json({}, 500);
  });
  const sync = new ConfigSync(
    client,
    (x) => values.push(x),
    (x) => states.push(x),
  );
  await sync.refresh();
  await sync.refresh();
  assert.equal(values.length, 1);
  assert.ok(states.at(-1)?.error instanceof ApiError);
  await sync.refresh();
  assert.equal(values[0].home_title_ar, "عنوان جديد");
  assert.equal(values.length, 1);
  assert.equal(states.at(-1)?.busy, false);
  sync.dispose();
});
test("disposed configuration requests cannot update a remounted app", async () => {
  let release!: (response: Response) => void;
  const values: AppConfig[] = [];
  const client = new ApiClient(
    origin,
    async () => new Promise<Response>((resolve) => (release = resolve)),
  );
  const sync = new ConfigSync(
    client,
    (x) => values.push(x),
    () => {},
  );
  const request = sync.refresh();
  sync.dispose();
  release(json({ data: { version: 1 } }));
  await request;
  assert.equal(values.length, 0);
});
test("malformed configuration is surfaced without replacing bundled content", async () => {
  let updated = false;
  const states: ConfigStatus[] = [];
  const sync = new ConfigSync(
    new ApiClient(origin, async () =>
      json({ data: { app_name: "missing version" } }),
    ),
    () => (updated = true),
    (s) => states.push(s),
  );
  await sync.refresh();
  assert.equal(updated, false);
  assert.ok(states.at(-1)?.error instanceof ApiError);
  sync.dispose();
});
