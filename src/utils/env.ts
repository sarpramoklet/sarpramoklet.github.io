const GEMINI_KEY_STORAGE = 'sarpramoklet_gemini_api_key';

export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim() || '';

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const canUseSessionStorage = () => typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

export const getRuntimeGeminiApiKey = () => {
  if (!canUseSessionStorage()) return '';
  const sessionKey = window.sessionStorage.getItem(GEMINI_KEY_STORAGE)?.trim() || '';
  if (sessionKey) return sessionKey;

  // Backward compatibility: one-time read from legacy localStorage key.
  if (canUseStorage()) {
    return window.localStorage.getItem(GEMINI_KEY_STORAGE)?.trim() || '';
  }

  return '';
};

export const setRuntimeGeminiApiKey = (value: string) => {
  if (!canUseSessionStorage()) return;
  const trimmed = value.trim();
  if (!trimmed) {
    window.sessionStorage.removeItem(GEMINI_KEY_STORAGE);
    if (canUseStorage()) window.localStorage.removeItem(GEMINI_KEY_STORAGE);
    return;
  }

  // Safer default: keep override only for current browser session.
  window.sessionStorage.setItem(GEMINI_KEY_STORAGE, trimmed);
  if (canUseStorage()) window.localStorage.removeItem(GEMINI_KEY_STORAGE);
};

export const clearRuntimeGeminiApiKey = () => {
  if (canUseSessionStorage()) window.sessionStorage.removeItem(GEMINI_KEY_STORAGE);
  if (canUseStorage()) window.localStorage.removeItem(GEMINI_KEY_STORAGE);
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
