import { ApiError } from "./api";
import type { User, Notice } from "./types";
export function isCompanyLeader(user: User | null): boolean {
  return (
    !!user?.email_verified &&
    user.company?.status === "active" &&
    ["owner", "manager"].includes(user.company.role)
  );
}
export function noticeTarget(
  notice: Notice,
): { name: "room" | "offer" | "manage"; id: number } | null {
  const valid = (id: unknown): id is number =>
    typeof id === "number" && Number.isSafeInteger(id) && id > 0;
  if (valid(notice.offer_id))
    return {
      name: notice.type === "rfq.message" ? "room" : "offer",
      id: notice.offer_id,
    };
  if (valid(notice.opportunity_id))
    return { name: "manage", id: notice.opportunity_id };
  return null;
}
export function parseSession(raw: unknown): {
  access_token: string;
  user: User;
} {
  if (!raw || typeof raw !== "object") throw new ApiError(502);
  const data = (raw as { data?: Record<string, unknown> }).data;
  const user = data?.user as User | undefined;
  if (
    !data ||
    typeof data.access_token !== "string" ||
    !data.access_token ||
    /\s/.test(data.access_token) ||
    data.access_token.length > 1000 ||
    !user ||
    !Number.isSafeInteger(user.id) ||
    user.id < 1 ||
    typeof user.name !== "string" ||
    typeof user.email !== "string" ||
    typeof user.email_verified !== "boolean" ||
    (user.phone !== undefined &&
      user.phone !== null &&
      typeof user.phone !== "string") ||
    (user.phone_verified !== undefined &&
      typeof user.phone_verified !== "boolean") ||
    (user.account_verified !== undefined &&
      typeof user.account_verified !== "boolean") ||
    !["company", "individual"].includes(user.account_type) ||
    (user.company !== null &&
      (typeof user.company !== "object" ||
        !Number.isSafeInteger(user.company.workspace_id) ||
        user.company.workspace_id < 1 ||
        typeof user.company.role !== "string" ||
        typeof user.company.status !== "string"))
  )
    throw new ApiError(502);
  return { access_token: data.access_token, user };
}
