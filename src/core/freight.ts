export type FreightPort = {
  id: number;
  name: string;
  country_code: string | null;
  port_code: string | null;
};
export type FreightQuote = {
  id: number;
  reference: string;
  status: string;
  origin: { id: number; name: string | null };
  destination: { id: number; name: string | null };
  cargo_type: string;
  container_type: string;
  quantity: number;
  weight: string | null;
  preferred_date: string | null;
  created_at: string | null;
};
export function freightBody(
  origin: FreightPort | null,
  destination: FreightPort | null,
  cargo: string,
  container: string,
  quantity: string,
  weight: string,
  date: string,
) {
  if (
    !origin ||
    !destination ||
    origin.id === destination.id ||
    !cargo.trim() ||
    cargo.trim().length > 255 ||
    !container.trim() ||
    container.trim().length > 255 ||
    !/^[1-9][0-9]{0,4}$/.test(quantity) ||
    Number(quantity) > 10000 ||
    (weight !== "" &&
      (!/^\d{1,10}(\.\d{1,2})?$/.test(weight) ||
        Number(weight) > 9999999999.99)) ||
    (date !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(date))
  )
    return null;
  return {
    origin_port_id: origin.id,
    destination_port_id: destination.id,
    cargo_type: cargo.trim(),
    container_type: container.trim(),
    quantity: Number(quantity),
    weight: weight || null,
    preferred_date: date || null,
  };
}
export function freightStatus(status: string, ar: boolean): string {
  const labels: Record<string, [string, string]> = {
    pending: ["بانتظار المراجعة", "Awaiting review"],
    processing: ["قيد المعالجة", "Processing"],
    approved: ["معتمد", "Approved"],
    rejected: ["مرفوض", "Rejected"],
    completed: ["مكتمل", "Completed"],
    cancelled: ["ملغى", "Cancelled"],
  };
  return (
    labels[status]?.[ar ? 0 : 1] ??
    (ar ? "حالة قيد التحديث" : "Status update pending")
  );
}
