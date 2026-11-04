import type { User } from "./types";
export type AccountRecord = { user: User; revision: string };
export type DeletionRequest = {
  status: "pending" | "reviewing";
  requested_at: string;
};
export type LegalDocument = {
  slug: "privacy" | "terms";
  title: string;
  body: string;
  version: number;
  updated_at: string;
};
export function accountInput(
  name: string,
  email: string,
  password: string,
  record: AccountRecord,
) {
  const cleanName = name.trim(),
    cleanEmail = email.trim().toLowerCase();
  if (
    !cleanName ||
    Array.from(cleanName).length > 160 ||
    cleanEmail.length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
    (cleanEmail !== record.user.email && !password) ||
    !/^[a-f0-9]{64}$/.test(record.revision)
  )
    return null;
  return {
    name: cleanName,
    email: cleanEmail,
    revision: record.revision,
    current_password: password || null,
  };
}
