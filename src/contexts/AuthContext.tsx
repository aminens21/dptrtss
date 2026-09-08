import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { User, Role } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  isDemo: boolean;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  openProfileModal: () => void;
  closeProfileModal: () => void;
  loginAsDemo: (role: Role, name?: string, email?: string, sportId?: string, assignedTournamentId?: string, extraFields?: Partial<User>) => void;
  logout: () => Promise<void>;
  updateProfileState: (updatedFields: Partial<User>) => void;
}

export const CENTRAL_ADMIN_EMAIL = 'printomrdesigne@gmail.com';

const DEMO_PROFILES: Record<Role, { name: string; email: string; sportId?: string; workLocation?: string; leaseNumber?: string }> = {
  CENTRAL_ADMIN: {
    name: 'المسير المركزي - تاوريرت',
    email: CENTRAL_ADMIN_EMAIL,
  },
  SPORT_MANAGER: {
    name: 'ذ. مصطفى الغازي (مسؤول كرة السلة)',
    email: 'ghazi.basket@taourirt.ma',
    sportId: 'basketball',
  },
  TEACHER: {
    name: 'أستاذ التربية البدنية (ثانوية الفتح)',
    email: 'prof.eps@taourirt-sports.ma',
    workLocation: 'ثانوية الفتح التأهيلية',
    leaseNumber: '1234567',
  },
  REFEREE: {
    name: 'الحكم المعتمد (محمد العلوي)',
    email: 'referee@taourirt-sports.ma',
  },
};

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  isDemo: false,
  isProfileModalOpen: false,
  setIsProfileModalOpen: () => {},
  openProfileModal: () => {},
  closeProfileModal: () => {},
  loginAsDemo: () => {},
  logout: async () => {},
  updateProfileState: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const openProfileModal = () => setIsProfileModalOpen(true);
  const closeProfileModal = () => setIsProfileModalOpen(false);

  // Check demo session on load
  useEffect(() => {
    const savedDemo = localStorage.getItem('demo_user_profile');
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo) as User;
        setUserProfile(parsed);
        setIsDemo(true);
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('demo_user_profile');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setIsDemo(false);
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const isCentralAdminEmail = (user.email || '').toLowerCase() === CENTRAL_ADMIN_EMAIL.toLowerCase();

          if (userDoc.exists()) {
            const data = userDoc.data() as User;
            // Guard: If document has CENTRAL_ADMIN but email does not match, downgrade
            const verifiedRole = (data.role === 'CENTRAL_ADMIN' && !isCentralAdminEmail)
              ? 'SPORT_MANAGER'
              : isCentralAdminEmail
              ? 'CENTRAL_ADMIN'
              : data.role;

            setUserProfile({
              id: userDoc.id,
              ...data,
              role: verifiedRole,
            });
          } else {
            // Check if there is a pre-registered manager account in Firestore
            const cleanUserEmail = (user.email || '').toLowerCase();
            const managerDocId = `mgr_${cleanUserEmail.replace(/[^a-z0-9]/g, '_')}`;
            let detectedRole: Role = isCentralAdminEmail ? 'CENTRAL_ADMIN' : 'TEACHER';
            let detectedName = user.displayName || (isCentralAdminEmail ? 'المسير المركزي - تاوريرت' : user.email?.split('@')[0] || 'مستخدم');
            let detectedSportId: string | undefined = undefined;
            let detectedTournamentId: string | undefined = undefined;

            try {
              const mgrDoc = await getDoc(doc(db, 'users', managerDocId));
              if (mgrDoc.exists()) {
                const mgrData = mgrDoc.data();
                detectedRole = 'SPORT_MANAGER';
                if (mgrData.fullName) detectedName = mgrData.fullName;
                if (mgrData.sportId) detectedSportId = mgrData.sportId;
                if (mgrData.assignedTournamentId) detectedTournamentId = mgrData.assignedTournamentId;
              }
            } catch (mgrErr) {
              console.warn("Manager lookup warning:", mgrErr);
            }

            // Profile fallback
            setUserProfile({
              id: user.uid,
              fullName: detectedName,
              email: user.email || (isCentralAdminEmail ? CENTRAL_ADMIN_EMAIL : 'user@taourirt-sports.ma'),
              role: detectedRole,
              sportId: detectedSportId,
              assignedTournamentId: detectedTournamentId,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          const isCentralAdminEmail = (user.email || '').toLowerCase() === CENTRAL_ADMIN_EMAIL.toLowerCase();
          setUserProfile({
            id: user.uid,
            fullName: isCentralAdminEmail ? 'المسير المركزي - تاوريرت' : (user.email || 'مستخدم'),
            email: user.email || CENTRAL_ADMIN_EMAIL,
            role: isCentralAdminEmail ? 'CENTRAL_ADMIN' : 'TEACHER',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } else {
        if (!localStorage.getItem('demo_user_profile')) {
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginAsDemo = (role: Role, customName?: string, customEmail?: string, sportId?: string, assignedTournamentId?: string, extraFields?: Partial<User>) => {
    const defaultInfo = DEMO_PROFILES[role] || DEMO_PROFILES.CENTRAL_ADMIN;
    const demoProfile: User = {
      id: `demo-${role.toLowerCase()}`,
      fullName: customName || defaultInfo.name,
      email: customEmail || defaultInfo.email,
      role: role,
      sportId: sportId || defaultInfo.sportId,
      assignedTournamentId: assignedTournamentId,
      workLocation: defaultInfo.workLocation,
      leaseNumber: defaultInfo.leaseNumber,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...extraFields
    };

    localStorage.setItem('demo_user_profile', JSON.stringify(demoProfile));
    setUserProfile(demoProfile);
    setIsDemo(true);
    setCurrentUser({
      uid: demoProfile.id,
      email: demoProfile.email,
      displayName: demoProfile.fullName,
      emailVerified: true,
      isAnonymous: false,
    } as any);
  };

  const logout = async () => {
    localStorage.removeItem('demo_user_profile');
    setUserProfile(null);
    setIsDemo(false);
    setCurrentUser(null);
    try {
      await auth.signOut();
    } catch (e) {
      console.warn("Auth signout:", e);
    }
  };

  const updateProfileState = (updatedFields: Partial<User>) => {
    setUserProfile(prev => {
      if (!prev) return null;
      return { ...prev, ...updatedFields };
    });
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser: isDemo ? ({ uid: userProfile?.id, email: userProfile?.email } as any) : currentUser, 
      userProfile, 
      loading, 
      isDemo, 
      isProfileModalOpen,
      setIsProfileModalOpen,
      openProfileModal,
      closeProfileModal,
      loginAsDemo, 
      logout, 
      updateProfileState 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
