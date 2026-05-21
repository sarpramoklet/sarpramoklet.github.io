import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Copy,
  Check,
  Bot,
  User,
  Key,
} from 'lucide-react';
import { canAccessFinanceData, getCurrentUser } from '../data/organization';
import {
  DASHBOARD_SECTION_LABELS,
  fetchDashboardSnapshot,
  type DashboardAssistantSnapshot,
  type DashboardSectionKey,
} from '../utils/dashboardSnapshot';
import {
  buildSarmokAssistantReply,
  shouldRefreshAssistantSnapshot,
  detectSections,
  buildContextualSuggestions,
} from '../utils/sarmokAssistant';
import './SarmokAssistant.css';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  createdAt: string;
  sections?: DashboardSectionKey[];
  suggestions?: string[];
};

const STORAGE_PREFIX = 'sarmokAssistantChat.v2';
const LEGACY_STORAGE_KEY = 'sarmokAssistantChat.v1';

const getChatScopeId = (isLoggedIn: boolean) => {
  if (typeof window === 'undefined') return 'public';
  if (!isLoggedIn) return 'public';
  const email = (window.localStorage.getItem('userEmail') || '').trim().toLowerCase();
  return email ? `user:${email}` : 'public';
};

const getChatStorageKey = (scopeId: string) => `${STORAGE_PREFIX}:${scopeId}`;

const getStarterPrompts = (canViewFinance: boolean) => (
  canViewFinance
    ? ['Ringkas dashboard hari ini', 'Prioritas kelas dan AC', 'Rekap layanan Sarmok', 'Status kas dan utilitas']
    : ['Ringkas dashboard hari ini', 'Prioritas kelas dan AC', 'Rekap layanan Sarmok', 'Catatan piket terbaru']
);

const getWelcomeGreeting = () => {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
};

const createWelcomeMessage = (canViewFinance: boolean): ChatMessage => ({
  id: 'assistant-welcome',
  role: 'assistant',
  createdAt: new Date().toISOString(),
  text: `${getWelcomeGreeting()}! Saya Asisten Sarmok, asisten virtual Command Center SMK Telkom Malang. \n\nTanya santai saja — saya bisa membacakan live dashboard real-time. Anda bisa bertanya yang singkat (seperti \`berapa pengaduan menunggu\` atau \`kondisi AC ruang 12\`) maupun meminta ringkasan luas (seperti \`ringkas dashboard hari ini\`).${canViewFinance ? ' Area kas juga terbuka untuk akun ini.' : ''}`,
  suggestions: getStarterPrompts(canViewFinance),
});

const readStoredMessages = (canViewFinance: boolean, scopeId: string) => {
  if (typeof window === 'undefined') return [createWelcomeMessage(canViewFinance)];

  try {
    if (window.localStorage.getItem(LEGACY_STORAGE_KEY)) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }

    const raw = window.localStorage.getItem(getChatStorageKey(scopeId));
    if (!raw) return [createWelcomeMessage(canViewFinance)];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [createWelcomeMessage(canViewFinance)];

    const filtered = parsed.filter((item): item is ChatMessage => {
      return typeof item?.id === 'string' && (item?.role === 'assistant' || item?.role === 'user') && typeof item?.text === 'string';
    });
    return filtered.length > 0 ? filtered : [createWelcomeMessage(canViewFinance)];
  } catch {
    return [createWelcomeMessage(canViewFinance)];
  }
};

const formatSyncTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const makeSystemInstruction = (snapshot: DashboardAssistantSnapshot, canViewFinance: boolean) => {
  const generatedDate = snapshot.generatedAt ? new Date(snapshot.generatedAt) : new Date();
  const dateFormatted = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta'
  }).format(generatedDate);

  return `Anda adalah Asisten Sarmok, asisten AI resmi Command Center untuk SMK Telkom Malang (Moklet).
Tugas Anda adalah membantu pengguna memahami data dari dashboard sekolah saat ini.

Informasi Waktu:
- Hari ini: ${dateFormatted}
- Waktu server: ${new Date().toLocaleTimeString('id-ID')}

Aturan Penting:
1. Jawablah dengan gaya bahasa yang sangat ramah, hangat, komunikatif, manusiawi, dan profesional (seperti ChatGPT atau Gemini). Hindari jawaban yang terlalu kaku atau mekanis.
2. Gunakan bahasa Indonesia yang santun namun akrab. Gunakan sapaan yang sesuai.
3. Gunakan pemformatan markdown (seperti tebal, daftar poin, sub-judul) agar respon Anda mudah dibaca dan premium.
4. JANGAN pernah membeberkan atau menyebutkan nominal saldo keuangan (Kas Sarpras, Kas TU, Kas AC, belanja, dll.) karena parameter hak akses keuangan saat ini dinonaktifkan (canViewFinance = ${canViewFinance ? 'true' : 'false'}). Jika ditanya tentang keuangan sedangkan Anda tidak memiliki akses, jawablah secara halus dan sopan bahwa area tersebut memerlukan wewenang pimpinan.
5. Jika data untuk suatu bagian ditandai gagal atau tidak sinkron, sampaikan apa adanya secara jujur dan tawarkan saran alternatif.

Berikut adalah Snapshot Data Dashboard Live saat ini (format JSON):
${JSON.stringify(snapshot, null, 2)}
`;
};

const callGeminiAPIStream = async (
  prompt: string,
  history: ChatMessage[],
  key: string,
  snapshot: DashboardAssistantSnapshot,
  canViewFinance: boolean,
  onChunk: (text: string) => void
) => {
  const systemPrompt = makeSystemInstruction(snapshot, canViewFinance);
  
  // Format history for Gemini API (user -> user, assistant -> model)
  const formattedContents = history
    .filter(m => m.id !== 'assistant-welcome')
    .map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));
  
  // Append current prompt
  formattedContents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${key}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: formattedContents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1500,
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body reader');

  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunk) {
              fullText += chunk;
              onChunk(fullText);
            }
          } catch {
            // ignore JSON parse error for partial lines
          }
        }
      }
    }

    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.slice(6).trim();
        try {
          const parsed = JSON.parse(jsonStr);
          const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (chunk) {
            fullText += chunk;
            onChunk(fullText);
          }
        } catch {}
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
};

const parseMarkdownToJSX = (text: string): React.ReactNode[] => {
  const lines = text.split('\n');
  let inList = false;
  const listItems: React.ReactNode[][] = [];
  const elements: React.ReactNode[] = [];

  const parseInlineStyles = (inlineText: string): React.ReactNode[] => {
    const parts = inlineText.split(/(\*\*|`)/);
    let isBold = false;
    let isCode = false;
    
    return parts.map((part, index) => {
      if (part === '**') {
        isBold = !isBold;
        return null;
      }
      if (part === '`') {
        isCode = !isCode;
        return null;
      }
      if (isCode) {
        return (
          <code key={index} className="inline-code">
            {part}
          </code>
        );
      }
      if (isBold) {
        return (
          <strong key={index}>
            {part}
          </strong>
        );
      }
      return part;
    }).filter(Boolean);
  };

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        inList = true;
      }
      listItems.push(parseInlineStyles(trimmed.slice(2)));
    } else {
      if (inList) {
        elements.push(
          <ul key={`list-${lineIndex}`}>
            {listItems.map((item, itemIdx) => (
              <li key={itemIdx}>{item}</li>
            ))}
          </ul>
        );
        listItems.length = 0;
        inList = false;
      }
      
      if (trimmed.startsWith('### ')) {
        elements.push(<h3 key={lineIndex}>{parseInlineStyles(trimmed.slice(4))}</h3>);
      } else if (trimmed.startsWith('## ')) {
        elements.push(<h2 key={lineIndex}>{parseInlineStyles(trimmed.slice(3))}</h2>);
      } else if (trimmed.startsWith('# ')) {
        elements.push(<h1 key={lineIndex}>{parseInlineStyles(trimmed.slice(2))}</h1>);
      } else if (trimmed === '') {
        elements.push(<div key={lineIndex} style={{ height: '0.4rem' }} />);
      } else {
        elements.push(<p key={lineIndex}>{parseInlineStyles(line)}</p>);
      }
    }
  });

  if (inList) {
    elements.push(
      <ul key={`list-end`}>
        {listItems.map((item, itemIdx) => (
          <li key={itemIdx}>{item}</li>
        ))}
      </ul>
    );
  }

  return elements;
};

