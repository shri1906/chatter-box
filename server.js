// server.js — ChatterBox v3 (fixed: env loading, DB persistence, model guards)
// ── IMPORTANT: env is loaded BEFORE any other require ────────────────────────
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
// ─────────────────────────────────────────────────────────────────────────────

const { createServer } = require('http');
const { parse }        = require('url');
const next             = require('next');
const { Server }       = require('socket.io');
const bcrypt           = require('bcryptjs');
const jwt              = require('jsonwebtoken');
const { v4: uuidv4 }  = require('uuid');
const { connectDB }    = require('./src/lib/db');
const User             = require('./src/models/User');
const Message          = require('./src/models/Message');
const Room             = require('./src/models/Room');

const dev        = process.env.NODE_ENV !== 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'chatterbox-dev-secret-change-in-prod';
const MONGO_URI  = process.env.MONGODB_URI || 'mongodb://localhost:27017/chatterbox';

const app    = next({ dev });
const handle = app.getRequestHandler();

// ── Active socket sessions (in-memory, rebuilt on reconnect) ──────────────────
const activeSessions = new Map();   // socketId  → sessionUser
const userSockets    = new Map();   // userId    → socketId

// ── Default seed rooms ────────────────────────────────────────────────────────
const SEED_ROOMS = [
  { _id: 'room-general', name: 'General',  icon: 'comments', color: '#25D366', description: 'General chat for everyone' },
  { _id: 'room-design',  name: 'Design',   icon: 'palette',  color: '#EC4899', description: 'UI/UX, design & inspiration' },
  { _id: 'room-dev',     name: 'Dev',      icon: 'code',     color: '#0EA5E9', description: 'Code, bugs & everything dev' },
  { _id: 'room-random',  name: 'Random',   icon: 'shuffle',  color: '#F59E0B', description: 'Anything goes!' },
];
const SEED_IDS = SEED_ROOMS.map(r => r._id);

const COLORS = ['#25D366','#128C7E','#0EA5E9','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#EC4899','#14B8A6','#FF7043'];
const dmKey       = (a, b) => [a, b].sort().join(':');
const onlineUsers = ()     => [...activeSessions.values()];

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function jsonRes(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 15_000_000) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

const signToken   = payload => jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
const verifyToken = token   => { try { return jwt.verify(token, JWT_SECRET); } catch { return null; } };
const getAuth     = req     => verifyToken((req.headers.authorization || '').replace('Bearer ', ''));

// ── Auth handlers ─────────────────────────────────────────────────────────────
async function handleRegister(req, res) {
  try {
    const { username, displayName, password, color } = await readBody(req);

    if (!username?.trim() || !displayName?.trim() || !password)
      return jsonRes(res, 400, { error: 'Username, display name and password are required.' });
    if (username.trim().length < 3)
      return jsonRes(res, 400, { error: 'Username must be at least 3 characters.' });
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim()))
      return jsonRes(res, 400, { error: 'Username: letters, numbers and underscores only.' });
    if (password.length < 6)
      return jsonRes(res, 400, { error: 'Password must be at least 6 characters.' });

    const key = username.trim().toLowerCase();
    const existing = await User.findOne({ username: key }).lean();
    if (existing) return jsonRes(res, 409, { error: 'Username already taken.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      username:    key,
      displayName: displayName.trim(),
      passwordHash,
      color: color || COLORS[Math.floor(Math.random() * COLORS.length)],
    });

    await user.save();
    console.log(`✅ Registered user: ${user.username} (${user._id})`);

    jsonRes(res, 201, {
      token: signToken({ userId: user._id.toString() }),
      user:  user.toSafe(),
    });
  } catch (err) {
    console.error('Register error:', err);
    jsonRes(res, 500, { error: 'Server error: ' + err.message });
  }
}

