'use client';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faComments, faCode, faPalette, faShuffle, faMusic, faGamepad,
  faBook, faBriefcase, faCamera, faCoffee, faHeart, faRocket,
  faGlobe, faLeaf, faBolt, faStar, faFilm, faTrophy,
  faFlask, faMicrophone, faHeadphones, faGraduationCap,
  faShield, faWrench, faBug, faDatabase, faCloud, faLock,
} from '@fortawesome/free-solid-svg-icons';

const ICONS = [
  { name: 'comments',      icon: faComments },
  { name: 'code',          icon: faCode },
  { name: 'palette',       icon: faPalette },
  { name: 'shuffle',       icon: faShuffle },
  { name: 'music',         icon: faMusic },
  { name: 'gamepad',       icon: faGamepad },
  { name: 'book',          icon: faBook },
  { name: 'briefcase',     icon: faBriefcase },
  { name: 'camera',        icon: faCamera },
  { name: 'coffee',        icon: faCoffee },
  { name: 'heart',         icon: faHeart },
  { name: 'rocket',        icon: faRocket },
  { name: 'globe',         icon: faGlobe },
  { name: 'leaf',          icon: faLeaf },
  { name: 'bolt',          icon: faBolt },
  { name: 'star',          icon: faStar },
  { name: 'film',          icon: faFilm },
  { name: 'trophy',        icon: faTrophy },
  { name: 'flask',         icon: faFlask },
  { name: 'microphone',    icon: faMicrophone },
  { name: 'headphones',    icon: faHeadphones },
  { name: 'graduation-cap',icon: faGraduationCap },
  { name: 'shield',        icon: faShield },
  { name: 'wrench',        icon: faWrench },
  { name: 'bug',           icon: faBug },
  { name: 'database',      icon: faDatabase },
  { name: 'cloud',         icon: faCloud },
  { name: 'lock',          icon: faLock },
];

export const ICON_MAP = Object.fromEntries(ICONS.map(i => [i.name, i.icon]));

const COLORS = [
  '#25D366','#128C7E','#0EA5E9','#8B5CF6',
  '#F59E0B','#EF4444','#EC4899','#14B8A6',
  '#FF7043','#06B6D4','#84CC16','#6366F1',
];

export default function CreateRoomModal({ onClose, onCreated, editRoom }) {
  const isEdit = !!editRoom;
  const [name,        setName]        = useState(editRoom?.name || '');
  const [description, setDescription] = useState(editRoom?.description || '');
  const [icon,        setIcon]        = useState(editRoom?.icon || 'comments');
  const [color,       setColor]       = useState(editRoom?.color || '#25D366');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!name.trim()) return setError('Room name is required.');
    setSaving(true);
    try {
      const token = localStorage.getItem('cb_token');
      const url   = isEdit ? `/api/rooms/${editRoom.id}` : '/api/rooms';
      const method = isEdit ? 'PUT' : 'POST';
      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), icon, color }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Failed to save room.');
      onCreated(data.room, isEdit);
      onClose();
    } catch (e) {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.65)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--panel)', borderRadius: 18, padding: '32px 28px', width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
            {isEdit ? 'Edit Room' : 'Create Room'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, padding: '14px 16px', background: 'var(--panel-2)', borderRadius: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FontAwesomeIcon icon={ICON_MAP[icon] || ICON_MAP.comments} style={{ color: '#fff', fontSize: 20 }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text)' }}>{name || 'Room name'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{description || 'No description'}</div>
          </div>
        </div>

        {/* Name */}
        <label style={labelStyle}>Room name *</label>
        <input value={name} onChange={e => setName(e.target.value)} maxLength={32} placeholder="e.g. Gaming, Music, Announcements" style={inputStyle} />

        {/* Description */}
        <label style={labelStyle}>Description</label>
        <input value={description} onChange={e => setDescription(e.target.value)} maxLength={100} placeholder="What's this room about?" style={{ ...inputStyle, marginBottom: 20 }} />

        {/* Icon picker */}
        <label style={labelStyle}>Icon</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {ICONS.map(({ name: n, icon: ic }) => (
            <button key={n} onClick={() => setIcon(n)} title={n} style={{
              width: 38, height: 38, borderRadius: 9, border: `2px solid ${icon === n ? color : 'var(--divider)'}`,
              background: icon === n ? color : 'var(--panel-2)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', transform: icon === n ? 'scale(1.1)' : 'scale(1)',
            }}>
              <FontAwesomeIcon icon={ic} style={{ color: icon === n ? '#fff' : 'var(--text-2)', fontSize: 16 }} />
            </button>
          ))}
        </div>

        {/* Color picker */}
        <label style={labelStyle}>Color</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 30, height: 30, borderRadius: '50%', background: c, border: 'none',
              outline: color === c ? `3px solid ${c}` : '3px solid transparent',
              outlineOffset: 2, cursor: 'pointer',
              transform: color === c ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.15s',
            }} />
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 13, color: '#F87171' }}>⚠ {error}</div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid var(--divider)', background: 'transparent', color: 'var(--text-2)', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving || !name.trim()} style={{
            flex: 2, padding: '12px', borderRadius: 10, border: 'none',
            background: saving || !name.trim() ? 'var(--panel-2)' : color,
            color: saving || !name.trim() ? 'var(--text-3)' : '#fff',
            fontSize: 15, fontWeight: 600, cursor: saving || !name.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create room'}
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: 10, marginBottom: 14, border: '1.5px solid var(--panel-2)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 14.5, outline: 'none', fontFamily: 'inherit' };
