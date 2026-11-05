import type {AIResult} from '../p0/model';

export const moodLabels={calm:'편안해요',happy:'기뻐요',thinking:'생각이 많아요',settled:'차분해요',talk:'이야기하고 싶어요'} as const;
export type MoodCode=keyof typeof moodLabels;
export interface JournalRange{range_start:string;range_end:string;}
export interface JournalSummary extends JournalRange{entry_count:number;days_with_entries:string[];mood_counts:Record<MoodCode,number>;}
export interface Favorite{reading_id:string;created_at:string;}
export interface InsightSource{id:string;version:number;local_day:string;}
export interface InsightSelection extends JournalRange{entries:InsightSource[];}
export interface InsightInput extends JournalRange{entry_ids:string[];entry_versions:Record<string,number>;consent_event_id:string;}
export interface Insight extends JournalRange{id:string;state:'draft'|'generating'|'ready'|'failed'|'invalidated'|'cancelled';based_on_count:number;entry_ids:string[];entry_versions:Record<string,number>;result:AIResult|null;}
