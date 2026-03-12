
import { Layers } from 'lucide-react';

const DummyPage = ({ title }: { title: string }) => {
  return (
    <div className="animate-fade-in" style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h1 className="page-title gradient-text">{title}</h1>
      <p className="page-subtitle">Modul sedang dalam tahap pengembangan (WIP)</p>
      
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
        <Layers size={64} color="var(--accent-blue)" style={{ opacity: 0.5 }} />
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>Segera Hadir</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '400px', textAlign: 'center' }}>
          Fitur ini akan segera tersedia sesuai dengan blueprint digitalisasi sistem informasi Sarana, Prasarana, IT, dan Laboratorium.
        </p>
        <button className="btn btn-outline" style={{ marginTop: '1rem' }} onClick={() => window.history.back()}>
          Kembali
        </button>
      </div>
    </div>
  );
};

export default DummyPage;
