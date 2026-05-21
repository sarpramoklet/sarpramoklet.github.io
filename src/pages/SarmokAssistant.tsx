import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2, MessageSquare, RefreshCw, ShieldCheck, Sparkles, Trash2, User } from 'lucide-react';
import { canAccessFinanceData, getCurrentUser } from '../data/organization';
import {
  DASHBOARD_SECTION_LABELS,
  fetchDashboardSnapshot,
  type DashboardAssistantSnapshot,
  type DashboardSectionKey,
} from '../utils/dashboardSnapshot';
import { buildSarmokAssistantReply, shouldRefreshAssistantSnapshot } from '../utils/sarmokAssistant';

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
  text: `${getWelcomeGreeting()}! Ngobrol santai saja — saya cek live dashboard real-time. Tanya yang singkat ("berapa pengaduan menunggu", "AC ruang 12 gimana") atau yang luas ("ringkas dashboard hari ini") — saya menyesuaikan.${canViewFinance ? ' Area kas juga terbuka untuk akun ini.' : ''}`,
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

// Helper inline parser for bold, italic, and code blocks
const renderInlineMarkdown = (text: string) => {
  if (!text) return '';

  const parts = [];
  const boldRegex = /\*\*(.*?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const boldText = match[1];
    parts.push(
      <strong key={`bold-${match.index}`} style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
        {boldText}
      </strong>
    );
    lastIndex = boldRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
};

const MarkdownRenderer = ({ text }: { text: string }) => {
  if (!text) return null;

  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\n\s*\n/g, '\n\n');
  const blocks = normalizedText.split('\n\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', width: '100%' }}>
      {blocks.map((block, blockIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // 1. Table parser
        if (trimmed.startsWith('|')) {
          const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);
          if (lines.length >= 2) {
            const parseCols = (line: string) => line.split('|').slice(1, -1).map((c) => c.trim());
            const headers = parseCols(lines[0]);
            const rows = lines.slice(2).map((l) => parseCols(l));

            return (
              <div
                key={blockIdx}
                style={{
                  overflowX: 'auto',
                  margin: '0.5rem 0',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255, 255, 255, 0.01)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-subtle)' }}>
                      {headers.map((h, i) => (
                        <th key={i} style={{ padding: '0.65rem 0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {renderInlineMarkdown(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        style={{
                          borderBottom: rIdx < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                          background: rIdx % 2 === 1 ? 'rgba(255, 255, 255, 0.01)' : 'transparent',
                        }}
                      >
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} style={{ padding: '0.65rem 0.8rem', color: 'var(--text-secondary)' }}>
                            {renderInlineMarkdown(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
        }

        // 2. Unordered or ordered list parser
        const lines = trimmed.split('\n');
        const isUnorderedList = lines.every((line) => /^\s*([-*+•])\s+/.test(line));
        const isOrderedList = lines.every((line) => /^\s*\d+\.\s+/.test(line));

        if (isUnorderedList || isOrderedList) {
          const Tag = isOrderedList ? 'ol' : 'ul';
          return (
            <Tag
              key={blockIdx}
              style={{
                margin: '0.2rem 0 0.2rem 1.4rem',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
                listStyleType: isOrderedList ? 'decimal' : 'disc',
              }}
            >
              {lines.map((line, lineIdx) => {
                const cleanContent = line.replace(/^\s*([-*+•]|\d+\.)\s+/, '');
                return (
                  <li key={lineIdx} style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', lineHeight: '1.5' }}>
                    {renderInlineMarkdown(cleanContent)}
                  </li>
                );
              })}
            </Tag>
          );
        }

        // 3. Header parser
        if (trimmed.startsWith('#')) {
          const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
          if (headerMatch) {
            const level = headerMatch[1].length;
            const content = headerMatch[2];
            const fontSize = level === 1 ? '1.4rem' : level === 2 ? '1.2rem' : '1.02rem';
            const style = {
              margin: '0.8rem 0 0.4rem 0',
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontSize,
            };
            const inner = renderInlineMarkdown(content);
            if (level === 1) return <h1 key={blockIdx} style={style}>{inner}</h1>;
            if (level === 2) return <h2 key={blockIdx} style={style}>{inner}</h2>;
            if (level === 3) return <h3 key={blockIdx} style={style}>{inner}</h3>;
            if (level === 4) return <h4 key={blockIdx} style={style}>{inner}</h4>;
            if (level === 5) return <h5 key={blockIdx} style={style}>{inner}</h5>;
            return <h6 key={blockIdx} style={style}>{inner}</h6>;
          }
        }

        // 4. Fallback: regular paragraph
        const paragraphLines = trimmed.split('\n');
        return (
          <p key={blockIdx} style={{ margin: 0, fontSize: '0.86rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
            {paragraphLines.map((line, idx) => (
              <span key={idx}>
                {idx > 0 && <br />}
                {renderInlineMarkdown(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
};

const TypewriterText = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let index = 0;
    const words = text.split(' ');
    let current = '';

    const interval = setInterval(() => {
      if (index < words.length) {
        current += (index === 0 ? '' : ' ') + words[index];
        setDisplayedText(current);
        index++;
      } else {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, 15); // Fast and smooth 15ms per word typewriter effect

    return () => clearInterval(interval);
  }, [text, onComplete]);

  return <MarkdownRenderer text={displayedText} />;
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
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

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
    setTypingMessageId(null);
    setMessages([createWelcomeMessage(canViewFinance)]);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(getChatStorageKey(scopeId));
    }
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

    const previousAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    try {
      const reply = await buildSarmokAssistantReply({
        message: content,
        snapshot: activeSnapshot,
        canViewFinance,
        previousSections: previousAssistant?.sections,
        history: messages.map((m) => ({ role: m.role, text: m.text })),
      });

      const assistantMsgId = `assistant-${Date.now()}`;
      setMessages((current) => [
        ...current,
        {
          id: assistantMsgId,
          role: 'assistant',
          text: reply.text,
          createdAt: new Date().toISOString(),
          sections: reply.sections,
          suggestions: reply.suggestions,
        },
      ]);
      setTypingMessageId(assistantMsgId);
    } catch (err) {
      console.error('Error generating response:', err);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: 'Maaf, terjadi kesalahan saat menghubungi asisten AI. Silakan coba lagi.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setResponding(false);
    }
  };

  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <style>{`
        @keyframes pulse-dots {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .dot-bounce {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background-color: var(--accent-cyan);
          display: inline-block;
          animation: pulse-dots 1.4s infinite ease-in-out;
        }
        .dot-bounce:nth-child(2) {
          animation-delay: 0.2s;
        }
        .dot-bounce:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes avatar-shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .gemini-sparkle-avatar {
          background: linear-gradient(-45deg, #a78bfa, #818cf8, #60a5fa, #34d399, #ec4899);
          background-size: 300% 300%;
          animation: avatar-shimmer 8s ease infinite;
        }
      `}</style>
      <div className="glass-panel" style={{ padding: '1.35rem', background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(59,130,246,0.04))', borderLeft: '4px solid var(--accent-cyan)' }}>
        <div className="flex-row-responsive" style={{ gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem', flex: 1 }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.25)', color: 'var(--accent-cyan)', flexShrink: 0 }}>
              <MessageSquare size={22} />
            </div>
            <div>
              <h1 className="page-title gradient-text" style={{ marginBottom: '0.25rem' }}>Asisten Sarmok</h1>
              <p className="page-subtitle" style={{ margin: 0, maxWidth: '860px' }}>
                Percakapan berbasis snapshot dashboard live. Jawaban dirangkum dari sumber data yang sama dengan dashboard supaya tetap relevan, valid, dan siap dipakai untuk tindak lanjut.
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

      <div className="glass-panel" style={{ padding: '1rem 1.1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Status Sumber Data</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Hijau berarti sinkron atau lokal siap pakai, merah berarti sumber itu sedang gagal dibaca.
            </div>
          </div>
          {syncError && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: 'var(--accent-rose)', fontSize: '0.76rem', fontWeight: 700 }}>
              <AlertCircle size={15} />
              {syncError}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
          {(snapshot?.sectionStates || []).map((section) => (
            <div
              key={section.key}
              style={{
                borderRadius: '14px',
                padding: '0.85rem',
                background:
                  section.state === 'unavailable'
                    ? 'rgba(244,63,94,0.06)'
                    : section.state === 'local'
                      ? 'rgba(59,130,246,0.06)'
                      : 'rgba(16,185,129,0.06)',
                border:
                  section.state === 'unavailable'
                    ? '1px solid rgba(244,63,94,0.16)'
                    : section.state === 'local'
                      ? '1px solid rgba(59,130,246,0.16)'
                      : '1px solid rgba(16,185,129,0.16)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{section.label}</div>
                <div
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
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
                </div>
              </div>
              <div style={{ marginTop: '0.45rem', fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                {section.message}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '65vh', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.1rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Percakapan Data Dashboard</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Tanya status, prioritas, rekap, atau perintah penyajian data. Saya akan jawab dari snapshot yang sedang aktif.
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
            {snapshot ? `Snapshot aktif: ${formatSyncTime(snapshot.generatedAt)}` : 'Snapshot belum tersedia'}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'linear-gradient(180deg, rgba(255,255,255,0.01), transparent)' }}>
          {messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <div
                key={message.id}
                style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: 'min(860px, 92%)',
                  display: 'flex',
                  gap: '0.8rem',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                }}
              >
                {/* Avatar */}
                {isUser ? (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'rgba(59,130,246,0.12)',
                      border: '1px solid rgba(59,130,246,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-blue)',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      flexShrink: 0,
                      boxShadow: '0 2px 6px rgba(59,130,246,0.15)',
                    }}
                    title="Anda"
                  >
                    <User size={16} />
                  </div>
                ) : (
                  <div
                    className="gemini-sparkle-avatar"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
                    }}
                    title="Asisten Sarmok"
                  >
                    <Sparkles size={16} />
                  </div>
                )}

                {/* Message Bubble Container */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    gap: '0.45rem',
                    flex: 1,
                  }}
                >
                  {/* Bubble */}
                  <div
                    style={{
                      padding: '0.95rem 1.1rem',
                      borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      border: isUser ? '1px solid rgba(59,130,246,0.22)' : '1px solid var(--border-subtle)',
                      background: isUser
                        ? 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(6,182,212,0.06))'
                        : 'rgba(255,255,255,0.035)',
                      color: 'var(--text-primary)',
                      fontSize: '0.88rem',
                      lineHeight: 1.62,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
                      width: '100%',
                    }}
                  >
                    {message.id === typingMessageId ? (
                      <TypewriterText text={message.text} onComplete={() => setTypingMessageId(null)} />
                    ) : (
                      <MarkdownRenderer text={message.text} />
                    )}
                  </div>

                  {/* Section Badges */}
                  {(message.sections?.length || 0) > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.1rem' }}>
                      {message.sections?.map((section) => (
                        <span
                          key={`${message.id}-${section}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '999px',
                            fontSize: '0.66rem',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-subtle)',
                            background: 'rgba(255,255,255,0.03)',
                          }}
                        >
                          {DASHBOARD_SECTION_LABELS[section]}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Quick Suggestions */}
                  {message.role === 'assistant' && message.suggestions && latestAssistantMessage?.id === message.id && (
                    <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                      {message.suggestions.map((suggestion) => (
                        <button
                          key={`${message.id}-${suggestion}`}
                          type="button"
                          className="btn btn-outline"
                          onClick={() => void handleSend(suggestion)}
                          disabled={responding}
                          style={{
                            padding: '0.45rem 0.75rem',
                            fontSize: '0.74rem',
                            borderRadius: '999px',
                            borderColor: 'rgba(6,182,212,0.3)',
                            background: 'rgba(6,182,212,0.02)',
                            color: 'var(--accent-cyan)',
                            transition: 'all 0.2s',
                          }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing state */}
          {responding && (
            <div
              style={{
                alignSelf: 'flex-start',
                maxWidth: '85%',
                display: 'flex',
                gap: '0.8rem',
                alignItems: 'flex-start',
              }}
            >
              <div
                className="gemini-sparkle-avatar"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
                }}
              >
                <Sparkles size={16} />
              </div>
              <div
                style={{
                  padding: '0.85rem 1.1rem',
                  borderRadius: '18px 18px 18px 4px',
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255,255,255,0.035)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
                }}
              >
                <div className="dot-bounce"></div>
                <div className="dot-bounce"></div>
                <div className="dot-bounce"></div>
              </div>
            </div>
          )}

          <div ref={scrollAnchorRef} />
        </div>

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
              placeholder="Contoh: ringkas dashboard hari ini, prioritas kelas dan AC, rekap layanan Sarmok, atau susun tindak lanjut utilitas."
              style={{
                width: '100%',
                minHeight: '88px',
                resize: 'vertical',
                padding: '0.95rem 1rem',
                borderRadius: '16px',
                border: '1px solid var(--border-subtle)',
                background: 'rgba(255,255,255,0.03)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.86rem',
                lineHeight: 1.55,
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', maxWidth: '720px' }}>
                Asisten ini mengutamakan data dari sumber dashboard yang sedang sinkron. Jika suatu sumber gagal dibaca, saya akan menyatakannya apa adanya di jawaban.
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleSend()}
                disabled={!draft.trim() || responding}
                style={{ padding: '0.8rem 1rem', fontSize: '0.84rem' }}
              >
                {responding ? <Loader2 size={15} className="animate-spin" /> : <MessageSquare size={15} />}
                Kirim Pertanyaan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SarmokAssistant;
