import React, { useContext, useEffect, useState } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import API from '../utils/api';

const NotificationBell = () => {
  const { token, user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    if (!token || !user) return;
    try {
      const response = await API.get('/notifications/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data.data?.notifications || []);
    } catch (error) {
      console.error('Unable to load notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [token, user?._id]);

  const unread = notifications.filter((item) => !item.read).length;

  const markRead = async (id) => {
    await API.patch(`/notifications/${id}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
    fetchNotifications();
  };

  const deleteNotification = async (id) => {
    await API.delete(`/notifications/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    fetchNotifications();
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-lg p-2 text-gray-300 transition hover:bg-white/5 hover:text-bakery-red"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-bakery-red px-1 text-[10px] font-black text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-lg border border-red-900 bg-zinc-950 shadow-2xl shadow-black/60">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <p className="font-bold text-white">Notifications</p>
            <span className="text-xs text-gray-400">{unread} unread</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">No notifications yet.</p>
            ) : notifications.slice(0, 12).map((notification) => (
              <div key={notification._id} className={`border-b border-zinc-900 p-3 ${notification.read ? 'bg-zinc-950' : 'bg-red-950/30'}`}>
                <p className="text-sm font-bold text-white">{notification.title}</p>
                <p className="mt-1 text-xs leading-5 text-gray-300">{notification.message}</p>
                <div className="mt-2 flex gap-2">
                  {!notification.read && (
                    <button onClick={() => markRead(notification._id)} className="inline-flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs text-gray-200 hover:bg-zinc-700">
                      <Check size={12} /> Read
                    </button>
                  )}
                  <button onClick={() => deleteNotification(notification._id)} className="inline-flex items-center gap-1 rounded bg-zinc-900 px-2 py-1 text-xs text-red-200 hover:bg-red-950">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
