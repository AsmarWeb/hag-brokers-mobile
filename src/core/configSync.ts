import { ApiClient, ApiError } from "./api";
import { AppConfig, parseAppConfig } from "./appConfig";
export type ConfigStatus = {
  busy: boolean;
  lastUpdated: string | null;
  error: unknown;
};
// Coalesces refreshes and retains the last good configuration on failures.
export class ConfigSync {
  private flight: Promise<void> | null = null;
  private disposed = false;
  private controller: AbortController | null = null;
  private version = -1;
  private nonce = 0;
  private lastUpdated: string | null = null;
  constructor(
    private api: Pick<ApiClient, "request" | "origin">,
    private onValue: (value: AppConfig) => void,
    private onStatus: (status: ConfigStatus) => void,
  ) {}
  refresh(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    if (this.flight) return this.flight;
    this.controller = new AbortController();
    this.onStatus({ busy: true, lastUpdated: this.lastUpdated, error: null });
    this.flight = this.load(this.controller.signal).finally(() => {
      this.flight = null;
    });
    return this.flight;
  }
  private async load(signal: AbortSignal) {
    try {
      const response = await this.api.request<{ data: unknown }>(
        `/app-config?_sync=${Date.now()}-${++this.nonce}`,
        { auth: false, signal },
      );
      const raw = response.data as Record<string, unknown> | null;
      if (
        !raw ||
        typeof raw !== "object" ||
        Array.isArray(raw) ||
        !Number.isSafeInteger(raw.version) ||
        Number(raw.version) < 0
      )
        throw new ApiError(502);
      const value = parseAppConfig(raw, this.api.origin);
      if (value.version < this.version) throw new ApiError(409);
      if (this.disposed) return;
      this.version = value.version;
      this.lastUpdated = new Date().toISOString();
      this.onValue(value);
      this.onStatus({
        busy: false,
        lastUpdated: this.lastUpdated,
        error: null,
      });
    } catch (error) {
      if (!this.disposed)
        this.onStatus({ busy: false, lastUpdated: this.lastUpdated, error });
    }
  }
  dispose() {
    this.disposed = true;
    this.controller?.abort();
  }
}
