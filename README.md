# Communication(messagin_platform) – Frontend

React client for the Spring Boot **communication platform** backend: groups, channels, direct messages, notifications, presence, file sharing and an admin console, with live updates over WebSocket (STOMP).

**Stack:** React 18 · Vite 5 · Tailwind CSS 3 · React Router 6 · `@stomp/stompjs` + `sockjs-client`

## Quick start

Requirements: Node.js 18+ and the backend running (see the backend README).

```powershell
npm install
copy .env.example .env      # then edit VITE_API_URL if your backend isn't on 8077
npm run dev
```

Open **http://localhost:5173**. The backend's CORS rules only allow that origin, so the dev server uses a fixed port and fails loudly instead of moving to another one.

Production build: `npm run build` (output in `dist/`). If you deploy it, add the site's origin to `CorsConfig` in the backend.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8077` | Base URL of the Spring Boot API (REST and `/ws`) |

The app name shown in the UI is one constant: `APP_NAME` in `src/config.js`.

## Features

- **Sign in / register**, with silent token refresh (the access token is renewed before it expires, and refresh-token rotation is handled safely when requests run in parallel)
- **Groups and channels**: create, join, leave, delete; public channels can be joined in one click, private ones with a channel ID + invite code; invite codes can be copied and regenerated
- **Live messaging**: new messages, edits and deletions arrive instantly; unread badges for channels you are not looking at; paginated history ("Load earlier messages")
- **Message actions**: reply, edit your own, delete your own (moderators can delete others'), links are clickable
- **Attachments**: images, video, audio and files up to 25 MB, shown inline
- **Direct messages**: start from a user search, unread counts, mark-as-read when you open a conversation
- **Presence**: online/away/offline dots, updated live
- **Notifications**: drawer with unread count, click-through to the conversation, toast for new ones
- **Profile**: edit your name and upload a profile picture
- **Admin console** (`ROLE_ADMIN`): list users, disable/enable, ban/unban, grant and revoke roles
- Responsive layout with a slide-in sidebar on phones, keyboard-friendly, honours *reduced motion*

## Project structure

```
src/
├── api/
│   ├── http.js          fetch wrapper: auth header, token refresh, error handling
│   └── api.js           one function per backend endpoint
├── context/
│   ├── AuthContext.jsx  session, login/register/logout
│   ├── SocketContext.jsx STOMP connection, auto re-subscribe, presence, useTopic()
│   └── ToastContext.jsx
├── components/          Sidebar, ChannelView, DmView, MessageList, Composer,
│                        NotificationsPanel, Modals, ui (Avatar, Modal, Icon…)
├── pages/               AuthPage, Workspace (main shell), AdminPage
├── lib/util.js          dates, names, helpers
└── config.js
```

Routes: `/login` · `/g/:groupId/c/:channelId` · `/dm/:userId` · `/admin`

## How the real-time part works

`SocketProvider` opens one STOMP connection per signed-in session and sends the JWT in the `CONNECT` frame. Components call `useTopic(destination, handler)`; subscriptions are re-attached automatically after a reconnect, and a fresh access token is fetched on every reconnect.

| Destination | Used for |
|---|---|
| `/topic/channel.{id}` | messages in channels you belong to |
| `/user/queue/messages` | incoming private messages |
| `/user/queue/notifications` | new notifications |
| `/topic/presence` | online/offline changes |

Messages are **sent over REST** (`POST /api/messages`, `/api/chats/messages`) and **received over WebSocket**, exactly as the backend is designed. The sender's own message appears from the REST response, and the WebSocket echo is merged by message id so nothing is shown twice.

## Things worth knowing about the backend

- **`private` vs `isPrivate`.** Lombok turns `boolean isPrivate` into the JSON field `private`. The client reads either name and sends both when creating or updating groups and channels.
- **Admin console permissions.** The admin endpoints require the `MANAGE_USERS` and `BAN_USER` privileges. If your database seeder creates `ROLE_ADMIN` without privileges, the console will show an error until you attach them to that role.
- **Private channels are hidden.** They don't appear in a group's channel list until you join with the ID and invite code.
- **File uploads** accept only the `avatars` (images, 5 MB) and `attachments` (25 MB) categories.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Cannot reach the server" | Backend not running, or wrong `VITE_API_URL`/port |
| CORS error in the browser console | Something else is using the port, or the page isn't on `http://localhost:5173` |
| `global is not defined` | Already handled in `vite.config.js` and `index.html` (needed by `sockjs-client`) |
| "Reconnecting" badge never clears | WebSocket blocked by a proxy, or an invalid token; sign out and in again |