async function handleLogin(req, res) {
  try {
    const { username, password } = await readBody(req);
    if (!username?.trim() || !password)
      return jsonRes(res, 400, { error: 'Username and password are required.' });

    const user = await User.findOne({ username: username.trim().toLowerCase() });
    if (!user) return jsonRes(res, 401, { error: 'Invalid username or password.' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return jsonRes(res, 401, { error: 'Invalid username or password.' });

    console.log(`✅ Login: ${user.username}`);
    jsonRes(res, 200, {
      token: signToken({ userId: user._id.toString() }),
      user:  user.toSafe(),
    });
  } catch (err) {
    console.error('Login error:', err);
    jsonRes(res, 500, { error: 'Server error: ' + err.message });
  }
}

async function handleMe(req, res) {
  try {
    const payload = getAuth(req);
    if (!payload) return jsonRes(res, 401, { error: 'Unauthorized' });
    const user = await User.findById(payload.userId);
    if (!user) return jsonRes(res, 404, { error: 'User not found' });
    jsonRes(res, 200, { user: user.toSafe() });
  } catch (err) {
    console.error('Me error:', err);
    jsonRes(res, 500, { error: 'Server error' });
  }
}

async function handleUpdateProfile(req, res) {
  try {
    const payload = getAuth(req);
    if (!payload) return jsonRes(res, 401, { error: 'Unauthorized' });

    const body = await readBody(req);
    const update = {};
    if (body.displayName?.trim()) update.displayName = body.displayName.trim();
    if (body.color)                update.color       = body.color;
    if (body.status  !== undefined) update.status     = String(body.status).slice(0, 140);
    if (body.avatar  !== undefined) update.avatar     = body.avatar;

    const user = await User.findByIdAndUpdate(payload.userId, { $set: update }, { new: true, runValidators: true });
    if (!user) return jsonRes(res, 404, { error: 'User not found' });

    // Backfill sender info in messages
    const msgUpdate = {};
    if (update.avatar  !== undefined) msgUpdate.senderAvatar = update.avatar;
    if (update.displayName)           msgUpdate.senderName   = update.displayName;
    if (Object.keys(msgUpdate).length) {
      const result = await Message.updateMany({ senderId: payload.userId }, { $set: msgUpdate });
      console.log(`✅ Updated ${result.modifiedCount} messages for user ${user.username}`);
    }

    console.log(`✅ Profile updated: ${user.username}`);
    jsonRes(res, 200, { user: user.toSafe() });
  } catch (err) {
    console.error('Profile update error:', err);
    jsonRes(res, 500, { error: 'Server error: ' + err.message });
  }
}

// ── Room helpers ──────────────────────────────────────────────────────────────
function roomToClient(r) {
  const o = r.toObject ? r.toObject() : r;
  return {
    id:          o._id,
    name:        o.name,
    description: o.description || '',
    icon:        o.icon  || 'comments',
    color:       o.color || '#25D366',
    type:        'group',
    members:     o.members || [],
    createdBy:   o.createdBy || 'system',
    createdAt:   o.createdAt,
  };
}

// ── Room CRUD handlers ────────────────────────────────────────────────────────
async function handleGetRooms(req, res) {
  try {
    const payload = getAuth(req);
    if (!payload) return jsonRes(res, 401, { error: 'Unauthorized' });
    const rooms = await Room.find().sort({ createdAt: 1 }).lean();
    jsonRes(res, 200, { rooms: rooms.map(roomToClient) });
  } catch (err) {
    console.error('Get rooms error:', err);
    jsonRes(res, 500, { error: 'Server error' });
  }
}

async function handleCreateRoom(req, res) {
  try {
    const payload = getAuth(req);
    if (!payload) return jsonRes(res, 401, { error: 'Unauthorized' });

    const { name, description, icon, color } = await readBody(req);
    if (!name?.trim())           return jsonRes(res, 400, { error: 'Room name is required.' });
    if (name.trim().length < 2)  return jsonRes(res, 400, { error: 'Name must be at least 2 characters.' });
    if (name.trim().length > 32) return jsonRes(res, 400, { error: 'Name must be 32 characters or less.' });

    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const id   = `room-${slug}-${Date.now()}`;

    const room = new Room({
      _id:         id,
      name:        name.trim(),
      description: description?.trim() || '',
      icon:        icon  || 'comments',
      color:       color || COLORS[Math.floor(Math.random() * COLORS.length)],
      createdBy:   payload.userId,
      members:     [],
    });

    await room.save();
    console.log(`✅ Room created: ${room.name} (${room._id})`);
    jsonRes(res, 201, { room: roomToClient(room) });
  } catch (err) {
    console.error('Create room error:', err);
    jsonRes(res, 500, { error: 'Server error: ' + err.message });
  }
}

async function handleUpdateRoom(req, res, roomId) {
  try {
    const payload = getAuth(req);
    if (!payload) return jsonRes(res, 401, { error: 'Unauthorized' });

    const { name, description, icon, color } = await readBody(req);
    const update = {};
    if (name?.trim())              update.name        = name.trim();
    if (description !== undefined) update.description = description.trim();
    if (icon)                      update.icon        = icon;
    if (color)                     update.color       = color;

    const room = await Room.findByIdAndUpdate(roomId, { $set: update }, { new: true });
    if (!room) return jsonRes(res, 404, { error: 'Room not found.' });

    console.log(`✅ Room updated: ${room.name}`);
    jsonRes(res, 200, { room: roomToClient(room) });
  } catch (err) {
    console.error('Update room error:', err);
    jsonRes(res, 500, { error: 'Server error' });
  }
}

async function handleDeleteRoom(req, res, roomId) {
  try {
    const payload = getAuth(req);
    if (!payload) return jsonRes(res, 401, { error: 'Unauthorized' });

    if (SEED_IDS.includes(roomId))
      return jsonRes(res, 403, { error: 'Cannot delete default rooms.' });

    const room = await Room.findByIdAndDelete(roomId);
    if (!room) return jsonRes(res, 404, { error: 'Room not found.' });

    const { deletedCount } = await Message.deleteMany({ channelId: roomId });
    console.log(`✅ Room deleted: ${roomId} (${deletedCount} messages removed)`);
    jsonRes(res, 200, { ok: true });
  } catch (err) {
    console.error('Delete room error:', err);
    jsonRes(res, 500, { error: 'Server error' });
  }
}

// ── Message helpers ───────────────────────────────────────────────────────────
function buildMsg(user, channelId, channelType, type, extras = {}) {
  return {
    channelId,
    channelType,
    type,
    senderId:     user.id,
    senderName:   user.name,
    senderColor:  user.color  || null,
    senderAvatar: user.avatar || null,
    timestamp:    new Date(),
    ...extras,
  };
}

function docToMsg(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id:           o._id?.toString(),
    type:         o.type,
    text:         o.text         || null,
    fileName:     o.fileName     || null,
    fileType:     o.fileType     || null,
    fileSize:     o.fileSize     || null,
    fileData:     o.fileData     || null,
    senderId:     o.senderId,
    senderName:   o.senderName,
    senderColor:  o.senderColor  || null,
    senderAvatar: o.senderAvatar || null,
    timestamp:    new Date(o.timestamp).getTime(),
  };
}

async function saveRoomMsg(io, roomId, msgData) {
  const doc = await new Message(msgData).save();
  io.to(roomId).emit('room:message', { roomId, message: docToMsg(doc) });
  return doc;
}

async function saveDmMsg(io, socket, senderId, toUserId, msgData) {
  const key = dmKey(senderId, toUserId);
  const doc = await new Message({ ...msgData, channelId: key, channelType: 'dm' }).save();
  const out = docToMsg(doc);
  socket.emit('dm:message', { channelId: key, toUserId, message: out });
  const toSock = userSockets.get(toUserId);
  if (toSock) io.to(toSock).emit('dm:message', { channelId: key, fromUserId: senderId, message: out });
  return doc;
}

// ── Boot ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n📦 Loading environment from .env.local');
  console.log(`   MONGODB_URI = ${MONGO_URI.replace(/\/\/.*@/, '//***@')}`);
  console.log(`   JWT_SECRET  = ${JWT_SECRET === 'chatterbox-dev-secret-change-in-prod' ? '(default - change in production!)' : '(set ✓)'}\n`);

  // Connect to MongoDB BEFORE starting the server
  await connectDB();

  // Seed default rooms (upsert - won't overwrite existing data)
  for (const r of SEED_ROOMS) {
    const exists = await Room.findById(r._id).lean();
    if (!exists) {
      await new Room({ ...r, type: 'group', members: [], createdBy: 'system' }).save();
      console.log(`✅ Seeded room: ${r.name}`);
    }
  }

  await app.prepare();

  const httpServer = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    const p = parsedUrl.pathname;
    const m = req.method;

    // Route API calls before passing to Next.js
    try {
      if (p === '/api/auth/register'  && m === 'POST')   return await handleRegister(req, res);
      if (p === '/api/auth/login'     && m === 'POST')   return await handleLogin(req, res);
      if (p === '/api/auth/me'        && m === 'GET')    return await handleMe(req, res);
      if (p === '/api/profile/update' && m === 'POST')   return await handleUpdateProfile(req, res);
      if (p === '/api/rooms'          && m === 'GET')    return await handleGetRooms(req, res);
      if (p === '/api/rooms'          && m === 'POST')   return await handleCreateRoom(req, res);

      const roomMatch = p.match(/^\/api\/rooms\/([^/]+)$/);
      if (roomMatch) {
        if (m === 'PUT')    return await handleUpdateRoom(req, res, decodeURIComponent(roomMatch[1]));
        if (m === 'DELETE') return await handleDeleteRoom(req, res, decodeURIComponent(roomMatch[1]));
      }
    } catch (err) {
      console.error('API handler crash:', err);
      if (!res.headersSent) jsonRes(res, 500, { error: 'Internal server error' });
      return;
    }

    handle(req, res, parsedUrl);
  });

  // ── Socket.io ──────────────────────────────────────────────────────────────
  const io = new Server(httpServer, {
    path:               '/api/socket',
    addTrailingSlash:   false,
    maxHttpBufferSize:  12 * 1024 * 1024, // 12 MB for file transfers
  });

  // JWT auth middleware — runs before every connection
  io.use(async (socket, next) => {
    const token   = socket.handshake.auth?.token;
    const payload = verifyToken(token);
    if (!payload) return next(new Error('AUTH_REQUIRED'));

    try {
      const user = await User.findById(payload.userId).lean();
      if (!user) return next(new Error('ACCOUNT_NOT_FOUND'));
      socket.authUser = { ...user, id: user._id.toString() };
      next();
    } catch (err) {
      next(new Error('DB_ERROR'));
    }
  });

  io.on('connection', (socket) => {
    const account = socket.authUser;

    // ── user:join ────────────────────────────────────────────────────────────
    socket.on('user:join', async () => {
      try {
        // Kick any stale connection for this account
        const prevId = userSockets.get(account.id);
        if (prevId && prevId !== socket.id) {
          io.sockets.sockets.get(prevId)?.disconnect(true);
          activeSessions.delete(prevId);
        }

        const su = {
          id:       account.id,
          username: account.username,
          name:     account.displayName,
          color:    account.color,
          avatar:   account.avatar || null,
          status:   account.status || '',
          socketId: socket.id,
        };
        activeSessions.set(socket.id, su);
        userSockets.set(account.id, socket.id);

        // Join all existing rooms and update membership
        const allRooms = await Room.find().sort({ createdAt: 1 }).lean();
        for (const room of allRooms) {
          socket.join(room._id);
          const alreadyMember = room.members?.some(m => m.id === account.id);
          if (!alreadyMember) {
            await Room.updateOne(
              { _id: room._id },
              { $push: { members: { id: account.id, name: account.displayName } } }
            );
          }
        }

        // Fetch last message for each room
        const roomsWithLast = await Promise.all(allRooms.map(async r => {
          const last = await Message.findOne({ channelId: r._id }).sort({ timestamp: -1 }).lean();
          return { ...roomToClient(r), lastMessage: last ? docToMsg(last) : null };
        }));

        socket.emit('user:joined', {
          user:        su,
          rooms:       roomsWithLast,
          onlineUsers: onlineUsers().filter(u => u.id !== account.id),
        });

        io.emit('users:updated', onlineUsers());
        socket.broadcast.emit('notification', { text: `${account.displayName} joined` });
      } catch (err) {
        console.error('user:join error:', err);
      }
    });

    // ── room:created (broadcast new room to all) ──────────────────────────────
    socket.on('room:created', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId).lean();
        if (!room) return;
        for (const [sockId, su] of activeSessions) {
          const s = io.sockets.sockets.get(sockId);
          if (s) {
            s.join(roomId);
            const already = room.members?.some(m => m.id === su.id);
            if (!already) await Room.updateOne({ _id: roomId }, { $addToSet: { members: { id: su.id, name: su.name } } });
          }
        }
        const updated = await Room.findById(roomId).lean();
        io.emit('room:new', { room: { ...roomToClient(updated), lastMessage: null } });
      } catch (err) { console.error('room:created error:', err); }
    });

    socket.on('room:deleted', ({ roomId }) => io.emit('room:removed', { roomId }));

    socket.on('room:updated', async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId).lean();
        if (room) io.emit('room:changed', { room: roomToClient(room) });
      } catch (err) { console.error('room:updated error:', err); }
    });

    // ── Text messages ─────────────────────────────────────────────────────────
    socket.on('room:message', async ({ roomId, text }) => {
      const u = activeSessions.get(socket.id);
      if (!u || !text?.trim()) return;
      try {
        await saveRoomMsg(io, roomId, buildMsg(u, roomId, 'room', 'text', { text: text.trim() }));
      } catch (err) { console.error('room:message save error:', err); }
    });

    socket.on('dm:message', async ({ toUserId, text }) => {
      const u = activeSessions.get(socket.id);
      if (!u || !text?.trim()) return;
      try {
        await saveDmMsg(io, socket, u.id, toUserId, buildMsg(u, '', 'dm', 'text', { text: text.trim() }));
      } catch (err) { console.error('dm:message save error:', err); }
    });

    // ── File messages ─────────────────────────────────────────────────────────
    socket.on('room:file', async ({ roomId, fileName, fileType, fileSize, fileData }) => {
      const u = activeSessions.get(socket.id);
      if (!u || !fileData) return;
      const type = fileType?.startsWith('image/') ? 'image' : 'file';
      try {
        await saveRoomMsg(io, roomId, buildMsg(u, roomId, 'room', type, { fileName, fileType, fileSize, fileData }));
      } catch (err) { console.error('room:file save error:', err); }
    });

    socket.on('dm:file', async ({ toUserId, fileName, fileType, fileSize, fileData }) => {
      const u = activeSessions.get(socket.id);
      if (!u || !fileData) return;
      const type = fileType?.startsWith('image/') ? 'image' : 'file';
      try {
        await saveDmMsg(io, socket, u.id, toUserId, buildMsg(u, '', 'dm', type, { fileName, fileType, fileSize, fileData }));
      } catch (err) { console.error('dm:file save error:', err); }
    });

    // ── History ───────────────────────────────────────────────────────────────
    socket.on('room:history', async ({ roomId }) => {
      try {
        const msgs = await Message.find({ channelId: roomId }).sort({ timestamp: 1 }).limit(200).lean();
        socket.emit('room:history', { roomId, messages: msgs.map(docToMsg) });
      } catch (err) { console.error('room:history error:', err); socket.emit('room:history', { roomId, messages: [] }); }
    });

    socket.on('dm:history', async ({ toUserId }) => {
      const u = activeSessions.get(socket.id);
      if (!u) return;
      try {
        const key  = dmKey(u.id, toUserId);
        const msgs = await Message.find({ channelId: key }).sort({ timestamp: 1 }).limit(200).lean();
        socket.emit('dm:history', { channelId: key, messages: msgs.map(docToMsg) });
      } catch (err) { console.error('dm:history error:', err); }
    });

    // ── Typing ────────────────────────────────────────────────────────────────
    socket.on('typing:start', ({ roomId, toUserId }) => {
      const u = activeSessions.get(socket.id); if (!u) return;
      if (roomId)   socket.to(roomId).emit('typing:update', { roomId, userId: u.id, name: u.name, typing: true });
      else if (toUserId) { const s = userSockets.get(toUserId); if (s) io.to(s).emit('typing:update', { fromUserId: u.id, name: u.name, typing: true }); }
    });
    socket.on('typing:stop', ({ roomId, toUserId }) => {
      const u = activeSessions.get(socket.id); if (!u) return;
      if (roomId)   socket.to(roomId).emit('typing:update', { roomId, userId: u.id, name: u.name, typing: false });
      else if (toUserId) { const s = userSockets.get(toUserId); if (s) io.to(s).emit('typing:update', { fromUserId: u.id, name: u.name, typing: false }); }
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const u = activeSessions.get(socket.id); if (!u) return;
      if (userSockets.get(u.id) === socket.id) {
        userSockets.delete(u.id);
        activeSessions.delete(socket.id);
        io.emit('users:updated', onlineUsers());
        socket.broadcast.emit('notification', { text: `${u.name} left` });
      }
    });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 ChatterBox v3  →  http://localhost:${PORT}\n`);
  });
}

main().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
