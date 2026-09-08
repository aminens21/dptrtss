import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../firebase/config';
import { signOut } from 'firebase/auth';
import {
  LayoutDashboard,
  Trophy,
  Users,
  CalendarDays,
  LogOut,
  Menu,
  X,
  MapPin,
  Bell,
  Plus,
  Shield,
  FileSpreadsheet,
  Megaphone,
  Check,
  GraduationCap,
  ShieldCheck,
  User as UserIcon,
  Edit3,
  Settings,
  ChevronDown
} from 'lucide-react';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';
import { TeacherProfileModal } from '../TeacherProfileModal';
import { DataService } from '../../lib/dataService';
import { useNotifications } from '../../contexts/NotificationContext';

export const AppLayout: React.FC = () => {
  const { userProfile, logout, isDemo, openProfileModal } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(location.pathname === '/sports-config');
  const [activeSeason, setActiveSeason] = useState('2026/2027');
  
  useEffect(() => {
    // Load active season initially
    DataService.getActiveSeason()
      .then(season => {
        if (season) setActiveSeason(season);
      })
      .catch(err => console.error("Error fetching active season inside AppLayout:", err));

    // Listen to custom 'seasonChanged' event
    const handleSeasonChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setActiveSeason(customEvent.detail);
      }
    };

    window.addEventListener('seasonChanged', handleSeasonChange);
    return () => window.removeEventListener('seasonChanged', handleSeasonChange);
  }, []);

  useEffect(() => {
    if (location.pathname === '/sports-config') {
      setIsSettingsOpen(true);
    }
  }, [location.pathname]);

  const { notifications, unreadCount, permission, requestPermission, markAsRead, markAllAsRead } = useNotifications();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const formatNotificationTime = (isoString?: string) => {
    if (!isoString) return 'الآن';
    try {
      const diff = Date.now() - new Date(isoString).getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return 'الآن';
      if (minutes < 60) return `منذ ${minutes} دقيقة`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `منذ ${hours} ساعة`;
      const days = Math.floor(hours / 24);
      return `منذ ${days} يوم`;
    } catch {
      return 'الآن';
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success('تم تسجيل الخروج بنجاح');
    } catch (error) {
      toast.error('خطأ في تسجيل الخروج');
    }
  };

  const isTeacher = userProfile?.role === 'TEACHER';
  const isCentralAdmin = userProfile?.role === 'CENTRAL_ADMIN';
  const isTechCommitteeHead = userProfile?.isTechCommitteeHead === true;

  const navItems = isCentralAdmin
    ? [
        { name: 'الرئيسية', href: '/dashboard', icon: LayoutDashboard },
        { name: 'البطولات الإقليمية', href: '/tournaments', icon: Trophy },
        { name: 'المؤسسات والفرق', href: '/schools', icon: Users },
        { name: 'المباريات والنتائج', href: '/matches', icon: CalendarDays },
        { name: 'رؤساء اللجن التقنية', href: '/tech-committee', icon: ShieldCheck },
        { name: 'الحكام', href: '/referees', icon: ShieldCheck },
        { name: 'هيئة التدريس', href: '/teachers', icon: GraduationCap },
        { name: 'مراكز التباري', href: '/venues', icon: MapPin },
      ]
    : isTeacher && isTechCommitteeHead
    ? [
        { name: 'فرق المؤسسة وتسجيل التلاميذ', href: '/teacher-teams', icon: Users },
        { name: 'رؤساء اللجن التقنية', href: '/tech-committee', icon: ShieldCheck },
        { name: 'البطولات الإقليمية', href: '/tournaments', icon: Trophy },
        { name: 'المباريات والنتائج', href: '/matches', icon: CalendarDays },
        { name: 'لائحة الحكام', href: '/referees', icon: ShieldCheck },
        { name: 'المؤسسات المشاركة', href: '/schools', icon: Users },
        { name: 'مراكز التباري', href: '/venues', icon: MapPin },
      ]
    : isTeacher
    ? [
        { name: 'فرق المؤسسة وتسجيل التلاميذ', href: '/teacher-teams', icon: Users },
        { name: 'المقابلات والنتائج', href: '/matches', icon: CalendarDays },
        { name: 'البطولات الإقليمية', href: '/tournaments', icon: Trophy },
        { name: 'المؤسسات المشاركة', href: '/schools', icon: Users },
        { name: 'مراكز التباري', href: '/venues', icon: MapPin },
      ]
    : [
        { name: 'الرئيسية', href: '/dashboard', icon: LayoutDashboard },
        { name: 'البطولات الإقليمية', href: '/tournaments', icon: Trophy },
        { name: 'المباريات والنتائج', href: '/matches', icon: CalendarDays },
        { name: 'لائحة الحكام', href: '/referees', icon: ShieldCheck },
        { name: 'المؤسسات والفرق', href: '/schools', icon: Users },
        { name: 'مراكز التباري', href: '/venues', icon: MapPin },
      ];

  // Role display helper
  const getRoleLabel = (user?: any) => {
    if (!user) return 'مستخدم';
    if (user.isTechCommitteeHead) {
      return 'رئيس لجنة تقنية';
    }
    switch (user.role) {
      case 'CENTRAL_ADMIN':
        return 'المسير المركزي';
      case 'SPORT_MANAGER':
        return 'مسؤول نشاط رياضي';
      case 'TEACHER':
        return 'أستاذ تربية بدنية (EPS)';
      case 'REFEREE':
        return 'حكم معتمد';
      default:
        return 'مستخدم';
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-[#1e293b]" dir="rtl">
      {/* Sidebar for Desktop - High Density Dark Navy */}
      <aside className="hidden w-64 bg-[#0f172a] text-white md:flex md:flex-col border-l border-slate-700/80 shadow-lg select-none">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-700/80 bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-xl font-black text-white shadow-sm ring-2 ring-blue-400/30">
              ط
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight text-white">مديرية تاوريرت</h1>
              <p className="text-[11px] text-slate-400 font-medium">الرياضة المدرسية</p>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-semibold transition-all',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          ))}

          {isCentralAdmin && (
            <div className="space-y-1 pt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer'
                )}
              >
                <div className="flex items-center gap-3">
                  <Settings className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  <span>الإعدادات</span>
                </div>
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200 text-slate-400", isSettingsOpen ? "rotate-180" : "")} />
              </button>
              {isSettingsOpen && (
                <div className="mr-3 pr-2 border-r border-slate-700/80 space-y-1 mt-1 transition-all">
                  <NavLink
                    to="/sports-config"
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-md text-[11px] font-semibold transition-all block',
                        isActive
                          ? 'bg-blue-600/20 text-blue-400 font-bold border-r-2 border-blue-500 rounded-r-none'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      )
                    }
                  >
                    <span>ضبط فئات التخصصات الرياضية</span>
                  </NavLink>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-700/80 bg-slate-900/70">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={openProfileModal}
              title="تعديل البيانات الشخصية"
              className="flex items-center gap-2.5 min-w-0 text-right hover:opacity-90 cursor-pointer group flex-1"
            >
              <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-slate-200 group-hover:border-blue-400 group-hover:text-blue-300 transition-colors shrink-0">
                {userProfile?.fullName?.[0] || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-200 truncate group-hover:text-blue-300 transition-colors flex items-center gap-1">
                  <span>{userProfile?.fullName || 'المسير المركزي'}</span>
                  <Edit3 className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 text-blue-400 transition-opacity" />
                </p>
                <p className="text-[10px] text-slate-400 truncate">{getRoleLabel(userProfile)}</p>
              </div>
            </button>
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer shrink-0 mr-1"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main App Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header - High Density Crisp Style */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 text-slate-500 hover:text-slate-800 md:hidden rounded-md hover:bg-slate-100"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <h2 className="text-sm md:text-base font-bold text-slate-800">
              {isTeacher ? 'فضاء الأستاذ - المقابلات والنتائج' : 'لوحة التحكم المركزية'}
            </h2>
            <span className="hidden sm:inline-flex px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold">
              الموسم {activeSeason}
            </span>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {/* User Profile Button */}
            <button
              type="button"
              onClick={openProfileModal}
              className="flex items-center gap-2 py-1.5 px-2.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors cursor-pointer border border-slate-200"
              title="تعديل البيانات الشخصية"
            >
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center text-xs font-bold shrink-0">
                {userProfile?.fullName?.[0] || 'U'}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                  {userProfile?.fullName || 'المستخدم'}
                </p>
                <p className="text-[9px] text-blue-600 font-semibold leading-none">الملف الشخصي</p>
              </div>
              <Edit3 className="h-3 w-3 text-slate-400 hidden sm:block" />
            </button>

            {/* Notification Bell with Badge */}
            <div className="relative" ref={notificationsRef}>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-bold">
                  {unreadCount}
                </span>
              )}
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={cn(
                  "p-1.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer",
                  isNotificationsOpen ? "bg-slate-100 text-slate-800" : "hover:bg-slate-100"
                )}
              >
                <Bell className="h-5 w-5" />
              </button>
              
              {/* Notifications Dropdown */}
              {isNotificationsOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
                  <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-sm font-bold text-slate-800">الإشعارات</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="h-3 w-3" />
                        تحديد الكل كمقروء
                      </button>
                    )}
                  </div>

                  {/* Web Push Prompt inside dropdown */}
                  {permission !== 'granted' && (
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex flex-col gap-1.5 text-right">
                      <p className="text-[10px] font-bold text-slate-700">تلقي مواعيد وتحديثات مباريات تخصصك فوراً؟</p>
                      <button
                        onClick={requestPermission}
                        className="w-full bg-blue-600 text-white text-[10px] font-bold py-1.5 px-2 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Bell className="h-3.5 w-3.5 shrink-0" />
                        تفعيل إشعارات الهاتف والويب
                      </button>
                    </div>
                  )}

                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {notifications.map((notification) => {
                          const isUnread = !notification.readBy?.includes(userProfile?.id || '');
                          return (
                            <div 
                              key={notification.id} 
                              className={cn(
                                "p-3 transition-colors hover:bg-slate-50 cursor-pointer text-right",
                                isUnread ? "bg-blue-50/30" : ""
                              )}
                              onClick={() => {
                                if (isUnread) {
                                  markAsRead(notification.id);
                                }
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "mt-1.5 w-2 h-2 rounded-full shrink-0",
                                  isUnread ? "bg-blue-500" : "bg-transparent"
                                )} />
                                <div className="flex-1 min-w-0">
                                  <p className={cn(
                                    "text-xs leading-relaxed font-bold",
                                    isUnread ? "text-slate-900 font-extrabold" : "text-slate-500 font-semibold"
                                  )}>
                                    {notification.title}
                                  </p>
                                  <p className="text-[11px] text-slate-600 mt-0.5 leading-normal">
                                    {notification.body}
                                  </p>
                                  <p className="text-[9px] text-slate-400 mt-1 font-medium">
                                    {formatNotificationTime(notification.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-400 text-xs font-medium">
                        لا توجد إشعارات حالياً
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            {/* Quick Action Button - Central Admin, Tech Head vs Sport Manager */}
            {(isCentralAdmin || isTechCommitteeHead) && (
              <button
                onClick={() => navigate('/tournaments')}
                className="bg-blue-600 text-white px-3 py-1.5 md:px-3.5 md:py-2 rounded-md text-xs font-bold flex items-center gap-1.5 hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>بطولة جديدة</span>
              </button>
            )}
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden" dir="rtl">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className="relative flex w-64 flex-1 flex-col bg-[#0f172a] text-white">
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-sm font-bold">ط</div>
                  <span className="text-xs font-bold">مديرية تاوريرت</span>
                </div>
                <button
                  className="text-slate-400 hover:text-white p-1"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-semibold',
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </NavLink>
                ))}

                {isCentralAdmin && (
                  <div className="space-y-1 pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="h-4 w-4 flex-shrink-0 text-slate-400" />
                        <span>الإعدادات</span>
                      </div>
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200 text-slate-400", isSettingsOpen ? "rotate-180" : "")} />
                    </button>
                    {isSettingsOpen && (
                      <div className="mr-3 pr-2 border-r border-slate-700/80 space-y-1 mt-1 transition-all">
                        <NavLink
                          to="/sports-config"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center gap-2.5 px-3 py-2 rounded-md text-[11px] font-semibold transition-all block',
                              isActive
                                ? 'bg-blue-600/20 text-blue-400 font-bold border-r-2 border-blue-500 rounded-r-none'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                            )
                          }
                        >
                          <span>ضبط فئات التخصصات الرياضية</span>
                        </NavLink>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-700 bg-slate-900/50 space-y-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openProfileModal();
                  }}
                  className="flex w-full items-center gap-2 text-xs font-semibold text-blue-300 hover:text-blue-200"
                >
                  <UserIcon className="h-4 w-4" />
                  <span>تعديل البيانات الشخصية</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 text-xs font-semibold text-red-400 hover:text-red-300"
                >
                  <LogOut className="h-4 w-4" />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <TeacherProfileModal />
    </div>
  );
};

