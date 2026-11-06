export type AdminRole='viewer'|'publisher';
export interface AdminGrant{token:string;expiresAt:string;roles:AdminRole[];}
export interface AdminSnapshot{open:boolean;owner:string|null;expiresAt:string|null;roles:readonly AdminRole[];generation:number;}
const closed=()=>new Error('운영 세션을 다시 시작해 주세요.');
/** Bearers never enter React state, URLs, storage adapters or serialized snapshots. */
export class AdminSession{
 #grant:AdminGrant|null=null;#expectedOwner:string|null=null;#generation=0;#listeners=new Set<()=>void>();
 #snapshot:AdminSnapshot={open:false,owner:null,expiresAt:null,roles:[],generation:0};
 constructor(private readonly clock:()=>number=Date.now){}
 get snapshot(){return this.#snapshot;}
 get generation(){return this.#generation;}
 subscribe(listener:()=>void){this.#listeners.add(listener);return()=>{this.#listeners.delete(listener);};}
 #publish(){for(const listener of this.#listeners)listener();}
 clear(){this.#grant=null;this.#expectedOwner=null;this.#generation++;this.#snapshot={open:false,owner:null,expiresAt:null,roles:[],generation:this.#generation};this.#publish();}
 begin(owner:string){this.clear();this.#expectedOwner=owner;return this.#generation;}
 activate(owner:string,grant:AdminGrant,generation:number){
  if(generation!==this.#generation||owner!==this.#expectedOwner)return false;
  if(!grant.token||!Number.isFinite(Date.parse(grant.expiresAt))||Date.parse(grant.expiresAt)<=this.clock()||!Array.isArray(grant.roles)||!grant.roles.length||new Set(grant.roles).size!==grant.roles.length||grant.roles.some(role=>!['viewer','publisher'].includes(role)))throw closed();
  this.#grant={...grant,roles:[...grant.roles]};this.#snapshot={open:true,owner,expiresAt:grant.expiresAt,roles:[...grant.roles],generation};this.#publish();return true;
 }
 token(owner:string){if(!this.#grant||this.#snapshot.owner!==owner||Date.parse(this.#grant.expiresAt)<=this.clock()){this.clear();throw closed();}return this.#grant.token;}
}
