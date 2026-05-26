import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { 
  Bell, 
  MessageSquare, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  X,
  Volume2,
  Menu
} from 'lucide-react';
import { User, Notification } from './types';
import Sidebar from './components/Sidebar';
import AuthPage from './pages/AuthPage';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AIConcierge from './components/AIConcierge';

export default function App() {
  // Session states
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('rooms');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Socket client point
  const [socket, setSocket] = useState<any>(null);

  // In-app Notification lists
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Custom Toast Banner state
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'err' | 'info' } | null>(null);

  useEffect(() => {
    // 1. Session restoration
    const savedUser = localStorage.getItem('hostel_user');
    const savedToken = localStorage.getItem('hostel_token');
    
    if (savedUser && savedToken) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setToken(savedToken);
      // Setup active tab depending on role
      setActiveTab(parsedUser.role === 'student' ? 'rooms' : 'analytics');
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    // 2. Configure real-time updates over socket
    const socketUrl = window.location.origin;
    const socketClient = io(socketUrl);
    setSocket(socketClient);

    socketClient.emit('join', user?.id || 'public');

    // Subscribe to live notification alerts
    socketClient.on('notification', (newNotif: Notification) => {
      if (newNotif.userId === 'all' || newNotif.userId === user?.id) {
        setNotifications(prev => [newNotif, ...prev]);
        triggerToast(newNotif.title, 'info');
      }
    });

    fetchNotifications();

    return () => {
      socketClient.disconnect();
    };
  }, [token]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch (err) {
      console.error('Error fetching notifications logs', err);
    }
  };

  const triggerToast = (msg: string, type: 'success' | 'err' | 'info') => {
    setToast({ msg, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleAuthSuccess = (authUser: User, accessToken: string) => {
    setUser(authUser);
    setToken(accessToken);
    localStorage.setItem('hostel_user', JSON.stringify(authUser));
    localStorage.setItem('hostel_token', accessToken);
    
    setActiveTab(authUser.role === 'student' ? 'rooms' : 'analytics');
    triggerToast(`Welcome back, ${authUser.name}! Sync completed.`, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('hostel_user');
    localStorage.removeItem('hostel_token');
    setUser(null);
    setToken(null);
    setActiveTab('rooms');
    triggerToast('Sign out successfully. Safe travels!', 'info');
  };

  const markNotificationsRead = async () => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error('Error clearing notifications', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.readBy.includes(user?.id || '')).length;

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans text-xs sm:text-sm antialiased select-none bg-slate-50 text-slate-800">
      
      {/* Toast notifications portal */}
      {toast && (
        <div className="fixed top-6 right-6 z-55 max-w-sm w-full bg-white text-slate-800 border rounded-3xl p-4 shadow-2xl flex items-start gap-3 animate-fade-in animate-bounce-subtle">
          {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
          {toast.type === 'err' && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />}
          
          <div className="flex-1 text-left">
            <h5 className="font-display font-bold text-xs uppercase text-slate-400 font-mono tracking-wider">Hub Monitor Alert</h5>
            <p className="text-xs text-slate-700 leading-normal font-semibold mt-1">{toast.msg}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-350 hover:text-slate-500 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Auth Screen or Main Roster Console layout */}
      {!user || !token ? (
        <AuthPage onAuthSuccess={handleAuthSuccess} />
      ) : (
        <React.Fragment>
          {/* Main workspace frame */}
          <div className="flex h-full w-full overflow-hidden">
            
            {/* Sidebar navigation */}
            <Sidebar 
              user={user} 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              onLogout={handleLogout} 
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
            />

            {/* Content pane */}
            <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-50">
              
              {/* Header navbar alerts controller */}
              <header className="h-16 px-6 lg:px-10 border-b border-slate-200/50 bg-white flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-3">
                  {/* Mobile responsive sidebar hamburger toggle */}
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-xl transition-all cursor-pointer"
                    title="Open sidebar directory"
                  >
                    <Menu className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                    <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 hidden sm:inline">Hub Server: SECURE TUNNEL ONLINE</span>
                    <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 inline sm:hidden">ONLINE</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 relative">
                  
                  {/* Notifications bell */}
                  <button 
                    onClick={() => {
                      setShowNotificationsDropdown(!showNotificationsDropdown);
                      if (!showNotificationsDropdown && unreadCount > 0) {
                        markNotificationsRead();
                      }
                    }}
                    id="btn-alerts-toggle"
                    className="p-2 text-slate-450 hover:text-slate-900 rounded-xl hover:bg-slate-50 relative cursor-pointer"
                  >
                    <Bell className="w-5 h-5 text-slate-650" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[8px] font-mono font-bold animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown menus */}
                  {showNotificationsDropdown && (
                    <div className="absolute right-0 top-11 z-50 bg-white border border-slate-200 shadow-2xl w-80 rounded-2xl p-4 space-y-3.5 text-left animate-fade-in text-xs font-semibold">
                      <div className="flex justify-between items-center border-b pb-2">
                        <h4 className="font-display font-bold text-slate-950 uppercase text-[10px] tracking-wider">In-App Announcements</h4>
                        <button 
                          onClick={() => setShowNotificationsDropdown(false)}
                          className="text-slate-400 text-[10px] hover:text-slate-600"
                        >
                          Close
                        </button>
                      </div>

                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {notifications.map((n) => (
                          <div key={n.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex gap-2">
                            <span className="p-1 text-slate-400 shrink-0 mt-0.5">🚀</span>
                            <div className="text-left select-text">
                              <h5 className="font-bold text-slate-800">{n.title}</h5>
                              <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">{n.message}</p>
                              <div className="text-[8px] text-slate-400 font-mono mt-1">{new Date(n.createdAt).toLocaleTimeString()}</div>
                            </div>
                          </div>
                        ))}
                        {notifications.length === 0 && (
                          <p className="text-center text-slate-400 py-4 font-normal">Announcements folder is empty.</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 border">
                      <img src={user.avatar} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 hidden sm:inline">{user.name}</span>
                  </div>
                </div>
              </header>

              {/* Dynamic screen loaders */}
              {user.role === 'student' ? (
                <StudentDashboard
                  user={user}
                  token={token}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  showToast={triggerToast}
                  onRefreshGlobalNotifs={fetchNotifications}
                />
              ) : (
                <AdminDashboard
                  user={user}
                  token={token}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  showToast={triggerToast}
                  onRefreshGlobalNotifs={fetchNotifications}
                />
              )}

              {/* AI floating counselor widget */}
              <AIConcierge />

            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}
