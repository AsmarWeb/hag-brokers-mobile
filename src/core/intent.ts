export class MutationIntent {
  private previous = "";
  private key = "";
  private uncertain = false;
  constructor(private uuid: () => string) {}
  prepare(body: unknown) {
    const signature = JSON.stringify(body);
    if (this.uncertain && signature !== this.previous)
      throw new Error("uncertain-mutation");
    if (signature !== this.previous || !this.key) {
      this.key = this.uuid();
      this.previous = signature;
    }
    return this.key;
  }
  failed(status: number) {
    this.uncertain = status === 0 || status >= 500;
  }
  succeeded() {
    this.key = "";
    this.previous = "";
    this.uncertain = false;
  }
}
export function dubaiDate(days: number, now = Date.now()) {
  const date = new Date(now + days * 86400000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
