
import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { subscribeToNotifications, markNotificationAsRead, clearNotifications } from '../services/firestore';
import { Clock, Coffee, CalendarOff, Users, LogOut, ChevronRight, UserPlus, ShieldCheck, UserCircle, Crown, ClipboardList, Menu, X, Bell, Trash2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Notification } from '../types';
import { clsx } from 'clsx';

interface NotificationListProps {
  notifications: Notification[];
  onClear: () => void;
  onRead: (notif: Notification) => void;
}

const NotificationList: React.FC<NotificationListProps> = ({ notifications, onClear, onRead }) => (
  <div className="absolute right-0 mt-2 w-80 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 z-[100] overflow-hidden animate-in fade-in zoom-in-95 origin-top-right ring-1 ring-black/5 top-full mr-0">
      <div className="p-3 border-b border-slate-100/50 flex justify-between items-center bg-slate-50/50">
          <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Notifications</h4>
          {notifications.length > 0 && (
              <button onClick={onClear} className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                  <Trash2 className="w-3 h-3"/> Clear All
              </button>
          )}
      </div>
      <div className="max-h-80 overflow-y-auto custom-scrollbar">
          {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                  <div className="bg-slate-50 p-3 rounded-full mb-2">
                      <Bell className="w-6 h-6 opacity-30" />
                  </div>
                  <p className="text-xs font-medium">No new notifications</p>
              </div>
          ) : (
              notifications.map(notif => (
                  <div 
                      key={notif.id} 
                      onClick={() => onRead(notif)}
                      className={`p-4 border-b border-slate-50/50 hover:bg-slate-50/80 transition-colors cursor-pointer flex gap-3 ${!notif.read ? 'bg-blue-50/30' : ''}`}
                  >
                      <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${!notif.read ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-transparent'}`}></div>
                      <div>
                          <p className={`text-sm leading-snug ${!notif.read ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{notif.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1.5 font-medium">{new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                      </div>
                  </div>
              ))
          )}
      </div>
  </div>
);

export const Layout: React.FC = () => {
  const { currentUser, setCurrentUser, notifications, setNotifications } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const mobileNotifRef = useRef<HTMLDivElement>(null);
  const desktopNotifRef = useRef<HTMLDivElement>(null);

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (currentUser) {
        const unsubscribe = subscribeToNotifications(currentUser.id, (data) => {
            setNotifications(data);
        });
        return () => unsubscribe();
    }
  }, [currentUser, setNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!target || !(target instanceof Node)) return;
      
      const isInsideMobile = mobileNotifRef.current?.contains(target);
      const isInsideDesktop = desktopNotifRef.current?.contains(target);

      if (!isInsideMobile && !isInsideDesktop) {
        setShowNotifications(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setTimeout(() => {
        setCurrentUser(null);
        navigate('/');
    }, 0);
  };

  const handleNotificationClick = async (notif: Notification) => {
      if (!notif.read) {
          await markNotificationAsRead(notif.id);
      }
      if (notif.link) {
          navigate(notif.link);
          setShowNotifications(false);
      }
  };

  const handleClearAllNotifications = async () => {
      if(currentUser) await clearNotifications(currentUser.id);
  };
  
  const getPageTitle = () => {
    switch(location.pathname) {
      case '/dashboard': return 'Dashboard';
      case '/tasks': return 'Task Board';
      case '/breaks': return 'Breaks & Rest';
      case '/leaves': return 'Leave Management';
      case '/team': return 'Team Overview';
      case '/employees': return 'People';
      case '/profile': return 'My Profile';
      default: return 'TeamTime';
    }
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;
  const isAdmin = currentUser.role === 'Admin';
  const isManager = currentUser.role === 'Manager';
  const canManage = isAdmin || isManager;
  
  const navItems = [
    { to: '/dashboard', icon: Clock, label: 'Dashboard' },
    { to: '/tasks', icon: ClipboardList, label: 'Task Board' },
    { to: '/breaks', icon: Coffee, label: 'Breaks & Rest' },
    { to: '/leaves', icon: CalendarOff, label: 'Leave Management' },
    { 
      to: '/team', 
      icon: canManage ? ShieldCheck : Users, 
      label: canManage ? 'Admin Panel' : 'Team Overview' 
    },
    ...(canManage ? [{ to: '/employees', icon: UserPlus, label: 'People' }] : []),
    { to: '/profile', icon: UserCircle, label: 'My Profile' },
  ];

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex font-sans text-slate-900">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside 
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white/80 backdrop-blur-md border-r border-slate-200 flex flex-col shadow-2xl lg:shadow-sm h-full transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Clock className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-extrabold text-slate-800 tracking-tight">TeamTime</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 pt-6 pb-2 relative z-50 flex-shrink-0">
          <div className="p-4 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-100 flex items-center gap-3 shadow-sm relative">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-inner border flex-shrink-0 overflow-hidden
                ${isAdmin ? 'bg-purple-100 text-purple-700 border-purple-200' : isManager ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {currentUser.avatarUrl ? <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : (
                isAdmin ? <Crown className="w-6 h-6"/> : isManager ? <ShieldCheck className="w-6 h-6"/> : currentUser.name.charAt(0)
              )}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold text-slate-900 truncate">{currentUser.name}</p>
              {currentUser.designation && <p className="text-xs text-primary font-semibold truncate">{currentUser.designation}</p>}
              <p className="text-[10px] text-slate-400 truncate font-bold uppercase tracking-wide mt-0.5">{currentUser.role}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-2 flex-1 overflow-y-auto relative z-0 custom-scrollbar">
          <nav className="space-y-2">
            <p className="px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Menu</p>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    "group flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "bg-primary/5 text-primary shadow-sm ring-1 ring-primary/20"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center space-x-3">
                      <item.icon className={clsx("h-5 w-5 transition-colors", isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600")} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="h-4 w-4 text-primary/50" />}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="p-6 border-t border-slate-100 flex-shrink-0">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors font-medium px-4 py-6" 
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
          <header className="lg:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
              <div className="flex items-center gap-3">
                  <button 
                      onClick={() => setIsSidebarOpen(true)}
                      className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                      <Menu className="h-6 w-6" />
                  </button>
                  <span className="font-extrabold text-lg text-slate-800 tracking-tight">TeamTime</span>
              </div>
              <div className="flex items-center gap-3">
                  <div className="relative" ref={mobileNotifRef}>
                      <button 
                          onClick={() => setShowNotifications(!showNotifications)}
                          className="h-9 w-9 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:text-primary transition-all relative"
                      >
                          <Bell className="w-5 h-5" />
                          {unreadCount > 0 && (
                              <span className="absolute top-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white animate-pulse"></span>
                          )}
                      </button>
                      {showNotifications && (
                          <div className="absolute top-full right-[-10px]">
                              <NotificationList notifications={notifications} onClear={handleClearAllNotifications} onRead={handleNotificationClick} />
                          </div>
                      )}
                  </div>

                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm border shadow-sm
                        ${isAdmin ? 'bg-purple-100 text-purple-700 border-purple-200' : isManager ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {currentUser.avatarUrl ? <img src={currentUser.avatarUrl} className="w-full h-full object-cover rounded-full" alt="User" /> : currentUser.name.charAt(0)}
                  </div>
              </div>
          </header>

          <header className="hidden lg:flex items-center justify-between px-8 py-5 bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-40 transition-all">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{getPageTitle()}</h2>
              
              <div className="flex items-center gap-6">
                  <div className="relative" ref={desktopNotifRef}>
                      <button 
                          onClick={() => setShowNotifications(!showNotifications)}
                          className="group flex items-center justify-center h-10 w-10 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30 transition-all shadow-sm active:scale-95"
                          title="Notifications"
                      >
                          <div className="relative">
                            <Bell className="w-5 h-5 transition-transform group-hover:rotate-12" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white animate-pulse"></span>
                            )}
                          </div>
                      </button>
                      
                      {showNotifications && (
                          <div className="absolute top-full right-0 pt-2">
                              <NotificationList notifications={notifications} onClear={handleClearAllNotifications} onRead={handleNotificationClick} />
                          </div>
                      )}
                  </div>

                  <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                      <div className="text-right hidden xl:block">
                          <p className="text-sm font-bold text-slate-800">{currentUser.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{currentUser.role}</p>
                      </div>
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm border shadow-sm cursor-pointer hover:ring-2 ring-offset-2 ring-primary/20 transition-all
                            ${isAdmin ? 'bg-purple-100 text-purple-700 border-purple-200' : isManager ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-100 text-slate-600 border-slate-200'}`}
                           onClick={() => navigate('/profile')}>
                          {currentUser.avatarUrl ? <img src={currentUser.avatarUrl} className="w-full h-full object-cover rounded-full" alt="User" /> : currentUser.name.charAt(0)}
                      </div>
                  </div>
              </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth relative">
             <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none z-0"></div>
             <div className="max-w-6xl mx-auto relative pb-20 md:pb-0 lg:pr-16">
               <Outlet />
             </div>
          </main>
      </div>
    </div>
  );
};
