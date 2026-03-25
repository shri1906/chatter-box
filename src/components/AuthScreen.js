'use client';
import { useState } from 'react';
import { useAuth } from '../lib/auth';

const COLORS = ['#25D366','#128C7E','#0EA5E9','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#EC4899','#14B8A6'];

function Input({ label, type = 'text', value, onChange, placeholder, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '11px 14px', borderRadius: 10,
          border: `1.5px solid ${error ? '#EF4444' : focused ? 'var(--green)' : 'var(--panel-2)'}`,
          background: 'var(--input-bg)', color: 'var(--text)',
          fontSize: 14.5, outline: 'none', fontFamily: 'var(--font)',
          transition: 'border-color 0.2s',
        }}
      />
      {error && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function ColorPicker({ value, onChange }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Avatar colour
      </label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {COLORS.map(c => (
          <button key={c} onClick={() => onChange(c)} style={{
            width: 30, height: 30, borderRadius: '50%', background: c,
            border: `3px solid ${value === c ? '#fff' : 'transparent'}`,
            outline: value === c ? `2px solid ${c}` : 'none',
            cursor: 'pointer', transition: 'transform 0.15s',
            transform: value === c ? 'scale(1.18)' : 'scale(1)',
          }} />
        ))}
      </div>
    </div>
  );
}

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [tab, setTab]         = useState('login');  // 'login' | 'register'
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Login fields
  const [lUser, setLUser] = useState('');
  const [lPass, setLPass] = useState('');

  // Register fields
  const [rUser,    setRUser]    = useState('');
  const [rDisplay, setRDisplay] = useState('');
  const [rPass,    setRPass]    = useState('');
  const [rPass2,   setRPass2]   = useState('');
  const [rColor,   setRColor]   = useState(COLORS[0]);

  const handleLogin = async () => {
    setError('');
    if (!lUser.trim() || !lPass) return setError('Please fill in all fields.');
    setLoading(true);
    try { await login(lUser.trim(), lPass); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    setError('');
    if (!rUser.trim() || !rDisplay.trim() || !rPass) return setError('Please fill in all fields.');
    if (rPass !== rPass2) return setError('Passwords do not match.');
    setLoading(true);
    try { await register(rUser.trim(), rDisplay.trim(), rPass, rColor); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{
        background: 'var(--panel)', borderRadius: 20, padding: '40px 36px',
        width: '100%', maxWidth: 420, boxShadow: '0 16px 56px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>💬</div>
          <h1 style={{ fontSize: 26, fontWeight: 600 }}>ChatterBox</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 13.5, marginTop: 4 }}>
            Real-time rooms &amp; direct messages
          </p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: 'var(--panel-2)', borderRadius: 10,
          padding: 4, marginBottom: 26,
        }}>
          {[['login', 'Sign In'], ['register', 'Create Account']].map(([t, label]) => (
            <button key={t} onClick={() => { setTab(t); setError(''); }} style={{
              flex: 1, padding: '9px 0', borderRadius: 8, border: 'none',
              background: tab === t ? 'var(--panel)' : 'transparent',
              color: tab === t ? 'var(--text)' : 'var(--text-2)',
              fontFamily: 'var(--font)', fontSize: 13.5, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
            }}>{label}</button>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: 8, padding: '9px 14px', marginBottom: 16,
            fontSize: 13.5, color: '#F87171',
          }}>⚠ {error}</div>
        )}

        {/* Login form */}
        {tab === 'login' && (
          <>
            <Input label="Username" value={lUser} onChange={setLUser} placeholder="your_username" />
            <Input label="Password" type="password" value={lPass} onChange={setLPass} placeholder="••••••••" />
            <button
              onClick={handleLogin} disabled={loading}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={btnStyle(loading)}
            >
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)', marginTop: 14 }}>
              No account?{' '}
              <span onClick={() => setTab('register')} style={{ color: 'var(--green)', cursor: 'pointer' }}>
                Create one
              </span>
            </p>
          </>
        )}

        {/* Register form */}
        {tab === 'register' && (
          <>
            <Input label="Username" value={rUser} onChange={setRUser} placeholder="cool_username" />
            <Input label="Display name" value={rDisplay} onChange={setRDisplay} placeholder="How others see you" />
            <Input label="Password" type="password" value={rPass} onChange={setRPass} placeholder="At least 6 characters" />
            <Input label="Confirm password" type="password" value={rPass2} onChange={setRPass2} placeholder="Repeat password" />
            <ColorPicker value={rColor} onChange={setRColor} />

            {/* Avatar preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%', background: rColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {rDisplay ? rDisplay.slice(0, 2).toUpperCase() : '??'}
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                {rDisplay || 'Your display name'} · @{rUser || 'username'}
              </span>
            </div>

            <button onClick={handleRegister} disabled={loading} style={btnStyle(loading)}>
              {loading ? 'Creating account…' : 'Create Account →'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-3)', marginTop: 14 }}>
              Have an account?{' '}
              <span onClick={() => setTab('login')} style={{ color: 'var(--green)', cursor: 'pointer' }}>
                Sign in
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const btnStyle = (loading) => ({
  width: '100%', padding: '13px', borderRadius: 10, border: 'none',
  background: loading ? 'var(--panel-2)' : 'var(--green)',
  color: loading ? 'var(--text-3)' : '#fff',
  fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
  fontFamily: 'var(--font)', transition: 'background 0.2s',
  marginTop: 4,
});
