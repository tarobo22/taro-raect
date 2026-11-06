export type Provider='google'|'apple';
export type Account={user_id:string;kind:'guest'|'member';providers:Provider[]};
export type Grant={user_id:string;session_id:string;access_token:string;expires_at:string;previous_user_id:string;guest_records_preserved:true};
export type PendingSocial={owner:string;provider:Provider;return_uri:string;verifier:string;expires_at:string};
export type ProviderStatus={provider:Provider;available:boolean;reason:null|'provider_not_configured'};
export type AccountSession={id:string;platform:'web'|'android'|'ios';created_at:string;expires_at:string;current:boolean};
const invalid=()=>new Error('계정 연결 응답을 확인하지 못했어요. 기존 기록은 유지돼요.');
export function object(value:unknown,keys:readonly string[]):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw invalid();const v=value as Record<string,unknown>;if(Object.keys(v).length!==keys.length||keys.some(k=>!(k in v)))throw invalid();return v;}
export function text(value:unknown){if(typeof value!=='string'||!value)throw invalid();return value;}
export function uuid(value:unknown){const v=text(value);if(!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(v))throw invalid();return v;}
export function stamp(value:unknown){const v=text(value);if(!/^\d{4}-\d\d-\d\dT/.test(v)||!Number.isFinite(Date.parse(v)))throw invalid();return v;}
export function provider(value:unknown):Provider{if(value!=='google'&&value!=='apple')throw invalid();return value;}
export function boolean(value:unknown){if(typeof value!=='boolean')throw invalid();return value;}
export function decodeAccount(value:unknown):Account{const v=object(value,['user_id','kind','providers']);if(v.kind!=='guest'&&v.kind!=='member'||!Array.isArray(v.providers))throw invalid();const providers=v.providers.map(provider);if(new Set(providers).size!==providers.length)throw invalid();return{user_id:uuid(v.user_id),kind:v.kind,providers};}
export function decodeGrant(value:unknown):Grant{const v=object(value,['user_id','session_id','access_token','expires_at','previous_user_id','guest_records_preserved']);if(typeof v.access_token!=='string'||!/^[\da-f]{64}$/.test(v.access_token)||v.guest_records_preserved!==true)throw invalid();return{user_id:uuid(v.user_id),session_id:uuid(v.session_id),access_token:v.access_token,expires_at:stamp(v.expires_at),previous_user_id:uuid(v.previous_user_id),guest_records_preserved:true};}
export function decodePending(value:unknown):PendingSocial{const v=object(value,['owner','provider','return_uri','verifier','expires_at']);const verifier=text(v.verifier);if(!/^[\w-]{43,128}$/.test(verifier))throw invalid();return{owner:uuid(v.owner),provider:provider(v.provider),return_uri:text(v.return_uri),verifier,expires_at:stamp(v.expires_at)};}
export function authorizationUrl(value:unknown,p:Provider){const url=new URL(text(value));if(url.protocol!=='https:'||url.username||url.password||url.port||url.hostname!==(p==='google'?'accounts.google.com':'appleid.apple.com')||url.hash||[...url.searchParams.keys()].some(k=>/^(?:access_token|id_token|token|bearer|authorization|auth_ticket)$/i.test(k)))throw invalid();return url.href;}
export function parseCallback(value:string,returnUri:string,expected:Provider):{ticket:string;provider:Provider}|{error:string}{
 const url=new URL(value),base=new URL(returnUri);if(url.protocol!==base.protocol||url.host!==base.host||url.pathname!==base.pathname||url.search||url.username||url.password)throw invalid();
 const params=new URLSearchParams(url.hash.slice(1));if([...params.keys()].some(k=>params.getAll(k).length!==1))throw invalid();
 if(params.has('auth_error')){if([...params.keys()].length!==1||!['cancelled','authentication_failed','flow_expired'].includes(params.get('auth_error')!))throw invalid();return{error:params.get('auth_error')!};}
 if([...params.keys()].length!==2||params.get('auth_provider')!==expected||!/^[\w-]{32,256}$/.test(params.get('auth_ticket')||''))throw invalid();return{ticket:params.get('auth_ticket')!,provider:expected};
}
function base64url(bytes:Uint8Array){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';let value='';for(let i=0;i<bytes.length;i+=3){const n=(bytes[i]<<16)|((bytes[i+1]||0)<<8)|(bytes[i+2]||0);value+=alphabet[n>>>18]+alphabet[n>>>12&63];if(i+1<bytes.length)value+=alphabet[n>>>6&63];if(i+2<bytes.length)value+=alphabet[n&63];}return value;}
export function validatePkce(value:unknown){const v=object(value,['verifier','challenge']);if(typeof v.verifier!=='string'||!/^[\w-]{43,128}$/.test(v.verifier)||typeof v.challenge!=='string'||!/^[\w-]{43}$/.test(v.challenge))throw invalid();return{verifier:v.verifier,challenge:v.challenge};}
interface PkceCrypto{getRandomValues<T extends Uint8Array>(value:T):T;subtle:{digest(algorithm:string,value:Uint8Array<ArrayBuffer>):Promise<ArrayBuffer>};}
export async function createPkce(crypto:PkceCrypto){if(!crypto?.getRandomValues||!crypto.subtle?.digest)throw new Error('이 환경에서는 안전한 계정 연결을 시작할 수 없어요.');const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);const verifier=base64url(bytes),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));return validatePkce({verifier,challenge:base64url(new Uint8Array(digest))});}
