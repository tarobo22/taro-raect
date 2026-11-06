import type {Asset,Page} from '../p0/model';
import type {AdminRole} from './AdminSession';
export interface AdminEligibility{eligible:boolean;role:AdminRole|null;session_seconds:number;}
export interface AdminMe{owner_id:string;role:AdminRole;expires_at:string;audit_retention_days:number|null;}
export type RightsStatus='unreviewed'|'approved'|'rejected';
export interface AdminDeck{version_id:string;code:string;name:string;version:string;rights_status:RightsStatus;review_version:number;review_note:string;published:boolean;publication_version:number;current_publication_id:string|null;assets:Asset[];}
export interface Publication{id:string;version_id:string;code:string;action:'publish'|'rollback';previous_id:string|null;created_at:string;}
export interface CatalogState{items:AdminDeck[];publications:Publication[];}
export type TriageStatus='new'|'reviewing'|'resolved'|'dismissed';
export interface AdminFeedback{id:string;rating:'helpful'|'unhelpful';reason:string;comment:string;reading_id:string|null;turn_id:string|null;created_at:string;triage_status:TriageStatus;triage_version:number;}
export type AuditValue=string|number|boolean|null|AuditValue[]|{[key:string]:AuditValue};
export interface AuditEvent{id:string;action:string;target_type:string;target_id:string;actor_owner_id:string|null;details:{[key:string]:AuditValue};created_at:string;}
export interface OtaPolicy{channel:string;min_native_version:string;updates_enabled:boolean;version:number;}
export interface OtaUpdate{expected_version:number;channel:string;min_native_version:string;updates_enabled:boolean;}
export type FeedbackPage=Page<AdminFeedback>;
export type AuditPage=Page<AuditEvent>;
