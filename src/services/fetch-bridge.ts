/**
 * Request options for bridge fetch
 */
export interface BackgroundFetchRequest {
  url: string;
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    credentials?: RequestCredentials;
    redirect?: RequestRedirect;
    cache?: RequestCache;
    mode?: RequestMode;
  };
  responseType?: 'json' | 'text' | 'arrayBuffer';
  includeHeaders?: boolean;
  timeoutMs?: number;
}

/**
 * Response from bridge fetch
 */
export interface BackgroundFetchResponse<T = any> {
  ok: boolean;
  status: number;
  statusText: string;
  url: string;
  headers?: Record<string, string>;
  body?: T;
}

// Simple direct fetch with timeout and response-type handling.
export async function bridgeFetch<T = any>(
  req: BackgroundFetchRequest
): Promise<BackgroundFetchResponse<T>> {
  try {
    const init = (req.init || {}) as RequestInit;
    const resp = await fetch(req.url, init);

    const ct = resp.headers.get('content-type') || '';
    const want =
      req.responseType ||
      (ct.includes('application/json')
        ? 'json'
        : ct.startsWith('text/')
          ? 'text'
          : 'arrayBuffer');
    let body: any = undefined;
    try {
      if (want === 'json') body = await resp.json();
      else if (want === 'text') body = await resp.text();
      else {
        const buf = await resp.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let bin = '';
        for (let i = 0; i < bytes.length; i++)
          bin += String.fromCharCode(bytes[i]);
        body = btoa(bin);
      }
    } catch {}
    
    const headers: Record<string, string> = {};
    try {
      resp.headers.forEach((v, k) => {
        headers[k] = v;
      });
    } catch {}
    
    return {
      ok: resp.ok,
      status: resp.status,
      statusText: resp.statusText,
      url: resp.url,
      headers,
      body,
    } as BackgroundFetchResponse<T>;
  } catch (e) {
    // Surface as a network-like response for uniform handling
    return {
      ok: false,
      status: 0,
      statusText: (e as any)?.message || 'Network error',
      url: req.url,
      headers: {},
      body: undefined,
    } as BackgroundFetchResponse<T>;
  }
}

export default bridgeFetch;
