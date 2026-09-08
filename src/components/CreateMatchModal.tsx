import React, { useState, useMemo, useEffect } from 'react';
import { Match, School, Venue, Tournament, Referee } from '../types';
import { X, CalendarDays, Clock, MapPin, Trophy, AlertTriangle, AlertCircle, Calendar, ArrowRight, ShieldCheck, Lock, Users, Tag, UserCheck, Plus } from 'lucide-react';
import { SPORTS_MAP, AGE_CATEGORIES, GENDER_MAP, DataService, getAgeCategoriesForSeason } from '../lib/dataService';
import toast from 'react-hot-toast';

interface CreateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  venues: Venue[];
  tournaments?: Tournament[];
  matches?: Match[];
  managerSportId?: string; // If set, user is restricted to this sport only
  onSave: (match: Omit<Match, 'id'>, matchId?: string) => Promise<void>;
  editingMatch?: Match | null;
}

export const CreateMatchModal: React.FC<CreateMatchModalProps> = ({
  isOpen,
  onClose,
  schools,
  venues,
  tournaments = [],
  matches = [],
  managerSportId,
  onSave,
  editingMatch
}) => {
  // Filter tournaments if manager has a restricted sport
  const availableTournaments = useMemo(() => {
    if (managerSportId) {
      const matching = tournaments.filter(t => t.sportId === managerSportId);
      return matching.length > 0 ? matching : tournaments;
    }
    return tournaments;
  }, [tournaments, managerSportId]);

  const [tournamentId, setTournamentId] = useState(availableTournaments[0]?.id || 'tourn-1');
  const [team1Id, setTeam1Id] = useState(schools[0]?.id || 'sch-1');
  const [team2Id, setTeam2Id] = useState(schools[1]?.id || 'sch-2');
  const [stage, setStage] = useState('دور المجموعات');
  const [sportId, setSportId] = useState(managerSportId || availableTournaments[0]?.sportId || 'basketball');
  const [ageCategory, setAgeCategory] = useState<string>(availableTournaments[0]?.ageCategory || 'الصغار (U15)');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Mixed'>(availableTournaments[0]?.gender || 'Male');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [venueId, setVenueId] = useState(venues[0]?.id || 'ven-1');
  const [referees, setReferees] = useState<string[]>(['']);
  const [allReferees, setAllReferees] = useState<Referee[]>([]);
  const [status, setStatus] = useState<Match['status']>('Scheduled');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSeason, setCurrentSeason] = useState('2026/2027');

  useEffect(() => {
    if (isOpen) {
      DataService.getActiveSeason()
        .then(season => setCurrentSeason(season))
        .catch(err => console.warn("Error loading season in match modal:", err));
    }
  }, [isOpen]);

  // Load referees from DataService
  useEffect(() => {
    if (isOpen) {
      DataService.getReferees().then(data => {
        setAllReferees(data);
      }).catch(err => {
        console.warn("Failed to load referees:", err);
      });
    }
  }, [isOpen]);

  // Current match sport
  const currentSport = managerSportId || sportId;

  // Filter referees by specialty in the current sport
  const specializedReferees = useMemo(() => {
    return allReferees.filter(r => {
      if (r.isActive === false) return false;
      if (Array.isArray(r.specialty)) {
        return r.specialty.includes(currentSport);
      }
      return r.specialty === currentSport;
    });
  }, [allReferees, currentSport]);

  const otherReferees = useMemo(() => {
    return allReferees.filter(r => {
      if (r.isActive === false) return false;
      if (Array.isArray(r.specialty)) {
        return !r.specialty.includes(currentSport);
      }
      return r.specialty !== currentSport;
    });
  }, [allReferees, currentSport]);

  // Sync sport and tournament when managerSportId or tournaments change
  useEffect(() => {
    if (editingMatch) {
      setTournamentId(editingMatch.tournamentId);
      setTeam1Id(editingMatch.team1Id);
      setTeam2Id(editingMatch.team2Id);
      setStage(editingMatch.stage);
      setSportId(editingMatch.sportId || 'basketball');
      if (editingMatch.ageCategory) setAgeCategory(editingMatch.ageCategory);
      if (editingMatch.gender) setGender(editingMatch.gender);
      
      if (editingMatch.date) {
        if (typeof editingMatch.date === 'string') {
          setDate(editingMatch.date.split('T')[0]);
        } else if ((editingMatch.date as any).toDate) {
          setDate((editingMatch.date as any).toDate().toISOString().split('T')[0]);
        } else if (editingMatch.date instanceof Date) {
          setDate(editingMatch.date.toISOString().split('T')[0]);
        }
      }
      
      setStartTime(editingMatch.startTime);
      setVenueId(editingMatch.venueId);
      
      // Load existing referees
      if (editingMatch.referees && editingMatch.referees.length > 0) {
        setReferees(editingMatch.referees);
      } else {
        const legacyReferees = [];
        if (editingMatch.referee1Id) legacyReferees.push(editingMatch.referee1Id);
        if (editingMatch.referee2Id) legacyReferees.push(editingMatch.referee2Id);
        setReferees(legacyReferees.length > 0 ? legacyReferees : ['']);
      }
      
      setStatus(editingMatch.status);
    } else {
      if (managerSportId) {
        setSportId(managerSportId);
        if (availableTournaments.length > 0 && !availableTournaments.some(t => t.id === tournamentId)) {
          const first = availableTournaments[0];
          setTournamentId(first.id);
          if (first.ageCategory) setAgeCategory(first.ageCategory);
          if (first.gender) setGender(first.gender);
        }
      } else if (availableTournaments.length > 0 && !tournamentId) {
        const first = availableTournaments[0];
        setTournamentId(first.id);
        if (first.sportId) setSportId(first.sportId);
        if (first.ageCategory) setAgeCategory(first.ageCategory);
        if (first.gender) setGender(first.gender);
      }
    }
  }, [managerSportId, availableTournaments, isOpen, editingMatch]);

  // Check for Venue Conflict on the chosen Date & Time (1 hour difference)
  const selectedVenue = useMemo(() => venues.find(v => v.id === venueId), [venues, venueId]);

  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  };

  const conflictingMatches = useMemo(() => {
    if (!venueId || !date) return [];
    return matches.filter(m => {
      if (m.venueId !== venueId) return false;
      if (m.status === 'Cancelled' || m.status === 'Postponed') return false;
      if (editingMatch && m.id === editingMatch.id) return false;

      // Check date equality (YYYY-MM-DD)
      let matchDateStr = '';
      if (m.date) {
        if (typeof m.date === 'string') {
          matchDateStr = m.date.split('T')[0];
        } else if (m.date.toDate) {
          matchDateStr = m.date.toDate().toISOString().split('T')[0];
        } else if (m.date instanceof Date) {
          matchDateStr = m.date.toISOString().split('T')[0];
        }
      }
      if (matchDateStr !== date) return false;

      // Same day, check if time difference is less than 60 minutes
      if (m.startTime && startTime) {
        const t1 = parseTimeToMinutes(m.startTime);
        const t2 = parseTimeToMinutes(startTime);
        return Math.abs(t1 - t2) < 60;
      }
      return true; // fallback if no times defined
    });
  }, [matches, venueId, date, startTime]);

  const hasConflict = conflictingMatches.length > 0;

  if (!isOpen) return null;

  const handleNextDay = () => {
    try {
      const current = new Date(date);
      current.setDate(current.getDate() + 1);
      const nextDateStr = current.toISOString().split('T')[0];
      setDate(nextDateStr);
      toast.success(`تم تغيير التاريخ إلى ${nextDateStr}`);
    } catch {
      // fallback
    }
  };

  const getSchoolName = (id?: string) => {
    return schools.find(s => s.id === id)?.name || 'مؤسسة تعليمية';
  };

  const handleAddRefereeQuick = (refName: string) => {
    // Check if already in the list
    if (referees.includes(refName)) {
      toast('هذا الحكم مضاف بالفعل إلى الطاقم', { icon: 'ℹ️' });
      return;
    }
    // If first element is empty string, replace it, otherwise append
    if (referees.length === 1 && referees[0] === '') {
      setReferees([refName]);
    } else {
      setReferees([...referees, refName]);
    }
    toast.success(`تمت إضافة الحكم: ${refName}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (team1Id === team2Id) {
      toast.error('يرجى اختيار مؤسستين مختلفتين للتباري');
      return;
    }

    // Sport Manager validation
    if (managerSportId && sportId !== managerSportId) {
      toast.error(`أنت مخول لبرمجة مباريات ${SPORTS_MAP[managerSportId]?.name || managerSportId} فقط.`);
      return;
    }

    if (hasConflict) {
      const confirmProceed = window.confirm(
        `تنبيه: مركز التباري "${selectedVenue?.name || ''}" غير شاغر في هذا التوقيت ومبرمج فيه نشاط آخر في وقت متقارب (أقل من ساعة فرق) في نفس التاريخ (${date})!\n\nهل ترغب في تثبيت البرمجة رغم التعارض، أم تفضل تغيير التاريخ/المركز/التوقيت؟`
      );
      if (!confirmProceed) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const cleanReferees = referees.map(r => r.trim()).filter(r => r !== '');
      await onSave({
        tournamentId,
        sportId: managerSportId || sportId,
        stage,
        team1Id,
        team2Id,
        ageCategory,
        gender,
        date: new Date(date),
        startTime,
        venueId,
        referees: cleanReferees,
        referee1Id: cleanReferees[0] || undefined,
        referee2Id: cleanReferees[1] || undefined,
        status,
        score1: editingMatch?.score1 ?? 0,
        score2: editingMatch?.score2 ?? 0,
        updatedAt: new Date()
      }, editingMatch?.id);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const sportInfo = SPORTS_MAP[managerSportId || sportId] || { name: 'الرياضة', icon: '🏆' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {editingMatch ? 'تعديل برمجة المقابلة' : 'برمجة مباراة ونشاط رياضي جديد'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">تحديد الفئة العمرية، المؤسسات المتبارية، وتعيين الحكام مباشرة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Manager Specialty Notice */}
          {managerSportId && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg font-bold shadow-xs shrink-0">
                {sportInfo.icon}
              </div>
              <div className="flex-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <span>تخصصك المعتمد: {sportInfo.name} {sportInfo.icon}</span>
                </div>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  بصفتك مسؤولاً عن هذا النشاط، يمكنك برمجة مقابلات <strong>{sportInfo.name}</strong> وتعيين حكام التخصص مباشرة.
                </p>
              </div>
            </div>
          )}

          {/* Tournament Selection */}
          {availableTournaments.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                البطولة المنظمة <span className="text-red-500">*</span>
              </label>
              <select
                value={tournamentId}
                onChange={(e) => {
                  setTournamentId(e.target.value);
                  const selectedTourn = availableTournaments.find(t => t.id === e.target.value);
                  if (selectedTourn) {
                    if (selectedTourn.sportId && !managerSportId) {
                      setSportId(selectedTourn.sportId);
                    }
                    if (selectedTourn.ageCategory) {
                      setAgeCategory(selectedTourn.ageCategory);
                    }
                    if (selectedTourn.gender) {
                      setGender(selectedTourn.gender);
                    }
                  }
                }}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
              >
                {availableTournaments.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.managerName ? `(المسؤول: ${t.managerName})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Age Category & Gender */}
          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
              <Tag className="h-3.5 w-3.5 text-blue-600" />
              <span>الفئة العمرية والجنس للمشاركين:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  الفئة العمرية <span className="text-red-500">*</span>
                </label>
                <select
                  value={ageCategory}
                  onChange={(e) => setAgeCategory(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold cursor-pointer"
                >
                  {getAgeCategoriesForSeason(currentSeason).map(cat => (
                    <option key={cat.id} value={cat.shortName}>
                      {cat.name}
                    </option>
                  ))}
                  <option value="U17 (15-17 سنة)">U17 (15-17 سنة)</option>
                  <option value="U15 (13-15 سنة)">U15 (13-15 سنة)</option>
                  <option value="U13 (11-13 سنة)">U13 (11-13 سنة)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  الجنس (الفئة) <span className="text-red-500">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold cursor-pointer"
                >
                  <option value="Male">👦 ذكور (فئة الذكور)</option>
                  <option value="Female">👧 إناث (فئة الإناث)</option>
                  <option value="Mixed">👥 مختلط (فئة مشتركة)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Teams */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المؤسسة 1 (المستضيف) <span className="text-red-500">*</span>
              </label>
              <select
                value={team1Id}
                onChange={(e) => setTeam1Id(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.commune})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                المؤسسة 2 (الضيف) <span className="text-red-500">*</span>
              </label>
              <select
                value={team2Id}
                onChange={(e) => setTeam2Id(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.commune})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sport & Stage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">الرياضة</label>
                {managerSportId && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium">
                    <Lock className="h-3 w-3 text-slate-400" />
                    محدد حسب تخصصك
                  </span>
                )}
              </div>

              {managerSportId ? (
                <div className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 font-bold flex items-center justify-between">
                  <span>{sportInfo.icon} {sportInfo.name}</span>
                  <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">معتمد</span>
                </div>
              ) : (
                <select
                  value={sportId}
                  onChange={(e) => setSportId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="football">⚽ كرة القدم</option>
                  <option value="futsal">⚽ فوتسال (داخل القاعة)</option>
                  <option value="handball">🤾 كرة اليد</option>
                  <option value="basketball">🏀 كرة السلة</option>
                  <option value="volleyball">🏐 الكرة الطائرة</option>
                  <option value="athletics">🏃 ألعاب القوى</option>
                  <option value="table_tennis">🏓 كرة الطاولة</option>
                  <option value="chess">♟️ الشطرنج المدرسي</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الدور / المرحلة</label>
              <input
                type="text"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                placeholder="مثال: ربع النهائي أو دور المجموعات"
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Venue Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              مركز التباري / القاعة الرياضية *
            </label>
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className={`w-full text-xs rounded-lg border px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 ${
                hasConflict ? 'border-amber-400 bg-amber-50/30 ring-2 ring-amber-300' : 'border-slate-200 focus:ring-blue-500'
              }`}
            >
              {venues.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.city})</option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ المقابلة *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full text-xs rounded-lg border px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 ${
                  hasConflict ? 'border-amber-400 bg-amber-50/30 ring-2 ring-amber-300' : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">توقيت الانطلاق</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Referees Assignment Section */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <label className="block text-xs font-bold text-slate-800">
                  طاقم التحكيم (اختيار مباشر من قائمة حكام التخصص)
                </label>
              </div>
              <button
                type="button"
                onClick={() => setReferees([...referees, ''])}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-white hover:bg-blue-50 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                <Plus className="h-3 w-3" />
                <span>إضافة حكم</span>
              </button>
            </div>

            {/* Specialized Referees Quick Tags */}
            {specializedReferees.length > 0 && (
              <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-blue-100">
                <p className="text-[10px] font-bold text-blue-800 flex items-center gap-1">
                  <span>🎯 حكام مسجلون متخصصون في ({sportInfo.name} {sportInfo.icon}):</span>
                  <span className="bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-extrabold">{specializedReferees.length}</span>
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {specializedReferees.map((ref) => {
                    const isAlreadyAssigned = referees.includes(ref.fullName);
                    return (
                      <button
                        key={ref.id}
                        type="button"
                        onClick={() => handleAddRefereeQuick(ref.fullName)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                          isAlreadyAssigned
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 ring-1 ring-emerald-200'
                            : 'bg-blue-50/70 hover:bg-blue-100 text-blue-700 border border-blue-200 hover:border-blue-300'
                        }`}
                      >
                        <span>{isAlreadyAssigned ? '✓' : '+'}</span>
                        <span>{ref.fullName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Referee Slots Inputs with Dropdown & Manual Input Option */}
            <div className="space-y-2">
              {referees.map((ref, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Dropdown selector */}
                    <select
                      value={allReferees.some(r => r.fullName === ref) ? ref : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const newRefs = [...referees];
                        newRefs[idx] = val;
                        setReferees(newRefs);
                      }}
                      className="w-full text-xs rounded-lg border border-slate-200 px-2.5 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="">-- اختيار من لائحة الحكام --</option>
                      {specializedReferees.length > 0 && (
                        <optgroup label={`حكام تخصص ${sportInfo.name} (${specializedReferees.length})`}>
                          {specializedReferees.map(r => (
                            <option key={r.id} value={r.fullName}>
                              ⭐ {r.fullName} ({r.phone})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {otherReferees.length > 0 && (
                        <optgroup label="باقي الحكام والأساتذة المسجلين">
                          {otherReferees.map(r => (
                            <option key={r.id} value={r.fullName}>
                              👤 {r.fullName}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>

                    {/* Text input / Custom Name */}
                    <input
                      type="text"
                      value={ref}
                      onChange={(e) => {
                        const newRefs = [...referees];
                        newRefs[idx] = e.target.value;
                        setReferees(newRefs);
                      }}
                      placeholder={`أو اكتب اسم الحكم ${idx + 1} يدوياً`}
                      className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  {referees.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newRefs = referees.filter((_, i) => i !== idx);
                        setReferees(newRefs);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="حذف هذا الحكم"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* CRITICAL OCCUPANCY CONFLICT WARNING ALERT */}
          {hasConflict && (
            <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-amber-50/80 p-3.5 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-2.5">
                <div className="p-1 bg-red-100 text-red-600 rounded-lg shrink-0 mt-0.5">
                  <AlertTriangle className="h-5 w-5 animate-bounce" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-red-900 flex items-center gap-1">
                    <span>تنبيه: مركز التباري غير شاغر في هذا التاريخ!</span>
                  </h4>
                  <p className="text-[11px] text-red-700 mt-0.5 leading-relaxed">
                    تم برمجة نشاط/مقابلة أخرى بـ <strong className="font-bold underline">{selectedVenue?.name}</strong> في تاريخ <span className="font-mono font-bold" dir="ltr">{date}</span>.
                  </p>
                </div>
              </div>

              {/* Conflicting matches list */}
              <div className="bg-white/80 border border-red-100 rounded-lg p-2.5 space-y-1.5 text-xs">
                <p className="text-[10px] font-bold text-slate-600">المباريات المبرمجة مسبقاً بنفس المركز:</p>
                {conflictingMatches.map(cm => (
                  <div key={cm.id} className="flex items-center justify-between text-[11px] text-slate-700 bg-red-50/50 px-2 py-1 rounded border border-red-100/60">
                    <span className="font-bold">
                      {getSchoolName(cm.team1Id)} ضد {getSchoolName(cm.team2Id)}
                    </span>
                    <span className="text-[10px] text-red-600 font-bold bg-white px-1.5 py-0.5 rounded border border-red-200">
                      ⏰ {cm.startTime || '10:00'} ({cm.stage || 'مباراة'})
                    </span>
                  </div>
                ))}
              </div>

              {/* Quick helper button to change date */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-amber-800 font-medium">المرجو تغيير التاريخ لتفادي تضارب المواعيد:</span>
                <button
                  type="button"
                  onClick={handleNextDay}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer shadow-xs"
                >
                  <Calendar className="h-3 w-3" />
                  <span>تأجيل لليوم الموالي (+1)</span>
                </button>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 text-xs font-bold text-white rounded-lg transition-colors shadow-xs disabled:bg-blue-300 cursor-pointer ${
                hasConflict ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? 'جاري الحفظ...' : hasConflict ? 'تأكيد الحفظ رغم التعارض' : (editingMatch ? 'حفظ التعديلات' : 'تأكيد برمجة المباراة')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

