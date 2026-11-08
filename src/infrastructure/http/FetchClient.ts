export type FetchPort = (url: string, options?: RequestInit) => Promise<Response>;

export interface JsonTransport {
  request(path: string, options?: RequestInit, authenticated?: boolean): Promise<unknown>;
}

export class HttpError extends Error{
  constructor(message:string,readonly status:number,readonly code:string='',readonly retryable=false){super(message);}
}

export class FetchClient implements JsonTransport {
  constructor(private readonly baseUrl: string, private readonly timeoutMs: number,
              private readonly getToken: () => Promise<string>, private readonly fetcher: FetchPort) {}

  async request(path: string, options: RequestInit = {}, authenticated = true): Promise<unknown> {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    if (options.signal?.aborted) cancel();
    options.signal?.addEventListener('abort', cancel, {once: true});
    const timer = setTimeout(cancel, this.timeoutMs);
    try {
      const token = authenticated ? await this.getToken() : null;
      const headers = new Headers(options.headers);
      if(!(typeof FormData!=='undefined'&&options.body instanceof FormData))headers.set('Content-Type', 'application/json');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const response = await this.fetcher(this.baseUrl + path, {...options, headers, signal: controller.signal});
      if (!response.ok) {
        const result: unknown = await response.json().catch(()=>null);
        const detail=typeof result==='object'&&result!==null&&'error' in result?result.error:null;
        const value=typeof detail==='object'&&detail!==null?detail as Record<string,unknown>:null;
        const message=typeof detail==='string'?detail:typeof value?.message==='string'?value.message:'연결을 확인하고 다시 시도해 주세요.';
        throw new HttpError(message,response.status,typeof value?.code==='string'?value.code:'',value?.retryable===true);
      }
      return response.status===204?null:await response.json();
    } catch (error) {
      if (controller.signal.aborted) throw new Error('연결이 늦어지거나 중단됐어요. 입력한 내용은 유지됩니다.');
      throw error;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', cancel);
    }
  }

  async download(path:string):Promise<Blob>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),this.timeoutMs);
    try{
      const response=await this.fetcher(this.baseUrl+path,{headers:{Authorization:`Bearer ${await this.getToken()}`},signal:controller.signal});
      if(!response.ok)throw new HttpError(response.status===410?'내보내기 파일이 만료됐어요. 새로 요청해 주세요.':'파일을 내려받지 못했어요. 다시 확인해 주세요.',response.status);
      if(!response.headers.get('Content-Type')?.includes('application/zip'))throw new Error('내보내기 파일 형식을 확인하지 못했어요.');
      return await response.blob();
    }finally{clearTimeout(timer);}
  }
}
