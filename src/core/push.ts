export type PushSettings = {
  available: boolean;
  project_id: string | null;
  device: null | {
    binding: string;
    enabled: boolean;
    offers: boolean;
    messages: boolean;
    locale: string;
  };
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function pushEnvelope(
  raw: unknown,
): { binding: string; notice_id: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  return d.scope === "hag-push-v1" &&
    typeof d.binding === "string" &&
    uuid.test(d.binding) &&
    typeof d.notice_id === "string" &&
    uuid.test(d.notice_id)
    ? { binding: d.binding, notice_id: d.notice_id }
    : null;
}
export function pushRoute(
  raw: unknown,
): { name: "room" | "offer"; id: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  return (d.name === "room" || d.name === "offer") &&
    typeof d.id === "number" &&
    Number.isSafeInteger(d.id) &&
    d.id > 0
    ? { name: d.name, id: d.id }
    : null;
}
