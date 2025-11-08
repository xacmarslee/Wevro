import { QueryClient, QueryFunction } from "@tanstack/react-query";

export async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    console.error(`[API Error] ${res.status}: ${text}`);
    throw new Error(`${res.status}: ${text}`);
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
  return fetch(input, withAuthInit(init));
}

export async function fetchJsonWithAuth<T>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const res = await fetchWithAuth(input, init);
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

  console.log(`[API Request] ${method} ${url}`, data ? { data } : "");

  const res = await fetchWithAuth(url, init);

  console.log(`[API Response] ${method} ${url}`, {
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
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
