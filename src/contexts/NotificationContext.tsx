import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../firebase/config';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { AppNotification } from '../types';
import { DataService } from '../lib/dataService';
import toast from 'react-hot-toast';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  permission: NotificationPermission;
  requestPermission: () => Promise<boolean>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  permission: 'default',
  requestPermission: async () => false,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

export const useNotifications = () => useContext(NotificationContext);

// Generates a beautiful premium synthetic notification chime
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 (pleasant high note)
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);  // A5 (harmonious third)
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (err) {
    console.warn("Audio chime play warning:", err);
  }
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile } = useAuth();
  const [allRawNotifications, setAllRawNotifications] = useState<AppNotification[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' ? Notification.permission : 'default'
  );
  
  const isFirstLoad = useRef(true);
  const sessionStartTime = useRef(Date.now());

  // Request browser Notification permissions
  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('المتصفح لا يدعم إشعارات النظام.');
      return false;
    }

    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        toast.success('تم تفعيل إشعارات الهاتف والويب بنجاح! 🔔');
        // Play welcome chime
        playNotificationSound();
        new Notification('مديرية تاوريرت للرياضة المدرسية', {
          body: 'تم تفعيل الإشعارات بنجاح. ستتلقى تحديثات مباريات تخصصك هنا.',
          icon: '/favicon.ico',
        });
        return true;
      } else {
        toast.error('تم رفض صلاحية الإشعارات.');
        return false;
      }
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return false;
    }
  };

  // 1. Subscribe to Firestore real-time notifications
  useEffect(() => {
    if (!userProfile) {
      setAllRawNotifications([]);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Set up Firestore snapshot listener
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: AppNotification[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          // Map Firebase timestamp to ISO or Date string
          let createdAtStr = new Date().toISOString();
          if (data.createdAt) {
            if (typeof data.createdAt.toDate === 'function') {
              createdAtStr = data.createdAt.toDate().toISOString();
            } else if (data.createdAt.seconds) {
              createdAtStr = new Date(data.createdAt.seconds * 1000).toISOString();
            } else {
              createdAtStr = new Date(data.createdAt).toISOString();
            }
          }
          fetched.push({
            id: doc.id,
            title: data.title || '',
            body: data.body || '',
            sportId: data.sportId,
            role: data.role,
            userIds: data.userIds || [],
            createdAt: createdAtStr,
            readBy: data.readBy || [],
          });
        });

        setAllRawNotifications(fetched);
      },
      (error) => {
        console.warn('Real-time notifications Firestore error, loading fallback local storage:', error);
        // Fallback to local storage
        DataService.getNotifications().then((localData) => {
          setAllRawNotifications(localData);
        });
      }
    );

    return () => unsubscribe();
  }, [userProfile]);

  // 2. Filter notifications based on logged-in user profile & specialty
  useEffect(() => {
    if (!userProfile) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const userId = userProfile.id;
    const userRole = userProfile.role;
    const specialties = userProfile.refereeSpecialty || [];
    const techSports = userProfile.techCommitteeSports || [];
    const techSportsMemberOf = userProfile.techCommitteeSportsMemberOf || [];

    // Filter logic based on the user's profile
    const filtered = allRawNotifications.filter((notif) => {
      // Admins see everything
      if (userRole === 'CENTRAL_ADMIN') return true;

      // Specifically targeted notifications
      if (Array.isArray(notif.userIds) && notif.userIds.includes(userId)) return true;

      // Filter by Role
      if (notif.role && notif.role !== 'ALL' && notif.role !== userRole) {
        // Special exceptions (e.g. if targeted to REFEREE, and user is referee or teacher with specialty)
        if (notif.role === 'REFEREE' && userRole === 'TEACHER' && specialties.length > 0) {
          // allow
        } else {
          return false;
        }
      }

      // Filter by Sport Specialty (التخصص الرياضي)
      if (notif.sportId) {
        // Referee: check if sport is in referee specialties
        if (userRole === 'REFEREE') {
          return specialties.includes(notif.sportId);
        }

        // Teacher / Coach:
        if (userRole === 'TEACHER') {
          // If they are Tech Committee Head of that sport
          if (userProfile.isTechCommitteeHead && techSports.includes(notif.sportId)) {
            return true;
          }
          // If they are Tech Committee Member of that sport
          if (userProfile.isTechCommitteeMember && techSportsMemberOf.includes(notif.sportId)) {
            return true;
          }
          // Otherwise, teachers can see general announcements & updates for their selected sport,
          // or if they registered teams in that sport
          return true; // Or we can restrict to true to keep it open
        }

        // Sport Manager: check if sportId matches
        if (userRole === 'SPORT_MANAGER') {
          return userProfile.sportId === notif.sportId;
        }
      }

      return true;
    });

    // Check if a brand-new notification arrived for browser push
    if (!isFirstLoad.current && filtered.length > 0) {
      const prevIds = notifications.map((n) => n.id);
      const newlyArrived = filtered.filter((n) => !prevIds.includes(n.id));

      if (newlyArrived.length > 0) {
        const absoluteNewest = newlyArrived[0];
        const timeDiffMs = Date.now() - new Date(absoluteNewest.createdAt).getTime();

        // Ensure we only notify for events occurring right now (within 30 seconds),
        // preventing mass notification bursts on page loading or stream reconnects
        if (timeDiffMs < 30000) {
          playNotificationSound();
          toast(absoluteNewest.title, {
            icon: '🔔',
            duration: 5000,
          });

          if (Notification.permission === 'granted') {
            new Notification(absoluteNewest.title, {
              body: absoluteNewest.body,
              icon: '/favicon.ico',
            });
          }
        }
      }
    }

    setNotifications(filtered);
    
    // Count unread (not included in readBy array)
    const unread = filtered.filter((n) => !n.readBy?.includes(userId)).length;
    setUnreadCount(unread);

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
    }
  }, [allRawNotifications, userProfile]);

  const markAsRead = async (id: string) => {
    if (!userProfile) return;
    await DataService.markNotificationAsRead(id, userProfile.id);
    
    // Update local state instantly
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          const currentReadBy = n.readBy || [];
          if (!currentReadBy.includes(userProfile.id)) {
            return { ...n, readBy: [...currentReadBy, userProfile.id] };
          }
        }
        return n;
      })
    );
  };

  const markAllAsRead = async () => {
    if (!userProfile) return;
    const unreadNotifs = notifications.filter((n) => !n.readBy?.includes(userProfile.id));
    
    // Perform sequentially or concurrently
    await Promise.all(unreadNotifs.map((n) => DataService.markNotificationAsRead(n.id, userProfile.id)));

    // Update local state instantly
    setNotifications((prev) =>
      prev.map((n) => {
        const currentReadBy = n.readBy || [];
        if (!currentReadBy.includes(userProfile.id)) {
          return { ...n, readBy: [...currentReadBy, userProfile.id] };
        }
        return n;
      })
    );
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        permission,
        requestPermission,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
