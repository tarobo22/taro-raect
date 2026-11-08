export const topics=[
 ['relationship','관계','연애·관계'],['work','일과 진로','일·진로'],['self','나 자신'],
 ['daily','오늘 하루','오늘의 선택'],['care','마음 돌봄'],['start','새로운 시작'],
] as const;
export type Topic=typeof topics[number][0];
export const topicCodes=topics.map(([id])=>id);
export function findTopicCode(value:string):Topic|undefined{
 return topics.find(([id,label,legacyLabel])=>value===id||value===label||value===legacyLabel)?.[0];
}
export type ConsentKind='ai_processing'|'journal_context'|'cloud_transcription';
export interface Consent{id:string;kind:ConsentKind;policy_version:string;granted:boolean;occurred_at:string;}
export interface Preferences{tone:'warm'|'giga';reduced_motion:boolean;voice_mode:'device'|'cloud';}
export interface PreferencePatch{tone?:Preferences['tone'];reduced_motion?:boolean;voice_mode?:Preferences['voice_mode'];timezone?:string;}
export interface Me{id:string;kind:'guest'|'member';locale:string;timezone:string;preferences:Preferences;}
export interface OtaPolicy{channel:string;min_native_version:string;updates_enabled:boolean;}
export interface Bootstrap{api_version:string;policy_version:string;server_time:string;user:Me;consents:Consent[];ota_policy:OtaPolicy;limits:{daily_ai_requests:number;question_max_chars:number;journal_max_chars:number;audio_max_seconds:number;audio_max_bytes:number};}
export interface Asset{id:string;url:string;sha256:string;width:number;height:number;source_page:string|null;license_name:string;license_url:string|null;}
export interface Deck{id:string;code:string;version:string;name:string;card_count:number;status:'candidate'|'published'|'retired';back_asset:Asset;}
export interface CatalogCard{id:number;code:string;name_ko:string;name_en:string;arcana:'major'|'minor';suit:'wands'|'cups'|'swords'|'pentacles'|null;basic_meaning:string;short_meaning?:string;image_asset:Asset|null;}
export interface SelectedCard{card_id:number;position:number;position_label:string;orientation:'upright'|'reversed';card:CatalogCard;}
export interface AIResult{kind:'tarot'|'chat'|'insight';empathy:string;summary:string;card_insights:{card_id:number;position:number;meaning:string;reflection:string}[];advice:string;actions:string[];expression:'calm'|'welcome'|'listen'|'encourage'|'joy'|'concern'|'serious';follow_up_questions:string[];safety_mode:'standard'|'support';}
export interface V2Reading{id:string;kind:'daily'|'three_card';topic:Topic;question:string;deck_version_id:string;local_day:string|null;captured_timezone:string;state:'draft'|'selected'|'generating'|'ready'|'failed';version:number;slots:{id:string;index:number}[];selected_cards:SelectedCard[];result:AIResult|null;created_at:string;}
export interface BasicReading{reading_id:string;source:'basic';summary:string;cards:SelectedCard[];advice:string;action:string;}
export interface ReadingInput{kind:'daily'|'three_card';topic:Topic;question?:string;deck_version_id:string;}
export interface InterpretationInput{expected_version:number;consent_event_id:string;context_entry_ids:string[];context_entry_versions?:Record<string,number>;}
export type JobState='queued'|'running'|'cancel_requested'|'succeeded'|'failed'|'cancelled';
export interface JobAccepted{job_id:string;resource_id:string;state:JobState;status_url:string;events_url:string;}
export interface Job{id:string;kind:'tarot'|'chat'|'insight'|'transcription';state:JobState;version:number;resource_id:string;result_url:string|null;error:{code:string;message:string;retryable:boolean}|null;created_at:string;finished_at:string|null;}
export interface ChoiceAnswer{question_id:'control'|'support'|'action';answer:boolean;}
export interface TurnInput{client_message_id:string;input_source:'text'|'choice'|'voice';text:string;answers:ChoiceAnswer[];context_entry_ids:string[];context_entry_versions?:Record<string,number>;consent_event_id:string;}
export interface Conversation{id:string;topic:Topic;tone:'warm'|'giga';state:'active'|'closed';created_at:string;updated_at:string;}
export interface Turn{id:string;conversation_id:string;turn_index:number;text:string;answers:ChoiceAnswer[];input_source:string;state:'accepted'|'generating'|'ready'|'failed'|'cancelled';assistant_result:AIResult|null;version:number;created_at:string;}
export interface Transcription{id:string;state:'queued'|'running'|'ready'|'failed'|'deleted';transcript:string|null;expires_at:string;}
export interface ContextEntry{id:string;local_day:string;mood:string;body:string;version:number;created_at:string;updated_at:string;source_reading_id:string|null;source_turn_id:string|null;}
export type RecordFilter='전체'|'마음'|'타로'|'대화';
export interface Page<T>{items:T[];next_cursor:string|null;}
export interface DataRequest{id:string;kind:'export'|'erase';state:'queued'|'running'|'completed'|'failed';download_available:boolean;expires_at:string;}
export interface DataReceipt{id:string;kind:'export'|'erase';state:DataRequest['state'];receipt:string;expires_at:string;device_cleanup_complete?:boolean;}
export interface FeedbackInput{reading_id?:string;turn_id?:string;rating:'helpful'|'unhelpful';reason:string;comment:string;}
export function currentConsent(consents:Consent[],kind:ConsentKind,policy:string):Consent|undefined{
 const event=consents.filter(c=>c.kind===kind).sort((a,b)=>b.occurred_at.localeCompare(a.occurred_at))[0];
 return event?.granted&&event.policy_version===policy?event:undefined;
}
