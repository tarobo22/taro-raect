import type {JsonTransport} from '../../infrastructure/http/FetchClient';
/** Stop new requests and reject every response from a previous mounted identity. */
export class AccountTransport implements JsonTransport{
 private paused=false;private generation=0;private pending=new Set<Promise<unknown>>();private controllers=new Set<AbortController>();
 constructor(private readonly inner:JsonTransport){}
 request(path:string,options:RequestInit={},authenticated=true):Promise<unknown>{
  if(this.paused)return Promise.reject(new Error('계정 연결을 전환하고 있어요. 작성한 내용은 보관돼요.'));
  const generation=this.generation,controller=new AbortController(),abort=()=>controller.abort();if(options.signal?.aborted)abort();options.signal?.addEventListener('abort',abort,{once:true});this.controllers.add(controller);
  const request=this.inner.request(path,{...options,signal:controller.signal},authenticated).then(value=>{if(generation!==this.generation)throw new Error('이전 계정의 응답은 적용하지 않았어요.');return value;}).finally(()=>{this.pending.delete(request);this.controllers.delete(controller);options.signal?.removeEventListener('abort',abort);});this.pending.add(request);return request;
 }
 async pause(){this.paused=true;this.generation++;for(const controller of this.controllers)controller.abort();await Promise.allSettled([...this.pending]);}
 resume(){this.paused=false;}
}
