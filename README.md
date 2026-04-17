# ChatterBox v3
### Next.js · MongoDB · Socket.io · JWT · Font Awesome · Responsive

## Quick Start

```bash
# 1. Install
npm install
# 2. Run
npm run dev
```

Open → **http://localhost:3000**

---


## Environment Variables
```
MONGODB_URI=mongodb://localhost:27017/chatterbox   # Required
JWT_SECRET=your-secret-here                         # Required in production

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
