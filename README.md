# ChatterBox v3 💬
### Next.js · MongoDB · Socket.io · JWT · Font Awesome · Responsive

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.local.example .env.local
# Edit .env.local — set MONGODB_URI and JWT_SECRET

# 3. Start MongoDB (if running locally)
mongod

# 4. Run
npm run dev
```

Open → **http://localhost:3000**

---

## Why models weren't saving (fixed)

The root cause was that `.env.local` was never loaded in the custom Node server.
Here is what was wrong and what was fixed:

| # | Bug | Fix |
|---|-----|-----|
| 1 | `server.js` never read `.env.local`, so `MONGODB_URI` was always `undefined` | Added `require('dotenv').config(...)` as the **very first line** of server.js |
| 2 | `db.js` used an `isConnected` boolean that got stale on hot reload | Replaced with a connection promise cache keyed on `mongoose.connection.readyState` |
| 3 | Mongoose threw `OverwriteModelError` on hot reload | All models use `mongoose.models.X \|\| mongoose.model('X', schema)` guard |
| 4 | Room members subdoc had auto `_id` causing duplicate key errors | Added `_id: false` to members array schema |
| 5 | `uuid` was removed from package.json by accident | Restored; `dotenv` added |
| 6 | Server started before DB connected | MongoDB now connects **before** `app.prepare()` |
| 7 | No error logging on save failures | Every `await .save()` wrapped in try/catch with console.error |

---

## Environment Variables

```
MONGODB_URI=mongodb://localhost:27017/chatterbox   # Required
JWT_SECRET=your-secret-here                         # Required in production
PORT=3000                                           # Optional
```

**Local MongoDB**: install from https://www.mongodb.com/try/download/community
**MongoDB Atlas** (free cloud): https://www.mongodb.com/atlas

---

## Project Structure

```
chatterbox/
├── server.js                    ← Custom Node server (loads .env.local first!)
├── .env.local.example           ← Copy → .env.local
├── package.json
├── next.config.js
└── src/
    ├── models/
    │   ├── User.js              ← username, displayName, passwordHash, avatar, color, status
    │   ├── Message.js           ← channelId, type, text/file, sender info, timestamp
    │   └── Room.js              ← name, icon (FA), color, description, members[]
    ├── lib/
    │   ├── db.js                ← MongoDB connection (promise cache, reconnect events)
    │   ├── auth.js              ← AuthContext + updateProfile
    │   ├── socket.js            ← Socket.io client (sends JWT in handshake)
    │   └── theme.js             ← ThemeContext (dark/light/ocean/rose)
    ├── components/
    │   ├── AuthScreen.js        ← Login + Register
    │   ├── ProfileModal.js      ← Edit profile + upload photo
    │   └── CreateRoomModal.js   ← Create/edit room with FA icon picker
    └── app/
        ├── layout.js
        ├── page.js              ← Main chat UI (responsive)
        └── globals.css          ← 4 CSS themes
```

---

## REST API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/auth/me` | Bearer | Restore session |
| POST | `/api/profile/update` | Bearer | Update profile + avatar |
| GET | `/api/rooms` | Bearer | List all rooms |
| POST | `/api/rooms` | Bearer | Create room |
| PUT | `/api/rooms/:id` | Bearer | Update room |
| DELETE | `/api/rooms/:id` | Bearer | Delete room (not seed rooms) |

## MongoDB Collections

| Collection | Persists |
|---|---|
| `users` | Accounts, hashed passwords, avatars, status |
| `messages` | All chat history (rooms + DMs, text + files) |
| `rooms` | Room definitions, icons, colors, membership |
