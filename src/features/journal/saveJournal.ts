import type {JournalAttempt, JournalDraft, JournalEntry, JournalRepository, JournalRetryStore} from './model';
import {requestId} from '../../infrastructure/requestId';

/** One instance per form. A save completes only after persistence acknowledges it. */
export class SaveJournal {
  private pending: Promise<JournalEntry> | null = null;
  private attempt:JournalAttempt|null=null;
  constructor(private readonly repository:JournalRepository,
              private readonly newId:()=>string=requestId,
              private readonly retries?:JournalRetryStore) {}

  save(draft: JournalDraft): Promise<JournalEntry> {
    if (this.pending) return this.pending;
    const write = draft.id ? this.repository.update(draft.id, draft)
      : this.retries ? this.createPersisted(draft) : this.create(draft);
    this.pending = write.then(entry=>{this.attempt=null;return entry;}).finally(() => {this.pending = null;});
    return this.pending;
  }

  private identity(draft:JournalDraft,previous:JournalAttempt|null):JournalAttempt {
    const fingerprint=JSON.stringify({day:draft.day,mood:draft.mood,body:draft.body});
    return previous?.fingerprint===fingerprint?previous:{fingerprint,id:draft.requestId??this.newId()};
  }

  private create(draft:JournalDraft):Promise<JournalEntry> {
    this.attempt=this.identity(draft,this.attempt);
    return this.repository.create({...draft,requestId:this.attempt.id});
  }

  private async createPersisted(draft:JournalDraft):Promise<JournalEntry> {
    const previous=this.attempt??await this.retries!.read();
    this.attempt=this.identity(draft,previous);
    await this.retries!.write(this.attempt);
    const entry=await this.repository.create({...draft,requestId:this.attempt.id});
    await this.retries!.clear();
    return entry;
  }
}
