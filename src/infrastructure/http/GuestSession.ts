export interface SessionStore {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
}

export class GuestSession {
  private cached: string | null = null;
  private pending: Promise<string> | null = null;

  constructor(private readonly store: SessionStore, private readonly create: () => Promise<unknown>) {}

  token(): Promise<string> {
    if (this.cached) return Promise.resolve(this.cached);
    if (this.pending) return this.pending;
    this.pending = this.load().finally(() => {this.pending = null;});
    return this.pending;
  }

  private async load(): Promise<string> {
    const persisted = await this.store.read();
    if (persisted && /^[\da-f]{64}$/.test(persisted)) return this.cached = persisted;
    const value = await this.create();
    if (typeof value !== 'object' || value === null || !('token' in value) ||
        typeof value.token !== 'string' || !/^[\da-f]{64}$/.test(value.token)) {
      throw new Error('기록 연결을 확인하지 못했어요.');
    }
    await this.store.write(value.token);
    return this.cached = value.token;
  }
}
