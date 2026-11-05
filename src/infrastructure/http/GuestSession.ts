export interface SessionStore {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
}

export class GuestSession {
  private cached: string | null = null;
  private pending: Promise<string> | null = null;

  constructor(private readonly store: SessionStore, private readonly create: () => Promise<unknown>,private readonly explicitStart=false) {}

  async hasStoredSession():Promise<boolean>{return (await this.store.read())!==null;}

  start():Promise<string>{
    if(this.cached)return Promise.resolve(this.cached);
    if(this.pending)return this.pending;
    this.pending=this.load(true).finally(()=>{this.pending=null;});
    return this.pending;
  }

  token(): Promise<string> {
    if (this.cached) return Promise.resolve(this.cached);
    if (this.pending) return this.pending;
    this.pending = this.load().finally(() => {this.pending = null;});
    return this.pending;
  }

  private async load(start=false): Promise<string> {
    const persisted = await this.store.read();
    if (persisted && /^[\da-f]{64}$/.test(persisted)) return this.cached = persisted;
    if(persisted!==null)throw new Error('기존 기록 연결을 확인하지 못했어요. 연결을 유지한 채 다시 확인해 주세요.');
    if(this.explicitStart&&!start)throw new Error('게스트로 시작을 눌러 기기 연결을 만들어 주세요.');
    const value = await this.create();
    const token=typeof value==='object'&&value!==null?('access_token' in value?value.access_token:'token' in value?value.token:null):null;
    if (typeof token !== 'string' || !/^[\da-f]{64}$/.test(token)) {
      throw new Error('기록 연결을 확인하지 못했어요.');
    }
    await this.store.write(token);
    return this.cached = token;
  }
}
