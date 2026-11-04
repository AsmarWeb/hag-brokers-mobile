import test from "node:test";
import assert from "node:assert/strict";
import {
  accountInput,
  type AccountRecord,
} from "../src/core/accountCompletion";
const record: AccountRecord = {
  revision: "a".repeat(64),
  user: {
    id: 1,
    name: "Name",
    email: "old@example.test",
    email_verified: true,
    account_type: "individual",
    company: null,
  },
};
test("account edits normalize identity but cannot carry company permissions", () => {
  const body = accountInput(" New name ", " OLD@example.test ", "", record);
  assert.deepEqual(body, {
    name: "New name",
    email: "old@example.test",
    revision: record.revision,
    current_password: null,
  });
  assert.equal(accountInput("Name", "new@example.test", "", record), null);
  assert.equal(
    accountInput("Name", "new@example.test", "current password", record)?.email,
    "new@example.test",
  );
});
test("account edits reject malformed or missing fields and stale revision shape", () => {
  assert.equal(accountInput("", "old@example.test", "", record), null);
  assert.equal(
    accountInput("a".repeat(161), "old@example.test", "", record),
    null,
  );
  assert.equal(accountInput("Name", "not-an-email", "", record), null);
  assert.equal(
    accountInput("Name", "old@example.test", "", {
      ...record,
      revision: "bad",
    }),
    null,
  );
});
