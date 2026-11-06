export interface SessionStore {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  clear?():Promise<void>;
}

export class GuestSession {
  private cached: string | null = null;
  private pending: Promise<string> | null = null;
  private generation=0;
  private changing:Promise<void>|null=null;
  private writes:Promise<unknown>=Promise.resolve();

  constructor(private readonly store: SessionStore, private readonly create: () => Promise<unknown>,private readonly explicitStart=false) {}

  async hasStoredSession():Promise<boolean>{return (await this.store.read())!==null;}
  async forget():Promise<void>{
    const generation=++this.generation;this.cached=null;
    const pending=this.pending,previous=this.changing;
    const changing=(async()=>{await pending?.catch(()=>{});await previous?.catch(()=>{});
      await this.persist(async()=>{if(generation===this.generation)await this.store.clear?.();});if(this.pending===pending)this.pending=null;
    })();this.changing=changing;
    try{await changing;}finally{if(this.changing===changing)this.changing=null;}
  }

  private persist<T>(work:()=>Promise<T>):Promise<T>{const next=this.writes.catch(()=>{}).then(work);this.writes=next;return next;}
  async adopt(token:string,expected?:string):Promise<void>{
    if(!/^[\da-f]{64}$/.test(token))throw new Error('새 계정 연결을 확인하지 못했어요.');
    const generation=++this.generation,pending=this.pending;this.cached=null;
    const changing=(async()=>{await pending?.catch(()=>{});await this.persist(async()=>{
      if(generation!==this.generation)throw new Error('더 새로운 계정 연결이 있어 적용하지 않았어요.');
      if(expected!==undefined&&await this.store.read()!==expected)throw new Error('다른 화면에서 계정 연결이 바뀌었어요. 다시 확인해 주세요.');
      await this.store.write(token);
      if(generation!==this.generation)throw new Error('계정 연결이 바뀌어 이전 응답은 적용하지 않았어요.');
      this.cached=token;
    });})();this.changing=changing;
    try{await changing;}finally{if(this.changing===changing)this.changing=null;}
  }

  start():Promise<string>{
    if(this.changing)return this.changing.then(()=>this.start());
    if(this.cached)return Promise.resolve(this.cached);
    if(this.pending)return this.pending;
    this.pending=this.load(true).finally(()=>{this.pending=null;});
    return this.pending;
  }

  token(): Promise<string> {
    if(this.changing)return this.changing.then(()=>this.token());
    if (this.cached) return Promise.resolve(this.cached);
    if (this.pending) return this.pending;
    this.pending = this.load().finally(() => {this.pending = null;});
    return this.pending;
  }

  private async load(start=false): Promise<string> {
    const generation=this.generation;
    const persisted = await this.store.read();
    if(generation!==this.generation)throw new Error('기기 연결이 해제됐어요.');
    if (persisted && /^[\da-f]{64}$/.test(persisted)) return this.cached = persisted;
    if(persisted!==null)throw new Error('기존 기록 연결을 확인하지 못했어요. 연결을 유지한 채 다시 확인해 주세요.');
    if(this.explicitStart&&!start)throw new Error('게스트로 시작을 눌러 기기 연결을 만들어 주세요.');
    const value = await this.create();
    if(generation!==this.generation)throw new Error('기기 연결이 해제됐어요.');
    const token=typeof value==='object'&&value!==null?('access_token' in value?value.access_token:'token' in value?value.token:null):null;
    if (typeof token !== 'string' || !/^[\da-f]{64}$/.test(token)) {
      throw new Error('기록 연결을 확인하지 못했어요.');
    }
    await this.persist(async()=>{
      if(generation!==this.generation)throw new Error('기기 연결이 해제됐어요.');
      await this.store.write(token);
      if(generation!==this.generation)throw new Error('기기 연결이 해제됐어요.');
    });
    return this.cached = token;
  }
}
