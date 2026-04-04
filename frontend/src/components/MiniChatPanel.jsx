import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { requestsAPI } from '../utils/requestsAPI';
import { playNotificationSound } from './NotificationToast';

// MiniChatPanel self-fetches its own request list so it works on every page.

// ─── Avatar ───────────────────────────────────────────────────────────────────
const Avatar = ({ name = '', size = 38, bg = '#1a3c5e' }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    background: bg, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.38, fontWeight: '700', fontFamily: "'Outfit', sans-serif",
    userSelect: 'none',
  }}>
    {name.charAt(0).toUpperCase()}
  </div>
);

// ─── Timestamp ────────────────────────────────────────────────────────────────
const fmtTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const now  = new Date();
  const diff = now - date;
  if (diff < 60000)     return 'Just now';
  if (diff < 3600000)   return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000)  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const fmtMsgTime = (d) =>
  d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

// ─── Main component ───────────────────────────────────────────────────────────
const MiniChatPanel = ({ onUnread }) => {
  const { user }   = useAuth();
  const { socket } = useSocket();

  const [requests,    setRequests]    = useState([]);
  const [activeConv,  setActiveConv]  = useState(null);
  const [messages,    setMessages]    = useState([]);
  const [msgText,     setMsgText]     = useState('');
  const [sending,     setSending]     = useState(false);
  const [loadingConv, setLoadingConv] = useState(false);
  const [unreadMap,   setUnreadMap]   = useState({});  // { reqId: count }
  const [previewMap,  setPreviewMap]  = useState({});  // { reqId: { text, time } }

  const chatEndRef    = useRef(null);
  const inputRef      = useRef(null);
  // Refs to avoid stale closures in the socket handler
  const activeConvRef = useRef(null);
  const onUnreadRef   = useRef(onUnread);

  // Keep refs in sync with latest values
  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);
  useEffect(() => { onUnreadRef.current   = onUnread;   }, [onUnread]);

  // Fetch own requests (all chatable ones, not relying on parent's 5-item list)
  useEffect(() => {
    requestsAPI.getMy({ limit: 50 })
      .then(res => setRequests(res.data.data || []))
      .catch(() => {});
  }, []);

  // Only requests where chat is enabled (provider assigned and not pending/cancelled)
  const chatableReqs = requests.filter(r =>
    r.provider && !['pending', 'cancelled'].includes(r.status)
  );

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Socket: join all rooms + listen ─────────────────────────────────────────
  // Uses refs for activeConv/onUnread so this effect never needs to re-run
  // on conversation switches (no stale-closure listener gaps).
  useEffect(() => {
    if (!socket) return;
    chatableReqs.forEach(r => socket.emit('join_request', r._id));

    const handleMsg = (msg) => {
      const isFromMe = msg.sender?._id?.toString() === user?._id?.toString();
      const conv     = activeConvRef.current;

      // Update sidebar preview
      setPreviewMap(prev => ({
        ...prev,
        [msg.requestId]: { text: msg.content, time: msg.createdAt },
      }));

      if (conv?._id?.toString() === msg.requestId?.toString()) {
        if (isFromMe) {
          // Replace the optimistic temp message with the confirmed real one
          setMessages(prev => {
            const tempIdx = prev.findIndex(m => m._id?.toString().startsWith('temp_'));
            if (tempIdx === -1) return prev;
            const next = [...prev];
            next[tempIdx] = msg;
            return next;
          });
          return;
        }
        playNotificationSound();
        setMessages(prev => {
          const exists = prev.some(m => m._id?.toString() === msg._id?.toString());
          return exists ? prev : [...prev, msg];
        });
      } else if (!isFromMe) {
        playNotificationSound();
        setUnreadMap(prev => {
          const next = { ...prev, [msg.requestId]: (prev[msg.requestId] || 0) + 1 };
          if (onUnreadRef.current) {
            onUnreadRef.current(Object.values(next).reduce((a, b) => a + b, 0));
          }
          return next;
        });
      }
    };

    socket.on('new_message', handleMsg);
    return () => socket.off('new_message', handleMsg);
  }, [socket, chatableReqs.length, user?._id]);

  // Re-join rooms on reconnect
  useEffect(() => {
    if (!socket) return;
    const rejoin = () => chatableReqs.forEach(r => socket.emit('join_request', r._id));
    socket.on('connect', rejoin);
    return () => socket.off('connect', rejoin);
  }, [socket, chatableReqs.length]);

  // ── Open conversation ───────────────────────────────────────────────────────
  const openConversation = useCallback(async (req) => {
    // Update ref immediately so the socket handler sees the new conversation right away
    activeConvRef.current = req;
    setActiveConv(req);
    setMessages([]);
    setMsgText('');
    setLoadingConv(true);
    setUnreadMap(prev => { const n = { ...prev }; delete n[req._id]; return n; });
    // Explicitly join room in case it wasn't joined yet
    if (socket) socket.emit('join_request', req._id);
    try {
      const res = await requestsAPI.getById(req._id);
      const full = res.data.data;
      activeConvRef.current = full;
      setActiveConv(full);
      setMessages(full.messages || []);
      const last = full.messages?.[full.messages.length - 1];
      if (last) setPreviewMap(prev => ({
        ...prev, [req._id]: { text: last.content, time: last.createdAt },
      }));
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch { /* ignore */ } finally {
      setLoadingConv(false);
    }
  }, [socket]);

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!msgText.trim() || !activeConv || sending) return;
    const content = msgText.trim();
    setMsgText('');

    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      _id: tempId, content,
      createdAt: new Date().toISOString(),
      sender: { _id: user._id, firstName: user.firstName, lastName: user.lastName, role: user.role },
    };
    setMessages(prev => [...prev, optimistic]);
    setPreviewMap(prev => ({
      ...prev, [activeConv._id]: { text: content, time: optimistic.createdAt },
    }));

    setSending(true);
    try {
      await requestsAPI.sendMessage(activeConv._id, content);
    } catch {
      setMessages(prev => prev.filter(m => m._id !== tempId));
      setMsgText(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const otherName = (req) => {
    if (!req) return '';
    if (user?.role === 'provider') {
      const c = req.customer;
      return c ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : 'Customer';
    }
    const p = req.provider;
    return p ? `${p.firstName || ''} ${p.lastName || ''}`.trim() : 'Provider';
  };

  const totalUnread = Object.values(unreadMap).reduce((a, b) => a + b, 0);

  return (
    <div style={{
      display: 'flex', width: '620px', height: '480px',
      background: '#fff', borderRadius: '14px', overflow: 'hidden',
      fontFamily: "'Outfit', sans-serif", border: '1px solid #e8ecf0',
    }}>

      {/* ══ LEFT SIDEBAR ════════════════════════════════════════════════════ */}
      <div style={{
        width: '220px', flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid #eef0f3', background: '#f8fafc',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid #eef0f3',
          background: '#1a3c5e',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '15px', fontWeight: '800', color: '#fff' }}>💬 Messages</span>
            {totalUnread > 0 && (
              <span style={{ background: '#e74c3c', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: '800' }}>
                {totalUnread}
              </span>
            )}
          </div>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {chatableReqs.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: '#aab4bf', fontSize: '12px' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>💬</div>
              No conversations yet
            </div>
          ) : (
            chatableReqs.map(req => {
              const isActive = activeConv?._id?.toString() === req._id?.toString();
              const unread   = unreadMap[req._id] || 0;
              const preview  = previewMap[req._id];
              const name     = otherName(req);
              return (
                <button
                  key={req._id}
                  onClick={() => openConversation(req)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 14px', border: 'none', cursor: 'pointer', textAlign: 'left',
                    background: isActive ? '#e8f0fb' : 'transparent',
                    borderLeft: isActive ? '3px solid #1a3c5e' : '3px solid transparent',
                    fontFamily: "'Outfit', sans-serif",
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f0f4f8'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Avatar name={name} size={38} bg={isActive ? '#1a3c5e' : '#8a9bb0'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: unread ? '800' : '600', color: '#1a2e44', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>
                        {name}
                      </span>
                      {preview && (
                        <span style={{ fontSize: '10px', color: '#aab4bf', flexShrink: 0 }}>
                          {fmtTime(preview.time)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: unread ? '#1a3c5e' : '#8a9bb0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px', fontWeight: unread ? '600' : '400' }}>
                        {preview ? preview.text : req.title}
                      </span>
                      {unread > 0 && (
                        <span style={{ background: '#1a3c5e', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '10px', fontWeight: '800', flexShrink: 0 }}>
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ══ RIGHT CHAT AREA ══════════════════════════════════════════════════ */}
      {!activeConv ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#aab4bf', gap: '12px' }}>
          <span style={{ fontSize: '48px' }}>💬</span>
          <p style={{ fontSize: '14px', margin: 0, fontWeight: '500' }}>Select a conversation</p>
          <p style={{ fontSize: '12px', margin: 0, color: '#c0cdd8' }}>Choose from your active jobs on the left</p>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Chat header */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid #eef0f3',
            display: 'flex', alignItems: 'center', gap: '10px',
            background: '#fff', flexShrink: 0,
          }}>
            <Avatar name={otherName(activeConv)} size={36} bg="#1a3c5e" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#1a2e44' }}>
                {otherName(activeConv)}
              </div>
              <div style={{ fontSize: '11px', color: '#8a9bb0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeConv.title}
              </div>
            </div>
            <span style={{
              padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '700',
              background: activeConv.status === 'completed' ? '#d4edda' : '#e8f0fb',
              color:      activeConv.status === 'completed' ? '#27ae60' : '#1a3c5e',
            }}>
              {activeConv.status?.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {/* Messages area */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px 14px',
            display: 'flex', flexDirection: 'column', gap: '6px',
            background: '#f5f7fa',
          }}>
            {loadingConv ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <div style={{ width: '24px', height: '24px', border: '3px solid #e8ecf0', borderTopColor: '#1a3c5e', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aab4bf', gap: '8px' }}>
                <span style={{ fontSize: '32px' }}>👋</span>
                <span style={{ fontSize: '13px' }}>No messages yet — say hello!</span>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMine  = msg.sender?._id?.toString() === user?._id?.toString();
                const isTemp  = msg._id?.toString().startsWith('temp_');
                const showAvatar = !isMine && (i === 0 || messages[i - 1]?.sender?._id?.toString() !== msg.sender?._id?.toString());
                return (
                  <div key={msg._id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', marginBottom: '2px' }}>
                    {/* Sender label on first of group */}
                    {showAvatar && (
                      <span style={{ fontSize: '10px', color: '#8a9bb0', marginBottom: '3px', marginLeft: '8px' }}>
                        {msg.sender?.firstName || 'User'}
                      </span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flexDirection: isMine ? 'row-reverse' : 'row' }}>
                      {/* Avatar — only for receiver, first of group */}
                      {!isMine && (
                        <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: showAvatar ? '#8a9bb0' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontWeight: '700', flexShrink: 0 }}>
                          {showAvatar ? (msg.sender?.firstName?.charAt(0) || '?') : ''}
                        </div>
                      )}
                      {/* Bubble */}
                      <div style={{
                        maxWidth: '72%', padding: '9px 13px',
                        borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background:   isMine ? '#1a3c5e' : '#fff',
                        color:        isMine ? '#fff' : '#1a2e44',
                        fontSize: '13px', lineHeight: 1.5,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                        border: isMine ? 'none' : '1px solid #e8ecf0',
                        opacity: isTemp ? 0.7 : 1,
                        wordBreak: 'break-word',
                      }}>
                        {msg.content}
                      </div>
                    </div>
                    {/* Timestamp */}
                    <span style={{ fontSize: '10px', color: '#aab4bf', marginTop: '2px', marginLeft: isMine ? 0 : '32px', marginRight: isMine ? '2px' : 0 }}>
                      {isTemp ? '⏳ Sending…' : fmtMsgTime(msg.createdAt)}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          {['completed', 'cancelled'].includes(activeConv.status) ? (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #eef0f3', background: '#f8fafc', textAlign: 'center', fontSize: '12px', color: '#8a9bb0' }}>
              This conversation is closed.
            </div>
          ) : (
            <div style={{
              padding: '10px 12px', borderTop: '1px solid #eef0f3',
              display: 'flex', gap: '8px', alignItems: 'flex-end',
              background: '#fff', flexShrink: 0,
            }}>
              <textarea
                ref={inputRef}
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message…"
                rows={1}
                style={{
                  flex: 1, padding: '10px 14px',
                  border: '1.5px solid #e0e5eb',
                  borderRadius: '22px', fontSize: '13px',
                  fontFamily: "'Outfit', sans-serif",
                  outline: 'none', resize: 'none',
                  background: '#f5f7fa', lineHeight: 1.4,
                  maxHeight: '80px', overflowY: 'auto',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#1a3c5e'}
                onBlur={e  => e.target.style.borderColor = '#e0e5eb'}
              />
              <button
                onClick={handleSend}
                disabled={sending || !msgText.trim()}
                style={{
                  width: '40px', height: '40px', borderRadius: '50%', border: 'none', flexShrink: 0,
                  background: sending || !msgText.trim() ? '#dde3eb' : '#1a3c5e',
                  color: '#fff', cursor: sending || !msgText.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', transition: 'background 0.15s',
                }}
              >
                {sending ? (
                  <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default MiniChatPanel;
