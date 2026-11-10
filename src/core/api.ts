export class ApiError extends Error {
  constructor(
    public status: number,
    public fields: Record<string, string[]> = {},
    public retryAfter = 0,
    public code = "",
  ) {
    super(`API ${status}`);
  }
}
export function validatedOrigin(
  value: string,
  development = false,
  allowLocalHttp = false,
): string {
  const u = new URL(value);
  const local =
    u.hostname === "localhost" ||
    u.hostname === "127.0.0.1" ||
    /^10\.\d+\.\d+\.\d+$/.test(u.hostname) ||
    /^192\.168\.\d+\.\d+$/.test(u.hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(u.hostname);
  if (
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    !["", "/"].includes(u.pathname) ||
    (u.protocol !== "https:" &&
      !(u.protocol === "http:" && local && development && allowLocalHttp))
  )
    throw new Error("Invalid API origin");
  return u.origin;
}
export function apiUrl(origin: string, path: string): string {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    path.includes("#") ||
    path.includes("..") ||
    /%2f|%5c|%2e/i.test(path)
  )
    throw new Error("Invalid API path");
  const url = new URL(origin + "/api/v1" + path);
  if (url.origin !== origin || !url.pathname.startsWith("/api/v1/"))
    throw new Error("Invalid API URL");
  return url.href;
}
export function safeMedia(origin: string, raw: string): string | undefined {
  try {
    const u = new URL(raw, origin);
    if (
      u.origin === origin &&
      !u.username &&
      !u.password &&
      ["http:", "https:"].includes(u.protocol)
    )
      return u.href;
  } catch {}
  return undefined;
}
type Options = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
  form?: FormData;
  binary?: boolean;
};
export class ApiClient {
  private token: string | null = null;
  private locale = "en";
  setLanguage(ar: boolean) {
    this.locale = ar ? "ar" : "en";
  }
  constructor(
    public readonly origin: string,
    private fetcher: typeof fetch = fetch,
    private lost: () => void = () => {},
  ) {}
  setToken(token: string | null) {
    this.token = token;
  }
  async request<T>(path: string, options: Options = {}): Promise<T> {
    const sentToken = options.auth === false ? null : this.token;
    if (options.auth !== false && !sentToken) throw new ApiError(401);
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) controller.abort();
    const timeout = setTimeout(abort, options.form ? 120000 : 15000);
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (sentToken) headers.Authorization = `Bearer ${sentToken}`;
      if (options.body !== undefined && !options.form)
        headers["Content-Type"] = "application/json";
      const target = new URL(apiUrl(this.origin, path));
      target.searchParams.set("lang", this.locale);
      const response = await this.fetcher(target.href, {
        method: options.method ?? "GET",
        headers,
        body:
          options.form ??
          (options.body === undefined
            ? undefined
            : JSON.stringify(options.body)),
        signal: controller.signal,
        redirect: "error",
        credentials: "omit",
      });
      if (sentToken && sentToken !== this.token) throw new ApiError(401);
      if (response.status === 401 && sentToken && sentToken === this.token) {
        this.token = null;
        this.lost();
      }
      if (response.status === 204) return undefined as T;
      const contentType = response.headers.get("content-type") ?? "";
      if (options.binary && response.ok) {
        if (
          !["application/pdf", "image/jpeg", "image/png"].some((x) =>
            contentType.startsWith(x),
          )
        )
          throw new ApiError(502);
        if (Number(response.headers.get("content-length")) > 10 * 1024 * 1024)
          throw new ApiError(413);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length > 10 * 1024 * 1024) throw new ApiError(413);
        if (sentToken && sentToken !== this.token) throw new ApiError(401);
        return { bytes, contentType } as T;
      }
      const text = await response.text();
      let data: { errors?: Record<string, string[]>; error_code?: unknown } =
        {};
      if (!contentType.includes("application/json"))
        throw new ApiError(response.ok ? 502 : response.status);
      try {
        data = JSON.parse(text);
      } catch {
        throw new ApiError(502);
      }
      if (!data || typeof data !== "object" || Array.isArray(data))
        throw new ApiError(502);
      const fields: Record<string, string[]> = {};
      if (
        response.status === 422 &&
        data.errors &&
        typeof data.errors === "object" &&
        !Array.isArray(data.errors)
      ) {
        for (const [key, value] of Object.entries(data.errors).slice(0, 30)) {
          if (Array.isArray(value))
            fields[key] = value
              .filter((m): m is string => typeof m === "string")
              .slice(0, 10)
              .map((m) => m.slice(0, 500));
        }
      }
      if (!response.ok)
        throw new ApiError(
          response.status,
          fields,
          Number(response.headers.get("retry-after")) || 0,
          data.error_code === "AUTH_ADMIN_WEB_ONLY"
            ? "AUTH_ADMIN_WEB_ONLY"
            : "",
        );
      if (
        !data ||
        typeof data !== "object" ||
        (!("data" in data) &&
          !path.startsWith("/auth/forgot-password") &&
          !path.startsWith("/auth/reset-password") &&
          !path.startsWith("/auth/verification-email") &&
          path !== "/auth/phone-verification")
      )
        throw new ApiError(502);
      if (sentToken && sentToken !== this.token) throw new ApiError(401);
      return data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(0);
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
    }
  }
}
export function mergeMessages<T extends { id: number }>(
  old: T[],
  incoming: T[],
): T[] {
  return [
    ...new Map([...old, ...incoming].map((x) => [x.id, x])).values(),
  ].sort((a, b) => a.id - b.id);
}
export function errorText(error: unknown, ar: boolean): string {
  if (error instanceof ApiError && error.code === "AUTH_ADMIN_WEB_ONLY")
    return ar
      ? "هذا حساب إدارة المنصة. استخدم لوحة الإدارة على الموقع، أو حساب شركة/فرد مستقل للتطبيق."
      : "This is a platform administrator account. Use the web admin dashboard or a separate company/individual account for the app.";
  if (
    error instanceof ApiError &&
    error.status === 422 &&
    error.fields.email?.includes("Invalid credentials.")
  )
    return ar
      ? "البريد الإلكتروني أو كلمة المرور غير صحيحة."
      : "The email or password is incorrect.";

  if (error instanceof Error && error.message === "uncertain-mutation")
    return ar
      ? "الطلب السابق غير مؤكد. أعد إرساله دون تغيير أو افحص سجلات الشركة أولًا."
      : "The previous request is unconfirmed. Retry unchanged or check company records first.";
  if (!(error instanceof ApiError))
    return ar
      ? "تعذر إكمال العملية. حاول مجددًا."
      : "Unable to complete the action. Try again.";
  const pairs: Record<number, [string, string]> = {
    0: [
      "تعذر الاتصال. تحقق من الشبكة ثم أعد المحاولة.",
      "Connection failed. Check your network and retry.",
    ],
    401: ["انتهت الجلسة. سجّل الدخول مجددًا.", "Sign in to continue."],
    403: [
      "هذه العملية تحتاج صلاحية مناسبة وبريدًا مؤكدًا وشركة فعالة.",
      "This action requires appropriate access, verified email and an active company.",
    ],
    404: [
      "هذا المحتوى غير متاح لحسابك.",
      "This content is unavailable to your account.",
    ],
    409: [
      "تغيّرت البيانات أو تعذّر التحقق من سلامتها. أعد تحميلها قبل المتابعة.",
      "Data changed or failed integrity verification. Reload before continuing.",
    ],
    422: [
      "راجع الحقول وشروط العملية وحصة خطتك.",
      "Check the fields, business rules and your plan limits.",
    ],
    429: [
      "طلبات كثيرة. انتظر قليلًا قبل المحاولة.",
      "Too many requests. Wait before retrying.",
    ],
  };
  return (pairs[error.status] ?? [
    "الخدمة غير متاحة مؤقتًا. حاول لاحقًا.",
    "Service temporarily unavailable. Try later.",
  ])[ar ? 0 : 1];
}

export function invalidSession(error: unknown): boolean {
  return error instanceof ApiError && [401, 403].includes(error.status);
}
