import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAuth } from "../src/core/authValidation";

test("personal registration requires only name email password and confirmation", () => {
  const errors = validateAuth({
    name: "New User",
    email: "new@example.test",
    password: "Strong-password-123!",
    confirmation: "Strong-password-123!",
  }, true, false);
  assert.deepEqual(errors, {});
});

test("personal registration validates email password and confirmation", () => {
  const errors = validateAuth({
    name: "",
    email: "not-an-email",
    password: "short",
    confirmation: "different",
  }, true, false);
  assert.ok(errors.name);
  assert.ok(errors.email);
  assert.ok(errors.password);
  assert.ok(errors.password_confirmation);
});

test("sign in does not require company or phone fields", () => {
  const errors = validateAuth({
    name: "",
    email: "user@example.test",
    password: "password",
    confirmation: "",
  }, false, false);
  assert.deepEqual(errors, {});
});
