import { Tournament, Match, School, Venue, User, Referee, Student, Sport, AppNotification } from '../types';
import { INITIAL_TOURNAMENTS, INITIAL_MATCHES, INITIAL_SCHOOLS, INITIAL_VENUES } from './initialData';
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, doc, updateDoc, setDoc, deleteDoc, Timestamp, serverTimestamp } from 'firebase/firestore';

const STORAGE_KEYS = {
  TOURNAMENTS: 'taourirt_tournaments_data',
  MATCHES: 'taourirt_matches_data',
  SCHOOLS: 'taourirt_schools_data',
  VENUES: 'taourirt_venues_data',
};

// Local storage helpers
function getLocal<T>(key: string, fallback: T[]): T[] {
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, data: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Local storage error:", e);
  }
}

export const SPORTS_MAP: Record<string, { name: string; icon: string }> = {
  football: { name: 'كرة القدم', icon: '⚽' },
  futsal: { name: 'فوتسال (داخل القاعة)', icon: '⚽' },
  basketball: { name: 'كرة السلة', icon: '🏀' },
  handball: { name: 'كرة اليد', icon: '🤾' },
  volleyball: { name: 'الكرة الطائرة', icon: '🏐' },
  athletics: { name: 'ألعاب القوى', icon: '🏃' },
  table_tennis: { name: 'كرة الطاولة', icon: '🏓' },
  chess: { name: 'الشطرنج المدرسي', icon: '♟️' }
};

export const getAgeCategoriesForSeason = (season: string) => {
  const match = season.match(/(\d{4})/);
  const startYear = match ? parseInt(match[1], 10) : 2026;

  return [
    { 
      id: 'U12', 
      name: `البراعم (U12) - مواليد ${startYear - 11} وما بعد`, 
      shortName: 'البراعم (U12)', 
      years: Array.from({ length: 15 }, (_, i) => startYear - 11 + i)
    },
    { 
      id: 'U15', 
      name: `الصغار / الصغيرات (U15) - مواليد ${startYear - 14}/${startYear - 13}/${startYear - 12}`, 
      shortName: 'الصغار (U15)', 
      years: [startYear - 14, startYear - 13, startYear - 12] 
    },
    { 
      id: 'U18', 
      name: `الفتيان / الفتيات (U18) - مواليد ${startYear - 17}/${startYear - 16}/${startYear - 15}`, 
      shortName: 'الفتيان (U18)', 
      years: [startYear - 17, startYear - 16, startYear - 15] 
    },
    { 
      id: 'U20', 
      name: `فئة ${startYear - 17} وما بعد - مواليد ${startYear - 17}/${startYear - 16}/${startYear - 15}...`, 
      shortName: `${startYear - 17} ومابعد`, 
      years: Array.from({ length: 15 }, (_, i) => startYear - 17 + i)
    },
    { 
      id: 'OPEN', 
      name: 'فئة مفتوحة (جميع الفئات)', 
      shortName: 'فئة مفتوحة', 
      years: [] 
    }
  ];
};

export const AGE_CATEGORIES = getAgeCategoriesForSeason('2026/2027');

