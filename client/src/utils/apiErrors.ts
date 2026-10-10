import axios from 'axios';

interface ApiErrorResponse {
  error?: { message?: string };
  message?: string;
}

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const apiMessage = error.response?.data?.error?.message ?? error.response?.data?.message;
    if (apiMessage) return apiMessage;
    if (!error.response) {
      return 'We could not reach the WealthMap server. Start the backend and try again.';
    }
  }

  return error instanceof Error ? error.message : fallback;
};
