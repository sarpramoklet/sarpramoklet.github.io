import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, KeyRound } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string) => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'hadi@smktelkom-mlg.sch.id') {
      onLogin(email);
      navigate('/');
    } else {
      setError('Akses ditolak. Email tidak terdaftar sebagai Administrator.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)', borderRadius: '50%', marginBottom: '1rem' }}>
            <Shield size={40} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Login Administrator</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Masukkan hak akses untuk mengelola data</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Alamat Email Akses</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email" 
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="email@smktelkom-mlg.sch.id"
                style={{ 
                  width: '100%', 
                  padding: '0.8rem 1rem 0.8rem 2.8rem', 
                  borderRadius: '8px', 
                  background: 'rgba(0,0,0,0.2)', 
                  border: '1px solid var(--border-subtle)', 
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'var(--trans-fast)'
                }} 
                required
              />
              <KeyRound size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
            {error && (
              <p style={{ color: 'var(--accent-rose)', fontSize: '0.8rem', marginTop: '0.2rem' }}>{error}</p>
            )}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', justifyContent: 'center' }}>
            Masuk ke Sistem
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Lupa email administratif Anda? Silakan hubungi tim IT Support untuk melakukan sinkronisasi akses dapodik.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
