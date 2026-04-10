const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const DEFAULT_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
];

const modelCache = new Map<string, string>();
const availableModelsCache = new Map<string, string[]>();

const extractModelName = (fullName: string) => fullName.replace(/^models\//, '');

const shouldRetryWithAnotherModel = (message: string) => {
  return /(not found|not supported for generatecontent|404|models\/.+ is not found)/i.test(message);
};

const extractJsonPayload = (text: string) => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) return objectMatch[0];

  return text.trim();
};

const getAvailableGeminiModels = async (apiKey: string) => {
  const cached = availableModelsCache.get(apiKey);
  if (cached) return cached;

  const response = await fetch(`${GEMINI_API_BASE}/models?key=${apiKey}`);
  if (!response.ok) {
    throw new Error(`Gagal mengambil daftar model Gemini. HTTP ${response.status}`);
  }

  const data = await response.json();
  const available = Array.isArray(data?.models)
    ? data.models
        .filter((model: any) => Array.isArray(model?.supportedGenerationMethods) && model.supportedGenerationMethods.includes('generateContent'))
        .map((model: any) => extractModelName(String(model.name || '')))
        .filter(Boolean)
    : [];

  availableModelsCache.set(apiKey, available);
  return available;
};

const buildModelCandidates = async (apiKey: string, preferredModels?: string[]) => {
  const preferred = preferredModels?.length ? preferredModels : DEFAULT_GEMINI_MODELS;
  const cached = modelCache.get(apiKey);
  const seen = new Set<string>();
  const candidates: string[] = [];

  const push = (model: string) => {
    if (!model || seen.has(model)) return;
    seen.add(model);
    candidates.push(model);
  };

  if (cached) push(cached);

  try {
    const available = await getAvailableGeminiModels(apiKey);
    preferred.forEach((model) => {
      const exact = available.find((item: string) => item === model);
      if (exact) push(exact);
    });

    available
      .filter((model: string) => /flash/i.test(model) && !/image|tts|embedding/i.test(model))
      .forEach(push);
  } catch {
    preferred.forEach(push);
  }

  preferred.forEach(push);
  return candidates;
};

export const generateGeminiJsonFromImage = async ({
  apiKey,
  prompt,
  base64,
  mimeType,
  preferredModels,
}: {
  apiKey: string;
  prompt: string;
  base64: string;
  mimeType: string;
  preferredModels?: string[];
}) => {
  const candidates = await buildModelCandidates(apiKey, preferredModels);
  let lastError: Error | null = null;

  for (const model of candidates) {
    try {
      const response = await fetch(`${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          }],
          generationConfig: { temperature: 0.1, topP: 0.8 },
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const message = err?.error?.message || `HTTP ${response.status}`;
        if (shouldRetryWithAnotherModel(message)) {
          modelCache.delete(apiKey);
          lastError = new Error(message);
          continue;
        }
        throw new Error(message);
      }

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const payload = extractJsonPayload(String(text));
      modelCache.set(apiKey, model);
      return JSON.parse(payload || '{}');
    } catch (error: any) {
      const message = error?.message || 'Gagal membaca respons Gemini.';
      if (shouldRetryWithAnotherModel(message)) {
        lastError = new Error(message);
        continue;
      }
      throw error instanceof Error ? error : new Error(message);
    }
  }

  throw lastError || new Error('Tidak ada model Gemini yang tersedia untuk membaca gambar saat ini.');
};
