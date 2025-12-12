
import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Clock, Coffee, CalendarOff, Users, LogOut, ChevronRight, UserPlus, ShieldCheck, UserCircle, Crown, ClipboardList, Menu, X } from 'lucide-react';
import { Button } from './ui/Button';
import { clsx } from 'clsx';

export const Layout: React.FC = () => {
  const { currentUser, setCurrentUser } = useStore();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Redirect to login if no user is found
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/');
  };

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
      
      {/* Mobile/Tablet Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
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
          {/* Close Button Mobile/Tablet */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* User Profile Card - Simplified */}
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
                onClick={() => setIsSidebarOpen(false)} // Close menu on click
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

      {/* Main Content with subtle theme hue background */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
          
          {/* Mobile/Tablet Header */}
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
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm border shadow-sm
                    ${isAdmin ? 'bg-purple-100 text-purple-700 border-purple-200' : isManager ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {currentUser.avatarUrl ? <img src={currentUser.avatarUrl} className="w-full h-full object-cover rounded-full" alt="User" /> : currentUser.name.charAt(0)}
              </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth relative z-0">
             {/* Subtle background decorations for internal pages too */}
             <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none z-0"></div>
             
             <div className="max-w-6xl mx-auto relative z-10 pb-20 md:pb-0">
               <Outlet />
             </div>
          </main>
      </div>
    </div>
  );
};
