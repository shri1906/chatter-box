'use client';
import { useState, useRef } from 'react';
import { useAuth } from '../lib/auth';

const COLORS = ['#25D366','#128C7E','#0EA5E9','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#EC4899','#14B8A6','#FF7043','#26A69A','#AB47BC'];

function resizeImage(file, maxPx = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio  = Math.min(maxPx / img.width, maxPx / img.height, 1);
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function ProfileModal({ onClose }) {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [status,      setStatus]      = useState(user?.status || '');
  const [color,       setColor]       = useState(user?.color || COLORS[0]);
  const [avatar,      setAvatar]      = useState(user?.avatar || null);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const fileRef = useRef(null);

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return; }
    try {
      const resized = await resizeImage(file, 256);
      setAvatar(resized);
      setError('');
    } catch { setError('Could not process image.'); }
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!displayName.trim()) return setError('Display name cannot be empty.');
    setSaving(true); setError(''); setSuccess('');
    try {
      await updateProfile({ displayName, status, color, avatar });
      setSuccess('Profile saved!');
      setTimeout(() => { setSuccess(''); onClose(); }, 800);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--panel)', borderRadius: 18, padding: '36px 32px',
        width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>Edit Profile</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Avatar upload */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 96, height: 96, borderRadius: '50%',
              backgroundColor: avatar ? 'transparent' : color,
              backgroundImage: avatar ? `url(${avatar})` : 'none',
              backgroundSize: 'cover', backgroundPosition: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 34, fontWeight: 700, color: '#fff',
              cursor: 'pointer', position: 'relative', overflow: 'hidden',
              border: '3px solid var(--green)', flexShrink: 0,
            }}
          >
            {!avatar && displayName.slice(0, 2).toUpperCase()}
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.2s',
              fontSize: 26,
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0'}
            >📷</div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFile} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={() => fileRef.current?.click()} style={smallBtnStyle}>Upload photo</button>
            {avatar && <button onClick={() => setAvatar(null)} style={{ ...smallBtnStyle, color: '#EF4444', borderColor: '#EF4444' }}>Remove</button>}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>JPG, PNG, GIF · max 5 MB · resized to 256px</p>
        </div>

        {/* Display name */}
        <label style={labelStyle}>Display name</label>
        <input
          value={displayName} onChange={e => setDisplayName(e.target.value)}
          style={inputStyle} placeholder="Your name"
        />

        {/* Status */}
        <label style={labelStyle}>Status</label>
        <input
          value={status} onChange={e => setStatus(e.target.value.slice(0, 140))}
          style={inputStyle} placeholder="Hey there! I am using ChatterBox"
          maxLength={140}
        />
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: -10, marginBottom: 14 }}>{status.length}/140</p>

        {/* Color */}
        <label style={labelStyle}>Avatar colour (when no photo)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 28, height: 28, borderRadius: '50%', background: c, border: 'none',
              outline: color === c ? `3px solid ${c}` : '3px solid transparent',
              outlineOffset: 2, cursor: 'pointer',
              transform: color === c ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.15s',
            }} />
          ))}
        </div>

        {error   && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 13, color: '#F87171' }}>⚠ {error}</div>}
        {success && <div style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 13, color: '#25D366' }}>✓ {success}</div>}

        <button onClick={handleSave} disabled={saving} style={{
          width: '100%', padding: '13px', borderRadius: 10, border: 'none',
          background: saving ? 'var(--panel-2)' : 'var(--green)', color: saving ? 'var(--text-3)' : '#fff',
          fontSize: 15, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10, marginBottom: 16,
  border: '1.5px solid var(--panel-2)', background: 'var(--input-bg)',
  color: 'var(--text)', fontSize: 14.5, outline: 'none', fontFamily: 'inherit',
};
const smallBtnStyle = {
  padding: '5px 14px', borderRadius: 8, border: '1.5px solid var(--text-3)',
  background: 'transparent', color: 'var(--text-2)', fontSize: 13,
  cursor: 'pointer', fontFamily: 'inherit',
};
