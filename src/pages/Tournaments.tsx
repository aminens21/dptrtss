import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DataService, SPORTS_MAP, getAgeCategoriesForSeason, deduplicateById } from '../lib/dataService';
import { Tournament, User, Student, School, Sport, Match } from '../types';
import * as XLSX from 'xlsx';
import {
  Plus,
  Search,
  Trophy,
  Calendar,
  Filter,
  Sparkles,
  Trash2,
  Users,
  Layers,
  ShieldCheck,
  Phone,
  Star,
  Lock,
  Edit,
  AlertCircle,
  CheckCircle2,
  Settings
} from 'lucide-react';
import { CreateTournamentModal } from '../components/CreateTournamentModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { CrossCountryChampionshipModal } from '../components/CrossCountryChampionshipModal';
import { SportChampionshipModal } from '../components/SportChampionshipModal';
import toast from 'react-hot-toast';

export const Tournaments: React.FC = () => {
  const { userProfile } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [sportsConfig, setSportsConfig] = useState<Sport[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeSeason, setActiveSeason] = useState('2026/2027');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCcModalOpen, setIsCcModalOpen] = useState(false);
  const [filterSport, setFilterSport] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PROGRAMMED' | 'UNPROGRAMMED'>('ALL');

  // Sport Championship Modal State
  const [selectedSportForModal, setSelectedSportForModal] = useState<Sport | null>(null);
  const [isSportModalOpen, setIsSportModalOpen] = useState(false);
  const [preselectedSportId, setPreselectedSportId] = useState<string | undefined>(undefined);

  // Deletion Modal state
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Only CENTRAL_ADMIN and Technical Committee Heads can create, assign or delete tournaments
  const isCentralAdmin = userProfile?.role === 'CENTRAL_ADMIN';
  const isSportManager = userProfile?.role === 'SPORT_MANAGER';
  const isTechCommitteeHead = userProfile?.isTechCommitteeHead === true;

  // Allowed sport IDs for technical committee head
  const allowedSportIds = useMemo(() => {
    if (isCentralAdmin) return null; // null means unrestricted
    if (isTechCommitteeHead) {
      const list: string[] = [];
      if (userProfile?.techCommitteeSports && userProfile.techCommitteeSports.length > 0) {
        list.push(...userProfile.techCommitteeSports);
      }
      if (userProfile?.sportId && !list.includes(userProfile.sportId)) {
        list.push(userProfile.sportId);
      }
      return list;
    }
    return [];
  }, [isCentralAdmin, isTechCommitteeHead, userProfile]);

  const canCreate = isCentralAdmin || (isTechCommitteeHead && (allowedSportIds === null || allowedSportIds.length > 0));

  const canManageSport = (sportId: string) => {
    if (isCentralAdmin) return true;
    if (isTechCommitteeHead && allowedSportIds && allowedSportIds.includes(sportId)) return true;
    return false;
  };

  // Determine manager sport specialty
  const managerSportId = useMemo(() => {
    if (!isSportManager) return undefined;
    if (userProfile?.sportId) return userProfile.sportId;
    const assignedTourn = tournaments.find(t =>
      (t.managerEmail && t.managerEmail.toLowerCase() === userProfile?.email?.toLowerCase()) ||
      (t.managerName && t.managerName === userProfile?.fullName)
    );
    return assignedTourn?.sportId || 'basketball';
  }, [userProfile, isSportManager, tournaments]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tournList, sportsList, season, allTeachers, studentsList, schoolsList, matchList] = await Promise.all([
        DataService.getTournaments(),
        DataService.getSportsConfig(),
        DataService.getActiveSeason(),
        DataService.getTeachers(),
        DataService.getStudents(),
        DataService.getSchools(),
        DataService.getMatches()
      ]);
      setTournaments(deduplicateById(tournList));
      setSportsConfig(sportsList);
      setTeachers(deduplicateById(allTeachers));
      setAllStudents(deduplicateById(studentsList));
      setSchools(deduplicateById(schoolsList));
      setMatches(deduplicateById(matchList));
      if (season) {
        setActiveSeason(season);
      }
    } catch (e) {
      console.error(e);
      toast.error('تعذر تحميل بيانات البطولات والرياضات');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = async (newTourns: Omit<Tournament, 'id'> | Omit<Tournament, 'id'>[]) => {
    try {
      const items = Array.isArray(newTourns) ? newTourns : [newTourns];
      const createdItems: Tournament[] = [];
      
      for (const item of items) {
        const created = await DataService.addTournament(item);
        createdItems.push(created);
      }
      
      setTournaments(prev => deduplicateById([...createdItems, ...prev]));
      
      if (items.length > 1) {
        toast.success(`تم إنشاء وبرمجة ${items.length} بطولات بنجاح وفقاً للفئات والأجناس المحددة!`);
      } else {
        toast.success('تمت إضافة البطولة وبرمجتها بنجاح!');
      }

      // Refresh sports config to update statuses
      const updatedSports = await DataService.getSportsConfig();
      setSportsConfig(updatedSports);
    } catch (e) {
      toast.error('حدث خطأ أثناء حفظ البطولة');
    }
  };

  const handleOpenProgramModal = (sportId?: string) => {
    setPreselectedSportId(sportId);
    setIsModalOpen(true);
  };

  const promptDeleteTournament = (t: Tournament, e: React.MouseEvent) => {
    e.stopPropagation();
    setTournamentToDelete(t);
  };

  const handleConfirmDelete = async () => {
    if (!tournamentToDelete) return;
    setIsDeleting(true);
    try {
      await DataService.deleteTournament(tournamentToDelete.id);
      setTournaments(prev => prev.filter(t => t.id !== tournamentToDelete.id));
      toast.success('تم حذف البطولة بنجاح');
      setTournamentToDelete(null);
    } catch (e) {
      toast.error('تعذر حذف البطولة');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportAllCrossCountry = async () => {
    const loadToastId = toast.loading('جاري تحضير وتصدير ملف فئات العدو الريفي الثمانية...');
    try {
      const allStudents = await DataService.getStudents();
      const ccStudents = allStudents.filter(s => s.sportId === 'cross_country');

      if (ccStudents.length === 0) {
        toast.dismiss(loadToastId);
        toast.error('لا يوجد تلاميذ مسجلين في العدو الريفي حالياً لتصديرهم.');
        return;
      }

      const workbook = XLSX.utils.book_new();
      let hasData = false;

      const ccCategories = [
        { category: 'U12', gender: 'Male', label: 'البراعم ذكور (U12)' },
        { category: 'U12', gender: 'Female', label: 'البرعمات إناث (U12)' },
        { category: 'U15', gender: 'Male', label: 'الصغار ذكور (U15)' },
        { category: 'U15', gender: 'Female', label: 'الصغيرات إناث (U15)' },
        { category: 'U18', gender: 'Male', label: 'الفتيان ذكور (U18)' },
        { category: 'U18', gender: 'Female', label: 'الفتيات إناث (U18)' },
        { category: 'U20', gender: 'Male', label: 'الشبان ذكور (U20)' },
        { category: 'U20', gender: 'Female', label: 'الشابات إناث (U20)' },
      ];

      ccCategories.forEach(cat => {
        const participants = ccStudents.filter(s => 
          s.category === cat.category && 
          s.gender === cat.gender
        );

        const sheetData = participants.length > 0 
          ? participants.map((p, index) => ({
              'الرقم الترتيبي': index + 1,
              'الاسم والنسب': p.fullName,
              'الجنس': p.gender === 'Male' ? 'ذكر' : 'أنثى',
              'تاريخ الازدياد': p.birthDate,
              'الفئة الرياضية': p.category,
              'المؤسسة التعليمية': p.schoolName,
              'نوع المشاركة': p.participationType === 'school_team' ? 'فريق المؤسسة' : 'فردي',
              'المسافة المبرمجة': p.distance || '',
            }))
          : [
              {
                'تنبيه': 'لا يوجد تلاميذ مسجلين في هذه الفئة بعد'
              }
            ];

        if (participants.length > 0) {
          hasData = true;
        }

        const worksheet = XLSX.utils.json_to_sheet(sheetData);
        worksheet['!views'] = [{ RTL: true }];
        const sheetName = cat.label.substring(0, 30);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });

      const fileName = `ملف_العدو_الريفي_الموحد_للفئات_الثمانية_${activeSeason.replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.dismiss(loadToastId);
      if (hasData) {
        toast.success('تم تصدير الملف الموحد لجميع الفئات الثمانية بنجاح!');
      } else {
        toast.success('تم تصدير هيكل الملف الموحد (الفئات فارغة حالياً)');
      }
    } catch (error) {
      console.error('Error exporting cross country workbook:', error);
      toast.dismiss(loadToastId);
      toast.error('حدث خطأ أثناء محاولة تصدير البيانات بصيغة إكسيل.');
    }
  };

  // Group tournaments by sport & check programming status
  const sportsWithTournamentData = useMemo(() => {
    const seasonalCats = getAgeCategoriesForSeason(activeSeason);

    return sportsConfig.map(sport => {
      const sportTournaments = tournaments.filter(t => t.sportId === sport.id);
      
      // Determine if programmed
      const isProgrammed = sport.isProgrammed !== undefined
        ? sport.isProgrammed
        : (sport.id === 'cross_country' ||
           sportTournaments.length > 0 ||
           (sport.ageCategories && sport.ageCategories.length > 0 && sport.studentLimit !== undefined && sport.studentLimit > 0));

      // Technical head
      const techHead = teachers.find(tch =>
        tch.isTechCommitteeHead &&
        (tch.techCommitteeSports?.includes(sport.id) || tch.sportId === sport.id)
      );

      // Categories
      const categoriesList = (sport.ageCategories && sport.ageCategories.length > 0)
        ? sport.ageCategories
        : seasonalCats.map(c => c.id);

      // Student count
      const registeredCount = allStudents.filter(s => s.sportId === sport.id).length;

      return {
        sport,
        sportTournaments,
        isProgrammed,
        techHead,
        categoriesList,
        registeredCount
      };
    });
  }, [sportsConfig, tournaments, teachers, allStudents, activeSeason]);

  // Filtered sports list
  const filteredSports = useMemo(() => {
    return sportsWithTournamentData.filter(item => {
      const { sport, isProgrammed, techHead } = item;

      // Filter by Sport
      if (filterSport !== 'ALL' && sport.id !== filterSport) return false;

      // Filter by Status
      if (filterStatus === 'PROGRAMMED' && !isProgrammed) return false;
      if (filterStatus === 'UNPROGRAMMED' && isProgrammed) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = sport.name.toLowerCase().includes(q);
        const matchDesc = (sport.description || '').toLowerCase().includes(q);
        const matchHead = techHead?.fullName.toLowerCase().includes(q);
        return matchName || matchDesc || matchHead;
      }

      return true;
    });
  }, [sportsWithTournamentData, filterSport, filterStatus, search]);

  const handleOpenSportModal = (sport: Sport) => {
    setSelectedSportForModal(sport);
    setIsSportModalOpen(true);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-3xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-black text-slate-800">بطولات الرياضات الإقليمية (مجمعة حسب التخصص)</h2>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-extrabold px-2 py-0.5 rounded-full border border-blue-200">
              مديرية تاوريرت
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            تجميع كافة الفئات داخل بطولة كل رياضة. تكون الرياضات غير المعدة باللون الرمادي إلى حين إعداد ضوابطها وبرمجتها.
          </p>
        </div>

        {canCreate && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportAllCrossCountry}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>ملف العدو الريفي (8 فئات)</span>
            </button>

            <button
              onClick={() => handleOpenProgramModal()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة / برمجة بطولة جديدة</span>
            </button>
          </div>
        )}
      </div>

      {/* Notice for Sport Managers */}
      {isSportManager && (
        <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50/70 to-slate-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-900 shadow-3xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold shadow-xs shrink-0">
              {managerSportId ? SPORTS_MAP[managerSportId]?.icon : '🏅'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-800">
                  فضاء مسؤول النشاط الرياضي {managerSportId ? `(${SPORTS_MAP[managerSportId]?.name})` : ''}
                </span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  صلاحيات مخصصة
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                يمكنك الاطلاع على ضوابط البطولة المعتمدة، برمجة المباريات، وتوجيه المؤسسات للتباري.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <a
              href="/matches"
              className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors shadow-xs"
            >
              برمجة مباراة الآن
            </a>
            <a
              href="/schools"
              className="px-3 py-1.5 bg-white text-blue-700 border border-blue-300 rounded-xl font-bold text-xs hover:bg-blue-50 transition-colors"
            >
              المؤسسات والفرق
            </a>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-3xs">
        <div className="flex flex-1 items-center px-2 w-full">
          <Search className="h-4 w-4 text-slate-400 ml-2 shrink-0" />
          <input
            type="text"
            placeholder="ابحث عن رياضة، بطولة، أو اسم رئيس اللجنة التقنية المكلف..."
            className="w-full border-0 focus:ring-0 text-xs py-1 text-slate-800 placeholder-slate-400 focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto border-t md:border-t-0 md:border-r border-slate-100 pt-2 md:pt-0 md:pr-3 shrink-0">
          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">الحالة:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="PROGRAMMED">🟢 المبرمجة فقط</option>
              <option value="UNPROGRAMMED">⚪ غير المبرمجة (في طور الإعداد)</option>
            </select>
          </div>

          {/* Sport Filter Dropdown */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">الرياضة:</span>
            <select
              value={filterSport}
              onChange={(e) => setFilterSport(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer max-w-[160px]"
            >
              <option value="ALL">🏆 جميع الرياضات</option>
              {sportsConfig.map(s => (
                <option key={s.id} value={s.id}>
                  {s.icon || '🏆'} {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSports.length > 0 ? (
            filteredSports.map((item, index) => {
              const { sport, sportTournaments, isProgrammed, techHead, categoriesList, registeredCount } = item;
              const isManagerSpecialty = managerSportId && sport.id === managerSportId;
              const canManageThis = canManageSport(sport.id);

              // 1. Cross Country Championship Card
              if (sport.id === 'cross_country') {
                return (
                  <div
                    key={sport.id}
                    onClick={() => setIsCcModalOpen(true)}
                    className="flex flex-col rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white border border-slate-800 shadow-md overflow-hidden transition-all hover:shadow-xl hover:border-blue-500/50 cursor-pointer group"
                  >
                    <div className="p-4 md:p-5 flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-xs text-2xl flex items-center justify-center border border-white/20 shadow-xs group-hover:scale-105 transition-transform">
                            🏃‍♂️
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                                بطولة العدو الريفي
                              </span>
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                                8 فئات مدمجة
                              </span>
                            </div>
                            <span className="text-[10px] font-medium text-slate-300">الموسم {activeSeason}</span>
                          </div>
                        </div>

                        <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          بطولة واحدة شاملة
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-black text-white leading-snug group-hover:text-blue-200 transition-colors">
                          البطولة الإقليمية المدرسية للعدو الريفي
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed font-medium">
                          تجمع كافة السباقات للفئات العمرية الـ8 الذكور والإناث (U12, U15, U18, U20).
                        </p>
                      </div>

                      {/* Categories Pills */}
                      <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-300 flex items-center justify-between">
                          <span>الفئات الثمانية المعتمدة (8 Categories):</span>
                          <span className="text-emerald-400 font-mono text-[9px]">{registeredCount} تلميذ(ة)</span>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          <span className="bg-blue-500/20 text-blue-200 px-1.5 py-0.5 rounded border border-blue-500/30">البراعم U12</span>
                          <span className="bg-emerald-500/20 text-emerald-200 px-1.5 py-0.5 rounded border border-emerald-500/30">الصغار U15</span>
                          <span className="bg-amber-500/20 text-amber-200 px-1.5 py-0.5 rounded border border-amber-200/30">الفتيان U18</span>
                          <span className="bg-purple-500/20 text-purple-200 px-1.5 py-0.5 rounded border border-purple-200/30">الشبان U20</span>
                        </div>
                      </div>

                      {/* Technical Head */}
                      <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <ShieldCheck className="h-4 w-4 text-emerald-400" />
                          <span>رئيس اللجنة التقنية:</span>
                        </div>
                        <span className="font-bold text-amber-300">
                          {techHead ? techHead.fullName : 'ذ. عبد الرحيم بلقاسم'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-white/10 border-t border-white/10 flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCcModalOpen(true);
                        }}
                        className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                      >
                        <Layers className="h-4 w-4" />
                        <span>دخول البطولة واستعراض الفئات الـ8</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportAllCrossCountry();
                        }}
                        title="تصدير ملف العدو الريفي الموحد Excel"
                        className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              }

              // 2. UNPROGRAMMED SPORT CARD (Greyed Out Style)
              if (!isProgrammed) {
                return (
                  <div
                    key={sport.id}
                    className="flex flex-col rounded-2xl bg-slate-100/90 border border-dashed border-slate-300 text-slate-500 overflow-hidden transition-all hover:border-slate-400 hover:bg-slate-100 shadow-3xs opacity-85 hover:opacity-100"
                  >
                    <div className="p-4 md:p-5 flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-slate-200/80 text-xl flex items-center justify-center border border-slate-300/60 grayscale opacity-80">
                            {sport.icon || '🏆'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {sport.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-medium text-slate-400">الموسم {activeSeason}</span>
                          </div>
                        </div>

                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-600 border border-slate-300">
                          <Lock className="h-3 w-3 text-slate-500" />
                          غير مبرمجة بعد
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-700 leading-snug">
                        البطولة الإقليمية لـ {sport.name}
                      </h3>

                      <p className="text-xs text-slate-500 leading-relaxed bg-white/60 p-2.5 rounded-xl border border-slate-200/60">
                        في انتظار تحديد الفئات العمرية وضوابط المشاركة من طرف المسير المركزي أو رئيس اللجنة التقنية المكلف.
                      </p>

                      {/* Technical Committee Head Info */}
                      <div className="bg-slate-200/50 p-2.5 rounded-xl border border-slate-300/50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <ShieldCheck className="h-4 w-4 text-slate-500" />
                          <span>رئيس اللجنة التقنية:</span>
                        </div>
                        <span className="font-bold text-slate-700">
                          {techHead ? techHead.fullName : 'لم يتم التعيين بعد'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-200/60 border-t border-slate-300/60 flex items-center justify-between gap-2">
                      {canManageThis ? (
                        <button
                          onClick={() => handleOpenProgramModal(sport.id)}
                          className="w-full py-2 px-3 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                        >
                          <Settings className="h-4 w-4" />
                          <span>إعداد وبرمجة البطولة الآن</span>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full py-2 px-3 bg-slate-300/80 text-slate-500 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <span>في طور الإعداد (غير مبرمجة)</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              // 3. PROGRAMMED SPORT CARD (Active Color Card)
              return (
                <div
                  key={sport.id}
                  className={`flex flex-col rounded-2xl bg-white border shadow-3xs overflow-hidden transition-all hover:shadow-md ${
                    isManagerSpecialty
                      ? 'border-blue-300 ring-2 ring-blue-500/10'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="p-4 md:p-5 flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-xl flex items-center justify-center border border-blue-100 shadow-3xs">
                          {sport.icon || '🏆'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                              {sport.name}
                            </span>
                            {isManagerSpecialty && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] bg-amber-50 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                                <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                تخصصك
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-slate-400">الموسم {activeSeason}</span>
                        </div>
                      </div>

                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        🟢 مبرمجة ومفتوحة
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 leading-snug">
                      البطولة الإقليمية المدرسية لـ {sport.name}
                    </h3>

                    {/* Configured Categories & Limit */}
                    <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">الفئات المدمجة:</span>
                        <div className="flex flex-wrap gap-1">
                          {categoriesList.slice(0, 4).map(c => (
                            <span key={c} className="bg-blue-100/80 text-blue-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-slate-500">التلاميذ المسجلين:</span>
                        <strong className="text-emerald-700 font-bold">{registeredCount} تلميذ(ة)</strong>
                      </div>
                    </div>

                    {/* Technical Committee Head */}
                    <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 p-2.5 rounded-xl border border-blue-100/90 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                        <span>رئيس اللجنة التقنية:</span>
                      </div>
                      <span className="font-bold text-slate-900 text-[11px]">
                        {techHead ? techHead.fullName : 'لم يتم التعيين بعد'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenSportModal(sport)}
                      className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-3xs cursor-pointer"
                    >
                      <Layers className="h-4 w-4" />
                      <span>دخول البطولة واستعراض الفئات ({categoriesList.length})</span>
                    </button>

                    {canManageThis && (
                      <button
                        onClick={() => handleOpenProgramModal(sport.id)}
                        title="تعديل أو إضافة فئات للبطولة"
                        className="p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer border border-slate-200 bg-white"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-500 bg-white rounded-2xl border border-slate-200 text-center">
              <Trophy className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700 mb-1">لا توجد رياضات مطابقة للبحث</p>
              <p className="text-xs text-slate-400 mb-4">يمكنك تغيير فلتر الرياضة أو الفلتر المعتمد أعلاه</p>
            </div>
          )}
        </div>
      )}

      {/* Create / Program Tournament Modal */}
      <CreateTournamentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPreselectedSportId(undefined);
        }}
        allowedSportIds={allowedSportIds}
        preselectedSportId={preselectedSportId}
        onCreated={handleCreateTournament}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!tournamentToDelete}
        onClose={() => setTournamentToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="حذف البطولة الإقليمية"
        message="هل أنت متأكد من رغبتك في حذف هذه البطولة نهائياً؟ سيتم مسح كافة البيانات والإعدادات المرتبطة بها."
        itemName={tournamentToDelete?.name}
        isDeleting={isDeleting}
      />

      {/* Cross Country Championship Unified 8 Categories Modal */}
      <CrossCountryChampionshipModal
        isOpen={isCcModalOpen}
        onClose={() => setIsCcModalOpen(false)}
        tournaments={tournaments}
        allStudents={allStudents}
        schools={schools}
        techHead={teachers.find(tch => tch.isTechCommitteeHead && (tch.techCommitteeSports?.includes('cross_country') || tch.sportId === 'cross_country'))}
        activeSeason={activeSeason}
      />

      {/* General Sport Championship Modal for viewing categories, controls & rosters */}
      <SportChampionshipModal
        isOpen={isSportModalOpen}
        onClose={() => setIsSportModalOpen(false)}
        sport={selectedSportForModal}
        tournaments={tournaments.filter(t => t.sportId === selectedSportForModal?.id)}
        allStudents={allStudents}
        schools={schools}
        matches={matches}
        teachers={teachers}
        activeSeason={activeSeason}
        canManage={selectedSportForModal ? canManageSport(selectedSportForModal.id) : false}
        isProgrammed={selectedSportForModal ? (
          selectedSportForModal.id === 'cross_country' ||
          tournaments.some(t => t.sportId === selectedSportForModal.id)
        ) : false}
        onProgramTournament={(sId) => {
          setIsSportModalOpen(false);
          handleOpenProgramModal(sId);
        }}
      />
    </div>
  );
};
