import type {JsonTransport} from '../../infrastructure/http/FetchClient';
import type {JournalDetailRepository, JournalDraft, JournalEntry, JournalPolicy, JournalRepository} from './model';

export interface JournalEndpoints {entries: string; policy: string;}

export function decodeEntry(value: unknown): JournalEntry {
  if (!isRecord(value) || typeof value.id !== 'string' ||
      !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value.id) ||
      typeof value.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.day) ||
      !Number.isFinite(Date.parse(value.day)) || new Date(value.day).toISOString().slice(0, 10) !== value.day ||
      typeof value.mood !== 'string' || typeof value.body !== 'string' ||
      typeof value.created_at !== 'string' || !Number.isFinite(Date.parse(value.created_at)) ||
       typeof value.updated_at !== 'string' || !Number.isFinite(Date.parse(value.updated_at)) ||
       (value.version!==undefined&&(!Number.isInteger(value.version)||Number(value.version)<1))) {
    throw new Error('저장한 기록을 확인하지 못했어요. 입력한 내용은 유지됩니다.');
  }
  return {id: value.id, day: value.day, mood: value.mood, body: value.body,
    createdAt: value.created_at, updatedAt: value.updated_at,
    ...(typeof value.version==='number'?{version:value.version}:{})};
}

export class JournalApi implements JournalRepository,JournalDetailRepository {
  private labels:string[]|null=null;
  constructor(private readonly http: JsonTransport, private readonly paths: JournalEndpoints,private readonly v2?:string) {}
  private readonly codes=['calm','happy','thinking','settled','talk'];
  private async moodCode(mood:string){if(this.codes.includes(mood))return mood;const labels=this.labels??(await this.policy()).moods;const code=this.codes[labels.indexOf(mood)];if(!code)throw new Error('마음 선택을 다시 확인해 주세요.');return code;}
  private async decodeV2(value:unknown):Promise<JournalEntry>{
    if(!isRecord(value))throw new Error('기록 응답을 확인하지 못했어요.');
    const labels=this.labels??(await this.policy()).moods;
    const source=(v:unknown)=>{if(v==null)return undefined;if(typeof v!=='string'||!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(v))throw new Error('연결된 기록 출처를 확인하지 못했어요.');return v;};
    const sourceReadingId=source(value.source_reading_id),sourceTurnId=source(value.source_turn_id);if(sourceReadingId&&sourceTurnId)throw new Error('기록 출처는 하나만 연결할 수 있어요.');
    const entry=decodeEntry({...value,day:value.local_day,mood:labels[this.codes.indexOf(String(value.mood))]??value.mood});
    return {...entry,...(sourceReadingId||sourceTurnId?{apiVersion:2 as const}:{}),...(sourceReadingId?{sourceReadingId}:{}),...(sourceTurnId?{sourceTurnId}:{})};
  }

  async get(id:string):Promise<JournalEntry> {
    if(this.v2)return this.decodeV2(await this.http.request(this.v2+'/'+encodeURIComponent(id)));
    return decodeEntry(await this.http.request(this.paths.entries+'/'+encodeURIComponent(id)));
  }

  async list(): Promise<JournalEntry[]> {
    const value = await this.http.request(this.paths.entries);
    if (!Array.isArray(value)) throw new Error('기록 응답을 확인하지 못했어요.');
    return value.map(decodeEntry);
  }

  async create(draft: JournalDraft): Promise<JournalEntry> {
    if(this.v2&&(draft.sourceReadingId||draft.sourceTurnId)){
      if(draft.sourceReadingId&&draft.sourceTurnId)throw new Error('기록 출처는 하나만 연결할 수 있어요.');
      return this.decodeV2(await this.http.request(this.v2,{method:'POST',headers:{'X-Idempotency-Key':draft.requestId!},body:JSON.stringify({local_day:draft.day,mood:await this.moodCode(draft.mood),body:draft.body,...(draft.sourceReadingId?{source_reading_id:draft.sourceReadingId}:{}),...(draft.sourceTurnId?{source_turn_id:draft.sourceTurnId}:{})})}));
    }
    return decodeEntry(await this.http.request(this.paths.entries, {method: 'POST',
      body: JSON.stringify({day: draft.day, mood: draft.mood, body: draft.body, requestId:draft.requestId})}));
  }

  async update(id: string, draft: JournalDraft): Promise<JournalEntry> {
    if(this.v2&&(draft.apiVersion===2||draft.sourceReadingId||draft.sourceTurnId))return this.decodeV2(await this.http.request(this.v2+'/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({expected_version:draft.version,mood:await this.moodCode(draft.mood),body:draft.body})}));
    return decodeEntry(await this.http.request(`${this.paths.entries}/${encodeURIComponent(id)}`, {method: 'PUT',
      body: JSON.stringify({mood: draft.mood, body: draft.body,expectedVersion:draft.version})}));
  }

  async delete(id: string): Promise<boolean> {
    const value = await this.http.request(`${this.paths.entries}/${encodeURIComponent(id)}`, {method: 'DELETE'});
    if (!isRecord(value) || typeof value.deleted !== 'boolean') throw new Error('삭제 응답을 확인하지 못했어요.');
    return value.deleted;
  }

  async policy(): Promise<JournalPolicy> {
    const value = await this.http.request(this.paths.policy, {}, false);
    if (!isRecord(value) || !Array.isArray(value.moods) || !value.moods.length ||
        !value.moods.every(x => typeof x === 'string') || typeof value.maxBodyLength !== 'number' ||
        !Number.isInteger(value.maxBodyLength) || value.maxBodyLength <= 0) {
      throw new Error('마음기록 설정을 불러오지 못했어요.');
    }
    this.labels=value.moods;return {moods: value.moods, maxBodyLength: value.maxBodyLength};
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
