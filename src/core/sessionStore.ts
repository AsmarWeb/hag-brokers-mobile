/** Serialize writes so a delayed token deletion cannot erase a newer sign-in. */
export class OrderedSessionStore {
  private epoch = 0;
  private queue: Promise<void> = Promise.resolve();
  constructor(private write: (token: string | null) => Promise<void>) {}
  save(token: string | null): Promise<boolean> {
    const epoch = ++this.epoch;
    this.queue = this.queue
      .catch(() => {})
      .then(async () => {
        if (epoch === this.epoch) await this.write(token);
      });
    return this.queue.then(() => epoch === this.epoch);
  }
}
