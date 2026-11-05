import type {JournalDraft,JournalDraftStore} from './model';

/** Coordinates asynchronous restore, ordered writes and acknowledgement of one draft revision. */
export class JournalDraftSession {
  private value:JournalDraft;
  private sequence=0;
  private pending:Promise<void>=Promise.resolve();

  constructor(initial:JournalDraft,private readonly storage:JournalDraftStore){this.value={...initial};}
  get snapshot():JournalDraft{return {...this.value};}
  get revision():number{return this.sequence;}

  async restore():Promise<void>{
    const revision=this.sequence;
    const saved=await this.storage.read();
    if(saved&&revision===this.sequence&&saved.id===this.value.id&&saved.sourceReadingId===this.value.sourceReadingId&&saved.sourceTurnId===this.value.sourceTurnId)this.value={...saved};
  }

  change(patch:Partial<JournalDraft>):Promise<void>{
    this.sequence++;
    this.value={...this.value,...patch};
    const snapshot=this.snapshot;
    this.pending=this.pending.catch(()=>{}).then(()=>this.storage.write(snapshot));
    return this.pending;
  }

  acknowledge(revision:number):Promise<boolean>{
    const result=this.pending.catch(()=>{}).then(async()=>{
      if(revision!==this.sequence)return false;
      await this.storage.clear();
      return true;
    });
    this.pending=result.then(()=>{});
    return result;
  }
}
