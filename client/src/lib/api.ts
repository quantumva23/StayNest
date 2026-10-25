const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export interface FieldError {
  path: string;
  message: string;
}

export class ApiRequestError extends Error {
  code: string;
  details?: FieldError[];
  status: number;

  constructor(message: string, code: string, status: number, details?: FieldError[]) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
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

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiRequestError(
      "Can't reach StayNest. Check your connection and retry.",
      'NETWORK_ERROR',
      0
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const body = data?.error || {};
    const error = new ApiRequestError(
      body.message || response.statusText || 'Request failed',
      body.code || 'API_ERROR',
      response.status,
      body.details
    );

    const isAuthAttempt = endpoint.includes('/auth/login') || endpoint.includes('/auth/register');
    if (response.status === 401 && !isAuthAttempt && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('staynest_token');
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.assign(`/login?redirect=${redirect}`);
    }

    throw error;
  }

  return data as T;
}

export async function uploadImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
    throw new ApiRequestError('Upload a JPEG, PNG, or WebP image under 2 MB.', 'INVALID_IMAGE', 400);
  }

  const token = localStorage.getItem('staynest_token');
  const headers: Record<string, string> = { 'Content-Type': file.type };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/uploads`, { method: 'POST', headers, body: file });
  } catch {
    throw new ApiRequestError("Can't reach StayNest. Check your connection and retry.", 'NETWORK_ERROR', 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const body = data?.error || {};
    throw new ApiRequestError(body.message || 'Upload failed', body.code || 'INVALID_IMAGE', response.status, body.details);
  }
  return data.imageUrl as string;
}

export function messageForError(err: unknown): string {
  if (err instanceof ApiRequestError) {
    switch (err.code) {
      case 'UNKNOWN_CITY':
        return 'Choose a city from the list. Free-typed destinations are not bookable yet.';
      case 'BOOKING_CONFLICT':
        return 'Those dates were just taken. Pick different dates or fewer rooms.';
      case 'DB_BUSY':
        return 'The database was busy and this save did not finish. Try again.';
      case 'CAPACITY_EXCEEDED':
        return err.message;
      case 'UNAUTHENTICATED':
        return 'Sign in to continue.';
      case 'INVALID_CREDENTIALS':
        return 'That email and password do not match.';
      case 'USER_EXISTS':
      case 'DUPLICATE':
        return err.message;
      case 'ACCOUNT_DEACTIVATED':
        return 'This account is deactivated. Contact StayNest support.';
      case 'VALIDATION_ERROR':
        return err.details?.map((detail) => detail.message).join(' ') || err.message;
      case 'NETWORK_ERROR':
        return err.message;
      case 'INVALID_REFERENCE':
        return 'A selected amenity or city is no longer available. Refresh and try again.';
      case 'PROPERTY_NOT_FOUND':
        return 'This listing is no longer available.';
      case 'ROOM_NOT_FOUND':
        return 'That room is no longer available.';
      case 'LISTING_NOT_PUBLIC':
        return 'This listing is not open for booking yet.';
      case 'INVALID_IMAGE':
        return err.message;
      default:
        return err.message;
    }
  }

  if (err instanceof Error && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}

export function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiRequestError) || !err.details) return {};
  const map: Record<string, string> = {};
  for (const detail of err.details) {
    if (detail.path) map[detail.path] = detail.message;
  }
  return map;
}

export function formatCurrency(amountInMinorUnits: number, currency = 'INR'): string {
  const major = amountInMinorUnits / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(major);
}
