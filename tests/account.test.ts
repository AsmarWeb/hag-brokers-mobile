import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isCompanyLeader,
  noticeTarget,
  parseSession,
} from "../src/core/account";
import { ApiClient, ApiError, errorText } from "../src/core/api";
import type { User, Notice } from "../src/core/types";
const user: User = {
  id: 1,
  name: "Company Owner",
  email: "owner@example.test",
  email_verified: true,
  account_type: "company",
  company: { workspace_id: 2, role: "owner", status: "active" },
};
const notice: Notice = {
  id: "n",
  type: "rfq.message",
  title: "Update",
  offer_id: 4,
  opportunity_id: null,
  read_at: null,
  created_at: "2026-11-04T00:00:00Z",
};
test("notification eligibility excludes guests individuals members unverified and inactive companies", () => {
  assert.equal(isCompanyLeader(user), true);
  assert.equal(
    isCompanyLeader({
      ...user,
      company: { ...user.company!, role: "manager" },
    }),
    true,
  );
  for (const u of [
    null,
    { ...user, company: null },
    { ...user, email_verified: false },
    { ...user, company: { ...user.company!, role: "member" } },
    { ...user, company: { ...user.company!, status: "suspended" } },
  ])
    assert.equal(isCompanyLeader(u), false);
});
test("notification targets open a message room or relevant offer and reject unsafe identifiers", () => {
  assert.deepEqual(noticeTarget(notice), { name: "room", id: 4 });
  assert.deepEqual(noticeTarget({ ...notice, type: "rfq.selected" }), {
    name: "offer",
    id: 4,
  });
  assert.deepEqual(
    noticeTarget({
      ...notice,
      offer_id: null,
      opportunity_id: 7,
      type: "marketplace.moderation.hide",
    }),
    { name: "manage", id: 7 },
  );
  assert.equal(noticeTarget({ ...notice, offer_id: 0 }), null);
  assert.equal(noticeTarget({ ...notice, offer_id: NaN }), null);
});
test("login validates response before saving a session", () => {
  assert.deepEqual(parseSession({ data: { access_token: "1|token", user } }), {
    access_token: "1|token",
    user,
  });
  for (const raw of [
    null,
    {},
    { data: { access_token: "", user } },
    { data: { access_token: "token", user: { ...user, id: 0 } } },
    { data: { access_token: "token", user: { ...user, company: undefined } } },
  ])
    assert.throws(() => parseSession(raw), ApiError);
});
test("platform admin login error remains distinct and never exposes arbitrary server messages", async () => {
  const api = new ApiClient(
    "https://hagbrokers.net",
    async () =>
      new Response(
        JSON.stringify({
          error_code: "AUTH_ADMIN_WEB_ONLY",
          message: "private debug data",
        }),
        { status: 403, headers: { "content-type": "application/json" } },
      ),
  );
  await assert.rejects(
    api.request("/auth/login", {
      auth: false,
      method: "POST",
      body: {
        email: "admin@example.test",
        password: "not-logged",
        device_name: "test",
      },
    }),
    (e) => {
      assert.ok(e instanceof ApiError);
      assert.equal(e.code, "AUTH_ADMIN_WEB_ONLY");
      assert.match(errorText(e, false), /administrator/);
      assert.doesNotMatch(errorText(e, false), /private debug/);
      return true;
    },
  );
});
test("malformed JSON envelopes are reported as upstream errors rather than network failures", async () => {
  for (const body of [null, [], false]) {
    const api = new ApiClient(
      "https://hagbrokers.net",
      async () =>
        new Response(JSON.stringify(body), {
          status: 422,
          headers: { "content-type": "application/json" },
        }),
    );
    await assert.rejects(
      api.request("/auth/login", { auth: false }),
      (e) => e instanceof ApiError && e.status === 502,
    );
  }
});

test("malformed validation fields cannot crash error rendering", async () => {
  const api = new ApiClient(
    "https://hagbrokers.net",
    async () =>
      new Response(
        JSON.stringify({
          errors: { email: 42, password: [false, "Try again"] },
        }),
        { status: 422, headers: { "content-type": "application/json" } },
      ),
  );
  await assert.rejects(api.request("/auth/login", { auth: false }), (e) => {
    assert.ok(e instanceof ApiError);
    assert.deepEqual(e.fields, { password: ["Try again"] });
    assert.equal(typeof errorText(e, true), "string");
    return true;
  });
});

test("session accepts optional phone verification fields and preserves legacy sessions", () => {
  const legacy = parseSession({
    data: { access_token: "1|token", user },
  });
  assert.equal(legacy.user.phone, undefined);
  assert.equal(legacy.user.phone_verified, undefined);

  const verified = parseSession({
    data: {
      access_token: "2|token",
      user: {
        ...user,
        phone: "+971501234567",
        phone_verified: true,
        account_verified: true,
      },
    },
  });

  assert.equal(verified.user.phone, "+971501234567");
  assert.equal(verified.user.phone_verified, true);
  assert.equal(verified.user.account_verified, true);
});

test("session rejects malformed phone verification fields", () => {
  for (const invalidUser of [
    { ...user, phone: 971501234567 },
    { ...user, phone_verified: "true" },
    { ...user, account_verified: 1 },
  ]) {
    assert.throws(
      () =>
        parseSession({
          data: { access_token: "1|token", user: invalidUser },
        }),
      ApiError,
    );
  }
});
