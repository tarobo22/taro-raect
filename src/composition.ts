import {runtime} from './config/runtime';
import {FetchClient} from './infrastructure/http/FetchClient';
import {GuestSession} from './infrastructure/http/GuestSession';
import {JournalApi} from './features/journal/JournalApi';
import {SaveJournal} from './features/journal/saveJournal';
import {readSession, writeSession} from './services/secure';

const session: GuestSession = new GuestSession({read: readSession, write: writeSession},
  () => http.request(runtime.paths.session, {method: 'POST'}, false));
export const http: FetchClient = new FetchClient(runtime.apiBaseUrl, runtime.timeoutMs,
  () => session.token(), (url, options) => fetch(url, options));
export const journalRepository = new JournalApi(http, runtime.paths.journal);
export const createJournalSaver = () => new SaveJournal(journalRepository);
