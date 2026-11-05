import type {JournalDraft, JournalEntry, JournalRepository} from './model';

/** One instance per form. A save completes only after persistence acknowledges it. */
export class SaveJournal {
  private pending: Promise<JournalEntry> | null = null;
  constructor(private readonly repository: JournalRepository) {}

  save(draft: JournalDraft): Promise<JournalEntry> {
    if (this.pending) return this.pending;
    const write = draft.id ? this.repository.update(draft.id, draft) : this.repository.create(draft);
    this.pending = write.finally(() => {this.pending = null;});
    return this.pending;
  }
}
