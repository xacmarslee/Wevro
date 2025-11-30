import { QueryClient, QueryFunction } from "@tanstack/react-query";

const RAW_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
let normalizedBaseUrl = RAW_API_BASE_URL;

if (normalizedBaseUrl) {
  if (normalizedBaseUrl.startsWith("//")) {
    normalizedBaseUrl = `https:${normalizedBaseUrl}`;
  } else if (!/^https?:\/\//i.test(normalizedBaseUrl)) {
    normalizedBaseUrl = `https://${normalizedBaseUrl}`;
  }
  normalizedBaseUrl = normalizedBaseUrl.replace(/\/+$/, "");
}

const API_BASE_URL = normalizedBaseUrl;

function resolveRequestInfo(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input === "string") {
    if (input.startsWith("http://") || input.startsWith("https://")) {
      return input;
    }
    // Force absolute URL for all API requests to avoid Capacitor local file interception
    if (API_BASE_URL && input.startsWith("/api")) {
      const normalizedPath = input.startsWith("/") ? input : `/${input}`;
      return `${API_BASE_URL}${normalizedPath}`;
    }
    if (API_BASE_URL) {
      const normalizedPath = input.startsWith("/") ? input : `/${input}`;
      return `${API_BASE_URL}${normalizedPath}`;
    }
  }
  return input;
}

export async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText = res.statusText;
    let errorData: any = null;
    
    try {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const text = await res.clone().text();
        errorData = JSON.parse(text);
        errorText = errorData?.message || errorData?.error || text || res.statusText;
      } else {
        const text = await res.text();
        errorText = text || res.statusText;
      }
    } catch (e) {
      // 如果解析失敗，嘗試取得原始文字
      try {
        errorText = await res.text() || res.statusText;
        
        // [DEBUG] 強制顯示 HTML 內容和 URL 以進行診斷
        if (errorText.trim().startsWith("<")) {
           alert(`API Error Diagnostic:\n\nURL: ${res.url}\nStatus: ${res.status}\n\nResponse Start:\n${errorText.substring(0, 200)}`);
        }
      } catch {
        errorText = res.statusText;
      }
    }
    
    console.error(`[API Error] ${res.status}:`, errorText, errorData);
    
    // 如果有結構化錯誤資料，將其作為 JSON 字串傳遞
    if (errorData) {
      throw new Error(`${res.status}: ${JSON.stringify(errorData)}`);
    }
    
    throw new Error(`${res.status}: ${errorText}`);
  }
}

function withAuthInit(init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers || {});
  const token = localStorage.getItem("firebaseToken");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  };
}

export async function fetchWithAuth(input: RequestInfo | URL, init: RequestInit = {}) {
  const resolvedInput = resolveRequestInfo(input);
  
  // 添加超時處理（30秒超時，避免 ANR）
  const timeoutMs = 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(resolvedInput, {
      ...withAuthInit(init),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error("[fetchWithAuth] Request timeout:", {
        url: resolvedInput.toString(),
        base: API_BASE_URL,
        timeout: timeoutMs
      });
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    
    console.error("[fetchWithAuth] Network/Fetch Error:", error, {
      url: resolvedInput.toString(),
      base: API_BASE_URL
    });
    throw error;
  }
}

export async function fetchJsonWithAuth<T>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const res = await fetchWithAuth(input, init);
  
  // Check for HTML response (common SPA fallback issue) - Catch 200 OK HTML responses
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("text/html")) {
     const text = await res.clone().text();
     // Force alert for diagnostics
     alert(`API DEBUG:\nURL: ${res.url}\nStatus: ${res.status}\n\nThis is likely the Index HTML page, meaning the API route was not found on server.\n\nResponse Preview:\n${text.substring(0, 200)}`);
     throw new Error(`API returned HTML instead of JSON (Status: ${res.status})`);
  }

  await throwIfResNotOk(res);
  return res.json() as Promise<T>;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const init: RequestInit = {
    method,
    body: data ? JSON.stringify(data) : undefined,
  };

  if (data) {
    init.headers = {
      "Content-Type": "application/json",
    };
  }

  const resolvedUrl = typeof url === "string" ? resolveRequestInfo(url) : url;
  const finalUrl = typeof resolvedUrl === "string" ? resolvedUrl : resolvedUrl.toString();
  
  console.log(`[API Request] ${method} ${url}`, {
    resolvedUrl: finalUrl,
    apiBaseUrl: API_BASE_URL || "not set",
    data: data ? { data } : undefined,
  });

  let res: Response;
  try {
    res = await fetchWithAuth(url, init);
  } catch (error) {
    console.error(`[API Request Failed] ${method} ${url}`, {
      error,
      resolvedUrl: finalUrl,
      apiBaseUrl: API_BASE_URL || "not set",
    });
    // 重新拋出錯誤，但新增更多上下文
    if (error instanceof Error) {
      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        throw new Error(`Network error: Cannot connect to ${finalUrl}. Please check your connection and API configuration.`);
      }
    }
    throw error;
  }

  console.log(`[API Response] ${method} ${url}`, {
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
    url: finalUrl,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    console.log(`[Query] Fetching ${url}`);

    const res = await fetchWithAuth(url);

    console.log(`[Query Response] ${url}`, {
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    console.log(`[Query Data] ${url}`, data);
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
