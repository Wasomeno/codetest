import bridgeFetch from './fetch-bridge';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T | null;
  error?: string;
  message?: string;
  meta?: any;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    // Base URL strategy:
    //   1. `VITE_API_BASE_URL` env var wins if set (e.g. "https://api.acme.com" or "/api/v1").
    //   2. Otherwise, default to the same-origin `/api` path — which works
    //      out-of-the-box when the backend is reverse-proxied behind the
    //      frontend, and is also the path the Vite dev server proxies
    //      (see `VITE_API_PROXY_TARGET` in vite.config.ts).
    //   3. Trailing slashes are normalized so accidental "https://api/" still
    //      resolves to "https://api/projects" instead of "https://api//projects".
    const base =
      (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ||
      '/api';
    const url = `${base}${endpoint}`;

    const headers: Record<string, string> = {};

    // Only set JSON content-type when body is not FormData
    // (FormData requires the browser to auto-set multipart/form-data with boundary)
    const isFormData = options.body instanceof FormData;
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    // Add X-Session-ID header for web app auth (cookie alternative)
    const sessionId = localStorage.getItem('qa_webapp_session_id');
    if (sessionId) {
      headers['X-Session-ID'] = sessionId;
    }

    if (options.headers) {
      const h = new Headers(options.headers);
      h.forEach((v, k) => {
        headers[k] = v;
      });
    }

    let finalBody: any = options.body;
    let finalHeaders = { ...headers };

    const resp = await bridgeFetch<T>({
      url,
      init: {
        ...options,
        headers: finalHeaders,
        credentials: options.credentials ?? 'omit', // Avoid tricky CORS issues unless a protected route needs cookies.
        body: finalBody,
      },
      responseType: 'json',
    });

    // 207 Multi-Status is a successful partial result (e.g. FSD issue create).
    // fetch sets ok=false for anything outside 200–299, so treat 207 explicitly.
    const isPartialSuccess = resp.status === 207;

    if (!resp.ok && !isPartialSuccess) {
      console.error(
        `[API Service] Error for ${endpoint}:`,
        resp.status,
        resp.statusText,
        resp.body
      );

      // Handle session expiration
      if (resp.status === 401) {
        localStorage.removeItem('session_user');
        localStorage.removeItem('qa_webapp_session_id');
        
        // Trigger a storage event manually so other hooks in the same tab can update
        // (The storage event only fires for other tabs by default)
        window.dispatchEvent(new Event('storage'));
        
        // Optional: Force reload or redirect if absolutely necessary, 
        // but clearing state should be enough if hooks are listening.
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }

      return {
        success: false,
        error: (resp.body as any)?.error || (resp.body as any)?.message || `API Error: ${resp.status} ${resp.statusText}`,
      };
    }

    return {
      success: true,
      data: resp.body,
      meta: isPartialSuccess ? { partial: true, status: 207 } : undefined,
    };
  } catch (error: any) {
    console.error(`[API Service] Network error for ${endpoint}:`, error);
    return {
      success: false,
      error: error?.message || 'Network error calling GitLab API',
    };
  }
}

export const api = {
  post: async <T>(endpoint: string, options?: RequestInit) => {
    const { body, ...rest } = options || {};

    // Check if body is FormData
    const isFormData = body instanceof FormData;

    const resp = await request<T>(endpoint, {
      method: 'POST',
      ...rest,
      body: isFormData ? body : (typeof body === 'string' ? body : (body ? JSON.stringify(body) : undefined)),
    });

    return resp;
  },
  get: async <T>(endpoint: string, options: RequestInit = {}) => {
    const resp = await request<T>(endpoint, {
      method: 'GET',
      ...options,
    });

    return resp;
  },
  delete: async <T>(endpoint: string, options: RequestInit = {}) => {
    const resp = await request<T>(endpoint, {
      method: 'DELETE',
      ...options,
    });

    return resp;
  },
  put: async <T>(endpoint: string, options?: RequestInit) => {
    const { body, ...rest } = options || {};
    const resp = await request<T>(endpoint, {
      method: 'PUT',
      body: typeof body === 'string' ? body : (body ? JSON.stringify(body) : undefined),
      ...rest,
    });

    return resp;
  },
  patch: async <T>(endpoint: string, options?: RequestInit) => {
    const { body, ...rest } = options || {};
    const resp = await request<T>(endpoint, {
      method: 'PATCH',
      body: typeof body === 'string' ? body : (body ? JSON.stringify(body) : undefined),
      ...rest,
    });

    return resp;
  },
} as const;
