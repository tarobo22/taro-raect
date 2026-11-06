import type {JsonTransport} from '../../infrastructure/http/FetchClient';
import {Account,AccountSession,Grant,Provider,ProviderStatus,authorizationUrl,boolean,decodeAccount,decodeGrant,object,provider,stamp,uuid} from './contracts';
export class AccountApi{
 constructor(private readonly http:JsonTransport){}
 async providers():Promise<{providers:ProviderStatus[]}>{const v=object(await this.http.request('/v2/auth/providers',{},false),['providers']);if(!Array.isArray(v.providers))throw new Error('로그인 방법을 확인하지 못했어요.');const providers=v.providers.map(value=>{const p=object(value,['provider','available','reason']),available=boolean(p.available);if(p.reason!==(available?null:'provider_not_configured'))throw new Error('로그인 준비 상태를 확인하지 못했어요.');return{provider:provider(p.provider),available,reason:p.reason as ProviderStatus['reason']};});if(new Set(providers.map(p=>p.provider)).size!==providers.length)throw new Error('로그인 방법이 중복됐어요.');return{providers};}
 async account():Promise<Account>{return decodeAccount(await this.http.request('/v2/auth/account'));}
 async start(p:Provider,input:{return_uri:string;code_challenge:string;platform:string;intent?:'sign_in'|'link'}){const v=object(await this.http.request('/v2/auth/social/'+p+'/start',{method:'POST',body:JSON.stringify(input)}),['authorization_url','expires_at']);return{authorization_url:authorizationUrl(v.authorization_url,p),expires_at:stamp(v.expires_at)};}
 async exchange(input:{ticket:string;code_verifier:string}):Promise<Grant>{return decodeGrant(await this.http.request('/v2/auth/social/exchange',{method:'POST',body:JSON.stringify(input)}));}
 async sessions():Promise<{items:AccountSession[]}>{const v=object(await this.http.request('/v2/auth/sessions'),['items']);if(!Array.isArray(v.items))throw new Error('연결된 기기를 확인하지 못했어요.');return{items:v.items.map(value=>{const s=object(value,['id','platform','created_at','expires_at','current']);if(!['web','android','ios'].includes(String(s.platform)))throw new Error('기기 종류를 확인하지 못했어요.');return{id:uuid(s.id),platform:s.platform as AccountSession['platform'],created_at:stamp(s.created_at),expires_at:stamp(s.expires_at),current:boolean(s.current)};})};}
 private async revoke(path:string,method='POST'){if(await this.http.request(path,{method})!==null)throw new Error('로그아웃 완료를 확인하지 못했어요.');}
 logout(){return this.revoke('/v2/auth/logout');}
 logoutAll(){return this.revoke('/v2/auth/logout-all');}
 revokeSession(id:string){return this.revoke('/v2/auth/sessions/'+encodeURIComponent(uuid(id)),'DELETE');}
}
