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

// Helper to deduplicate any array of objects by id
export function deduplicateById<T extends { id?: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (!item) continue;
    const id = item.id;
    if (id) {
      if (!seen.has(id)) {
        seen.add(id);
        result.push(item);
      }
    } else {
      result.push(item);
    }
  }
  return result;
}

// Local storage helpers with automatic deduplication and self-healing
function getLocal<T extends { id?: string }>(key: string, fallback: T[]): T[] {
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      const cleanFallback = deduplicateById(fallback);
      localStorage.setItem(key, JSON.stringify(cleanFallback));
      return cleanFallback;
    }
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      const clean = deduplicateById<T>(parsed);
      // Auto-heal local storage if duplicates existed
      if (clean.length !== parsed.length) {
        localStorage.setItem(key, JSON.stringify(clean));
      }
      return clean;
    }
    return fallback;
  } catch {
    return deduplicateById(fallback);
  }
}

function setLocal<T extends { id?: string }>(key: string, data: T[]) {
  try {
    const clean = deduplicateById(data);
    localStorage.setItem(key, JSON.stringify(clean));
  } catch (e) {
    console.error("Local storage error:", e);
  }
}

export const BASE_SPORTS: Record<string, { name: string; icon: string }> = {
  football: { name: 'كرة القدم', icon: '⚽' },
  basketball_3x3: { name: 'كرة السلة 3 ضد 3', icon: '🏀' },
  basketball: { name: 'كرة السلة 5 ضد 5', icon: '🏀' },
  volleyball: { name: 'الكرة الطائرة', icon: '🏐' },
  cross_country: { name: 'العدو الريفي', icon: '🏃‍♂️' },
  athletics: { name: 'ألعاب القوى', icon: '🏃' },
  beach_volleyball: { name: 'الكرة الطائرة الشاطئية', icon: '🏖️' },
  mixed_volleyball: { name: 'الكرة الطائرة مختلطة', icon: '🏐' },
  handball: { name: 'كرة اليد', icon: '🤾' },
  beach_handball: { name: 'كرة اليد الشاطئية', icon: '🏖️' },
  badminton: { name: 'البادمنتون', icon: '🏸' },
  chess: { name: 'الشطرنج', icon: '♟️' },
  boxing: { name: 'الملاكمة', icon: '🥊' },
  judo: { name: 'الجيدو', icon: '🥋' },
  karate: { name: 'الكراطي', icon: '🥋' },
  rugby: { name: 'الركبي', icon: '🏉' },
  futsal: { name: 'فوتسال (داخل القاعة)', icon: '⚽' },
  table_tennis: { name: 'كرة الطاولة', icon: '🏓' }
};

export const SPORTS_MAP: Record<string, { name: string; icon: string }> = {
  ...BASE_SPORTS
};