export const GENDER_MAP: Record<string, { name: string; icon: string; badgeClass: string }> = {
  Male: { name: 'ذكور', icon: '👦', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  Female: { name: 'إناث', icon: '👧', badgeClass: 'bg-pink-50 text-pink-700 border-pink-200' },
  Mixed: { name: 'مختلط', icon: '👥', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' }
};

export const DataService = {
  // TOURNAMENTS
  async getTournaments(): Promise<Tournament[]> {
    try {
      const snap = await getDocs(collection(db, 'tournaments'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Tournament));
      }
    } catch (e) {
      console.warn("Firestore fetch error, falling back to cached local storage:", e);
    }
    return getLocal<Tournament>(STORAGE_KEYS.TOURNAMENTS, INITIAL_TOURNAMENTS);
  },

  async addTournament(tournament: Omit<Tournament, 'id'>): Promise<Tournament> {
    const newTournament: Tournament = {
      ...tournament,
      id: `tourn-${Date.now()}`
    };

    // Always update local cache first for instant feedback
    const localList = getLocal<Tournament>(STORAGE_KEYS.TOURNAMENTS, INITIAL_TOURNAMENTS);
    const updated = [newTournament, ...localList];
    setLocal(STORAGE_KEYS.TOURNAMENTS, updated);

    // Sync to Firestore if online
    try {
      const docRef = await addDoc(collection(db, 'tournaments'), {
        ...tournament,
        createdAt: Timestamp.now()
      });
      newTournament.id = docRef.id;
    } catch (e) {
      console.warn("Saved locally; Firestore sync pending:", e);
    }

    return newTournament;
  },

  async deleteTournament(id: string): Promise<void> {
    const localList = getLocal<Tournament>(STORAGE_KEYS.TOURNAMENTS, INITIAL_TOURNAMENTS);
    const updated = localList.filter(t => t.id !== id);
    setLocal(STORAGE_KEYS.TOURNAMENTS, updated);

    try {
      await deleteDoc(doc(db, 'tournaments', id));
    } catch (e) {
      console.warn("Deleted locally:", e);
    }
  },

  async updateTournament(id: string, updates: Partial<Tournament>): Promise<void> {
    const localList = getLocal<Tournament>(STORAGE_KEYS.TOURNAMENTS, INITIAL_TOURNAMENTS);
    const targetTournament = localList.find(t => t.id === id);
    const targetSportId = updates.sportId || targetTournament?.sportId || 'basketball';

    const updated = localList.map(t => t.id === id ? { ...t, ...updates } : t);
    setLocal(STORAGE_KEYS.TOURNAMENTS, updated);

    // If manager email was provided, sync user account to Firebase and local accounts
    if (updates.managerEmail && updates.managerEmail.trim()) {
      const cleanEmail = updates.managerEmail.trim().toLowerCase();
      const sanitizedId = `mgr_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
      const accessCode = updates.accessCode || '123456';
      const managerName = updates.managerName?.trim() || 'مسؤول البطولة';

      // 1. Sync to local registry
      try {
        const localAccountsRaw = localStorage.getItem('local_registered_users');
        const accounts: Array<{ email: string; pass: string; name: string; role: string; accessCode?: string; assignedTournamentId?: string; sportId?: string }> = localAccountsRaw ? JSON.parse(localAccountsRaw) : [];
        const existingIdx = accounts.findIndex(a => a.email.toLowerCase() === cleanEmail);
        const newAccount = {
          email: cleanEmail,
          pass: accessCode,
          name: managerName,
          role: 'SPORT_MANAGER',
          accessCode,
          assignedTournamentId: id,
          sportId: targetSportId
        };
        if (existingIdx >= 0) {
          accounts[existingIdx] = { ...accounts[existingIdx], ...newAccount };
        } else {
          accounts.push(newAccount);
        }
        localStorage.setItem('local_registered_users', JSON.stringify(accounts));
      } catch (err) {
        console.warn("Local storage manager save error:", err);
      }

      // 2. Sync to Firebase Firestore 'users' collection
      try {
        await setDoc(doc(db, 'users', sanitizedId), {
          id: sanitizedId,
          email: cleanEmail,
          fullName: managerName,
          phone: updates.managerPhone?.trim() || null,
          role: 'SPORT_MANAGER',
          accessCode: accessCode,
          assignedTournamentId: id,
          sportId: targetSportId,
          isActive: true,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        }, { merge: true });
      } catch (fbErr) {
        console.warn("Firestore sync manager user document error:", fbErr);
      }
    }

    try {
      await updateDoc(doc(db, 'tournaments', id), {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (e) {
      console.warn("Updated locally:", e);
    }
  },

  // MATCHES
  async getMatches(): Promise<Match[]> {
    try {
      const snap = await getDocs(collection(db, 'matches'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Match));
      }
    } catch (e) {
      console.warn("Firestore fetch matches error, falling back to cache:", e);
    }
    return getLocal<Match>(STORAGE_KEYS.MATCHES, INITIAL_MATCHES);
  },

  async addMatch(match: Omit<Match, 'id'>): Promise<Match> {
    const newMatch: Match = {
      ...match,
      id: `mat-${Date.now()}`
    };
    const localList = getLocal<Match>(STORAGE_KEYS.MATCHES, INITIAL_MATCHES);
    const updated = [newMatch, ...localList];
    setLocal(STORAGE_KEYS.MATCHES, updated);

    try {
      const docRef = await addDoc(collection(db, 'matches'), {
        ...match,
        updatedAt: Timestamp.now()
      });
      newMatch.id = docRef.id;
    } catch (e) {
      console.warn("Match saved locally:", e);
    }

    // Trigger notification
    this.triggerMatchNotification('create', newMatch);

    return newMatch;
  },

  async updateMatch(matchId: string, matchData: Partial<Match>): Promise<void> {
    const localList = getLocal<Match>(STORAGE_KEYS.MATCHES, INITIAL_MATCHES);
    const updated = localList.map(m => m.id === matchId ? { ...m, ...matchData } : m);
    setLocal(STORAGE_KEYS.MATCHES, updated);

    try {
      // Remove id from matchData if it exists before updating Firestore
      const { id, ...dataToUpdate } = matchData as any;
      await updateDoc(doc(db, 'matches', matchId), {
        ...dataToUpdate,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Updated match locally:", e);
    }

    const fullMatch = updated.find(m => m.id === matchId);
    if (fullMatch) {
      this.triggerMatchNotification('update', fullMatch);
    }
  },

  async updateMatchScore(
    matchId: string,
    score1: number,
    score2: number,
    status: Match['status'],
    extras?: {
      penalty1?: number;
      penalty2?: number;
      winnerId?: string;
      notes?: string;
      scorers?: string;
      updatedBy?: string;
    }
  ): Promise<void> {
    const localList = getLocal<Match>(STORAGE_KEYS.MATCHES, INITIAL_MATCHES);
    const updated = localList.map(m => m.id === matchId ? {
      ...m,
      score1,
      score2,
      status,
      ...(extras || {})
    } : m);
    setLocal(STORAGE_KEYS.MATCHES, updated);

    try {
      await updateDoc(doc(db, 'matches', matchId), {
        score1,
        score2,
        status,
        ...(extras || {}),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Updated match score locally:", e);
    }

    const fullMatch = updated.find(m => m.id === matchId);
    if (fullMatch) {
      this.triggerMatchNotification('result', fullMatch);
    }
  },

  async deleteMatch(id: string): Promise<void> {
    const localList = getLocal<Match>(STORAGE_KEYS.MATCHES, INITIAL_MATCHES);
    const updated = localList.filter(m => m.id !== id);
    setLocal(STORAGE_KEYS.MATCHES, updated);

    try {
      await deleteDoc(doc(db, 'matches', id));
    } catch (e) {
      console.warn("Match deleted locally:", e);
    }
  },

  // SCHOOLS
  async getSchools(): Promise<School[]> {
    try {
      const snap = await getDocs(collection(db, 'schools'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as School));
      }
    } catch (e) {
      console.warn("Firestore schools fetch error:", e);
    }
    return getLocal<School>(STORAGE_KEYS.SCHOOLS, INITIAL_SCHOOLS);
  },

  async addSchool(school: Omit<School, 'id'>): Promise<School> {
    const newSchool: School = {
      ...school,
      id: `sch-${Date.now()}`
    };
    const localList = getLocal<School>(STORAGE_KEYS.SCHOOLS, INITIAL_SCHOOLS);
    const updated = [newSchool, ...localList];
    setLocal(STORAGE_KEYS.SCHOOLS, updated);

    try {
      const docRef = await addDoc(collection(db, 'schools'), {
        ...school,
        createdAt: Timestamp.now()
      });
      newSchool.id = docRef.id;
    } catch (e) {
      console.warn("Saved school locally:", e);
    }
    return newSchool;
  },

  async updateSchool(id: string, updates: Partial<School>): Promise<void> {
    const localList = getLocal<School>(STORAGE_KEYS.SCHOOLS, INITIAL_SCHOOLS);
    const updated = localList.map(s => s.id === id ? { ...s, ...updates } : s);
    setLocal(STORAGE_KEYS.SCHOOLS, updated);

    try {
      await updateDoc(doc(db, 'schools', id), {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (e) {
      console.warn("Updated school locally:", e);
    }
  },

  async deleteSchool(id: string): Promise<void> {
    const localList = getLocal<School>(STORAGE_KEYS.SCHOOLS, INITIAL_SCHOOLS);
    const updated = localList.filter(s => s.id !== id);
    setLocal(STORAGE_KEYS.SCHOOLS, updated);

    try {
      await deleteDoc(doc(db, 'schools', id));
    } catch (e) {
      console.warn("Deleted school locally:", e);
    }
  },

  // VENUES
  async getVenues(): Promise<Venue[]> {
    try {
      const snap = await getDocs(collection(db, 'venues'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Venue));
      }
    } catch (e) {
      console.warn("Firestore venues fetch error:", e);
    }
    return getLocal<Venue>(STORAGE_KEYS.VENUES, INITIAL_VENUES);
  },

  async addVenue(venue: Omit<Venue, 'id'>): Promise<Venue> {
    const newVenue: Venue = {
      ...venue,
      id: `ven-${Date.now()}`
    };
    const localList = getLocal<Venue>(STORAGE_KEYS.VENUES, INITIAL_VENUES);
    const updated = [newVenue, ...localList];
    setLocal(STORAGE_KEYS.VENUES, updated);

    try {
      const docRef = await addDoc(collection(db, 'venues'), {
        ...venue,
        createdAt: Timestamp.now()
      });
      newVenue.id = docRef.id;
    } catch (e) {
      console.warn("Saved venue locally:", e);
    }
    return newVenue;
  },

  async updateVenue(id: string, updates: Partial<Venue>): Promise<void> {
    const localList = getLocal<Venue>(STORAGE_KEYS.VENUES, INITIAL_VENUES);
    const updated = localList.map(v => v.id === id ? { ...v, ...updates } : v);
    setLocal(STORAGE_KEYS.VENUES, updated);

    try {
      await updateDoc(doc(db, 'venues', id), {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (e) {
      console.warn("Updated venue locally:", e);
    }
  },

  async deleteVenue(id: string): Promise<void> {
    const localList = getLocal<Venue>(STORAGE_KEYS.VENUES, INITIAL_VENUES);
    const updated = localList.filter(v => v.id !== id);
    setLocal(STORAGE_KEYS.VENUES, updated);

    try {
      await deleteDoc(doc(db, 'venues', id));
    } catch (e) {
      console.warn("Deleted venue locally:", e);
    }
  },

  // REFEREES
  async getReferees(): Promise<Referee[]> {
    let explicitReferees: Referee[] = [];
    try {
      const snap = await getDocs(collection(db, 'referees'));
      if (!snap.empty) {
        explicitReferees = snap.docs.map(d => ({ id: d.id, ...d.data() } as Referee));
      }
    } catch (e) {
      console.warn("Firestore fetch referees error, falling back to local:", e);
      explicitReferees = getLocal<Referee>('referees', []);
    }

    // Automatically fill referees from teachers who have referee data filled
    let teacherReferees: Referee[] = [];
    try {
      const teachers = await this.getTeachers();
      teacherReferees = teachers
        .filter(t => Array.isArray(t.refereeSpecialty) ? t.refereeSpecialty.length > 0 : !!t.refereeSpecialty)
        .map(t => ({
          id: t.id,
          fullName: t.fullName + ' (أستاذ)',
          phone: t.phone || 'غير محدد',
          specialty: t.refereeSpecialty,
          isActive: t.isActive,
          isTeacher: true
        }));
    } catch (e) {
      console.warn("Failed to extract teacher referees:", e);
    }

    return [...teacherReferees, ...explicitReferees];
  },

  async addReferee(referee: Omit<Referee, 'id'>): Promise<Referee> {
    const newRef: Referee = { ...referee, id: `ref-${Date.now()}` };
    const list = getLocal<Referee>('referees', []);
    setLocal('referees', [newRef, ...list]);

    try {
      const docRef = await addDoc(collection(db, 'referees'), {
        ...referee,
        createdAt: Timestamp.now()
      });
      newRef.id = docRef.id;
    } catch (e) {
      console.warn("Saved referee locally:", e);
    }
    return newRef;
  },

  async updateReferee(id: string, updates: Partial<Referee>): Promise<void> {
    const list = getLocal<Referee>('referees', []);
    setLocal('referees', list.map(r => r.id === id ? { ...r, ...updates } : r));
    try {
      await updateDoc(doc(db, 'referees', id), {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (e) {
      console.warn("Updated referee locally:", e);
    }
  },

  async deleteReferee(id: string): Promise<void> {
    const list = getLocal<Referee>('referees', []);
    setLocal('referees', list.filter(r => r.id !== id));
    try {
      await deleteDoc(doc(db, 'referees', id));
    } catch (e) {
      console.warn("Deleted referee locally:", e);
    }
  },

  // USERS / TEACHERS
  async getTeachers(): Promise<User[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        return snap.docs
          .map(d => ({ id: d.id, ...d.data() } as User))
          .filter(u => u.role === 'TEACHER');
      }
    } catch (e) {
      console.warn("Firestore fetch teachers error, falling back to cached list:", e);
    }
    // Fallback to local storage if offline or empty
    try {
      const localUsersRaw = localStorage.getItem('local_registered_users');
      if (localUsersRaw) {
        const users = JSON.parse(localUsersRaw) as User[];
        return users.filter(u => u.role === 'TEACHER');
      }
    } catch {}
    return [];
  },

  async updateUserProfile(userId: string, profileData: Partial<User>): Promise<void> {
    try {
      // Sync to Firestore
      await setDoc(doc(db, 'users', userId), {
        ...profileData,
        id: userId,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn("Firestore user profile update error:", e);
    }

    // Also sync to local storage/localStorage
    try {
      const savedDemo = localStorage.getItem('demo_user_profile');
      if (savedDemo) {
        const parsed = JSON.parse(savedDemo) as User;
        if (parsed.id === userId) {
          const updatedDemo = { ...parsed, ...profileData, updatedAt: new Date() };
          localStorage.setItem('demo_user_profile', JSON.stringify(updatedDemo));
        }
      }

      // Sync in local_registered_users list
      const localUsersRaw = localStorage.getItem('local_registered_users');
      let users = localUsersRaw ? JSON.parse(localUsersRaw) : [];
      const idx = users.findIndex((u: any) => u.id === userId || u.email === profileData.email);
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...profileData, id: userId, updatedAt: new Date() };
      } else {
        users.push({ ...profileData, id: userId, createdAt: new Date(), updatedAt: new Date() });
      }
      localStorage.setItem('local_registered_users', JSON.stringify(users));
    } catch (err) {
      console.warn("Local storage update profile error:", err);
    }
  },

  // ACTIVE SEASON CONFIGURATION
  async getSeasons(): Promise<string[]> {
    try {
      const snap = await getDocs(collection(db, 'config'));
      const seasonsDoc = snap.docs.find(d => d.id === 'seasons');
      if (seasonsDoc && seasonsDoc.data().list) {
        return seasonsDoc.data().list;
      }
    } catch (e) {
      console.warn("Error loading seasons list from Firestore:", e);
    }
    const local = localStorage.getItem('taourirt_sports_seasons_list');
    if (local) {
      try {
        return JSON.parse(local);
      } catch {}
    }
    return ['2025/2026', '2026/2027'];
  },

  async addSeason(season: string): Promise<void> {
    const current = await this.getSeasons();
    if (current.includes(season)) return;
    const newList = [...current, season].sort();
    localStorage.setItem('taourirt_sports_seasons_list', JSON.stringify(newList));
    try {
      await setDoc(doc(db, 'config', 'seasons'), {
        list: newList,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn("Error saving seasons list to Firestore:", e);
    }
  },

  async getActiveSeason(): Promise<string> {
    try {
      const snap = await getDocs(collection(db, 'config'));
      const seasonDoc = snap.docs.find(d => d.id === 'season');
      if (seasonDoc) {
        return seasonDoc.data().current || '2026/2027';
      }
    } catch (e) {
      console.warn("Error loading active season from Firestore:", e);
    }
    return localStorage.getItem('taourirt_sports_season') || '2026/2027';
  },

  async setActiveSeason(season: string): Promise<void> {
    localStorage.setItem('taourirt_sports_season', season);
    try {
      await setDoc(doc(db, 'config', 'season'), {
        current: season,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn("Error saving season to Firestore:", e);
    }
  },

  // SPORTS CONFIGURATION
  async getSportsConfig(): Promise<Sport[]> {
    try {
      const snap = await getDocs(collection(db, 'sports'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Sport));
      }
    } catch (e) {
      console.warn("Firestore fetch sports error, falling back to local cache:", e);
    }

    // Fallback/Initial Setup
    const localConfig = getLocal<Sport>('taourirt_sports_config', []);
    if (localConfig.length > 0) {
      return localConfig;
    }

    // Default configuration: all sports are associated with all categories by default
    const allCategoryIds = AGE_CATEGORIES.map(c => c.id);
    const defaults: Sport[] = Object.entries(SPORTS_MAP).map(([id, s]) => ({
      id,
      name: s.name,
      description: `منافسات ${s.name} الإقليمية`,
      ageCategories: allCategoryIds
    }));

    setLocal('taourirt_sports_config', defaults);
    return defaults;
  },

  async updateSportCategories(sportId: string, ageCategories: string[]): Promise<void> {
    const list = await this.getSportsConfig();
    const updated = list.map(s => s.id === sportId ? { ...s, ageCategories } : s);
    setLocal('taourirt_sports_config', updated);

    try {
      await setDoc(doc(db, 'sports', sportId), {
        ageCategories,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn("Updated sport categories locally, Firestore pending:", e);
    }
  },

  // STUDENTS / TEAM ROSTERS
  async getStudents(): Promise<Student[]> {
    try {
      const snap = await getDocs(collection(db, 'students'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
      }
    } catch (e) {
      console.warn("Firestore fetch students error, using local storage:", e);
    }
    return getLocal<Student>('taourirt_students_data', []);
  },

  async addStudent(student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> {
    const newStudent: Student = {
      ...student,
      id: `stud-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const localList = getLocal<Student>('taourirt_students_data', []);
    setLocal('taourirt_students_data', [newStudent, ...localList]);

    try {
      await setDoc(doc(db, 'students', newStudent.id), {
        ...student,
        id: newStudent.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Student saved locally; Firestore sync pending:", e);
    }

    return newStudent;
  },

  async deleteStudent(id: string): Promise<void> {
    const localList = getLocal<Student>('taourirt_students_data', []);
    setLocal('taourirt_students_data', localList.filter(s => s.id !== id));

    try {
      await deleteDoc(doc(db, 'students', id));
    } catch (e) {
      console.warn("Deleted student locally:", e);
    }
  },

  // NOTIFICATIONS SYSTEM
  async getNotifications(): Promise<AppNotification[]> {
    try {
      const snap = await getDocs(collection(db, 'notifications'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification));
      }
    } catch (e) {
      console.warn("Firestore fetch notifications error:", e);
    }
    return getLocal<AppNotification>('taourirt_notifications_data', []);
  },

  async addNotification(notification: Omit<AppNotification, 'id' | 'createdAt'>): Promise<AppNotification> {
    const newNotification: AppNotification = {
      ...notification,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    const localList = getLocal<AppNotification>('taourirt_notifications_data', []);
    setLocal('taourirt_notifications_data', [newNotification, ...localList]);

    try {
      await setDoc(doc(db, 'notifications', newNotification.id), {
        ...notification,
        id: newNotification.id,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Notification saved locally; Firestore sync pending:", e);
    }

    return newNotification;
  },

  async markNotificationAsRead(id: string, userId: string): Promise<void> {
    const localList = getLocal<AppNotification>('taourirt_notifications_data', []);
    const updated = localList.map(n => {
      if (n.id === id) {
        const readBy = n.readBy || [];
        if (!readBy.includes(userId)) {
          return { ...n, readBy: [...readBy, userId] };
        }
      }
      return n;
    });
    setLocal('taourirt_notifications_data', updated);

    try {
      const docRef = doc(db, 'notifications', id);
      const readByList = updated.find(n => n.id === id)?.readBy || [userId];
      await updateDoc(docRef, {
        readBy: readByList
      });
    } catch (e) {
      console.warn("Updated notification read state locally:", e);
    }
  },

  async triggerMatchNotification(type: 'create' | 'update' | 'result', match: Match) {
    try {
      const schools = await this.getSchools();
      const s1Name = schools.find(s => s.id === match.team1Id)?.name || 'الفريق الأول';
      const s2Name = schools.find(s => s.id === match.team2Id)?.name || 'الفريق الثاني';
      const sportName = SPORTS_MAP[match.sportId]?.name || 'التخصص الرياضي';
      
      let title = '';
      let body = '';
      
      if (type === 'create') {
        title = `🏆 برمجة مباراة جديدة: ${sportName}`;
        body = `تمت برمجة مباراة جديدة في ${sportName} بين ${s1Name} و ${s2Name} يوم ${match.date ? (typeof match.date === 'string' ? match.date : new Date(match.date.seconds * 1000).toLocaleDateString('ar-MA')) : ''} على الساعة ${match.startTime}.`;
      } else if (type === 'update') {
        title = `📅 تعديل مباراة: ${sportName}`;
        body = `تم تحديث تفاصيل أو موعد المباراة بين ${s1Name} و ${s2Name} في منافسات ${sportName}. الموعد الجديد: يوم ${match.date ? (typeof match.date === 'string' ? match.date : new Date(match.date.seconds * 1000).toLocaleDateString('ar-MA')) : ''} في تمام الساعة ${match.startTime}.`;
      } else if (type === 'result') {
        title = `⚽ نتيجة مباراة: ${sportName}`;
        const scoreText = match.score1 !== undefined && match.score2 !== undefined ? `(${match.score1} - ${match.score2})` : '';
        body = `تم تسجيل نتيجة المباراة في ${sportName} بين ${s1Name} و ${s2Name}: ${scoreText}. حالة المباراة: ${match.status === 'Completed' ? 'منتهية' : match.status}.`;
      }
      
      await this.addNotification({
        title,
        body,
        sportId: match.sportId,
        role: 'ALL',
        userIds: []
      });
    } catch (err) {
      console.error("Error triggering match notification:", err);
    }
  }
};
