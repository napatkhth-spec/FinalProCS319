import axios from 'axios';

interface ApiErrorBody {
  message?: unknown;
  errors?: Array<{ message?: unknown }>;
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const data = error.response?.data;
  if (Array.isArray(data?.errors)) {
    const messages = data.errors
      .map(({ message }) => (typeof message === 'string' ? message : ''))
      .filter(Boolean);
    if (messages.length > 0) return messages.join(' ');
  }
  if (typeof data?.message === 'string') return data.message;
  return error.message || fallback;
}