interface SarmokAssistantProps {
  isLoggedIn?: boolean;
}

const SarmokAssistant = ({ isLoggedIn = false }: SarmokAssistantProps) => {
  const user = isLoggedIn ? getCurrentUser() : null;
  const canViewFinance = Boolean(isLoggedIn && user && canAccessFinanceData(user));
  const starterPrompts = getStarterPrompts(canViewFinance);

  const [scopeId, setScopeId] = useState<string>(() => getChatScopeId(isLoggedIn));
  const [messages, setMessages] = useState<ChatMessage[]>(() => readStoredMessages(canViewFinance, getChatScopeId(isLoggedIn)));
  const [draft, setDraft] = useState('');
  const [snapshot, setSnapshot] = useState<DashboardAssistantSnapshot | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [responding, setResponding] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  // API Key state management
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem('sarmok_gemini_api_key') || '';
  });
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'checking' | 'connected' | 'error' | 'expired'>('idle');
  const [apiKeyError, setApiKeyError] = useState<string>('');

  const checkApiKey = async (key: string) => {
    if (!key) {
      setApiKeyStatus('idle');
      setApiKeyError('');
      return;
    }
    setApiKeyStatus('checking');
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] })
      });
      if (response.ok) {
        setApiKeyStatus('connected');
        setApiKeyError('');
      } else {
        const data = await response.json();
        const errMessage = data.error?.message || '';
        if (errMessage.toLowerCase().includes('expired')) {
          setApiKeyStatus('expired');
          setApiKeyError('Kunci API kedaluwarsa.');
        } else {
          setApiKeyStatus('error');
          setApiKeyError(errMessage || 'Kunci API tidak valid.');
        }
      }
    } catch {
      setApiKeyStatus('error');
      setApiKeyError('Gagal menghubungi API Gemini.');
    }
  };

  useEffect(() => {
    const keyToTest = customApiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
    if (keyToTest) {
      void checkApiKey(keyToTest);
    }
  }, [customApiKey]);

  const handleSaveApiKey = (key: string) => {
    const trimmed = key.trim();
    localStorage.setItem('sarmok_gemini_api_key', trimmed);
    setCustomApiKey(trimmed);
    void checkApiKey(trimmed);
  };

  const handleClearApiKey = () => {
    localStorage.removeItem('sarmok_gemini_api_key');
    setCustomApiKey('');
    setApiKeyStatus('idle');
    setApiKeyError('');
  };

  const syncSnapshot = async (options: { silent?: boolean } = {}) => {
    if (!options.silent) setSyncError('');
    setSyncing(true);
    try {
      const data = await fetchDashboardSnapshot({ includeFinance: canViewFinance });
      setSnapshot(data);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mengambil snapshot dashboard.';
      setSyncError(message);
      return null;
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    void syncSnapshot();
  }, []);

  useEffect(() => {
    const nextScope = getChatScopeId(isLoggedIn);
    if (nextScope === scopeId) return;
    setScopeId(nextScope);
    setMessages(readStoredMessages(canViewFinance, nextScope));
  }, [isLoggedIn, canViewFinance, scopeId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(getChatStorageKey(scopeId), JSON.stringify(messages.slice(-30)));
  }, [messages, scopeId]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, responding]);

  const handleClearChat = () => {
    if (responding) return;
    const confirmed = typeof window !== 'undefined'
      ? window.confirm('Hapus seluruh histori percakapan dan kembali ke sambutan awal? Tindakan ini hanya menghapus chat di perangkat ini untuk akun yang sedang login.')
      : true;
    if (!confirmed) return;

    setDraft('');
    setMessages([createWelcomeMessage(canViewFinance)]);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(getChatStorageKey(scopeId));
    }
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (forcedPrompt?: string) => {
    const content = (forcedPrompt ?? draft).trim();
    if (!content || responding) return;

    if (!forcedPrompt) setDraft('');

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: content,
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, userMessage]);
    setResponding(true);

    let activeSnapshot = snapshot;
    if (shouldRefreshAssistantSnapshot(content, snapshot)) {
      const refreshed = await syncSnapshot({ silent: true });
      if (refreshed) activeSnapshot = refreshed;
    }

    if (!activeSnapshot) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: 'Snapshot dashboard belum berhasil dimuat. Coba tekan refresh data lalu kirim pertanyaan lagi.',
          createdAt: new Date().toISOString(),
          suggestions: starterPrompts,
        },
      ]);
      setResponding(false);
      return;
    }

    const activeKey = customApiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
    let success = false;
    const assistantMessageId = `assistant-${Date.now()}`;

    if (activeKey && apiKeyStatus !== 'expired' && apiKeyStatus !== 'error') {
      try {
        // 1. Initialize empty streaming assistant message
        setMessages((current) => [
          ...current,
          {
            id: assistantMessageId,
            role: 'assistant',
            text: '',
            createdAt: new Date().toISOString(),
            sections: [],
            suggestions: [],
          },
        ]);

        // 2. Call the streaming API
        const fullReply = await callGeminiAPIStream(
          content,
          [...messages, userMessage],
          activeKey,
          activeSnapshot,
          canViewFinance,
          (streamedText) => {
            setMessages((current) =>
              current.map((msg) =>
                msg.id === assistantMessageId ? { ...msg, text: streamedText } : msg
              )
            );
          }
        );

        // 3. Post-process to detect sections & build context suggestions
        const detected = detectSections(fullReply, canViewFinance);
        const suggestions = buildContextualSuggestions(detected, canViewFinance);

        setMessages((current) =>
          current.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, sections: detected, suggestions }
              : msg
          )
        );

        success = true;
      } catch (err) {
        console.error('Gemini API failed, falling back to local simulated responder:', err);
        // Remove the empty streaming message so fallback can be written cleanly
        setMessages((current) => current.filter((msg) => msg.id !== assistantMessageId));
      }
    }

    if (!success) {
      const previousAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
      const reply = buildSarmokAssistantReply({
        message: content,
        snapshot: activeSnapshot,
        canViewFinance,
        previousSections: previousAssistant?.sections,
      });

      setMessages((current) => [
        ...current,
        {
          id: assistantMessageId,
          role: 'assistant',
          text: reply.text,
          createdAt: new Date().toISOString(),
          sections: reply.sections,
          suggestions: reply.suggestions,
        },
      ]);
    }

    setResponding(false);
  };

  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Bar */}
      <div className="glass-panel" style={{ padding: '1.35rem', background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(59,130,246,0.04))', borderLeft: '4px solid var(--accent-cyan)' }}>
        <div className="flex-row-responsive" style={{ gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem', flex: 1 }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)', color: 'var(--accent-cyan)', flexShrink: 0 }}>
              <MessageSquare size={22} />
            </div>
            <div>
              <h1 className="page-title gradient-text" style={{ marginBottom: '0.25rem' }}>Asisten Sarmok</h1>
              <p className="page-subtitle" style={{ margin: 0, maxWidth: '860px' }}>
                Percakapan interaktif berbasis data real-time Command Center. Jawabannya valid, akurat, dan dirangkum langsung dari snapshot agar siap digunakan untuk tindak lanjut operasional.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 0.8rem',
                borderRadius: '12px',
                background: syncError ? 'rgba(244,63,94,0.08)' : 'rgba(16,185,129,0.08)',
                border: `1px solid ${syncError ? 'rgba(244,63,94,0.18)' : 'rgba(16,185,129,0.18)'}`,
                color: syncError ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                fontSize: '0.78rem',
                fontWeight: 700,
              }}
            >
              {syncError ? <AlertCircle size={15} /> : <ShieldCheck size={15} />}
              {snapshot ? `Sinkron ${formatSyncTime(snapshot.generatedAt)}` : 'Menunggu snapshot'}
            </div>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => void syncSnapshot()}
              disabled={syncing}
              style={{ padding: '0.7rem 0.95rem', fontSize: '0.82rem' }}
            >
              {syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Refresh Data
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={handleClearChat}
              disabled={responding || messages.length <= 1}
              title={messages.length <= 1 ? 'Belum ada riwayat untuk dihapus' : 'Hapus seluruh percakapan di akun ini'}
              style={{
                padding: '0.7rem 0.95rem',
                fontSize: '0.82rem',
                borderColor: 'rgba(244,63,94,0.32)',
                color: 'var(--accent-rose)',
              }}
            >
              <Trash2 size={15} />
              Clear Chat
            </button>

            <Link to="/" className="btn btn-primary" style={{ padding: '0.7rem 0.95rem', fontSize: '0.82rem' }}>
              Kembali ke Dashboard
            </Link>
          </div>
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          {starterPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="btn btn-outline"
              onClick={() => void handleSend(prompt)}
              disabled={responding}
              style={{ padding: '0.55rem 0.8rem', fontSize: '0.76rem', borderRadius: '999px' }}
            >
              <Sparkles size={14} />
              {prompt}
            </button>
          ))}
        </div>

        {!canViewFinance && (
          <div style={{ marginTop: '0.95rem', padding: '0.8rem 0.95rem', borderRadius: '14px', border: '1px solid rgba(245,158,11,0.18)', background: 'rgba(245,158,11,0.06)', color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.55 }}>
            {isLoggedIn
              ? 'Data keuangan disembunyikan pada sesi login ini agar konsisten dengan hak akses dashboard. Area layanan, kelas, AC, jaringan, utilitas, CAPEX, personel, dan piket tetap bisa ditanya penuh.'
              : 'Anda sedang membuka mode publik. Chat tetap aktif untuk data dashboard umum, sementara area sensitif seperti finance tetap disembunyikan sampai login.'}
          </div>
        )}
      </div>

      {/* Main Grid Layout */}
      <div className="assistant-layout">
        {/* Left Sidebar */}
        <div className="assistant-sidebar">
          {/* AI Activation Panel */}
          <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Key size={16} style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Aktivasi AI (Gemini)</span>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Hubungkan kunci API pribadi untuk mengaktifkan respons cerdas, natural, dan manusiawi layaknya Gemini asli.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Gemini API Key</label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  style={{
                    flex: 1,
                    padding: '0.45rem 0.65rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'rgba(0,0,0,0.2)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                />
                {customApiKey && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleClearApiKey}
                    style={{ padding: '0.45rem', minWidth: 'auto', fontSize: '0.75rem' }}
                    title="Hapus Key"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleSaveApiKey(customApiKey)}
              disabled={apiKeyStatus === 'checking'}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.75rem', alignSelf: 'stretch', justifyContent: 'center' }}
            >
              {apiKeyStatus === 'checking' ? 'Memverifikasi...' : 'Simpan & Tes Kunci'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.2rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
              <span
                style={{
                  fontWeight: 700,
                  color:
                    apiKeyStatus === 'connected'
                      ? 'var(--accent-emerald)'
                      : apiKeyStatus === 'checking'
                        ? 'var(--accent-amber)'
                        : apiKeyStatus === 'expired' || apiKeyStatus === 'error'
                          ? 'var(--accent-rose)'
                          : 'var(--text-secondary)'
                }}
              >
                {apiKeyStatus === 'connected' && 'Gemini Aktif'}
                {apiKeyStatus === 'checking' && 'Menghubungkan...'}
                {apiKeyStatus === 'expired' && 'Kunci Kedaluwarsa'}
                {apiKeyStatus === 'error' && 'Error API Key'}
                {apiKeyStatus === 'idle' && 'Simulasi Lokal'}
              </span>
            </div>

            {apiKeyError && (
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-rose)', lineHeight: 1.4, padding: '0.4rem 0.6rem', borderRadius: '8px', background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)' }}>
                {apiKeyError}
                {apiKeyStatus === 'expired' && ' Kunci bawaan sistem telah kedaluwarsa. Pasang Kunci API pribadi Anda (gratis di Google AI Studio).'}
              </div>
            )}
          </div>

          {/* Section States Stack */}
          <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sumber Data Snapshot</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Status sinkronisasi untuk setiap modul dashboard.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '300px', overflowY: 'auto' }} className="chat-scroll-container">
              {(snapshot?.sectionStates || []).map((section) => (
                <div
                  key={section.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.45rem 0.6rem',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.75rem',
                  }}
                  title={section.message}
                >
                  <span style={{ color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                    {section.label}
                  </span>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color:
                        section.state === 'unavailable'
                          ? 'var(--accent-rose)'
                          : section.state === 'local'
                            ? 'var(--accent-blue)'
                            : 'var(--accent-emerald)',
                    }}
                  >
                    {section.state === 'unavailable' ? 'gagal' : section.state === 'local' ? 'lokal' : 'live'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Chat Column */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '65vh', overflow: 'hidden', margin: 0 }}>
          {/* Chat Panel Header */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Papan Percakapan</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Tanya status, prioritas, rekap, atau rekomendasi tindakan operasional.
              </div>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
              {snapshot ? `Snapshot: ${formatSyncTime(snapshot.generatedAt)}` : 'Snapshot belum dimuat'}
            </div>
          </div>

          {/* Message List */}
          <div className="chat-messages-container chat-scroll-container">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message-bubble-wrapper ${message.role}`}
              >
                <div className={`chat-avatar ${message.role}`}>
                  {message.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxWidth: 'calc(100% - 44px)' }}>
                  <div className="message-bubble">
                    {parseMarkdownToJSX(message.text)}

                    {message.role === 'assistant' && message.text && (
                      <div className="message-actions">
                        <button
                          type="button"
                          className="action-icon-btn"
                          onClick={() => handleCopyText(message.id, message.text)}
                          title="Salin jawaban"
                        >
                          {copiedId === message.id ? (
                            <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', display: 'inline-flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                              <Check size={12} /> Tersalin
                            </span>
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {(message.sections?.length || 0) > 0 && (
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {message.sections?.map((section) => (
                        <span
                          key={`${message.id}-${section}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '999px',
                            fontSize: '0.66rem',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-subtle)',
                            background: 'rgba(255,255,255,0.02)',
                          }}
                        >
                          {DASHBOARD_SECTION_LABELS[section]}
                        </span>
                      ))}
                    </div>
                  )}

                  {message.role === 'assistant' && message.suggestions && latestAssistantMessage?.id === message.id && (
                    <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      {message.suggestions.map((suggestion) => (
                        <button
                          key={`${message.id}-${suggestion}`}
                          type="button"
                          className="btn btn-outline"
                          onClick={() => void handleSend(suggestion)}
                          disabled={responding}
                          style={{ padding: '0.4rem 0.65rem', fontSize: '0.72rem', borderRadius: '999px', transition: 'all 0.2s' }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {responding && (
              <div className="message-bubble-wrapper assistant">
                <div className="chat-avatar assistant">
                  <Bot size={16} />
                </div>
                <div className="message-bubble" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <div className="typing-dots">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={scrollAnchorRef} />
          </div>

          {/* Typing Area */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Contoh: ringkas dashboard hari ini, prioritas kelas dan AC, rekap layanan sarmok..."
                style={{
                  width: '100%',
                  minHeight: '88px',
                  resize: 'vertical',
                  padding: '0.85rem 1rem',
                  borderRadius: '16px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255,255,255,0.02)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.86rem',
                  lineHeight: 1.55,
                  outline: 'none',
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', maxWidth: '720px' }}>
                  Asisten ini mengutamakan data dari sumber dashboard yang sedang sinkron. Jika suatu sumber gagal dibaca, saya akan menyatakannya apa adanya di jawaban.
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void handleSend()}
                  disabled={!draft.trim() || responding}
                  style={{ padding: '0.75rem 1.15rem', fontSize: '0.82rem', gap: '0.4rem' }}
                >
                  {responding ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                  Kirim Pertanyaan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SarmokAssistant;
