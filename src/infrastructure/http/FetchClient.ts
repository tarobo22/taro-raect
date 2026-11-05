export type FetchPort = (url: string, options?: RequestInit) => Promise<Response>;

export interface JsonTransport {
  request(path: string, options?: RequestInit, authenticated?: boolean): Promise<unknown>;
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
      headers.set('Content-Type', 'application/json');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const response = await this.fetcher(this.baseUrl + path, {...options, headers, signal: controller.signal});
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
          ? result.error : '연결을 확인하고 다시 시도해 주세요.';
        throw new Error(message);
      }
      return result;
    } catch (error) {
      if (controller.signal.aborted) throw new Error('연결이 늦어지거나 중단됐어요. 입력한 내용은 유지됩니다.');
      throw error;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', cancel);
    }
  }
}