// Immediately hydrate SPORTS_MAP from cached custom sports so synchronous accesses are complete
try {
  const cachedCustomSports = localStorage.getItem('taourirt_custom_sports');
  if (cachedCustomSports) {
    const parsed = JSON.parse(cachedCustomSports);
    if (Array.isArray(parsed)) {
      parsed.forEach((s: any) => {
        if (s && s.id && s.name) {
          SPORTS_MAP[s.id] = { name: s.name, icon: s.icon || '🏆' };
        }
      });
    }
  }
} catch {
  // Ignore in SSR/test environment
}

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
        const firestoreList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Tournament));
        return deduplicateById(firestoreList);
      }
    } catch (e) {
      console.warn("Firestore fetch error, falling back to cached local storage:", e);
    }
    const localList = getLocal<Tournament>(STORAGE_KEYS.TOURNAMENTS, INITIAL_TOURNAMENTS);
    return deduplicateById(localList);
  },

  async addTournament(tournament: Omit<Tournament, 'id'>): Promise<Tournament> {
    const tempId = `tourn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newTournament: Tournament = {
      ...tournament,
      id: tempId
    };

    // Always update local cache first for instant feedback
    const localList = getLocal<Tournament>(STORAGE_KEYS.TOURNAMENTS, INITIAL_TOURNAMENTS);
    const filtered = localList.filter(t => t.id !== tempId);
    const updated = [newTournament, ...filtered];
    setLocal(STORAGE_KEYS.TOURNAMENTS, updated);

    // Sync to Firestore if online
    try {
      const docRef = await addDoc(collection(db, 'tournaments'), {
        ...tournament,
        createdAt: Timestamp.now()
      });
      const realId = docRef.id;
      newTournament.id = realId;

      // Update local cache with the Firestore ID
      const currentList = getLocal<Tournament>(STORAGE_KEYS.TOURNAMENTS, INITIAL_TOURNAMENTS);
      const synced = currentList.map(t => t.id === tempId ? { ...t, id: realId } : t);
      setLocal(STORAGE_KEYS.TOURNAMENTS, synced);
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
        const firestoreList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Match));
        return deduplicateById(firestoreList);
      }
    } catch (e) {
      console.warn("Firestore fetch matches error, falling back to cache:", e);
    }
    const localList = getLocal<Match>(STORAGE_KEYS.MATCHES, INITIAL_MATCHES);
    return deduplicateById(localList);
  },

  async addMatch(match: Omit<Match, 'id'>): Promise<Match> {
    const tempId = `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newMatch: Match = {
      ...match,
      id: tempId
    };
    const localList = getLocal<Match>(STORAGE_KEYS.MATCHES, INITIAL_MATCHES);
    const filtered = localList.filter(m => m.id !== tempId);
    const updated = [newMatch, ...filtered];
    setLocal(STORAGE_KEYS.MATCHES, updated);

    try {
      const docRef = await addDoc(collection(db, 'matches'), {
        ...match,
        updatedAt: Timestamp.now()
      });
      const realId = docRef.id;
      newMatch.id = realId;

      const currentList = getLocal<Match>(STORAGE_KEYS.MATCHES, INITIAL_MATCHES);
      const synced = currentList.map(m => m.id === tempId ? { ...m, id: realId } : m);
      setLocal(STORAGE_KEYS.MATCHES, synced);
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
        const firestoreList = snap.docs.map(d => ({ id: d.id, ...d.data() } as School));
        return deduplicateById(firestoreList);
      }
    } catch (e) {
      console.warn("Firestore schools fetch error:", e);
    }
    const localList = getLocal<School>(STORAGE_KEYS.SCHOOLS, INITIAL_SCHOOLS);
    return deduplicateById(localList);
  },

  async addSchool(school: Omit<School, 'id'>): Promise<School> {
    const tempId = `sch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newSchool: School = {
      ...school,
      id: tempId
    };
    const localList = getLocal<School>(STORAGE_KEYS.SCHOOLS, INITIAL_SCHOOLS);
    const filtered = localList.filter(s => s.id !== tempId);
    const updated = [newSchool, ...filtered];
    setLocal(STORAGE_KEYS.SCHOOLS, updated);

    try {
      const docRef = await addDoc(collection(db, 'schools'), {
        ...school,
        createdAt: Timestamp.now()
      });
      const realId = docRef.id;
      newSchool.id = realId;

      const currentList = getLocal<School>(STORAGE_KEYS.SCHOOLS, INITIAL_SCHOOLS);
      const synced = currentList.map(s => s.id === tempId ? { ...s, id: realId } : s);
      setLocal(STORAGE_KEYS.SCHOOLS, synced);
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
        const firestoreList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Venue));
        return deduplicateById(firestoreList);
      }
    } catch (e) {
      console.warn("Firestore venues fetch error:", e);
    }
    const localList = getLocal<Venue>(STORAGE_KEYS.VENUES, INITIAL_VENUES);
    return deduplicateById(localList);
  },

  async addVenue(venue: Omit<Venue, 'id'>): Promise<Venue> {
    const tempId = `ven-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newVenue: Venue = {
      ...venue,
      id: tempId
    };
    const localList = getLocal<Venue>(STORAGE_KEYS.VENUES, INITIAL_VENUES);
    const filtered = localList.filter(v => v.id !== tempId);
    const updated = [newVenue, ...filtered];
    setLocal(STORAGE_KEYS.VENUES, updated);

    try {
      const docRef = await addDoc(collection(db, 'venues'), {
        ...venue,
        createdAt: Timestamp.now()
      });
      const realId = docRef.id;
      newVenue.id = realId;

      const currentList = getLocal<Venue>(STORAGE_KEYS.VENUES, INITIAL_VENUES);
      const synced = currentList.map(v => v.id === tempId ? { ...v, id: realId } : v);
      setLocal(STORAGE_KEYS.VENUES, synced);
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

    // Helper text normalizer for name matching
    const norm = (s?: string) => (s || '').replace(/[\s\-\_\.]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();

    // Fetch teachers/users to sync phone numbers and teacher referees
    let usersList: User[] = [];
    try {
      usersList = await this.getUsers();
    } catch (e) {
      console.warn("Failed to fetch users for referee merge:", e);
    }

    // Merge latest phone numbers into explicit referees if a user profile has a fresher phone
    explicitReferees = explicitReferees.map(r => {
      const matchedUser = usersList.find(u => 
        u.id === r.id || 
        (u.fullName && r.fullName && (norm(u.fullName) === norm(r.fullName) || norm(u.fullName).includes(norm(r.fullName)) || norm(r.fullName).includes(norm(u.fullName))))
      );
      if (matchedUser && matchedUser.phone && matchedUser.phone.trim()) {
        return {
          ...r,
          phone: matchedUser.phone.trim(),
          photoUrl: matchedUser.photoUrl || r.photoUrl
        };
      }
      return r;
    });

    // Automatically fill referees from teachers who have referee data filled
    const teacherReferees: Referee[] = usersList
      .filter(t => t.role === 'TEACHER' && (Array.isArray(t.refereeSpecialty) ? t.refereeSpecialty.length > 0 : !!t.refereeSpecialty))
      .map(t => ({
        id: t.id,
        fullName: t.fullName + ' (أستاذ)',
        phone: t.phone || 'غير محدد',
        specialty: Array.isArray(t.refereeSpecialty) ? t.refereeSpecialty : [t.refereeSpecialty || 'كرة القدم'],
        isActive: t.isActive !== false,
        isTeacher: true,
        photoUrl: t.photoUrl
      }));

    // Deduplicate by ID and normalized name
    const combined = [...explicitReferees, ...teacherReferees];
    const uniqueMap = new Map<string, Referee>();
    combined.forEach(r => {
      const key = norm(r.fullName.replace(/\s*\(أستاذ\)\s*/g, ''));
      if (!uniqueMap.has(key) || (r.phone && r.phone !== 'غير محدد' && !uniqueMap.get(key)?.phone)) {
        uniqueMap.set(key, r);
      }
    });

    return Array.from(uniqueMap.values());
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
    const norm = (s?: string) => (s || '').replace(/[\s\-\_\.]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
    
    const targetRef = list.find(r => r.id === id);
    const updated = list.map(r => r.id === id ? { ...r, ...updates } : r);
    setLocal('referees', updated);

    try {
      await updateDoc(doc(db, 'referees', id), {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (e) {
      console.warn("Updated referee locally:", e);
    }

    // Bidirectional sync: if this referee has a user profile (or matching name like عثماني خالد), update the user profile phone as well!
    if (updates.phone || updates.fullName) {
      try {
        const users = await this.getUsers();
        const refName = updates.fullName || targetRef?.fullName || '';
        const matchedUser = users.find(u => 
          u.id === id || 
          (refName && u.fullName && (norm(u.fullName) === norm(refName) || norm(u.fullName).includes(norm(refName)) || norm(refName).includes(norm(u.fullName))))
        );
        if (matchedUser) {
          await this.updateUserProfile(matchedUser.id, {
            ...(updates.phone ? { phone: updates.phone } : {}),
            ...(updates.fullName ? { fullName: updates.fullName } : {})
          });
        }
      } catch (err) {
        console.warn("Error syncing referee update to user profile:", err);
      }
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
  async getUsers(): Promise<User[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (!snap.empty) {
        const firestoreList = snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
        return deduplicateById(firestoreList);
      }
    } catch (e) {
      console.warn("Firestore fetch users error, falling back to cached list:", e);
    }
    try {
      const localUsersRaw = localStorage.getItem('local_registered_users');
      if (localUsersRaw) {
        const users = JSON.parse(localUsersRaw) as User[];
        return deduplicateById(users);
      }
    } catch {}
    return [];
  },

  async getTeachers(): Promise<User[]> {
    try {
      const allUsers = await this.getUsers();
      return allUsers.filter(u => u.role === 'TEACHER');
    } catch (e) {
      console.warn("Firestore fetch teachers error:", e);
      return [];
    }
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

      // Synchronize changes to Schools (teacherName & teacher phone)
      if (profileData.workLocation || profileData.fullName || profileData.phone) {
        const schoolsList = getLocal<School>(STORAGE_KEYS.SCHOOLS, INITIAL_SCHOOLS);
        let schoolChanged = false;
        const updatedSchools = schoolsList.map(sch => {
          const matchesWork = profileData.workLocation && (
            sch.name.trim().toLowerCase() === profileData.workLocation.trim().toLowerCase() ||
            sch.name.includes(profileData.workLocation) ||
            profileData.workLocation.includes(sch.name)
          );
          const matchesTeacherName = profileData.fullName && sch.teacherName && (
            sch.teacherName.trim().toLowerCase() === profileData.fullName.trim().toLowerCase()
          );

          if (matchesWork || matchesTeacherName) {
            schoolChanged = true;
            return {
              ...sch,
              ...(profileData.fullName ? { teacherName: profileData.fullName } : {}),
              ...(profileData.phone ? { phone: profileData.phone } : {})
            };
          }
          return sch;
        });

        if (schoolChanged) {
          setLocal(STORAGE_KEYS.SCHOOLS, updatedSchools);
          try {
            const matched = updatedSchools.filter(s => {
              const prev = schoolsList.find(ps => ps.id === s.id);
              return prev && (prev.phone !== s.phone || prev.teacherName !== s.teacherName);
            });
            for (const ms of matched) {
              await updateDoc(doc(db, 'schools', ms.id), {
                teacherName: ms.teacherName,
                phone: ms.phone,
                updatedAt: Timestamp.now()
              }).catch(() => {});
            }
          } catch (e) {
            console.warn("Error syncing teacher phone to schools Firestore:", e);
          }
        }
      }

      // Synchronize changes to Referees list (e.g. Othmani Khalid / عثماني خالد and all teacher referees)
      if (profileData.phone || profileData.fullName || profileData.refereeSpecialty) {
        const norm = (s?: string) => (s || '').replace(/[\s\-\_\.]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
        const refList = getLocal<Referee>('referees', []);
        let refChanged = false;
        const targetName = profileData.fullName;
        
        const updatedRefList = refList.map(r => {
          const matchId = r.id === userId;
          const matchName = targetName && r.fullName && (
            norm(r.fullName) === norm(targetName) ||
            norm(r.fullName).includes(norm(targetName)) ||
            norm(targetName).includes(norm(r.fullName))
          );

          if (matchId || matchName) {
            refChanged = true;
            return {
              ...r,
              ...(profileData.phone ? { phone: profileData.phone } : {}),
              ...(profileData.fullName ? { fullName: profileData.fullName } : {}),
              ...(profileData.refereeSpecialty ? { specialty: Array.isArray(profileData.refereeSpecialty) ? profileData.refereeSpecialty : [profileData.refereeSpecialty] } : {})
            };
          }
          return r;
        });

        if (refChanged) {
          setLocal('referees', updatedRefList);
          try {
            const matched = updatedRefList.filter(r => {
              const matchId = r.id === userId;
              const matchName = targetName && r.fullName && (norm(r.fullName) === norm(targetName) || norm(r.fullName).includes(norm(targetName)));
              return matchId || matchName;
            });
            for (const mr of matched) {
              await updateDoc(doc(db, 'referees', mr.id), {
                ...(profileData.phone ? { phone: profileData.phone } : {}),
                ...(profileData.fullName ? { fullName: profileData.fullName } : {}),
                updatedAt: Timestamp.now()
              }).catch(() => {});
            }
          } catch (e) {
            console.warn("Error syncing referee phone to Firestore:", e);
          }
        }
      }
    } catch (err) {
      console.warn("Local storage update profile error:", err);
    }
  },

  // Direct phone update for teacher, school principal, or referee
  async updateContactPhone(target: {
    type: 'teacher' | 'school' | 'principal' | 'referee';
    id?: string;
    schoolId?: string;
    schoolName?: string;
    name?: string;
    phone: string;
  }): Promise<void> {
    const cleanPhone = target.phone.trim();
    if (!cleanPhone) return;

    // 1. If it's a School or Principal
    if (target.type === 'principal' || target.type === 'school') {
      const schoolsList = getLocal<School>(STORAGE_KEYS.SCHOOLS, INITIAL_SCHOOLS);
      const targetSchool = schoolsList.find(s => 
        (target.schoolId && s.id === target.schoolId) ||
        (target.id && s.id === target.id) ||
        (target.schoolName && (s.name === target.schoolName || s.name.includes(target.schoolName)))
      );

      if (targetSchool) {
        const fieldToUpdate = target.type === 'principal' ? { principalPhone: cleanPhone } : { phone: cleanPhone };
        await this.updateSchool(targetSchool.id, fieldToUpdate);
      }
    }

    // 2. If it's a Teacher
    if (target.type === 'teacher') {
      const allUsers = await this.getUsers();
      const matchedUser = allUsers.find(u => 
        (target.id && u.id === target.id) ||
        (target.name && u.fullName === target.name) ||
        (target.schoolName && u.workLocation && (u.workLocation === target.schoolName || target.schoolName.includes(u.workLocation)))
      );

      if (matchedUser) {
        await this.updateUserProfile(matchedUser.id, { phone: cleanPhone });
      }

      // Also update matching school's teacher phone
      const schoolsList = getLocal<School>(STORAGE_KEYS.SCHOOLS, INITIAL_SCHOOLS);
      const targetSchool = schoolsList.find(s => 
        (target.schoolId && s.id === target.schoolId) ||
        (target.schoolName && (s.name === target.schoolName || s.name.includes(target.schoolName))) ||
        (target.name && s.teacherName && s.teacherName === target.name)
      );
      if (targetSchool) {
        await this.updateSchool(targetSchool.id, { phone: cleanPhone });
      }
    }

    // 3. If it's a Referee
    if (target.type === 'referee') {
      const referees = await this.getReferees();
      const matchedRef = referees.find(r => 
        (target.id && r.id === target.id) ||
        (target.name && (r.fullName === target.name || r.fullName.includes(target.name)))
      );
      if (matchedRef && !matchedRef.isTeacher) {
        await this.updateReferee(matchedRef.id, { phone: cleanPhone });
      } else if (matchedRef && matchedRef.isTeacher) {
        await this.updateUserProfile(matchedRef.id, { phone: cleanPhone });
      }
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
    let fetchedSports: Sport[] = [];
    try {
      const snap = await getDocs(collection(db, 'sports'));
      if (!snap.empty) {
        fetchedSports = snap.docs.map(d => ({ id: d.id, ...d.data() } as Sport));
      }
    } catch (e) {
      console.warn("Firestore fetch sports error, falling back to local cache:", e);
    }

    if (fetchedSports.length === 0) {
      fetchedSports = getLocal<Sport>('taourirt_sports_config', []);
    }

    const allCategoryIds = getAgeCategoriesForSeason('2026/2027').map(c => c.id);

    // 1. Merge default base sports
    const mergedBase: Sport[] = Object.entries(BASE_SPORTS).map(([id, s]) => {
      const existing = fetchedSports.find(item => item.id === id);
      if (existing) {
        return {
          ...existing,
          name: existing.name || s.name,
          icon: existing.icon || s.icon,
          description: existing.description || `منافسات ${s.name} الإقليمية`
        };
      }
      return {
        id,
        name: s.name,
        icon: s.icon,
        description: `منافسات ${s.name} الإقليمية`,
        ageCategories: allCategoryIds,
        studentLimit: 0,
        athleticsSpecialties: []
      };
    });

    // 2. Custom sports created by central admin (any sport in fetchedSports not in BASE_SPORTS)
    const customSports: Sport[] = fetchedSports
      .filter(item => !Object.prototype.hasOwnProperty.call(BASE_SPORTS, item.id))
      .map(item => ({
        ...item,
        name: item.name || 'رياضة جديدة',
        icon: item.icon || '🏆',
        description: item.description || `منافسات ${item.name || 'رياضة جديدة'} المدرسية`,
        ageCategories: item.ageCategories || allCategoryIds,
        studentLimit: item.studentLimit !== undefined ? item.studentLimit : 0,
        athleticsSpecialties: item.athleticsSpecialties || [],
        isCustom: true
      }));

    const allSports = deduplicateById<Sport>([...mergedBase, ...customSports]);

    // Keep SPORTS_MAP in sync with all current sports
    allSports.forEach(s => {
      SPORTS_MAP[s.id] = { name: s.name, icon: s.icon || '🏆' };
    });

    // Cache custom sports in localStorage for instantaneous boot
    const customListOnly = allSports.filter(s => s.isCustom);
    if (customListOnly.length > 0) {
      localStorage.setItem('taourirt_custom_sports', JSON.stringify(customListOnly.map(s => ({ id: s.id, name: s.name, icon: s.icon || '🏆' }))));
    }

    setLocal('taourirt_sports_config', allSports);
    return allSports;
  },

  async addSport(sport: {
    name: string;
    id?: string;
    icon?: string;
    description?: string;
    ageCategories: string[];
    studentLimit?: number;
    athleticsSpecialties?: string[];
  }): Promise<Sport> {
    const cleanName = sport.name.trim();
    // Unique ID from latin characters or sport_timestamp
    let sportId = (sport.id || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
    if (!sportId) {
      sportId = `sport_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    }

    const newSport: Sport = {
      id: sportId,
      name: cleanName,
      icon: sport.icon || '🏆',
      description: sport.description?.trim() || `منافسات ${cleanName} المدرسية الإقليمية`,
      ageCategories: sport.ageCategories,
      studentLimit: sport.studentLimit !== undefined ? sport.studentLimit : 0,
      athleticsSpecialties: sport.athleticsSpecialties || [],
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    // Register immediately in runtime SPORTS_MAP
    SPORTS_MAP[sportId] = { name: newSport.name, icon: newSport.icon || '🏆' };

    const currentSports = await this.getSportsConfig();
    const updatedSports = deduplicateById<Sport>([...currentSports.filter(s => s.id !== sportId), newSport]);
    setLocal('taourirt_sports_config', updatedSports);

    const customOnly = updatedSports.filter(s => s.isCustom);
    localStorage.setItem('taourirt_custom_sports', JSON.stringify(customOnly.map(s => ({ id: s.id, name: s.name, icon: s.icon || '🏆' }))));

    try {
      await setDoc(doc(db, 'sports', sportId), {
        ...newSport,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Added custom sport locally, Firestore pending:", e);
    }

    return newSport;
  },

  async deleteSport(sportId: string): Promise<void> {
    // Delete from runtime SPORTS_MAP if custom
    if (SPORTS_MAP[sportId] && !BASE_SPORTS[sportId]) {
      delete SPORTS_MAP[sportId];
    }

    const currentSports = await this.getSportsConfig();
    const updatedSports = currentSports.filter(s => s.id !== sportId);
    setLocal('taourirt_sports_config', updatedSports);

    const customOnly = updatedSports.filter(s => s.isCustom);
    localStorage.setItem('taourirt_custom_sports', JSON.stringify(customOnly.map(s => ({ id: s.id, name: s.name, icon: s.icon || '🏆' }))));

    try {
      await deleteDoc(doc(db, 'sports', sportId));
    } catch (e) {
      console.warn("Deleted custom sport locally, Firestore pending:", e);
    }
  },

  async updateSportCategories(
    sportId: string,
    ageCategories: string[],
    studentLimit?: number,
    athleticsSpecialties?: string[],
    name?: string,
    icon?: string,
    isProgrammed?: boolean
  ): Promise<void> {
    const list = await this.getSportsConfig();
    const updated = list.map(s => {
      if (s.id !== sportId) return s;
      return {
        ...s,
        ageCategories,
        studentLimit,
        athleticsSpecialties,
        name: name || s.name,
        icon: icon || s.icon,
        isProgrammed: isProgrammed !== undefined ? isProgrammed : s.isProgrammed
      };
    });
    setLocal('taourirt_sports_config', updated);

    if (name || icon) {
      SPORTS_MAP[sportId] = {
        name: name || SPORTS_MAP[sportId]?.name || 'الرياضة',
        icon: icon || SPORTS_MAP[sportId]?.icon || '🏆'
      };
    }

    try {
      await setDoc(doc(db, 'sports', sportId), {
        ageCategories,
        studentLimit: studentLimit !== undefined ? studentLimit : null,
        athleticsSpecialties: athleticsSpecialties !== undefined ? athleticsSpecialties : null,
        ...(isProgrammed !== undefined ? { isProgrammed } : {}),
        ...(name ? { name } : {}),
        ...(icon ? { icon } : {}),
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
        const firestoreList = snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
        return deduplicateById(firestoreList);
      }
    } catch (e) {
      console.warn("Firestore fetch students error, using local storage:", e);
    }
    const localList = getLocal<Student>('taourirt_students_data', []);
    return deduplicateById(localList);
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

  async updateStudent(id: string, student: Partial<Student>): Promise<void> {
    const localList = getLocal<Student>('taourirt_students_data', []);
    const updated = localList.map(s => s.id === id ? { ...s, ...student, updatedAt: new Date().toISOString() } : s);
    setLocal('taourirt_students_data', updated);

    try {
      await updateDoc(doc(db, 'students', id), {
        ...student,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Updated student locally; Firestore sync pending:", e);
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
