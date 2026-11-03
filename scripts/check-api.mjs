// Public, read-only smoke check. Never reads or sends a token or creates an account.
const raw = process.env.EXPO_PUBLIC_API_ORIGIN || "https://hagbrokers.net";
const origin = new URL(raw);
if (
  origin.protocol !== "https:" ||
  origin.username ||
  origin.password ||
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash
)
  throw new Error("Use an HTTPS origin without credentials or path");
for (const [path, status] of [
  ["/app-config", 200],
  ["/catalog", 200],
  ["/opportunities?per_page=1", 200],
  ["/me", 401],
  ["/company/trade-offers", 401],
]) {
  const r = await fetch(origin.origin + "/api/v1" + path, {
    headers: { Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (
    r.status !== status ||
    !r.headers.get("content-type")?.includes("application/json")
  )
    throw new Error(`Unexpected API response: ${path} ${r.status}`);
  const body = await r.json();
  if (status === 200 && !("data" in body))
    throw new Error("Invalid response envelope");
  console.log(`${path.split("?")[0]}: ${r.status} OK`);
}
