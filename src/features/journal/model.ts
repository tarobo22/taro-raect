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
  requestId?: string;
  day: string;
  mood: string;
  body: string;
}

export interface JournalAttempt {fingerprint:string;id:string;}
export interface JournalRetryStore {
  read():Promise<JournalAttempt|null>;
  write(attempt:JournalAttempt):Promise<void>;
  clear():Promise<void>;
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
