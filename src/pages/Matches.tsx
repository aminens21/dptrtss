import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DataService, SPORTS_MAP, deduplicateById } from '../lib/dataService';
import { Match, School, Venue, Tournament } from '../types';
import { Plus, Search, CalendarDays, MapPin, Clock, Filter, CheckCircle2, Trophy, UserCheck, KeyRound, Trash2, ShieldCheck, Lock, Pencil, Phone } from 'lucide-react';
import { CreateMatchModal } from '../components/CreateMatchModal';
import { ScoreModal } from '../components/ScoreModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

export const Matches: React.FC = () => {
  const { userProfile } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeSeason, setActiveSeason] = useState('2026/2027');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedSport, setSelectedSport] = useState<string>('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedMatchForScore, setSelectedMatchForScore] = useState<Match | null>(null);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);

  // Delete modal state
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isTeacher = userProfile?.role === 'TEACHER' && !userProfile?.isTechCommitteeHead;
  const isCentralAdmin = userProfile?.role === 'CENTRAL_ADMIN';
  const isSportManager = userProfile?.role === 'SPORT_MANAGER';
  const isTechCommitteeHead = userProfile?.isTechCommitteeHead === true;

  // Strict permission checks: Central Admin, Sport Managers, and Technical Committee Heads can manage matches
  const canCreate = isCentralAdmin || isSportManager || isTechCommitteeHead;
  const canEditScore = isCentralAdmin || isSportManager || isTechCommitteeHead;

  // Determine manager sport specialty
  const managerSportId = useMemo(() => {
    if (userProfile?.role !== 'SPORT_MANAGER') return undefined;
    if (userProfile.sportId) return userProfile.sportId;
    const assignedTourn = tournaments.find(t =>
      (t.managerEmail && t.managerEmail.toLowerCase() === userProfile.email?.toLowerCase()) ||
      (t.managerName && t.managerName === userProfile.fullName)
    );
    return assignedTourn?.sportId || 'basketball';
  }, [userProfile, tournaments]);

  // Determine user's primary/preferred sport specialty for automatic focus on login
  const preferredSportId = useMemo(() => {
    if (!userProfile) return 'ALL';
    
    // 1. Sport Manager
    if (userProfile.role === 'SPORT_MANAGER') {
      return managerSportId || 'ALL';
    }
    
    // 2. Technical Committee Head
    if (userProfile.isTechCommitteeHead && userProfile.techCommitteeSports && userProfile.techCommitteeSports.length > 0) {
      return userProfile.techCommitteeSports[0];
    }
    
    // 3. Technical Committee Member
    if (userProfile.isTechCommitteeMember && userProfile.techCommitteeSportsMemberOf && userProfile.techCommitteeSportsMemberOf.length > 0) {
      return userProfile.techCommitteeSportsMemberOf[0];
    }
    
    // 4. Fallback userProfile.sportId (such as teachers with preferred sport)
    if (userProfile.sportId) {
      return userProfile.sportId;
    }
    
    return 'ALL';
  }, [userProfile, tournaments, managerSportId]);

  // Set initial selected sport to user preferred specialty upon login/data load
  useEffect(() => {
    if (preferredSportId && preferredSportId !== 'ALL') {
      setSelectedSport(preferredSportId);
    }
  }, [preferredSportId]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mList, sList, vList, tList, season] = await Promise.all([
        DataService.getMatches(),
        DataService.getSchools(),
        DataService.getVenues(),
        DataService.getTournaments(),
        DataService.getActiveSeason()
      ]);
      setMatches(deduplicateById<Match>(mList));
      setSchools(deduplicateById<School>(sList));
      setVenues(deduplicateById<Venue>(vList));
      setTournaments(deduplicateById<Tournament>(tList));
      if (season) {
        setActiveSeason(season);
      }
    } catch (e) {
      console.error(e);
      toast.error('خطأ في تحميل المعطيات');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMatch = async (matchData: Omit<Match, 'id'>, matchId?: string) => {
    if (isTeacher) {
      toast.error('غير مصرح للأستاذ بإضافة أو تعديل المقابلات الرياضية');
      return;
    }
    try {
      if (matchId) {
        // Find existing match
        const existing = matches.find(m => m.id === matchId);
        if (existing) {
          await DataService.updateMatch(matchId, matchData);
          
          setMatches(prev => deduplicateById<Match>(prev.map(m => m.id === matchId ? { ...m, ...matchData } : m)));
          toast.success('تم تعديل المقابلة بنجاح!');
        }
      } else {
        const created = await DataService.addMatch(matchData);
        setMatches(prev => deduplicateById<Match>([created, ...prev]));
        toast.success('تمت برمجة المقابلة بنجاح!');
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء حفظ المقابلة');
    }
  };

  const handleSaveScore = async (matchId: string, score1: number, score2: number, status: Match['status']) => {
    if (isTeacher) {
      toast.error('غير مصرح للأستاذ بتسجيل أو تعديل نتائج المقابلات');
      return;
    }
    try {
      await DataService.updateMatchScore(matchId, score1, score2, status);
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, score1, score2, status } : m));
      toast.success('تم تثبيت نتيجة المقابلة بنجاح!');
    } catch (e) {
      toast.error('حدث خطأ أثناء حفظ النتيجة');
    }
  };

  const promptDeleteMatch = (m: Match) => {
    if (isTeacher) {
      toast.error('غير مصرح للأستاذ بحذف المقابلات الرياضية');
      return;
    }
    if (userProfile?.role === 'SPORT_MANAGER' && managerSportId && m.sportId !== managerSportId) {
      toast.error('لا يمكنك حذف مباريات رياضة أخرى خارج تخصصك');
      return;
    }
    setMatchToDelete(m);
  };

  const handleConfirmDeleteMatch = async () => {
    if (isTeacher) {
      toast.error('غير مصرح للأستاذ بحذف المقابلات');
      return;
    }
    if (!matchToDelete) return;
    setIsDeleting(true);
    try {
      await DataService.deleteMatch(matchToDelete.id);
      setMatches(prev => prev.filter(m => m.id !== matchToDelete.id));
      toast.success('تم حذف المقابلة بنجاح');
      setMatchToDelete(null);
    } catch (e) {
      toast.error('تعذر حذف المقابلة');
    } finally {
      setIsDeleting(false);
    }
  };

  const getSchoolName = (schoolId?: string) => {
    return schools.find(s => s.id === schoolId)?.name || 'مؤسسة تعليمية';
  };

  const getVenueName = (venueId?: string) => {
    return venues.find(v => v.id === venueId)?.name || 'القاعة الرياضية بتاوريرت';
  };

  const getTournament = (tournamentId?: string) => {
    return tournaments.find(t => t.id === tournamentId);
  };

  const filtered = matches.filter(m => {
    const s1 = getSchoolName(m.team1Id);
    const s2 = getSchoolName(m.team2Id);
    const tourn = getTournament(m.tournamentId);
    const matchesSearch = search === '' ||
                          (m.stage || '').includes(search) ||
                          s1.includes(search) ||
                          s2.includes(search) ||
                          (tourn?.name || '').includes(search) ||
                          (tourn?.managerName || '').includes(search);
    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
    const matchesSport = selectedSport === 'ALL' || m.sportId === selectedSport || (!m.sportId && selectedSport === 'football');
    
    let matchDateStr = '';
    if (m.date) {
      if (typeof m.date === 'string') matchDateStr = m.date.split('T')[0];
      else if (m.date.toDate) matchDateStr = m.date.toDate().toISOString().split('T')[0];
      else if (m.date instanceof Date) matchDateStr = m.date.toISOString().split('T')[0];
    }
    const matchesDate = dateFilter === '' || matchDateStr === dateFilter;

    return matchesSearch && matchesStatus && matchesSport && matchesDate;
  });

  const scheduledCount = matches.filter(m => m.status === 'Scheduled').length;
  const ongoingCount = matches.filter(m => m.status === 'Ongoing').length;
  const completedCount = matches.filter(m => m.status === 'Completed').length;

  const currentSportInfo = managerSportId ? SPORTS_MAP[managerSportId] : null;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-bold text-slate-800">
              {userProfile?.role === 'TEACHER' ? 'جدول المقابلات والنتائج الإقليمية' : 'برنامج المباريات والنتائج المباشرة'}
            </h2>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200">
              الموسم {activeSeason}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {userProfile?.role === 'TEACHER'
              ? 'متابعة فورية لمواعيد المباريات، الملاعب، والنتائج الرسمية المسجلة لمختلف الرياضات'
              : 'جدول المقابلات الإقليمية، تتبع المشرفين على كل بطولة، وإدخال النتائج الفورية'}
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>برمجة مباراة جديدة</span>
          </button>
        )}
      </div>

      {/* Sport Manager Specialty Dedicated Banner */}
      {managerSportId && currentSportInfo && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50/60 to-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold shadow-xs shrink-0">
              {currentSportInfo.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 text-sm">
                  مسؤول نشاط: {currentSportInfo.name} {currentSportInfo.icon}
                </span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                  تخصص معتمد
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                مرحباً بك {userProfile?.fullName}، يمكنك برمجة مقابلات <strong>{currentSportInfo.name}</strong> وتدبير نتائجها ومتابعة مراكز التباري الخاصة بها.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setSelectedSport(managerSportId)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                selectedSport === managerSportId
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              )}
            >
              مباريات تخصصي ({currentSportInfo.name})
            </button>
            <button
              onClick={() => setSelectedSport('ALL')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                selectedSport === 'ALL'
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              )}
            >
              جميع الرياضات
            </button>
          </div>
        </div>
      )}

      {/* Quick Summary Stats for Matches & Results */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setStatusFilter('Scheduled')}
          className={cn(
            "p-3 rounded-xl border text-right transition-all cursor-pointer",
            statusFilter === 'Scheduled'
              ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20"
              : "bg-white border-slate-200 hover:border-blue-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-blue-700 uppercase">المقابلات المبرمجة</span>
            <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <p className="text-lg md:text-xl font-black text-slate-800 mt-1">{scheduledCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter('Ongoing')}
          className={cn(
            "p-3 rounded-xl border text-right transition-all cursor-pointer",
            statusFilter === 'Ongoing'
              ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20"
              : "bg-white border-slate-200 hover:border-emerald-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase">مباشر / جارية</span>
            <Clock className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
          </div>
          <p className="text-lg md:text-xl font-black text-emerald-700 mt-1">{ongoingCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter('Completed')}
          className={cn(
            "p-3 rounded-xl border text-right transition-all cursor-pointer",
            statusFilter === 'Completed'
              ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20"
              : "bg-white border-slate-200 hover:border-amber-200"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-700 uppercase">النتائج المسجلة</span>
            <Trophy className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <p className="text-lg md:text-xl font-black text-slate-800 mt-1">{completedCount}</p>
        </button>
      </div>

      {/* High Density Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-1 items-center px-2 w-full">
          <Search className="h-4 w-4 text-slate-400 ml-2" />
          <input
            type="text"
            placeholder="ابحث باسم المؤسسة، المرحلة، البطولة، أو المسؤول..."
            className="w-full border-0 focus:ring-0 text-xs py-1 text-slate-800 placeholder-slate-400 focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-r border-slate-100 pt-2 sm:pt-0 sm:pr-3 shrink-0">
          <CalendarDays className="h-4 w-4 text-blue-600" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />
        </div>

        {/* Sport Filter Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto border-t sm:border-t-0 sm:border-r border-slate-100 pt-2 sm:pt-0 sm:pr-3 shrink-0">
          <label htmlFor="matches-sport-filter" className="text-xs font-bold text-slate-600 whitespace-nowrap flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            <span>الرياضة:</span>
          </label>
          <select
            id="matches-sport-filter"
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[160px]"
          >
            <option value="ALL">🏆 جميع الرياضات</option>
            {Object.entries(SPORTS_MAP).map(([id, info]) => (
              <option key={id} value={id}>
                {info.icon} {info.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'جميع الحالات' },
            { id: 'Scheduled', label: `مبرمجة (${scheduledCount})` },
            { id: 'Ongoing', label: `جارية (${ongoingCount})` },
            { id: 'Completed', label: `النتائج (${completedCount})` },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer",
                statusFilter === st.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.length > 0 ? (
            filtered.map((m) => {
              const tourn = getTournament(m.tournamentId);
              const mSportInfo = SPORTS_MAP[m.sportId || 'football'] || { name: 'رياضة', icon: '🏆' };

              return (
                <div
                  key={m.id}
                  className="flex flex-col rounded-xl bg-white p-4 border border-slate-200 shadow-xs transition-all hover:border-blue-300 hover:shadow-sm"
                >
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Match Time / Status / Sport Icon */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="w-24 text-center border-l border-slate-100 pl-3 shrink-0">
                        <div className="text-[10px] text-slate-500 font-bold mb-1 border-b border-slate-100 pb-1">
                          {m.date ? (typeof m.date === 'string' ? new Date(m.date) : (m.date as any).toDate ? (m.date as any).toDate() : new Date(m.date)).toLocaleDateString('ar-MA') : 'غير محدد'}
                        </div>
                        <div className="flex items-center justify-center gap-1 text-xs font-bold text-blue-600">
                          <span>{mSportInfo.icon}</span>
                          <span>{m.startTime || '10:00'}</span>
                        </div>
                        <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          m.status === 'Completed'
                            ? 'bg-slate-100 text-slate-700'
                            : m.status === 'Ongoing'
                            ? 'bg-emerald-50 text-emerald-700 animate-pulse'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {m.status === 'Completed' ? 'انتهت' : m.status === 'Ongoing' ? 'مباشر' : 'مبرمجة'}
                        </span>
                      </div>

                    <div className="flex-1 w-full flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 md:gap-6 px-2">
                      {/* Team 1 */}
                      <div className="flex items-center gap-2 sm:gap-3 text-right w-full sm:flex-1 justify-between sm:justify-end bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-lg border border-slate-100 sm:border-transparent">
                        <span className="font-bold text-xs md:text-sm text-slate-800 line-clamp-2">
                          {getSchoolName(m.team1Id)}
                        </span>
                        <div className="w-8 h-8 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                          🏫
                        </div>
                      </div>

                      {/* Score / Status */}
                      <div className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-black tracking-wider text-xs md:text-sm shadow-2xs shrink-0 mx-auto my-1 sm:my-0">
                        {m.status === 'Completed' || m.status === 'Ongoing'
                          ? `${m.score1 || 0} - ${m.score2 || 0}`
                          : 'ضد'}
                      </div>

                      {/* Team 2 */}
                      <div className="flex items-center gap-2 sm:gap-3 text-left w-full sm:flex-1 justify-between sm:justify-start flex-row-reverse sm:flex-row bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-lg border border-slate-100 sm:border-transparent">
                        <span className="font-bold text-xs md:text-sm text-slate-800 line-clamp-2 text-right sm:text-left">
                          {getSchoolName(m.team2Id)}
                        </span>
                        <div className="w-8 h-8 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                          🏫
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tournament, Referees & Metadata */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-500 pt-3 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-bold text-slate-700">{getVenueName(m.venueId)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        <span className="font-bold text-slate-700">{mSportInfo.icon} {mSportInfo.name}</span>
                      </div>

                      {tourn && (
                        <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                          <Trophy className="h-3.5 w-3.5 text-amber-500" />
                          <span className="font-bold text-slate-700 truncate max-w-[120px]">{tourn.name}</span>
                        </div>
                      )}

                      {((m.referees && m.referees.length > 0) || m.referee1Id || m.referee2Id) && (
                        <div className="flex items-center gap-1.5 bg-blue-50/50 px-2 py-1 rounded border border-blue-100">
                          <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                          <span className="font-bold text-blue-800">
                            طاقم التحكيم:{' '}
                            {m.referees && m.referees.length > 0
                              ? m.referees.join(' / ')
                              : [m.referee1Id, m.referee2Id].filter(Boolean).join(' / ')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {(m.status === 'Scheduled' || m.status === 'Ongoing') && (m.referees?.length > 0 || m.referee1Id || m.referee2Id) && (
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(`تذكير: لديك تعيين لتحكيم مقابلة في إطار البطولة المدرسية.\nالمكان: ${getVenueName(m.venueId)}\nالتاريخ: ${new Date(m.date).toLocaleDateString('ar-MA')}\nالتوقيت: ${m.startTime}\nالفريقين: ${getSchoolName(m.team1Id)} ضد ${getSchoolName(m.team2Id)}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="إرسال تنبيه عبر واتساب للحكام"
                          className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-500 hover:text-white text-emerald-600 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">تنبيه</span>
                        </a>
                      )}

                      {canEditScore && (
                        <>
                          {m.status !== 'Completed' && (
                            <button
                              onClick={() => {
                                if (userProfile?.role === 'SPORT_MANAGER' && managerSportId && m.sportId !== managerSportId) {
                                  toast.error(`أنت مخول لتدبير نتائج ${mSportInfo?.name || ''} فقط`);
                                  return;
                                }
                                setSelectedMatchForScore(m);
                              }}
                              title="إنهاء المقابلة وتأكيد النتيجة النهائية"
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-xs shrink-0"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>انتهت المباراة</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (userProfile?.role === 'SPORT_MANAGER' && managerSportId && m.sportId !== managerSportId) {
                                toast.error(`أنت مخول لتدبير نتائج ${mSportInfo?.name || ''} فقط`);
                                return;
                              }
                              setSelectedMatchForScore(m);
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer shrink-0"
                          >
                            {m.status === 'Completed' ? 'تعديل النتيجة' : 'تسجيل النتيجة'}
                          </button>
                        </>
                      )}

                      {canCreate && (
                        <>
                          <button
                            onClick={() => {
                              if (userProfile?.role === 'SPORT_MANAGER' && managerSportId && m.sportId !== managerSportId) {
                                toast.error('لا يمكنك تعديل مباريات رياضة أخرى خارج تخصصك');
                                return;
                              }
                              setEditingMatch(m);
                              setIsCreateOpen(true);
                            }}
                            title="تعديل برمجة المقابلة"
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => promptDeleteMatch(m)}
                            title="حذف المقابلة"
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                  {/* Extended Results (Scorers, Penalties) */}
                  {(m.status === 'Completed' || m.status === 'Ongoing') && (m.penalty1 !== undefined || m.scorers) && (
                    <div className="w-full mt-3 pt-3 border-t border-slate-100 flex flex-col md:flex-row items-center justify-center gap-4">
                      {m.penalty1 !== undefined && m.penalty2 !== undefined && (
                        <div className="text-[11px] bg-slate-50 px-3 py-1 rounded-full border border-slate-200 text-slate-600 flex items-center gap-2">
                          <span className="font-bold text-slate-800">ركلات الترجيح:</span>
                          <span className="font-black text-slate-900">{m.penalty1} - {m.penalty2}</span>
                        </div>
                      )}
                      {m.scorers && (
                        <div className="text-[11px] text-slate-500 text-center flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
                          ⚽ <span>{m.scorers}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white rounded-xl border border-slate-200 text-center">
              <CalendarDays className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700 mb-1">لا توجد مباريات مطابقة للبحث</p>
              {canCreate && (
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="mt-3 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                >
                  برمجة مباراة جديدة الآن
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create Match Modal */}
      <CreateMatchModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setTimeout(() => setEditingMatch(null), 200);
        }}
        schools={schools}
        venues={venues}
        tournaments={tournaments}
        matches={matches}
        managerSportId={managerSportId}
        onSave={handleCreateMatch}
        editingMatch={editingMatch}
      />

      {/* Score Edit Modal */}
      <ScoreModal
        isOpen={!!selectedMatchForScore}
        onClose={() => setSelectedMatchForScore(null)}
        match={selectedMatchForScore}
        schools={schools}
        onSave={handleSaveScore}
      />

      {/* Confirm Delete Match Modal */}
      <ConfirmDeleteModal
        isOpen={!!matchToDelete}
        onClose={() => setMatchToDelete(null)}
        onConfirm={handleConfirmDeleteMatch}
        title="حذف المقابلة المبرمجة"
        message="هل أنت متأكد من رغبتك في حذف هذه المقابلة نهائياً من البرنامج الإقليمي؟"
        itemName={matchToDelete ? `${getSchoolName(matchToDelete.team1Id)} ضد ${getSchoolName(matchToDelete.team2Id)}` : undefined}
        isDeleting={isDeleting}
      />
    </div>
  );
};

