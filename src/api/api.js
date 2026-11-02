import { request as r } from './http';

const q = encodeURIComponent;

export const api = {
  auth: {
    login: (b) => r('/api/auth/login', { method: 'POST', body: b, auth: false }),
    register: (b) => r('/api/auth/register', { method: 'POST', body: b, auth: false }),
    logout: (refreshToken) =>
      r('/api/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }),
  },
  users: {
    me: () => r('/api/users/me'),
    updateMe: (b) => r('/api/users/me', { method: 'PATCH', body: b }),
    get: (id) => r(`/api/users/${id}`),
    search: (query) => r(`/api/users/search?query=${q(query)}`),
    logoutAll: () => r('/api/users/me/logout-all', { method: 'POST' }),
  },
  groups: {
    mine: () => r('/api/groups/my'),
    get: (id) => r(`/api/groups/${id}`),
    members: (id) => r(`/api/groups/${id}/members`),
    // `isPrivate` is sent under both names — see isPriv() in lib/util.js
    create: (b) =>
      r('/api/groups', { method: 'POST', body: { ...b, isPrivate: !!b.isPrivate, private: !!b.isPrivate } }),
    remove: (id) => r(`/api/groups/${id}`, { method: 'DELETE' }),
    leave: (id) => r(`/api/groups/${id}/leave`, { method: 'POST' }),
    addMember: (id, b) => r(`/api/groups/${id}/members`, { method: 'POST', body: b }),
    removeMember: (id, userId) => r(`/api/groups/${id}/members/${userId}`, { method: 'DELETE' }),
  },
  channels: {
    byGroup: (groupId) => r(`/api/channels/group/${groupId}`),
    get: (id) => r(`/api/channels/${id}`),
    members: (id) => r(`/api/channels/${id}/members`),
    create: (b) =>
      r('/api/channels', { method: 'POST', body: { ...b, isPrivate: !!b.isPrivate, private: !!b.isPrivate } }),
    update: (id, b) => {
      const body = { ...b };
      if (b.isPrivate !== undefined) body.private = b.isPrivate;
      return r(`/api/channels/${id}`, { method: 'PATCH', body });
    },
    remove: (id) => r(`/api/channels/${id}`, { method: 'DELETE' }),
    join: (b) => r('/api/channels/join', { method: 'POST', body: b }),
    leave: (id) => r(`/api/channels/${id}/leave`, { method: 'POST' }),
    removeMember: (id, userId) => r(`/api/channels/${id}/members/${userId}`, { method: 'DELETE' }),
    regenerateCode: (id) => r(`/api/channels/${id}/invite-code/regenerate`, { method: 'POST' }),
  },
  messages: {
    list: (channelId, page = 0, size = 50) =>
      r(`/api/messages/channel/${channelId}?page=${page}&size=${size}`),
    send: (b) => r('/api/messages', { method: 'POST', body: b }),
    edit: (id, content) => r(`/api/messages/${id}`, { method: 'PATCH', body: { content } }),
    remove: (id) => r(`/api/messages/${id}`, { method: 'DELETE' }),
  },
  chats: {
    list: () => r('/api/chats'),
    messages: (chatId, page = 0, size = 50) =>
      r(`/api/chats/${chatId}/messages?page=${page}&size=${size}`),
    send: (b) => r('/api/chats/messages', { method: 'POST', body: b }),
    read: (chatId) => r(`/api/chats/${chatId}/read`, { method: 'POST' }),
    remove: (messageId) => r(`/api/chats/messages/${messageId}`, { method: 'DELETE' }),
  },
  notifications: {
    list: () => r('/api/notifications'),
    read: (ids) => r('/api/notifications/read', { method: 'POST', body: { notificationIds: ids } }),
    readAll: () => r('/api/notifications/read-all', { method: 'POST' }),
  },
  files: {
    // category must be "avatars" or "attachments" (enforced by the backend)
    upload: (category, file) => {
      const form = new FormData();
      form.append('file', file);
      return r(`/api/files/upload/${category}`, { method: 'POST', form });
    },
  },
  admin: {
    users: () => r('/api/admin/users'),
    disable: (id) => r(`/api/admin/users/${id}/disable`, { method: 'POST' }),
    enable: (id) => r(`/api/admin/users/${id}/enable`, { method: 'POST' }),
    ban: (id) => r(`/api/admin/users/${id}/ban`, { method: 'POST' }),
    unban: (id) => r(`/api/admin/users/${id}/unban`, { method: 'POST' }),
    assignRole: (id, role) => r(`/api/admin/users/${id}/roles/${q(role)}`, { method: 'POST' }),
    removeRole: (id, role) => r(`/api/admin/users/${id}/roles/${q(role)}`, { method: 'DELETE' }),
  },
};
