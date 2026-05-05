import { useState, useEffect, useRef } from 'react';
import { Bell, X, Trash2, Package } from 'lucide-react';
import { notificationService } from '../utils/db';
import { useAuthContext } from './Providers';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate, useLocation } from 'react-router';

export const NotificationBell = () => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const data = await notificationService.getAll(user.id);
      // Limit to latest 15
      setNotifications(data.slice(0, 15));
      
      // Calculate unread count based on last seen timestamp in localStorage
      const lastSeen = localStorage.getItem(`last_notif_seen_${user.id}`);
      const lastSeenDate = lastSeen ? new Date(lastSeen) : new Date(0);
      
      const newNotifs = data.filter(n => new Date(n.created_at) > lastSeenDate);
      setUnreadCount(newNotifs.length);
    };

    fetchNotifications();

    const subscription = notificationService.subscribe(user.id, () => {
      fetchNotifications();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  // Auto-close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.search]);

  // Click outside detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = async () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    
    if (nextOpen && user) {
      // Mark as seen locally to clear the red dot
      localStorage.setItem(`last_notif_seen_${user.id}`, new Date().toISOString());
      setUnreadCount(0);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (notif.order_id) {
      navigate(`/order-tracking/${notif.order_id}`);
    } else if (notif.product_id) {
      navigate(`/product/${notif.product_id}`);
    }
    setIsOpen(false);
    
    // Optional: Auto-dismiss on click? 
    // The user said "Clicking notification -> mark as read"
    await notificationService.markAsRead(notif.id);
    setNotifications(prev => prev.filter(n => n.id !== notif.id));
  };

  const handleDismiss = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await notificationService.dismiss(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAll = async () => {
    if (!user) return;
    await notificationService.clearAll(user.id);
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="p-2 text-gray-500 hover:text-purple-600 transition-colors relative group"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center space-x-2">
              <h3 className="font-black text-gray-900 text-sm uppercase tracking-widest">Inbox</h3>
              {notifications.length > 0 && (
                <span className="text-[10px] font-black text-gray-400">({notifications.length})</span>
              )}
            </div>
            {notifications.length > 0 && (
              <button 
                onClick={handleClearAll}
                className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-600 transition-colors flex items-center space-x-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-gray-200" />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Everything is quiet</p>
                <p className="text-[10px] text-gray-300 mt-2 font-medium">Updates about your orders will appear here</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className="p-5 border-b border-gray-50 hover:bg-gray-50 transition-all cursor-pointer relative group/item"
                >
                  <button
                    onClick={(e) => handleDismiss(e, notif.id)}
                    className="absolute top-4 right-4 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="flex items-start space-x-4">
                    <div className="mt-1 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-purple-100 text-purple-600">
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm leading-snug mb-2 text-gray-900 font-bold">
                        {notif.message}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest">
                          ID: {notif.order_id?.slice(-8) || 'System'}
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">
                          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
            <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
              End of notifications
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
