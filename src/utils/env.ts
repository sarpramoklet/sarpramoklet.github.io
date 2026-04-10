const GEMINI_KEY_STORAGE = 'sarpramoklet_gemini_api_key';

export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim() || '';

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const getRuntimeGeminiApiKey = () => {
  if (!canUseStorage()) return '';
  return window.localStorage.getItem(GEMINI_KEY_STORAGE)?.trim() || '';
};

export const setRuntimeGeminiApiKey = (value: string) => {
  if (!canUseStorage()) return;
  const trimmed = value.trim();
  if (!trimmed) {
    window.localStorage.removeItem(GEMINI_KEY_STORAGE);
    return;
  }
  window.localStorage.setItem(GEMINI_KEY_STORAGE, trimmed);
};

export const clearRuntimeGeminiApiKey = () => {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(GEMINI_KEY_STORAGE);
};

export const getGeminiApiKey = () => getRuntimeGeminiApiKey() || GEMINI_API_KEY;

export const getGeminiApiKeySource = () => {
  if (getRuntimeGeminiApiKey()) return 'browser';
  if (GEMINI_API_KEY) return 'env';
  return 'missing';
};

export const requireGeminiApiKey = () => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY belum diatur. Tambahkan key Gemini di environment aplikasi.');
  }

  return apiKey;
};
