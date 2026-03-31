import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { USERS } from '../data/organization';
import { logLoginEvent } from '../utils/logger';

// NOTE: Replace this with your actual Google Client ID
const GOOGLE_CLIENT_ID = "975387842374-locrn64jjrt4m6h7ffsq1ic6m2etbl3o.apps.googleusercontent.com";

interface LoginProps {
  onLogin: (email: string, picture?: string) => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleSuccess = (credentialResponse: any) => {
    if (credentialResponse.credential) {
      try {
        const decoded = jwtDecode(credentialResponse.credential) as any;
        const allowedEmails = [
          'hadi@smktelkom-mlg.sch.id', 
          'chusni@smktelkom-mlg.sch.id',
          'whyna@smktelkom-mlg.sch.id',
          'ekon.a.poernomo@smktelkom-mlg.sch.id',
          'amalia@smktelkom-mlg.sch.id',
          'rudimistriono@smktelkom-mlg.sch.id',
          'zainul@smktelkom-mlg.sch.id',
          'yoko@smktelkom-mlg.sch.id',
          'nico@smktelkom-mlg.sch.id',
          'zakaria@smktelkom-mlg.sch.id',
          'bagus@smktelkom-mlg.sch.id',
          'chandra@smktelkom-mlg.sch.id',
          'ayat@smktelkom-mlg.sch.id'
        ];
        if (allowedEmails.includes(decoded?.email)) {
          // Lookup extended user info for the log
          const emailMap: Record<string, string> = {
            'hadi@smktelkom-mlg.sch.id': 'U001',
            'chusni@smktelkom-mlg.sch.id': 'U003',
            'whyna@smktelkom-mlg.sch.id': 'U002',
            'ekon.a.poernomo@smktelkom-mlg.sch.id': 'U004',
            'amalia@smktelkom-mlg.sch.id': 'U005',
            'rudimistriono@smktelkom-mlg.sch.id': 'U012',
            'zainul@smktelkom-mlg.sch.id': 'U006',
            'yoko@smktelkom-mlg.sch.id': 'U013',
            'nico@smktelkom-mlg.sch.id': 'U010',
            'zakaria@smktelkom-mlg.sch.id': 'U007',
            'bagus@smktelkom-mlg.sch.id': 'U009',
            'chandra@smktelkom-mlg.sch.id': 'U008',
            'ayat@smktelkom-mlg.sch.id': 'U011'
          };
          const userId = emailMap[decoded.email] || '-';
          const userProfile = USERS.find(u => u.id === userId);
          
          // Fire login log BEFORE navigating away
          logLoginEvent(
            decoded.email,
            userProfile?.nama || decoded.name || decoded.email,
            userProfile?.jabatan || '-',
            userProfile?.unit || '-',
            userProfile?.roleAplikasi || '-',
            userId
          );

          onLogin(decoded.email, decoded.picture);
          navigate('/');
        } else {
          setError('Akses ditolak. Akun Google tidak memiliki akses administrator.');
        }
      } catch (err) {
        setError('Gagal memverifikasi akun Google.');
      }
    }
  };


  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '1rem', background: 'var(--accent-blue-ghost)', color: 'var(--accent-blue)', borderRadius: '50%', marginBottom: '1rem' }}>
            <Shield size={40} />
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Login Administrator</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Masuk dengan akun Google untuk mengelola data</p>
        </div>

        {error && (
          <div style={{ padding: '1rem', background: 'var(--accent-rose-ghost)', color: 'var(--accent-rose)', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              setError('Autentikasi Google gagal atau dibatalkan.');
            }}
            theme="outline"
            text="signin_with"
            shape="rectangular"
          />
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Lupa email administratif Anda? Silakan hubungi tim IT Support untuk melakukan sinkronisasi akses dapodik.
          </p>
        </div>
      </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default Login;
