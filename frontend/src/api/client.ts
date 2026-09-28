import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Event emitter pattern for auth & security events without circular react context dependency
type AuthEventCallback = () => void;
type ForbiddenEventCallback = (message: string) => void;

let onUnauthorizedCallback: AuthEventCallback | null = null;
let onForbiddenCallback: ForbiddenEventCallback | null = null;

// Prevents the 401 callback from firing once per concurrent in-flight request on logout
let isHandlingUnauthorized = false;

export function resetUnauthorizedGate() {
  isHandlingUnauthorized = false;
}

export function registerAuthEvents(callbacks: {
  onUnauthorized?: AuthEventCallback;
  onForbidden?: ForbiddenEventCallback;
}) {
  if (callbacks.onUnauthorized) onUnauthorizedCallback = callbacks.onUnauthorized;
  if (callbacks.onForbidden) onForbiddenCallback = callbacks.onForbidden;
}


export const apiClient: AxiosInstance = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string) || '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for attaching Authorization token from memory if needed (fallback for cookie)
let inMemoryAccessToken: string | null = null;

export function setInMemoryToken(token: string | null) {
  inMemoryAccessToken = token;
}

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (inMemoryAccessToken && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export interface NormalizedApiError {
  statusCode: number;
  message: string;
  errors?: string[];
  raw?: any;
}

export function normalizeError(error: unknown): NormalizedApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status || 500;
    const data = error.response?.data;

    let message = 'An unexpected server error occurred. Please try again.';
    let errors: string[] | undefined = undefined;

    if (data) {
      if (typeof data.message === 'string') {
        message = data.message;
      } else if (Array.isArray(data.message)) {
        errors = data.message;
        message = data.message.join(', ');
      } else if (data.error && typeof data.error === 'string') {
        message = data.error;
      }
    } else if (error.message) {
      message = error.message;
    }

    return { statusCode: status, message, errors, raw: data };
  }

  if (error instanceof Error) {
    return { statusCode: 500, message: error.message };
  }

  return { statusCode: 500, message: 'An unknown error occurred.' };
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const normalized = normalizeError(error);

    if (status === 401) {
      if (onUnauthorizedCallback && !isHandlingUnauthorized) {
        isHandlingUnauthorized = true;
        onUnauthorizedCallback();
      }
    } else if (status === 403) {
      if (onForbiddenCallback) {
        onForbiddenCallback(normalized.message);
      }
    }

    return Promise.reject(normalized);
  },
);
