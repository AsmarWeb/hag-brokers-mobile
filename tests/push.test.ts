import test from "node:test";
import assert from "node:assert/strict";
import { pushEnvelope, pushRoute } from "../src/core/push";
const binding = "a1111111-1111-4111-8111-111111111111",
  notice = "b1111111-1111-4111-8111-111111111111";
test("push data accepts only opaque HAG notice envelopes and strips injected navigation", () => {
  assert.deepEqual(
    pushEnvelope({
      scope: "hag-push-v1",
      binding,
      notice_id: notice,
      url: "https://evil.test",
      offer_id: 7,
    }),
    { binding, notice_id: notice },
  );
  for (const bad of [
    null,
    {},
    { scope: "other", binding, notice_id: notice },
    { scope: "hag-push-v1", binding: "bad", notice_id: notice },
  ])
    assert.equal(pushEnvelope(bad), null);
});
test("push destination is authorized by server shape, never an external URL or arbitrary screen", () => {
  assert.deepEqual(pushRoute({ name: "room", id: 7 }), { name: "room", id: 7 });
  for (const bad of [
    { name: "https://evil.test", id: 1 },
    { name: "identity", id: 1 },
    { name: "offer", id: -1 },
    { name: "offer", id: "1" },
    null,
  ])
    assert.equal(pushRoute(bad), null);
});
