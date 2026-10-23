const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('staynest_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: ApiError = data?.error || {
      code: 'API_ERROR',
      message: response.statusText || 'Network request failed',
    };
    throw error;
  }

  return data as T;
}

// Currency formatter helper: converts minor units (paise) to INR display
export function formatCurrency(amountInMinorUnits: number, currency = 'INR'): string {
  const major = amountInMinorUnits / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(major);
}
