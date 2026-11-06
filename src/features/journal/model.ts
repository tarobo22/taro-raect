export interface JournalEntry {
  sourceReadingId?:string;sourceTurnId?:string;apiVersion?:2;
  id: string;
  day: string;
  mood: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  version?:number;
}

export interface JournalDraft {
  sourceReadingId?:string;sourceTurnId?:string;apiVersion?:2;
  id?: string;
  requestId?: string;
  version?:number;
  day: string;
  mood: string;
  body: string;
}

export interface JournalAttempt {fingerprint:string;id:string;}
export function journalDraftKey(initial:JournalDraft){return 'yeoun.journal.draft.'+(initial.id??(initial.sourceReadingId?'reading.'+initial.sourceReadingId:initial.sourceTurnId?'turn.'+initial.sourceTurnId:'new'));}
export interface JournalRetryStore {
  read():Promise<JournalAttempt|null>;
  write(attempt:JournalAttempt):Promise<void>;
  clear():Promise<void>;
}

export interface JournalDraftStore {
  read():Promise<JournalDraft|null>;
  write(draft:JournalDraft):Promise<void>;
  clear():Promise<void>;
}

export type JournalMoodCode = 'calm' | 'happy' | 'thinking' | 'settled' | 'talk';
export type JournalMoodLabels = Record<JournalMoodCode, string>;

export interface JournalPolicy {
  moods: string[];
  maxBodyLength: number;
  moodCodes?: JournalMoodLabels;
}

export interface JournalRepository {
  list(): Promise<JournalEntry[]>;
  create(draft: JournalDraft): Promise<JournalEntry>;
  update(id: string, draft: JournalDraft): Promise<JournalEntry>;
  delete(id: string): Promise<boolean>;
  policy(): Promise<JournalPolicy>;
}

export interface JournalDetailRepository {get(id:string):Promise<JournalEntry>;}
