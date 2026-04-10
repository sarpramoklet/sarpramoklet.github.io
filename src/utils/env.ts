export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim() || '';

export const requireGeminiApiKey = () => {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY belum diatur. Tambahkan key Gemini di environment aplikasi.');
  }

  return GEMINI_API_KEY;
};
