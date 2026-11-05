import {currentConsent} from '../p0/model';
import type {Bootstrap} from '../p0/model';
import {validRecordDate} from '../p0/selection';
import {journalRange} from './dates';
import type {InsightInput,InsightSelection,InsightSource} from './model';

export function validId(value:unknown):value is string{return typeof value==='string'&&/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value);}
export function insightSelection(from:string,to:string,entries:readonly InsightSource[]):InsightSelection{
 const range=journalRange(from,to);
 if(entries.length>10||new Set(entries.map(e=>e.id)).size!==entries.length||entries.some(e=>!validId(e.id)||!Number.isInteger(e.version)||e.version<1||typeof e.local_day!=='string'||!validRecordDate(e.local_day)||e.local_day<from||e.local_day>to))throw new Error('요약할 기록은 기간 안에서 최대 10개를 골라 주세요. 수정된 기록은 내용을 다시 확인하고 선택해 주세요.');
 return {...range,entries:entries.map(({id,version,local_day})=>({id,version,local_day}))};
}
export function validateInsightInput(input:InsightInput):InsightInput{
 journalRange(input.range_start,input.range_end);
 const ids=input.entry_ids,versions=input.entry_versions;
 if(!Array.isArray(ids)||ids.length<1||ids.length>10||new Set(ids).size!==ids.length||ids.some(id=>!validId(id))||!versions||Object.keys(versions).length!==ids.length||ids.some(id=>!Object.hasOwn(versions,id)||!Number.isInteger(versions[id])||versions[id]<1)||!validId(input.consent_event_id))throw new Error('요약할 기록 1~10개와 현재 동의를 다시 확인해 주세요.');
 return {range_start:input.range_start,range_end:input.range_end,entry_ids:[...ids],entry_versions:{...versions},consent_event_id:input.consent_event_id};
}
export function insightRequest(selection:InsightSelection,bootstrap:Pick<Bootstrap,'consents'|'policy_version'>):InsightInput{
 const checked=insightSelection(selection.range_start,selection.range_end,selection.entries),ai=currentConsent(bootstrap.consents,'ai_processing',bootstrap.policy_version),context=currentConsent(bootstrap.consents,'journal_context',bootstrap.policy_version);
 if(!ai||!context)throw new Error('AI 처리와 마음기록 참조를 각각 허용한 뒤 다시 요청해 주세요.');
 return validateInsightInput({...checked,entry_ids:checked.entries.map(e=>e.id),entry_versions:Object.fromEntries(checked.entries.map(e=>[e.id,e.version])),consent_event_id:ai.id});
}
