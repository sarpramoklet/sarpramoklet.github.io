import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2, MessageSquare, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { getCurrentUser, ROLES } from '../data/organization';
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

const createWelcomeMessage = (canViewFinance: boolean): ChatMessage => ({
  id: 'assistant-welcome',
  role: 'assistant',
  createdAt: new Date().toISOString(),
  text: [
    'Saya siap membaca snapshot dashboard live dan merangkumnya tanpa mengarang angka.',
    'Coba minta ringkasan, prioritas, tindak lanjut, atau fokus ke area tertentu seperti kelas, AC, layanan Sarmok, utilitas, jaringan, piket, dan keuangan sesuai akses.',
  ].join('\n'),
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

interface SarmokAssistantProps {
  isLoggedIn?: boolean;
}

const SarmokAssistant = ({ isLoggedIn = false }: SarmokAssistantProps) => {
  const user = isLoggedIn ? getCurrentUser() : null;
  const canViewFinance = Boolean(
    isLoggedIn &&
    user &&
    (user.roleAplikasi === ROLES.PIMPINAN || user.roleAplikasi === ROLES.PIC_ADMIN)
  );
  const starterPrompts = getStarterPrompts(canViewFinance);

  const [scopeId, setScopeId] = useState<string>(() => getChatScopeId(isLoggedIn));
  const [messages, setMessages] = useState<ChatMessage[]>(() => readStoredMessages(canViewFinance, getChatScopeId(isLoggedIn)));
  const [draft, setDraft] = useState('');
  const [snapshot, setSnapshot] = useState<DashboardAssistantSnapshot | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [responding, setResponding] = useState(false);
  const [syncError, setSyncError] = useState('');
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

    const reply = buildSarmokAssistantReply({
      message: content,
      snapshot: activeSnapshot,
      canViewFinance,
    });

    setMessages((current) => [
      ...current,
      {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: reply.text,
        createdAt: new Date().toISOString(),
        sections: reply.sections,
        suggestions: reply.suggestions,
      },
    ]);
    setResponding(false);
  };

  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.9rem', background: 'linear-gradient(180deg, rgba(255,255,255,0.01), transparent)' }}>
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: 'min(860px, 88%)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
              }}
            >
              <div
                style={{
                  padding: '0.95rem 1rem',
                  borderRadius: message.role === 'user' ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                  border: message.role === 'user' ? '1px solid rgba(59,130,246,0.24)' : '1px solid var(--border-subtle)',
                  background:
                    message.role === 'user'
                      ? 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(6,182,212,0.08))'
                      : 'rgba(255,255,255,0.03)',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.62,
                  fontSize: '0.86rem',
                }}
              >
                {message.text}
              </div>

              {(message.sections?.length || 0) > 0 && (
                <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                  {message.sections?.map((section) => (
                    <span
                      key={`${message.id}-${section}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.25rem 0.55rem',
                        borderRadius: '999px',
                        fontSize: '0.68rem',
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

              {message.role === 'assistant' && message.suggestions && latestAssistantMessage?.id === message.id && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {message.suggestions.map((suggestion) => (
                    <button
                      key={`${message.id}-${suggestion}`}
                      type="button"
                      className="btn btn-outline"
                      onClick={() => void handleSend(suggestion)}
                      disabled={responding}
                      style={{ padding: '0.45rem 0.7rem', fontSize: '0.72rem', borderRadius: '999px' }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {responding && (
            <div style={{ alignSelf: 'flex-start', maxWidth: '420px' }}>
              <div style={{ padding: '0.85rem 0.95rem', borderRadius: '18px 18px 18px 6px', border: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.03)', display: 'inline-flex', alignItems: 'center', gap: '0.55rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                <Loader2 size={15} className="animate-spin" />
                Menyusun jawaban dari snapshot dashboard...
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
