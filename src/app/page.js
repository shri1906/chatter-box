'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faComments, faPlus, faTrash, faPencil, faRightFromBracket,
  faPaperPlane, faPaperclip, faChevronLeft, faMoon, faSun,
  faWater, faHeart as faRose, faEllipsisVertical, faUser,
  faHashtag, faSpinner, faCheck, faCheckDouble,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { getSocket } from '../lib/socket';
import AuthScreen from '../components/AuthScreen';
import ProfileModal from '../components/ProfileModal';
import CreateRoomModal, { ICON_MAP } from '../components/CreateRoomModal';
import { format, isToday, isYesterday } from 'date-fns';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = ts => format(new Date(ts), 'HH:mm');
const fmtDate = ts => { const d = new Date(ts); if (isToday(d)) return 'Today'; if (isYesterday(d)) return 'Yesterday'; return format(d, 'dd/MM/yyyy'); };
const fmtSize = b => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

const THEME_ICONS = { dark: faMoon, light: faSun, ocean: faWater, rose: faRose };

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ label, color, src, size = 40, online, onClick }) {
  return (
    <div onClick={onClick} style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: src ? 'transparent' : (color || 'var(--panel-2)'),
      backgroundImage: src ? `url(${src})` : 'none',
      backgroundSize: 'cover', backgroundPosition: 'center',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: '#fff',
      flexShrink: 0, position: 'relative', userSelect: 'none',
      cursor: onClick ? 'pointer' : 'default',
    }}>
      {!src && label}
      {online !== undefined && (
        <span style={{ position: 'absolute', bottom: 1, right: 1, width: size * 0.27, height: size * 0.27, borderRadius: '50%', background: online ? 'var(--green-l)' : 'var(--text-3)', border: '2px solid var(--online-border)' }} />
      )}
    </div>
  );
}

// ─── Room Icon ────────────────────────────────────────────────────────────────
function RoomIcon({ icon, color, size = 40 }) {
  const faIcon = ICON_MAP[icon] || ICON_MAP.comments;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color || 'var(--panel-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <FontAwesomeIcon icon={faIcon} style={{ color: '#fff', fontSize: size * 0.44 }} />
    </div>
  );
}

