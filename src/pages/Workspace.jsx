import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { APP_NAME } from '../config';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useTopic } from '../context/SocketContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ChannelView from '../components/ChannelView.jsx';
import DmView from '../components/DmView.jsx';
import NotificationsPanel from '../components/NotificationsPanel.jsx';
import {
  ChannelSettingsModal,
  CreateChannelModal,
  CreateGroupModal,
  GroupPeopleModal,
  JoinChannelModal,
  NewDmModal,
  ProfileModal,
} from '../components/Modals.jsx';
import { Empty, Icon, Spinner } from '../components/ui.jsx';
import { displayName, errorText } from '../lib/util';

const EMPTY = [];

function Shell({ onMenu, children }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center border-b border-line p-3 md:hidden">
        <button className="btn-ghost !p-2" onClick={onMenu} aria-label="Open navigation">
          <Icon name="menu" />
        </button>
      </div>
      {children}
    </div>
  );
}

// Renders nothing; keeps one STOMP subscription alive.
function Listener({ dest, onMessage }) {
  useTopic(dest, onMessage);
  return null;
}

export default function Workspace() {
  const { user, isAdmin, logout, logoutEverywhere } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const { pathname } = useLocation();

  // Routes: /g/:groupId[/c/:channelId]  ·  /dm[/:userId]
  const gm = pathname.match(/^\/g\/(\d+)(?:\/c\/(\d+))?/);
  const dm = pathname.match(/^\/dm\/(\d+)/);
  const groupId = gm ? Number(gm[1]) : null;
  const channelId = gm?.[2] ? Number(gm[2]) : null;
  const dmUserId = dm ? Number(dm[1]) : null;

  const [groups, setGroups] = useState(null);
  const [chState, setChState] = useState({ groupId: null, list: EMPTY });
  const [chKey, setChKey] = useState(0);
  const [chats, setChats] = useState([]);
  const [peers, setPeers] = useState({});
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState({});
  const [modal, setModal] = useState(null);
  const [sidebar, setSidebar] = useState(false);
  const [bell, setBell] = useState(false);
  const [loadError, setLoadError] = useState('');

  const close = () => setModal(null);
  const openModal = (type) => setModal({ type });

  const loadGroups = useCallback(
    () =>
      api.groups
        .mine()
        .then((g) => {
          setGroups(g);
          setLoadError('');
        })
        .catch((e) => {
          setGroups((g) => g || []);
          setLoadError(errorText(e));
        }),
    [],
  );
  const loadChats = useCallback(() => api.chats.list().then(setChats).catch(() => {}), []);
  const reloadChannels = useCallback(() => setChKey((k) => k + 1), []);

  useEffect(() => {
    loadGroups();
    loadChats();
    api.notifications.list().then(setNotifs).catch(() => {});
  }, [loadGroups, loadChats]);

  // Channels of the open group. They are tagged with their group id so a
  // slow response for a previous group can never show up under the new one.
  useEffect(() => {
    if (!groupId) return undefined;
    let live = true;
    api.channels
      .byGroup(groupId)
      .then((list) => live && setChState({ groupId, list }))
      .catch((e) => {
        if (!live) return;
        setChState({ groupId, list: EMPTY });
        toast({ tone: 'error', title: 'Could not load channels', body: errorText(e) });
      });
    return () => {
      live = false;
    };
  }, [groupId, chKey, toast]);

  const channels = chState.groupId === groupId ? chState.list : EMPTY;
  const channelsLoaded = chState.groupId === groupId;
  const group = groups?.find((g) => g.id === groupId) || null;
  const channel = channels.find((c) => c.id === channelId) || null;

  // "/" -> last group (or the DM home when the user has no group yet).
  useEffect(() => {
    if (!groups || pathname !== '/') return;
    const last = localStorage.getItem('relay.lastGroup');
    const g = groups.find((x) => String(x.id) === last) || groups[0];
    nav(g ? `/g/${g.id}` : '/dm', { replace: true });
  }, [groups, pathname, nav]);

  useEffect(() => {
    if (groupId) localStorage.setItem('relay.lastGroup', String(groupId));
  }, [groupId]);

  useEffect(() => {
    if (groupId && channelId) localStorage.setItem(`relay.ch.${groupId}`, String(channelId));
  }, [groupId, channelId]);

  // Opening a group without a channel picks one for you.
  useEffect(() => {
    if (!groupId || channelId || !channelsLoaded || channels.length === 0) return;
    const saved = localStorage.getItem(`relay.ch.${groupId}`);
    const pick =
      channels.find((c) => String(c.id) === saved && c.currentUserRole) ||
      channels.find((c) => c.currentUserRole) ||
      channels[0];
    nav(`/g/${groupId}/c/${pick.id}`, { replace: true });
  }, [groupId, channelId, channelsLoaded, channels, nav]);

  useEffect(() => {
    if (channelId) setUnread((u) => (u[channelId] ? { ...u, [channelId]: 0 } : u));
  }, [channelId]);

  // Direct messages
  const chatForPeer = chats.find((c) => c.otherUser?.id === dmUserId);
  const peer = chatForPeer?.otherUser || peers[dmUserId] || null;

  useEffect(() => {
    if (dmUserId && dmUserId === user.id) nav('/dm', { replace: true });
  }, [dmUserId, user.id, nav]);

  useEffect(() => {
    if (!dmUserId || peer || dmUserId === user.id) return;
    api.users
      .get(dmUserId)
      .then((u) => setPeers((p) => ({ ...p, [u.id]: u })))
      .catch((e) => toast({ tone: 'error', title: 'Could not open conversation', body: errorText(e) }));
  }, [dmUserId, peer, user.id, toast]);

  function openDm(u) {
    setPeers((p) => ({ ...p, [u.id]: u }));
    setSidebar(false);
    nav(`/dm/${u.id}`);
  }

  // Notifications
  function openNotification(n) {
    if (!n.read) {
      api.notifications.read([n.id]).catch(() => {});
      setNotifs((p) => p.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    const m = n.referenceUrl?.match(/\/chats\/(\d+)/);
    const chat = m && chats.find((c) => c.chatId === Number(m[1]));
    if (chat) openDm(chat.otherUser);
    else if (n.type === 'NEW_MESSAGE' && n.actor) openDm(n.actor);
    setBell(false);
  }

  async function readAll() {
    try {
      await api.notifications.readAll();
      setNotifs((p) => p.map((x) => ({ ...x, read: true })));
    } catch (e) {
      toast({ tone: 'error', title: 'Could not update notifications', body: errorText(e) });
    }
  }

  useTopic('/user/queue/notifications', (n) => {
    setNotifs((p) => [n, ...p.filter((x) => x.id !== n.id)]);
    // Already looking at that conversation: no need to nag.
    if (n.type === 'NEW_MESSAGE' && n.actor?.id === dmUserId) {
      api.notifications.read([n.id]).catch(() => {});
      setNotifs((p) => p.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      return;
    }
    toast({ title: n.actor ? displayName(n.actor) : 'Notification', body: n.content, onClick: () => openNotification(n) });
  });

  useTopic('/user/queue/messages', () => loadChats());

  function onChannelMessage(id, m) {
    if (id === channelId || m.sender?.id === user.id || m.edited || m.status === 'DELETED') return;
    setUnread((u) => ({ ...u, [id]: (u[id] || 0) + 1 }));
  }

  const unreadNotifs = notifs.filter((n) => !n.read).length;
  const openMenu = () => setSidebar(true);

  let content;
  if (dmUserId) {
    content = peer ? (
      <DmView key={dmUserId} peer={peer} chatId={chatForPeer?.chatId} onChatChanged={loadChats} onMenu={openMenu} />
    ) : (
      <Shell onMenu={openMenu}>
        <div className="flex flex-1 items-center justify-center"><Spinner /></div>
      </Shell>
    );
  } else if (groupId && groups && !group) {
    content = (
      <Shell onMenu={openMenu}>
        <Empty className="flex-1" title="Group not found" hint="It may have been deleted, or you are not a member." />
      </Shell>
    );
  } else if (groupId && channel) {
    content = (
      <ChannelView
        key={channel.id}
        channel={channel}
        group={group}
        onMenu={openMenu}
        onSettings={() => setModal({ type: 'channel' })}
        onJoined={() => {
          reloadChannels();
          loadGroups();
        }}
      />
    );
  } else if (groupId && channelId && channelsLoaded) {
    content = (
      <Shell onMenu={openMenu}>
        <Empty className="flex-1" title="Channel not found" hint="It may have been deleted or is private." />
      </Shell>
    );
  } else if (groupId && channelsLoaded && channels.length === 0) {
    const canCreate = ['OWNER', 'ADMIN'].includes(group?.currentUserRole);
    content = (
      <Shell onMenu={openMenu}>
        <Empty
          className="flex-1"
          title="This group has no channels yet"
          hint={canCreate ? 'Create the first channel to start the conversation.' : 'Ask a group admin to create one.'}
          action={canCreate && <button className="btn-primary" onClick={() => openModal('createChannel')}>Create a channel</button>}
        />
      </Shell>
    );
  } else if (groupId) {
    content = (
      <Shell onMenu={openMenu}>
        <div className="flex flex-1 items-center justify-center"><Spinner /></div>
      </Shell>
    );
  } else {
    content = (
      <Shell onMenu={openMenu}>
        <Empty
          className="flex-1"
          title={`Welcome to ${APP_NAME}`}
          hint="Create a group to organize your team's channels, or start a direct message with a colleague."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button className="btn-primary" onClick={() => openModal('createGroup')}>Create a group</button>
              <button className="btn-outline" onClick={() => openModal('newDm')}>New message</button>
            </div>
          }
        />
      </Shell>
    );
  }

  const memberChannels = channels.filter((c) => c.currentUserRole);

  return (
    <div className="flex h-full overflow-hidden">
      {sidebar && <div className="fixed inset-0 z-20 bg-pine-900/50 md:hidden" onClick={() => setSidebar(false)} />}
      <Sidebar
        open={sidebar}
        onClose={() => setSidebar(false)}
        user={user}
        groups={groups}
        group={group}
        groupId={groupId}
        channels={channels}
        channelId={channelId}
        chats={chats}
        dmUserId={dmUserId}
        unread={unread}
        notifCount={unreadNotifs}
        isAdmin={isAdmin}
        onModal={openModal}
        onBell={() => setBell(true)}
        onLogout={logout}
        onLogoutAll={logoutEverywhere}
      />

      <main className="flex min-w-0 flex-1 flex-col bg-white">
        {loadError && (
          <div role="alert" className="flex items-center justify-between gap-3 bg-red-50 px-4 py-2 text-sm text-brick">
            <span>{loadError}</span>
            <button className="btn-ghost !py-1 text-brick" onClick={loadGroups}><Icon name="refresh" size={14} /> Retry</button>
          </div>
        )}
        <div className="flex min-h-0 flex-1">{content}</div>
      </main>

      {memberChannels.map((c) => (
        <Listener key={c.id} dest={`/topic/channel.${c.id}`} onMessage={(m) => onChannelMessage(c.id, m)} />
      ))}

      {bell && <NotificationsPanel items={notifs} onClose={() => setBell(false)} onOpen={openNotification} onReadAll={readAll} />}

      {modal?.type === 'createGroup' && (
        <CreateGroupModal
          onClose={close}
          onCreated={(g) => {
            close();
            loadGroups();
            nav(`/g/${g.id}`);
          }}
        />
      )}
      {modal?.type === 'createChannel' && group && (
        <CreateChannelModal
          group={group}
          onClose={close}
          onCreated={(c) => {
            close();
            reloadChannels();
            nav(`/g/${group.id}/c/${c.id}`);
          }}
        />
      )}
      {modal?.type === 'joinChannel' && (
        <JoinChannelModal
          onClose={close}
          onJoined={(ch) => {
            close();
            loadGroups();
            reloadChannels();
            if (ch.groupId) nav(`/g/${ch.groupId}/c/${ch.id}`);
          }}
        />
      )}
      {modal?.type === 'newDm' && (
        <NewDmModal
          onClose={close}
          onPick={(u) => {
            close();
            openDm(u);
          }}
        />
      )}
      {modal?.type === 'profile' && <ProfileModal onClose={close} />}
      {modal?.type === 'people' && group && (
        <GroupPeopleModal
          group={group}
          onClose={close}
          onChanged={loadGroups}
          onLeft={() => {
            close();
            loadGroups();
            nav('/dm');
          }}
        />
      )}
      {modal?.type === 'channel' && group && channel && (
        <ChannelSettingsModal
          channel={channel}
          group={group}
          onClose={close}
          onChanged={() => {
            reloadChannels();
            loadGroups();
          }}
          onGone={(kind) => {
            close();
            if (kind === 'deleted') setChState((s) => ({ ...s, list: s.list.filter((c) => c.id !== channel.id) }));
            else reloadChannels();
            loadGroups();
            nav(`/g/${group.id}`);
          }}
        />
      )}
    </div>
  );
}
