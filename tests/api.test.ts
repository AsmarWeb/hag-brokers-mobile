import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ApiClient,
  ApiError,
  apiUrl,
  validatedOrigin,
  safeMedia,
  mergeMessages,
  errorText,
} from "../src/core/api";
import { MutationIntent, dubaiDate } from "../src/core/intent";
import { OrderedSessionStore } from "../src/core/sessionStore";
const origin = "https://hagbrokers.net";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
test("production origins reject credentials paths and insecure hosts", () => {
  assert.equal(validatedOrigin(origin), origin);
  for (const u of [
    "http://hagbrokers.net",
    "https://name:secret@hagbrokers.net",
    "https://hagbrokers.net/api",
    "https://hagbrokers.net?token=secret",
    "https://hagbrokers.net/#x",
  ])
    assert.throws(() => validatedOrigin(u));
  assert.throws(() => validatedOrigin("http://192.168.1.2", false, true));
  assert.equal(
    validatedOrigin("http://192.168.1.2:8080", true, true),
    "http://192.168.1.2:8080",
  );
  assert.throws(() => validatedOrigin("http://evil.test", true, true));
});
test("API path cannot escape trusted v1 origin", () => {
  assert.equal(apiUrl(origin, "/me"), origin + "/api/v1/me");
  for (const p of [
    "//evil.test",
    "https://evil.test",
    "/../me",
    "/%2e%2e/me",
    "/me\\other",
  ])
    assert.throws(() => apiUrl(origin, p));
});
test("public requests never carry bearer and private requests do", async () => {
  const calls: RequestInit[] = [];
  const api = new ApiClient(origin, (async (_u, init) => {
    calls.push(init!);
    return json({ data: [] });
  }) as typeof fetch);
  api.setToken("private-token");
  await api.request("/opportunities", { auth: false });
  await api.request("/me");
  assert.equal(
    (calls[0].headers as Record<string, string>).Authorization,
    undefined,
  );
  assert.equal(
    (calls[1].headers as Record<string, string>).Authorization,
    "Bearer private-token",
  );
  assert.equal(calls[1].redirect, "error");
  assert.equal(calls[1].credentials, "omit");
});
test("missing token blocks private request before network", async () => {
  let calls = 0;
  const api = new ApiClient(origin, (async () => {
    calls++;
    return json({});
  }) as typeof fetch);
  await assert.rejects(
    api.request("/me"),
    (e: unknown) => e instanceof ApiError && e.status === 401,
  );
  assert.equal(calls, 0);
});
test("401 clears matching token but a late 401 cannot clear a new session", async () => {
  let lost = 0;
  let resolve!: (r: Response) => void;
  const api = new ApiClient(
    origin,
    (() =>
      new Promise<Response>((r) => {
        resolve = r;
      })) as typeof fetch,
    () => lost++,
  );
  api.setToken("old");
  const pending = api.request("/me");
  api.setToken("new");
  resolve(json({ message: "Unauthenticated" }, 401));
  await assert.rejects(pending);
  assert.equal(lost, 0);
  const again = api.request("/me");
  resolve(json({}, 401));
  await assert.rejects(again);
  assert.equal(lost, 1);
});
test("HTML and malformed JSON are rejected without exposing provider body", async () => {
  for (const response of [
    new Response("<html>secret</html>", {
      headers: { "content-type": "text/html" },
    }),
    new Response("not json", {
      headers: { "content-type": "application/json" },
    }),
    json({ unexpected: true }),
  ]) {
    const api = new ApiClient(origin, (async () => response) as typeof fetch);
    await assert.rejects(
      api.request("/catalog", { auth: false }),
      (e: unknown) =>
        e instanceof ApiError &&
        e.status === 502 &&
        !e.message.includes("secret"),
    );
  }
});
test("204 is supported and 429 carries retry delay", async () => {
  const api = new ApiClient(
    origin,
    (async () => new Response(null, { status: 204 })) as typeof fetch,
  );
  api.setToken("x");
  assert.equal(
    await api.request("/auth/logout", { method: "POST" }),
    undefined,
  );
  const limited = new ApiClient(
    origin,
    (async () =>
      new Response("{}", {
        status: 429,
        headers: { "content-type": "application/json", "retry-after": "45" },
      })) as typeof fetch,
  );
  await assert.rejects(
    limited.request("/catalog", { auth: false }),
    (e: unknown) => e instanceof ApiError && e.retryAfter === 45,
  );
});
test("validation errors are preserved while generic failures hide server details", async () => {
  const api = new ApiClient(origin, (async () =>
    json(
      { message: "provider-secret", errors: { email: ["Invalid email"] } },
      422,
    )) as typeof fetch);
  await assert.rejects(
    api.request("/auth/login", { auth: false }),
    (e: unknown) =>
      e instanceof ApiError &&
      e.fields.email[0] === "Invalid email" &&
      !errorText(e, true).includes("provider-secret"),
  );
});
test("network failure is sanitized", async () => {
  const api = new ApiClient(origin, (async () => {
    throw new Error("password=secret");
  }) as typeof fetch);
  await assert.rejects(
    api.request("/catalog", { auth: false }),
    (e: unknown) =>
      e instanceof ApiError && e.status === 0 && !e.message.includes("secret"),
  );
});
test("multipart omits manual content type and preserves FormData", async () => {
  let init!: RequestInit;
  const api = new ApiClient(origin, (async (_u, i) => {
    init = i!;
    return json({ data: { id: 1 } });
  }) as typeof fetch);
  api.setToken("x");
  const form = new FormData();
  form.append("request_key", "key");
  await api.request("/company/opportunities", { method: "POST", form });
  assert.equal(
    (init.headers as Record<string, string>)["Content-Type"],
    undefined,
  );
  assert.equal(init.body, form);
});
test("private binary downloads accept only expected media types", async () => {
  const api = new ApiClient(
    origin,
    (async () =>
      new Response("%PDF-1.4", {
        headers: { "content-type": "application/pdf" },
      })) as typeof fetch,
  );
  api.setToken("x");
  const data = await api.request<{ bytes: Uint8Array }>(
    "/company/trade-offers/1/attachments/0",
    { binary: true },
  );
  assert.ok(data.bytes.length > 0);
  const bad = new ApiClient(
    origin,
    (async () =>
      new Response("<script>", {
        headers: { "content-type": "text/html" },
      })) as typeof fetch,
  );
  bad.setToken("x");
  await assert.rejects(
    bad.request("/company/trade-offers/1/attachments/0", { binary: true }),
  );
});
test("media is same-origin and cannot open executable or credential URLs", () => {
  assert.equal(
    safeMedia(origin, "/storage/photo.jpg"),
    origin + "/storage/photo.jpg",
  );
  for (const u of [
    "javascript:alert(1)",
    "https://evil.test/photo.jpg",
    "https://x:y@hagbrokers.net/a",
  ])
    assert.equal(safeMedia(origin, u), undefined);
});
test("message batches merge by ID in order without duplicates", () => {
  assert.deepEqual(
    mergeMessages(
      [
        { id: 5, body: "old" },
        { id: 2, body: "two" },
      ],
      [
        { id: 5, body: "new" },
        { id: 6, body: "six" },
      ],
    ),
    [
      { id: 2, body: "two" },
      { id: 5, body: "new" },
      { id: 6, body: "six" },
    ],
  );
});
test("uncertain mutation retries same key and cannot silently change payload", () => {
  let n = 0;
  const i = new MutationIntent(() => String(++n));
  const first = i.prepare({ price: "1.00" });
  i.failed(0);
  assert.equal(i.prepare({ price: "1.00" }), first);
  assert.throws(() => i.prepare({ price: "2.00" }));
  i.succeeded();
  assert.notEqual(i.prepare({ price: "2.00" }), first);
});
test("definitively rejected input can be corrected with a new intent", () => {
  let n = 0;
  const i = new MutationIntent(() => String(++n));
  const first = i.prepare("old");
  i.failed(422);
  assert.notEqual(i.prepare("corrected"), first);
});
test("Dubai dates respect calendar day across UTC boundary", () => {
  assert.equal(dubaiDate(0, Date.parse("2026-11-03T22:30:00Z")), "2026-11-04");
});
test("delayed local logout cannot erase newer sign-in token", async () => {
  let stored: string | null = "old";
  let unblock!: () => void;
  const store = new OrderedSessionStore(async (token) => {
    if (token === null)
      await new Promise<void>((r) => {
        unblock = r;
      });
    stored = token;
  });
  const old = store.save(null);
  await Promise.resolve();
  await Promise.resolve();
  const fresh = store.save("new");
  unblock();
  await old;
  assert.equal(await fresh, true);
  assert.equal(stored, "new");
});

