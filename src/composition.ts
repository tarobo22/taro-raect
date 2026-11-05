import {runtime} from './config/runtime';
import {FetchClient} from './infrastructure/http/FetchClient';
import {GuestSession} from './infrastructure/http/GuestSession';
import {JournalApi} from './features/journal/JournalApi';
import {SaveJournal} from './features/journal/saveJournal';
import {ExperienceApi} from './features/experience/ExperienceApi';
import type {ReadingDraft,CounselDraft} from './features/experience/model';
import {readSession, writeSession} from './services/secure';
import {journalRetries} from './infrastructure/storage/JournalRetryStore';

const session: GuestSession = new GuestSession({read: readSession, write: writeSession},
  () => http.request(runtime.paths.session, {method: 'POST'}, false));
export const http: FetchClient = new FetchClient(runtime.apiBaseUrl, runtime.timeoutMs,
  () => session.token(), (url, options) => fetch(url, options));
export const journalRepository = new JournalApi(http, runtime.paths.journal);
export const createJournalSaver = () => new SaveJournal(journalRepository,undefined,journalRetries);
export const experienceRepository=new ExperienceApi(http,runtime.paths.experience);
export const submitReading=(draft:ReadingDraft,id:string)=>experienceRepository.reading(draft,id);
export const submitCounsel=(draft:CounselDraft,id:string)=>experienceRepository.counsel(draft,id);
export const submitDaily=(draft:{day:string;topic:string},_id:string)=>experienceRepository.daily(draft.day,draft.topic);