// ─── Theme Switcher ───────────────────────────────────────────────────────────
function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={iconBtnStyle} title="Switch theme">
        <FontAwesomeIcon icon={THEME_ICONS[theme] || faMoon} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '115%', right: 0, zIndex: 999, background: 'var(--panel)', border: '1px solid var(--divider)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: 148 }}>
          <div style={{ padding: '8px 12px 5px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Theme</div>
          {themes.map(t => (
            <button key={t.id} onClick={() => { setTheme(t.id); setOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', border: 'none', cursor: 'pointer', background: theme === t.id ? 'var(--hover)' : 'transparent', color: theme === t.id ? 'var(--text)' : 'var(--text-2)', fontFamily: 'inherit', fontSize: 14, fontWeight: theme === t.id ? 600 : 400 }}>
              <FontAwesomeIcon icon={THEME_ICONS[t.id] || faMoon} style={{ width: 16 }} />
              <span>{t.label}</span>
              {theme === t.id && <FontAwesomeIcon icon={faCheck} style={{ marginLeft: 'auto', color: 'var(--green)', fontSize: 13 }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── File / Image Bubbles ─────────────────────────────────────────────────────
function FileBubble({ msg, isMine }) {
  const dl = () => { const a = document.createElement('a'); a.href = msg.fileData; a.download = msg.fileName; a.click(); };
  if (msg.type === 'image') return (
    <div style={{ maxWidth: 260 }}>
      <img src={msg.fileData} alt={msg.fileName} onClick={dl} style={{ width: '100%', borderRadius: 10, display: 'block', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)' }} />
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, textAlign: 'right' }}>
        {fmtTime(msg.timestamp)}{isMine && <FontAwesomeIcon icon={faCheckDouble} style={{ marginLeft: 5, color: 'var(--tick)', fontSize: 11 }} />}
      </div>
    </div>
  );
  return (
    <div onClick={dl} style={{ background: 'var(--file-bg)', borderRadius: 10, padding: '10px 14px', minWidth: 200, maxWidth: 260, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.06)' }}>
      <FontAwesomeIcon icon={faPaperclip} style={{ color: 'var(--file-icon)', fontSize: 20, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{msg.fileName}</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{fmtSize(msg.fileSize)}</div>
      </div>
      <span style={{ color: 'var(--file-icon)', fontSize: 18, flexShrink: 0 }}>↓</span>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function Bubble({ msg, isMine, showName, isGroup }) {
  const isFile = msg.type === 'image' || msg.type === 'file';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, marginBottom: 3, flexDirection: isMine ? 'row-reverse' : 'row' }}>
      {showName && !isMine
        ? <Avatar label={(msg.senderName || '?').slice(0, 2).toUpperCase()} color={msg.senderColor} src={msg.senderAvatar} size={28} />
        : <div style={{ width: 28, flexShrink: 0 }} />}
      <div style={{ maxWidth: '68%' }}>
        {isGroup && !isMine && showName && (
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3, marginLeft: 4, color: msg.senderColor || 'var(--green)' }}>{msg.senderName}</div>
        )}
        <div style={{ padding: isFile ? '5px 7px' : '7px 12px 5px', background: isFile ? 'transparent' : (isMine ? 'var(--out)' : 'var(--in)'), borderRadius: isMine ? '12px 0 12px 12px' : '0 12px 12px 12px', boxShadow: isFile ? 'none' : '0 1px 2px rgba(0,0,0,0.2)' }}>
          {isFile ? <FileBubble msg={msg} isMine={isMine} /> : (
            <>
              <span style={{ fontSize: 14.5, lineHeight: 1.5, wordBreak: 'break-word' }}>{msg.text}</span>
              <span style={{ fontSize: 11, color: 'var(--text-3)', float: 'right', marginLeft: 10, marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                {fmtTime(msg.timestamp)}
                {isMine && <FontAwesomeIcon icon={faCheckDouble} style={{ color: 'var(--tick)', fontSize: 11 }} />}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ChatView ─────────────────────────────────────────────────────────────────
function ChatView({ chat, currentUser, socket, onBack, onEditRoom, onDeleteRoom }) {
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [typing,    setTyping]    = useState([]);
  const [uploading, setUploading] = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const bottomRef = useRef(null);
  const timerRef  = useRef(null);
  const fileRef   = useRef(null);
  const menuRef   = useRef(null);
  const isGroup   = chat.type === 'group';

  useEffect(() => {
    const h = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    setMessages([]); setTyping([]);
    if (isGroup) socket.emit('room:history', { roomId: chat.id });
    else socket.emit('dm:history', { toUserId: chat.id });
  }, [chat.id]);

  useEffect(() => {
    const onRH = ({ roomId, messages: m })    => { if (roomId === chat.id) setMessages(m); };
    const onDH = ({ channelId, messages: m }) => { if (channelId === [currentUser.id, chat.id].sort().join(':')) setMessages(m); };
    const onRM = ({ roomId, message })        => { if (roomId === chat.id) setMessages(p => [...p, message]); };
    const onDM = ({ channelId, message })     => { if (channelId === [currentUser.id, chat.id].sort().join(':')) setMessages(p => [...p, message]); };
    const onTY = data => {
      if (isGroup && data.roomId !== chat.id) return;
      if (!isGroup && data.fromUserId !== chat.id) return;
      setTyping(p => data.typing ? [...new Set([...p, data.name])] : p.filter(n => n !== data.name));
    };
    socket.on('room:history', onRH); socket.on('dm:history', onDH);
    socket.on('room:message', onRM); socket.on('dm:message', onDM);
    socket.on('typing:update', onTY);
    return () => { socket.off('room:history', onRH); socket.off('dm:history', onDH); socket.off('room:message', onRM); socket.off('dm:message', onDM); socket.off('typing:update', onTY); };
  }, [chat.id, currentUser.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const stopTyping = useCallback(() => {
    if (isGroup) socket.emit('typing:stop', { roomId: chat.id });
    else socket.emit('typing:stop', { toUserId: chat.id });
  }, [chat.id, isGroup]);

  const sendText = () => {
    if (!input.trim()) return;
    if (isGroup) socket.emit('room:message', { roomId: chat.id, text: input.trim() });
    else socket.emit('dm:message', { toUserId: chat.id, text: input.trim() });
    setInput(''); clearTimeout(timerRef.current); stopTyping();
  };

  const handleFileChange = e => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 8 * 1024 * 1024) { alert('Max 8 MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setUploading(true);
      if (isGroup) socket.emit('room:file', { roomId: chat.id, fileName: file.name, fileType: file.type, fileSize: file.size, fileData: reader.result });
      else socket.emit('dm:file', { toUserId: chat.id, fileName: file.name, fileType: file.type, fileSize: file.size, fileData: reader.result });
      setTimeout(() => setUploading(false), 800);
    };
    reader.readAsDataURL(file); e.target.value = '';
  };

  const handleInput = val => {
    setInput(val);
    if (isGroup) socket.emit('typing:start', { roomId: chat.id });
    else socket.emit('typing:start', { toUserId: chat.id });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(stopTyping, 1500);
  };

  const rows = []; let lastDate = null;
  messages.forEach((msg, i) => {
    const d = fmtDate(msg.timestamp);
    if (d !== lastDate) { rows.push({ kind: 'date', label: d, key: `d${i}` }); lastDate = d; }
    rows.push({ kind: 'msg', msg, showName: i === 0 || messages[i-1]?.senderId !== msg.senderId, key: msg.id || `m${i}` });
  });

  const isSeedRoom = chat.id?.startsWith('room-') && ['room-general','room-design','room-dev','room-random'].includes(chat.id);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
      {/* Header */}
      <div style={{ background: 'var(--panel)', padding: '10px 16px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--divider)' }}>
        {onBack && <button onClick={onBack} style={{ ...iconBtnStyle, fontSize: 20, marginLeft: -4 }}><FontAwesomeIcon icon={faChevronLeft} /></button>}
        {isGroup
          ? <RoomIcon icon={chat.icon} color={chat.color} size={42} />
          : <Avatar label={(chat.name||'?').slice(0,2).toUpperCase()} color={chat.color} src={chat.avatar} size={42} online />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isGroup ? (chat.description || `${chat.members?.length || 0} members`) : (chat.status || `@${chat.username||''}`)}
          </div>
        </div>
        {/* Room actions menu */}
        {isGroup && (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen(o => !o)} style={iconBtnStyle} title="Room options">
              <FontAwesomeIcon icon={faEllipsisVertical} />
            </button>
            {menuOpen && (
              <div style={{ position: 'absolute', top: '115%', right: 0, zIndex: 999, background: 'var(--panel)', border: '1px solid var(--divider)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 28px rgba(0,0,0,0.4)', minWidth: 160 }}>
                <button onClick={() => { onEditRoom(chat); setMenuOpen(false); }} style={menuItemStyle}>
                  <FontAwesomeIcon icon={faPencil} style={{ width: 14 }} /> Edit room
                </button>
                {!isSeedRoom && (
                  <button onClick={() => { onDeleteRoom(chat.id); setMenuOpen(false); }} style={{ ...menuItemStyle, color: '#EF4444' }}>
                    <FontAwesomeIcon icon={faTrash} style={{ width: 14 }} /> Delete room
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', background: 'var(--chat-bg)', backgroundImage: 'radial-gradient(circle,var(--dot-color) 1px,transparent 1px)', backgroundSize: '22px 22px' }}>
        {rows.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', marginTop: 48, fontSize: 14 }}>
            <FontAwesomeIcon icon={faComments} style={{ fontSize: 32, marginBottom: 10, display: 'block', margin: '0 auto 12px' }} />
            No messages yet. Say hello! 👋
          </div>
        )}
        {rows.map(row =>
          row.kind === 'date'
            ? <div key={row.key} style={{ textAlign: 'center', margin: '12px 0' }}><span style={{ background: 'var(--panel)', color: 'var(--text-2)', fontSize: 12, padding: '4px 14px', borderRadius: 20, opacity: .9 }}>{row.label}</span></div>
            : <Bubble key={row.key} msg={row.msg} isMine={row.msg.senderId === currentUser.id} showName={row.showName} isGroup={isGroup} />
        )}
        {uploading && <div style={{ color: 'var(--text-3)', fontSize: 13, fontStyle: 'italic', padding: '4px 2px', display: 'flex', alignItems: 'center', gap: 6 }}><FontAwesomeIcon icon={faSpinner} spin />Sending file…</div>}
        {typing.length > 0 && <p style={{ color: 'var(--text-2)', fontSize: 13, fontStyle: 'italic', padding: '4px 2px' }}>{typing.join(', ')} {typing.length === 1 ? 'is' : 'are'} typing…</p>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', background: 'var(--panel)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--divider)' }}>
        <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.mp3,.mp4" />
        <button onClick={() => fileRef.current?.click()} style={{ ...iconBtnStyle, width: 38, height: 38, borderRadius: '50%', background: 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Attach file">
          <FontAwesomeIcon icon={faPaperclip} />
        </button>
        <input value={input} onChange={e => handleInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendText()}
          placeholder="Type a message…"
          style={{ flex: 1, padding: '10px 16px', borderRadius: 24, border: 'none', background: 'var(--input-bg)', color: 'var(--text)', fontSize: 15, outline: 'none', fontFamily: 'inherit' }} />
        <button onClick={sendText} style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', background: input.trim() ? 'var(--green)' : 'var(--input-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s', flexShrink: 0 }}>
          <FontAwesomeIcon icon={faPaperPlane} style={{ color: input.trim() ? '#fff' : 'var(--text-3)', fontSize: 16 }} />
        </button>
      </div>
    </div>
  );
}

// ─── Sidebar Row ──────────────────────────────────────────────────────────────
function Row({ item, active, onClick }) {
  const [hov, setHov] = useState(false);
  const last = item.lastMessage;
  const preview = last ? (last.type === 'image' ? '📷 Image' : last.type === 'file' ? `📎 ${last.fileName}` : last.text) : (item.type === 'group' ? (item.description || 'Group chat') : `@${item.username||''}`);
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer', background: active ? 'var(--hover)' : hov ? 'var(--panel-2)' : 'transparent', borderBottom: '1px solid rgba(134,150,160,0.07)', transition: 'background 0.12s' }}>
      {item.type === 'group'
        ? <RoomIcon icon={item.icon} color={item.color} size={46} />
        : <Avatar label={(item.name||'?').slice(0,2).toUpperCase()} color={item.color} src={item.avatar} size={46} online />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontWeight: 500, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>{item.name}</span>
          {last && <span style={{ fontSize: 12, color: item.unread ? 'var(--green)' : 'var(--text-3)', flexShrink: 0 }}>{fmtTime(last.timestamp)}</span>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{preview}</span>
          {item.unread > 0 && <span style={{ background: 'var(--green)', color: '#fff', borderRadius: '50%', minWidth: 19, height: 19, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, marginLeft: 6, flexShrink: 0 }}>{item.unread}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ user, tab, setTab, roomItems, dmItems, active, pick, logout, openProfile, openCreateRoom }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--panel)', borderRight: '1px solid var(--divider)', height: '100%', overflow: 'hidden' }}>
      {/* Me */}
      <div style={{ padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--divider)', flexShrink: 0 }}>
        <Avatar label={user.displayName?.slice(0,2).toUpperCase()} color={user.color} src={user.avatar} size={40} onClick={openProfile} online />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{user.displayName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>@{user.username}</div>
        </div>
        <ThemeSwitcher />
        <button onClick={openProfile} style={iconBtnStyle} title="Edit profile"><FontAwesomeIcon icon={faUser} /></button>
        <button onClick={logout} style={{ ...iconBtnStyle }} title="Sign out"
          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
          <FontAwesomeIcon icon={faRightFromBracket} />
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--divider)', flexShrink: 0 }}>
        {[['rooms', <><FontAwesomeIcon icon={faHashtag} style={{ marginRight: 5 }} />Rooms</>], ['dms', <><FontAwesomeIcon icon={faComments} style={{ marginRight: 5 }} />Direct</>]].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '11px 0', border: 'none', background: 'transparent', cursor: 'pointer', color: tab === t ? 'var(--green)' : 'var(--text-2)', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 500, borderBottom: tab === t ? '2px solid var(--green)' : '2px solid transparent', transition: 'all .18s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{label}</button>
        ))}
      </div>

      {/* Create room button (only on Rooms tab) */}
      {tab === 'rooms' && (
        <button onClick={openCreateRoom} style={{ margin: '10px 12px 6px', padding: '9px 14px', borderRadius: 10, border: '1.5px dashed var(--divider)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontFamily: 'inherit', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.color = 'var(--green)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--divider)'; e.currentTarget.style.color = 'var(--text-2)'; }}>
          <FontAwesomeIcon icon={faPlus} style={{ fontSize: 13 }} />
          Create a room
        </button>
      )}

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'rooms'
          ? roomItems.map(r => <Row key={r.id} item={r} active={active?.id === r.id} onClick={() => pick({ ...r, type: 'group' })} />)
          : dmItems.length === 0
            ? <div style={{ padding: 24, color: 'var(--text-2)', fontSize: 14, textAlign: 'center', lineHeight: 1.8 }}>No one else online.<br />Open another tab to test!</div>
            : dmItems.map(u => <Row key={u.id} item={u} active={active?.id === u.id} onClick={() => pick({ ...u, type: 'dm' })} />)
        }
      </div>
    </div>
  );
}

// ─── Icon styles ──────────────────────────────────────────────────────────────
const iconBtnStyle = { background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, padding: '4px 5px', borderRadius: 6, lineHeight: 1, transition: 'color .2s', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const menuItemStyle = { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 14, textAlign: 'left', transition: 'background .12s' };

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Page() {
  const { user, token, loading, logout } = useAuth();
  const [tab,            setTab]           = useState('rooms');
  const [rooms,          setRooms]         = useState([]);
  const [peers,          setPeers]         = useState([]);
  const [active,         setActive]        = useState(null);
  const [unreads,        setUnreads]       = useState({});
  const [toasts,         setToasts]        = useState([]);
  const [ready,          setReady]         = useState(false);
  const [showProfile,    setShowProfile]   = useState(false);
  const [showCreateRoom, setShowCreateRoom]= useState(false);
  const [editRoomData,   setEditRoomData]  = useState(null);
  const [mobileChat,     setMobileChat]    = useState(false);
  const sockRef = useRef(null);

  const toast = useCallback(text => {
    const id = Date.now();
    setToasts(p => [...p, { id, text }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);

  useEffect(() => {
    if (!user || !token) { setReady(false); return; }
    const socket = getSocket(token);
    sockRef.current = socket;

    socket.on('connect_error', err => { if (err.message === 'AUTH_REQUIRED') logout(); });
    socket.on('user:joined', ({ user: u, rooms: r, onlineUsers }) => {
      setRooms(r); setPeers(onlineUsers.filter(p => p.id !== u.id));
      setActive(prev => prev || { ...r[0], type: 'group' });
      setReady(true);
    });
    socket.on('users:updated', users => setPeers(users.filter(u2 => u2.id !== user.id)));
    socket.on('room:message', ({ roomId, message }) => {
      setRooms(p => p.map(r => r.id === roomId ? { ...r, lastMessage: message } : r));
      setActive(a => { if (!a || a.id !== roomId) setUnreads(u => ({ ...u, [roomId]: (u[roomId] || 0) + 1 })); return a; });
    });
    socket.on('dm:message', ({ fromUserId, message }) => {
      if (fromUserId && fromUserId !== user.id) {
        setPeers(p => p.map(peer => peer.id === fromUserId ? { ...peer, lastMessage: message } : peer));
        setActive(a => { if (!a || a.id !== fromUserId) setUnreads(u => ({ ...u, [fromUserId]: (u[fromUserId] || 0) + 1 })); return a; });
      }
    });
    socket.on('room:new', ({ room }) => {
      setRooms(p => [...p, room]);
      toast(`New room: #${room.name}`);
    });
    socket.on('room:removed', ({ roomId }) => {
      setRooms(p => p.filter(r => r.id !== roomId));
      setActive(a => a?.id === roomId ? null : a);
      toast('A room was deleted');
    });
    socket.on('room:changed', ({ room }) => {
      setRooms(p => p.map(r => r.id === room.id ? { ...r, ...room } : r));
      setActive(a => a?.id === room.id ? { ...a, ...room } : a);
    });
    socket.on('notification', ({ text }) => toast(text));

    if (!socket.connected) socket.connect();
    socket.emit('user:join');

    return () => {
      ['connect_error','user:joined','users:updated','room:message','dm:message','room:new','room:removed','room:changed','notification'].forEach(e => socket.off(e));
    };
  }, [user?.id, token]);

  const pick = item => { setActive(item); setUnreads(u => ({ ...u, [item.id]: 0 })); setMobileChat(true); };

  const handleRoomCreated = (room, isEdit) => {
    if (isEdit) {
      sockRef.current?.emit('room:updated', { roomId: room.id });
    } else {
      sockRef.current?.emit('room:created', { roomId: room.id });
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!confirm('Delete this room and all its messages?')) return;
    const token = localStorage.getItem('cb_token');
    const res = await fetch(`/api/rooms/${roomId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) sockRef.current?.emit('room:deleted', { roomId });
    else toast('Could not delete room.');
  };

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
      <div style={{ textAlign: 'center' }}><FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 32, marginBottom: 14 }} /><p>Loading…</p></div>
    </div>
  );
  if (!user) return <AuthScreen />;

  const roomItems = rooms.map(r => ({ ...r, unread: unreads[r.id] || 0 }));
  const dmItems   = peers.map(u => ({ ...u, type: 'dm', unread: unreads[u.id] || 0 }));

  const sidebarProps = {
    user, tab, setTab, roomItems, dmItems, active, pick, logout,
    openProfile: () => setShowProfile(true),
    openCreateRoom: () => { setEditRoomData(null); setShowCreateRoom(true); },
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Toasts */}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: 'var(--panel)', padding: '10px 18px', borderRadius: 10, fontSize: 13, boxShadow: '0 4px 24px rgba(0,0,0,0.35)', borderLeft: '3px solid var(--green)', color: 'var(--text)', animation: 'fadeIn .25s ease' }}>{t.text}</div>
        ))}
      </div>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {(showCreateRoom || editRoomData) && (
        <CreateRoomModal
          editRoom={editRoomData}
          onClose={() => { setShowCreateRoom(false); setEditRoomData(null); }}
          onCreated={handleRoomCreated}
        />
      )}

      {/* Desktop layout */}
      <div className="desktop-layout" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 330, flexShrink: 0 }}><Sidebar {...sidebarProps} /></div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {active && sockRef.current && ready
            ? <ChatView key={active.id} chat={active} currentUser={user} socket={sockRef.current}
                onEditRoom={r => { setEditRoomData(r); setShowCreateRoom(false); }}
                onDeleteRoom={handleDeleteRoom} />
            : <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--chat-bg)', color: 'var(--text-2)', gap: 10 }}>
                <FontAwesomeIcon icon={faComments} style={{ fontSize: 52, marginBottom: 8 }} />
                <h2 style={{ fontWeight: 500, fontSize: 20, color: 'var(--text)' }}>ChatterBox</h2>
                <p style={{ fontSize: 14 }}>Select a room or person to start chatting</p>
                <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
                  <FontAwesomeIcon icon={faPlus} style={{ marginRight: 5 }} />Create rooms ·
                  <FontAwesomeIcon icon={faPaperclip} style={{ margin: '0 5px' }} />Send files ·
                  <FontAwesomeIcon icon={faMoon} style={{ margin: '0 5px' }} />Switch themes
                </p>
              </div>
          }
        </div>
      </div>

      {/* Mobile layout */}
      <div className="mobile-layout" style={{ flex: 1, overflow: 'hidden', display: 'none' }}>
        {mobileChat && active && sockRef.current && ready
          ? <ChatView key={active.id} chat={active} currentUser={user} socket={sockRef.current}
              onBack={() => setMobileChat(false)}
              onEditRoom={r => { setEditRoomData(r); setShowCreateRoom(false); }}
              onDeleteRoom={handleDeleteRoom} />
          : <Sidebar {...sidebarProps} />
        }
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        * { transition: background-color .25s, border-color .25s, color .15s; }
        input, button { transition: background-color .25s, color .15s !important; }
        @media (max-width: 640px) { .desktop-layout { display: none !important; } .mobile-layout { display: flex !important; flex-direction: column; } }
        @media (min-width: 641px) { .desktop-layout { display: flex !important; } .mobile-layout { display: none !important; } }
      `}</style>
    </div>
  );
}
