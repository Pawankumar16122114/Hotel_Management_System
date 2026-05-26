import React from 'react';
import { 
  Building2, 
  CreditCard, 
  Wrench, 
  CalendarDays, 
  Clock, 
  LogOut, 
  ShieldAlert, 
  Users, 
  FileCheck2,
  BarChart3,
  Bot,
  Mail,
  X
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ user, activeTab, setActiveTab, onLogout, isOpen = false, onClose }: SidebarProps) {
  const isStudent = user.role === 'student';
  const isAdminOrWarden = user.role === 'admin' || user.role === 'warden';

  const studentMenuItems = [
    { id: 'rooms', name: 'Rooms & Booking', icon: Building2 },
    { id: 'payments', name: 'Payments History', icon: CreditCard },
    { id: 'complaints', name: 'Housekeeping & Maintenance', icon: Wrench },
    { id: 'leaves', name: 'Leave Requests', icon: CalendarDays },
    { id: 'attendance', name: 'Curfew & Attendance', icon: Clock },
    { id: 'ai-concierge', name: 'AI Smart Concierge', icon: Bot },
    { id: 'gmail', name: 'Gmail Communications', icon: Mail },
  ];

  const adminMenuItems = [
    { id: 'analytics', name: 'Occupancy Analytics', icon: BarChart3 },
    { id: 'room-mgmt', name: 'Room Management', icon: Building2 },
    { id: 'student-directory', name: 'Student Directory', icon: Users },
    { id: 'complaints-mgmt', name: 'Complaints Register', icon: Wrench },
    { id: 'leaves-mgmt', name: 'Leave Authorizations', icon: FileCheck2 },
    { id: 'attendance-mgmt', name: 'Curfew Logbook', icon: Clock },
    { id: 'gmail', name: 'Gmail Communications', icon: Mail },
  ];

  const activeMenu = isStudent ? studentMenuItems : adminMenuItems;

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="lg:hidden fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-40 transition-opacity duration-200"
        />
      )}

      <div className={`bg-slate-900 text-slate-100 flex flex-col justify-between h-screen transition-transform duration-300 ease-in-out
        fixed inset-y-0 left-0 z-50 w-80 shadow-2xl
        lg:sticky lg:top-0 lg:left-auto lg:z-auto lg:translate-x-0 lg:shadow-xl lg:border-r lg:border-slate-800 lg:shrink-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6">
          {/* Brand Header */}
          <div className="flex items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/30">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-display font-medium text-lg leading-tight tracking-tight">Hostel Hub</h1>
                <p className="text-xs text-indigo-400 font-mono tracking-widest font-semibold uppercase">Smart Control</p>
              </div>
            </div>
            
            {/* Close button inside mobile menu */}
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-850 rounded-xl transition cursor-pointer"
                title="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* User Card */}
          <div className="flex items-center gap-3 p-4 bg-slate-800/80 rounded-2xl mb-8 border border-slate-700/50">
            <img 
              src={user.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}`} 
              alt="User avatar" 
              className="w-11 h-11 rounded-xl bg-slate-700"
            />
            <div className="overflow-hidden">
              <h2 className="font-medium text-sm text-slate-200 truncate">{user.name}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`px-2 py-0.5 text-[10px] font-mono tracking-wide font-semibold uppercase rounded-full ${
                  user.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                  user.role === 'warden' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {user.role}
                </span>
                <span className="text-[10px] font-mono text-slate-400">{user.studentId || 'Staff'}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="space-y-1">
            {activeMenu.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`sidebar-tab-${item.id}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (onClose) onClose();
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-150 text-left text-sm cursor-pointer ${
                    isSelected 
                      ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/10' 
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer controls */}
        <div className="p-6 border-t border-slate-800/60 bg-slate-950/20">
          <button
            onClick={() => {
              onLogout();
              if (onClose) onClose();
            }}
            id="btn-logout"
            className="w-full flex items-center justify-between px-4 py-3 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-200 text-sm cursor-pointer"
          >
            <span className="font-medium">Sign Out</span>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}