test("late successful private responses are discarded after account switch", async () => {
  let resolve!: (r: Response) => void;
  const api = new ApiClient(
    origin,
    (() =>
      new Promise<Response>((r) => {
        resolve = r;
      })) as typeof fetch,
  );
  api.setToken("company-a");
  const pending = api.request("/company/trade-offers");
  api.setToken("company-b");
  resolve(json({ data: [{ private: "company-a" }] }));
  await assert.rejects(
    pending,
    (e: unknown) => e instanceof ApiError && e.status === 401,
  );
});
test("private binary response is discarded after logout", async () => {
  let resolve!: (r: Response) => void;
  const api = new ApiClient(
    origin,
    (() =>
      new Promise<Response>((r) => {
        resolve = r;
      })) as typeof fetch,
  );
  api.setToken("a");
  const pending = api.request("/company/trade-offers/1/attachments/0", {
    binary: true,
  });
  api.setToken(null);
  resolve(
    new Response("%PDF-1.4", {
      headers: { "content-type": "application/pdf" },
    }),
  );
  await assert.rejects(
    pending,
    (e: unknown) => e instanceof ApiError && e.status === 401,
  );
});

test("transient restore failures must not delete saved credentials", async () => {
  const { invalidSession } = await import("../src/core/api");
  assert.equal(invalidSession(new ApiError(0)), false);
  assert.equal(invalidSession(new ApiError(503)), false);
  assert.equal(invalidSession(new ApiError(401)), true);
  assert.equal(invalidSession(new ApiError(403)), true);
});

