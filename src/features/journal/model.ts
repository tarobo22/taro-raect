export interface JournalEntry {
  id: string;
  day: string;
  mood: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface JournalDraft {
  id?: string;
  day: string;
  mood: string;
  body: string;
}

export interface JournalPolicy {
  moods: string[];
  maxBodyLength: number;
}

export interface JournalRepository {
  list(): Promise<JournalEntry[]>;
  create(draft: JournalDraft): Promise<JournalEntry>;
  update(id: string, draft: JournalDraft): Promise<JournalEntry>;
  delete(id: string): Promise<boolean>;
  policy(): Promise<JournalPolicy>;
}
