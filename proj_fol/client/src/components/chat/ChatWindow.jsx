import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';

const ChatWindow = ({ matchId, matchStatus }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { fetchHistory(); }, [matchId]);

  useEffect(() => {
    if (!socket) return;
    socket.on('receive_message', (msg) => {
      setMessages(prev => [...prev, msg]);
      scrollToBottom();
    });
    socket.on('message_deleted', ({ message_id }) => {
      setMessages(prev => prev.filter(m => m.id !== message_id));
    });
    return () => {
      socket.off('receive_message');
      socket.off('message_deleted');
    };
  }, [socket]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/chat/${matchId}`);
      setMessages(data.data);
    } catch {}
    finally { setLoading(false); }
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await api.post(`/chat/${matchId}`, { content: input.trim() });
      setInput('');
    } catch {}
    finally { setSending(false); }
  };

  const handleDelete = async (messageId) => {
    try {
      await api.delete(`/chat/${matchId}/${messageId}`);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch {}
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit',
    });
  };

  const isCancelled = matchStatus === 'cancelled';

  return (
    <div className="card overflow-hidden flex flex-col h-96">
      {/* Header */}
      <div className="bg-primary-600 px-4 py-3 flex items-center gap-2">
        <span className="text-white text-lg">💬</span>
        <h3 className="font-bold text-white text-sm">Match Chat</h3>
        <span className="ml-auto text-primary-200 text-xs">
          {messages.length} messages
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-6 w-6 border-4 border-primary-100
              border-t-primary-600 rounded-full" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full
            text-center">
            <div className="text-3xl mb-2">💬</div>
            <p className="text-gray-400 text-sm">No messages yet</p>
            <p className="text-gray-300 text-xs mt-1">
              Be the first to say something!
            </p>
          </div>
        ) : (
          messages.map(msg => {
            const isOwn = msg.sender_id === user?.id;
            return (
              <div key={msg.id}
                className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                {!isOwn && (
                  <div className="w-7 h-7 rounded-full bg-primary-100 flex
                    items-center justify-center text-primary-700 font-bold
                    text-xs flex-shrink-0 mt-1">
                    {msg.sender_name?.charAt(0)}
                  </div>
                )}

                <div className={`max-w-xs group relative
                  ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isOwn && (
                    <span className="text-xs text-gray-400 mb-0.5 ml-1">
                      {msg.sender_name}
                    </span>
                  )}
                  <div className={`px-3 py-2 rounded-2xl text-sm
                    relative
                    ${isOwn
                      ? 'bg-primary-600 text-white rounded-tr-sm'
                      : 'bg-white text-gray-900 shadow-sm rounded-tl-sm'}`}>
                    {msg.content}
                    {/* Delete button for own messages */}
                    {isOwn && (
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="absolute -top-1 -left-6 hidden
                          group-hover:flex w-5 h-5 bg-red-100 hover:bg-red-200
                          rounded-full items-center justify-center
                          text-red-500 text-xs transition-all">
                        ✕
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 mt-0.5 mx-1">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3 bg-white">
        {isCancelled ? (
          <p className="text-center text-xs text-gray-400 py-1">
            Chat is disabled for cancelled matches
          </p>
        ) : !user ? (
          <p className="text-center text-xs text-gray-400 py-1">
            Login to send messages
          </p>
        ) : (
          <div className="flex gap-2">
            <input type="text" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Enter to send)"
              className="flex-1 px-3 py-2 text-sm rounded-xl border
                border-gray-200 focus:outline-none focus:ring-2
                focus:ring-primary-500 focus:border-transparent"
              maxLength={500} />
            <button onClick={handleSend}
              disabled={!input.trim() || sending}
              className="w-9 h-9 bg-primary-600 hover:bg-primary-700
                disabled:opacity-40 text-white rounded-xl flex items-center
                justify-center transition-colors flex-shrink-0">
              {sending ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"
                  fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10"
                    stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0
                    0v-8" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default ChatWindow;