test("phone OTP resend accepts generic 202 response without bearer token", async () => {
  let init!: RequestInit;
  const api = new ApiClient(origin, (async (_url, options) => {
    init = options!;
    return json(
      { message: "If the account exists, a code has been sent." },
      202,
    );
  }) as typeof fetch);

  api.setToken("must-not-be-sent");
  const result = await api.request<{ message: string }>(
    "/auth/phone-verification",
    {
      method: "POST",
      auth: false,
      body: { email: "owner@example.test" },
    },
  );

  assert.match(result.message, /code has been sent/);
  assert.equal(
    (init.headers as Record<string, string>).Authorization,
    undefined,
  );
});

test("phone verification accepts the documented successful response", async () => {
  const api = new ApiClient(origin, (async () =>
    json({
      data: {
        phone_verified: true,
        email_verified: false,
        account_verified: false,
      },
    })) as typeof fetch);

  const result = await api.request<{
    data: {
      phone_verified: boolean;
      email_verified: boolean;
      account_verified: boolean;
    };
  }>("/auth/verify-phone", {
    method: "POST",
    auth: false,
    body: { email: "owner@example.test", code: "123456" },
  });

  assert.equal(result.data.phone_verified, true);
  assert.equal(result.data.email_verified, false);
  assert.equal(result.data.account_verified, false);
});

test("message-only response exception is restricted to phone OTP resend", async () => {
  const api = new ApiClient(origin, (async () =>
    json({ message: "Accepted" }, 202)) as typeof fetch);

  await assert.rejects(
    api.request("/auth/verify-phone", {
      method: "POST",
      auth: false,
      body: { email: "owner@example.test", code: "123456" },
    }),
    (e: unknown) => e instanceof ApiError && e.status === 502,
  );

  await assert.rejects(
    api.request("/auth/phone-verification-extra", {
      method: "POST",
      auth: false,
    }),
    (e: unknown) => e instanceof ApiError && e.status === 502,
  );
});
