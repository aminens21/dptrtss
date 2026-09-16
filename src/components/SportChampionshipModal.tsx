import React, { useState, useMemo, useEffect } from 'react';
import { Tournament, Student, School, User, Sport, Match } from '../types';
import { SPORTS_MAP, getAgeCategoriesForSeason } from '../lib/dataService';
import { AppLogo } from './AppLogo';
import { CountdownTimer } from './CountdownTimer';
import { RegisterStudentModal } from './RegisterStudentModal';
import { EditDeadlineModal } from './EditDeadlineModal';
import { ParticipationFormPdfModal } from './ParticipationFormPdfModal';
import * as XLSX from 'xlsx';
import {
  X,
  Trophy,
  Users,
  Search,
  Filter,
  Download,
  FileText,
  ShieldCheck,
  Phone,
  Calendar,
  Layers,
  Settings,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  Edit,
  Clock,
  Plus,
  GraduationCap,
  Maximize2,
  Minimize2,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  Building2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SportChampionshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  sport: Sport | null;
  tournaments: Tournament[];
  allStudents: Student[];
  schools: School[];
  matches: Match[];
  teachers: User[];
  activeSeason: string;
  canManage: boolean;
  isProgrammed: boolean;
  onProgramTournament: (sportId: string) => void;
  onRefreshData?: () => void;
}

export const SportChampionshipModal: React.FC<SportChampionshipModalProps> = ({
  isOpen,
  onClose,
  sport,
  tournaments,
  allStudents,
  schools,
  matches,
  teachers,
  activeSeason,
  canManage,
  isProgrammed,
  onProgramTournament,
  onRefreshData
}) => {
  // Refresh data on open
  useEffect(() => {
    if (isOpen && onRefreshData) {
      onRefreshData();
    }
  }, [isOpen, onRefreshData]);

  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<'ALL' | 'Male' | 'Female'>('ALL');
  const [selectedAffiliation, setSelectedAffiliation] = useState<'non_club' | 'club_affiliated'>('non_club');
  const [activeBranchModal, setActiveBranchModal] = useState<'non_club' | 'club_affiliated' | null>(null);
  const [search, setSearch] = useState('');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isEditDeadlineOpen, setIsEditDeadlineOpen] = useState(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedSchoolNameForView, setSelectedSchoolNameForView] = useState<string | null>(null);
  const [pdfSchoolName, setPdfSchoolName] = useState<string | null>(null);

  useEffect(() => {
    setActiveBranchModal(null);
    setSelectedSchoolNameForView(null);
    setPdfSchoolName(null);
  }, [sport?.id]);

  useEffect(() => {
    setSelectedSchoolNameForView(null);
  }, [selectedAffiliation]);

  // Compute deadline for this sport from its tournaments
  const currentDeadline = useMemo(() => {
    if (!sport) return null;
    const sportTournaments = tournaments.filter(t => t.sportId === sport.id);
    const withDeadline = sportTournaments.find(t => t.registrationDeadline);
    return withDeadline?.registrationDeadline || null;
  }, [tournaments, sport]);

  // Head of Technical Committee assigned to this sport
  const techHead = useMemo(() => {
    if (!sport || !teachers) return null;
    return teachers.find(tch =>
      tch.isTechCommitteeHead &&
      (tch.techCommitteeSports?.includes(sport.id) || tch.sportId === sport.id)
    );
  }, [teachers, sport]);

  // Categories list configured for this sport
  const seasonalCategories = getAgeCategoriesForSeason(activeSeason);
  const sportCategories = useMemo(() => {
    return (sport?.ageCategories && sport.ageCategories.length > 0)
      ? sport.ageCategories
      : seasonalCategories.map(c => c.id);
  }, [sport, activeSeason, seasonalCategories]);

  // Set default category on open or when sport changes
  useEffect(() => {
    if (isOpen && sportCategories && sportCategories.length > 0) {
      setSelectedCatId(sportCategories[0]);
    } else {
      setSelectedCatId('ALL');
    }
  }, [isOpen, sport?.id, sportCategories]);

  // Students registered for this sport
  const sportStudents = allStudents.filter(s => s && s.sportId === sport?.id);

  const nonClubStudents = useMemo(() => {
    return sportStudents.filter(s => (s.affiliationType || 'non_club') === 'non_club');
  }, [sportStudents]);

  const clubStudents = useMemo(() => {
    return sportStudents.filter(s => s.affiliationType === 'club_affiliated');
  }, [sportStudents]);

  const nonClubSchoolsCount = useMemo(() => {
    const names = new Set(nonClubStudents.map(s => s.schoolName).filter(Boolean));
    return names.size;
  }, [nonClubStudents]);

  const clubSchoolsCount = useMemo(() => {
    const names = new Set(clubStudents.map(s => s.schoolName).filter(Boolean));
    return names.size;
  }, [clubStudents]);

  const currentSchoolForPdf = selectedSchoolNameForView || pdfSchoolName;
  const targetSchoolStudents = useMemo(() => {
    if (!currentSchoolForPdf) return [];
    return sportStudents.filter(s => 
      s.schoolName === currentSchoolForPdf &&
      (s.affiliationType || 'non_club') === (activeBranchModal || selectedAffiliation)
    );
  }, [sportStudents, currentSchoolForPdf, activeBranchModal, selectedAffiliation]);

  // Filter students by active category tab & gender & search & affiliationType
  const filteredStudents = sportStudents.filter(s => {
    if (!s) return false;
    const sCategory = s.category || '';
    const sGender = s.gender || '';
    const sFullName = s.fullName || '';
    const sSchoolName = s.schoolName || '';
    const sAffType = s.affiliationType || 'non_club';

    const matchCategory = selectedCatId === 'ALL' || sCategory.toUpperCase() === selectedCatId.toUpperCase();
    const matchGender = selectedGender === 'ALL' || sGender.toLowerCase() === selectedGender.toLowerCase();
    const matchAffiliation = sAffType === selectedAffiliation;
    const matchSearch = !search.trim() ||
      sFullName.toLowerCase().includes(search.toLowerCase()) ||
      sSchoolName.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchGender && matchAffiliation && matchSearch;
  });

  // Matches for this sport
  const sportMatches = matches.filter(m => m.sportId === sport?.id);

  const getCategoryName = (catId: string) => {
    const found = seasonalCategories.find(c => c.id === catId);
    return found ? found.shortName || found.name : catId;
  };

  // List of all participating schools with participant counts, gender counts, and category details
  const participatingSchools = useMemo(() => {
    const affiliationStudents = sportStudents.filter(s => {
      const sAffType = s.affiliationType || 'non_club';
      return sAffType === selectedAffiliation;
    });

    const schoolsMap: Record<string, {
      name: string;
      totalCount: number;
      maleCount: number;
      femaleCount: number;
      categories: string[];
    }> = {};

    affiliationStudents.forEach(s => {
      if (!s.schoolName) return;
      if (!schoolsMap[s.schoolName]) {
        schoolsMap[s.schoolName] = {
          name: s.schoolName,
          totalCount: 0,
          maleCount: 0,
          femaleCount: 0,
          categories: []
        };
      }
      schoolsMap[s.schoolName].totalCount += 1;
      if (s.gender === 'Male') {
        schoolsMap[s.schoolName].maleCount += 1;
      } else {
        schoolsMap[s.schoolName].femaleCount += 1;
      }
      if (s.category && !schoolsMap[s.schoolName].categories.includes(s.category)) {
        schoolsMap[s.schoolName].categories.push(s.category);
      }
    });

    return Object.values(schoolsMap).filter(sch => {
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      const matchSchoolName = sch.name.toLowerCase().includes(term);
      const matchCategories = sch.categories.some(catId => 
        getCategoryName(catId).toLowerCase().includes(term)
      );
      return matchSchoolName || matchCategories;
    });
  }, [sportStudents, selectedAffiliation, search, sportCategories]);

  // Students belonging to the currently selected school in this sport & affiliation
  const schoolStudents = useMemo(() => {
    if (!selectedSchoolNameForView) return [];
    return sportStudents.filter(s => 
      s.schoolName === selectedSchoolNameForView &&
      (s.affiliationType || 'non_club') === (activeBranchModal || selectedAffiliation)
    );
  }, [sportStudents, selectedSchoolNameForView, activeBranchModal, selectedAffiliation]);

  // Grouped students of this school by category
  const groupedSchoolStudents = useMemo(() => {
    const groups: Record<string, Student[]> = {};
    schoolStudents.forEach(s => {
      if (!s.category) return;
      const key = s.category;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(s);
    });
    return groups;
  }, [schoolStudents]);

  const handleExportCategoryExcel = (catId: string) => {
    const isAll = catId === 'ALL';
    const targets = isAll ? sportStudents : sportStudents.filter(s => s.category === catId);

    if (targets.length === 0) {
      toast.error('لا يوجد تلاميذ مسجلين حالياً للتصدير');
      return;
    }

    const loadToastId = toast.loading('جاري تحضير ملف الإكسيل...');
    try {
      const excelData = targets.map((p, index) => {
        const base: any = {
          'الرقم الترتيبي': index + 1,
          'الاسم والنسب': p.fullName,
          'الجنس': p.gender === 'Male' ? 'ذكر' : 'أنثى',
          'تاريخ الازدياد': p.birthDate,
          'الفئة الرياضية': getCategoryName(p.category),
          'المؤسسة التعليمية': p.schoolName,
        };

        if (sport?.id === 'athletics') {
          base['التخصص الفرعي'] = p.athleticsSpecialty || 'غير محدد';
        }

        return base;
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      worksheet['!views'] = [{ RTL: true }];
      const workbook = XLSX.utils.book_new();
      const sheetName = isAll ? 'جميع المشاركين' : getCategoryName(catId).substring(0, 30);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      const fileName = `مشاركي_بطولة_${(sport?.name || 'رياضة').replace(/\s+/g, '_')}_${isAll ? 'جميع_الفئات' : catId}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.dismiss(loadToastId);
      toast.success('تم تصدير ملف الإكسيل بنجاح!');
    } catch (e) {
      console.error(e);
      toast.dismiss(loadToastId);
      toast.error('تعذر تصدير الملف');
    }
  };

  if (!isOpen || !sport) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className={`bg-white rounded-2xl border border-slate-200 shadow-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto transition-all ${
        isFullScreen ? 'max-w-[98vw] h-[96vh]' : 'max-w-6xl xl:max-w-7xl h-[85vh] max-h-[92vh]'
      }`}>
        
        {/* Top Header */}
        <div className={`p-3 sm:p-4 md:p-5 border-b flex items-center justify-between gap-3 flex-wrap ${
          isProgrammed
            ? 'bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border-slate-800'
            : 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 text-white border-slate-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl text-xl md:text-2xl flex items-center justify-center border shadow-xs shrink-0 ${
              isProgrammed ? 'bg-white/10 border-white/20' : 'bg-slate-600/40 border-slate-500/40 opacity-80'
            }`}>
              {sport.icon || '🏆'}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isProgrammed
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {isProgrammed ? '🟢 مبرمجة ومفتوحة للتسجيل' : '⚪ غير مبرمجة (في طور الإعداد)'}
                </span>

                <span className="text-[10px] font-medium text-slate-300 bg-white/10 px-2 py-0.5 rounded border border-white/10">
                  الموسم الدراسي {activeSeason}
                </span>
              </div>

              <h2 className="text-base md:text-lg font-black text-white mt-1 leading-tight">
                البطولة الإقليمية المدرسية لـ {sport.name}
              </h2>
              {!isHeaderCollapsed && (
                <p className="text-xs text-slate-300 mt-0.5 font-medium line-clamp-1">
                  {sport.description || `المسابقات والبطولات المدرسية الخاصة بـ ${sport.name} بمديرية تاوريرت`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 mr-auto">
            {/* Toggle Collapse/Expand */}
            <button
              type="button"
              onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer border border-white/15 shadow-2xs"
              title={isHeaderCollapsed ? 'إظهار لوحة العداد والضوابط' : 'إخفاء هذا الجزء لتوسيع جدول وتفاصيل التلاميذ المسجلين'}
            >
              {isHeaderCollapsed ? (
                <>
                  <ChevronDown className="h-4 w-4 text-emerald-300 animate-pulse" />
                  <span>إظهار لوحة المؤشرات والعداد</span>
                </>
              ) : (
                <>
                  <ChevronUp className="h-4 w-4 text-amber-300" />
                  <span>إخفاء هذا الجزء (توسيع جدول التلاميذ)</span>
                </>
              )}
            </button>

            {/* Quick Register button when collapsed */}
            {isHeaderCollapsed && isProgrammed && (
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>تسجيل مشاركين</span>
              </button>
            )}

            {/* Fullscreen / Maximize toggle */}
            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title={isFullScreen ? 'استعادة الحجم الطبيعي' : 'ملء الشاشة بالكامل (أقصى اتساع)'}
            >
              {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-3 sm:p-4 md:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">

          {/* TWO SEPARATE CHAMPIONSHIP CARDS (Non-club = White, Club-affiliated = Yellow) */}
          {/* TWO SEPARATE CHAMPIONSHIP CARDS (Non-club = White, Club-affiliated = Yellow) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Non-club Tournament (White card) */}
            <div
              id="non-club-championship-card"
              onClick={() => {
                setSelectedAffiliation('non_club');
                setSelectedSchoolNameForView(null);
                setActiveBranchModal('non_club');
              }}
              className="text-right p-5 rounded-2xl border-2 border-slate-200/90 hover:border-blue-500 bg-white hover:bg-blue-50/20 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[220px] relative overflow-hidden shadow-2xs hover:shadow-md group"
            >
              <div className="space-y-2 w-full">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-black px-3 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1.5 shadow-3xs">
                    <span>⚪</span>
                    <span>بطولة غير المنتمين للأندية</span>
                  </span>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    {nonClubSchoolsCount} مؤسسة مشاركة
                  </span>
                </div>
                <h4 className="text-base font-black text-slate-800 mt-1 group-hover:text-blue-700 transition-colors">
                  البطولة المدرسية لغير المنتمين للأندية
                </h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  خاصة بالتلاميذ المتمدرسين العاديين غير المنخرطين في الأندية الرياضية أو العصب المدنية.
                </p>

                {/* List of categories with counts for this affiliation */}
                <div className="mt-3 flex flex-wrap gap-1 border-t border-slate-100 pt-3">
                  {sportCategories.map(catId => {
                    const count = nonClubStudents.filter(s => s.category === catId).length;
                    return (
                      <span key={catId} className={`text-[10px] px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 border ${
                        count > 0 
                          ? 'bg-blue-50 text-blue-800 border-blue-200' 
                          : 'bg-slate-50 text-slate-400 border-slate-100'
                      }`}>
                        <span>{getCategoryName(catId)}:</span>
                        <strong className="font-black">{count}</strong>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-slate-100 pt-3.5 w-full mt-4 gap-2">
                <div className="flex items-center justify-between sm:justify-start gap-2">
                  <span className="text-xs text-slate-400 font-bold">المشاركون:</span>
                  <strong className="text-xs font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                    {nonClubStudents.length} تلميذ(ة)
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAffiliation('non_club');
                    setSelectedSchoolNameForView(null);
                    setActiveBranchModal('non_club');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:scale-102 active:scale-98"
                >
                  <span>دخول واستعراض المؤسسات المشاركة 🔓</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Club-affiliated Tournament (Yellow card) */}
            <div
              id="club-affiliated-championship-card"
              onClick={() => {
                setSelectedAffiliation('club_affiliated');
                setSelectedSchoolNameForView(null);
                setActiveBranchModal('club_affiliated');
              }}
              className="text-right p-5 rounded-2xl border-2 border-amber-200 hover:border-amber-400 bg-amber-50/40 hover:bg-amber-50/80 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[220px] relative overflow-hidden shadow-2xs hover:shadow-md group text-amber-950"
            >
              <div className="space-y-2 w-full">
                <div className="flex items-center justify-between w-full">
                  <span className="text-[11px] font-black px-3 py-1 rounded-full border bg-amber-100 text-amber-900 border-amber-300 flex items-center gap-1.5 shadow-3xs">
                    <span>🟡</span>
                    <span>بطولة المنتمين للأندية والجمعيات</span>
                  </span>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-900 border border-amber-200">
                    {clubSchoolsCount} مؤسسة مشاركة
                  </span>
                </div>
                <h4 className="text-base font-black text-amber-900 mt-1 group-hover:text-amber-950 transition-colors">
                  البطولة المدرسية للمنتمين للأندية والجمعيات الرياضية
                </h4>
                <p className="text-xs text-amber-800/80 font-medium leading-relaxed">
                  خاصة بالتلاميذ المتمدرسين الممارسين والمرخصين رسمياً بالنوادي والعصب والجامعات الرياضية.
                </p>

                {/* List of categories with counts for this affiliation */}
                <div className="mt-3 flex flex-wrap gap-1 border-t border-amber-200/60 pt-3">
                  {sportCategories.map(catId => {
                    const count = clubStudents.filter(s => s.category === catId).length;
                    return (
                      <span key={catId} className={`text-[10px] px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 border ${
                        count > 0 
                          ? 'bg-amber-100 text-amber-900 border-amber-300' 
                          : 'bg-amber-50/30 text-amber-800/40 border-amber-100/40'
                      }`}>
                        <span>{getCategoryName(catId)}:</span>
                        <strong className="font-black">{count}</strong>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-amber-200/60 pt-3.5 w-full mt-4 gap-2">
                <div className="flex items-center justify-between sm:justify-start gap-2">
                  <span className="text-xs text-amber-800 font-bold">المشاركون:</span>
                  <strong className="text-xs font-black text-amber-950 bg-amber-200/60 px-3 py-1 rounded-lg border border-amber-300">
                    {clubStudents.length} تلميذ(ة)
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAffiliation('club_affiliated');
                    setSelectedSchoolNameForView(null);
                    setActiveBranchModal('club_affiliated');
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 hover:scale-102 active:scale-98"
                >
                  <span>دخول واستعراض المؤسسات المشاركة 🔓</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {!isHeaderCollapsed && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Deadline Countdown & Registration CTA Bar */}
              {isProgrammed && (
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border border-slate-700/80">
                  <div className="flex-1 min-w-0">
                    <CountdownTimer deadline={currentDeadline} />
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2.5 shrink-0">
                    {canManage && (
                      <button
                        onClick={() => setIsEditDeadlineOpen(true)}
                        className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>تعديل آخر أجل للتسجيل ✏️</span>
                      </button>
                    )}

                    <button
                      onClick={() => setIsRegisterModalOpen(true)}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2 hover:scale-102 active:scale-98"
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>تسجيل التلاميذ والفرق في هذه البطولة</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Technical Committee Head & Rules Banner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Tech Head info */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0 border border-blue-100">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">رئيس اللجنة التقنية المكلف:</span>
                      <strong className="text-xs font-bold text-slate-800">
                        {techHead ? techHead.fullName : 'لم يتم التعيين بعد (المسؤول المركزي)'}
                      </strong>
                    </div>
                  </div>

                  {techHead?.phone && (
                    <a
                      href={`tel:${techHead.phone}`}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold font-mono flex items-center gap-1 transition-colors"
                      dir="ltr"
                    >
                      <Phone className="h-3 w-3 text-slate-500" />
                      <span>{techHead.phone}</span>
                    </a>
                  )}
                </div>

                {/* Participation limits & Rules */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold shrink-0 border border-purple-100">
                      <Settings className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">سقف مشاركة المؤسسة التعليمية:</span>
                      <strong className="text-xs font-bold text-slate-800">
                        {sport.studentLimit && sport.studentLimit > 0
                          ? `${sport.studentLimit} تلميذ(ة) كأقصى حد`
                          : 'بدون سقف عددي محدّد'}
                      </strong>
                    </div>
                  </div>

                  {canManage && (
                    <button
                      onClick={() => onProgramTournament(sport.id)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>تعديل الضوابط</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Unprogrammed Warning Banner if not programmed */}
              {!isProgrammed && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 shadow-3xs">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-950">هذه البطولة في طور الإعداد حالياً</h4>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        لم يتم تأكيد برمجة الفئات والضوابط لهذه الرياضة نهائياً من طرف المسير المركزي أو رئيس اللجنة التقنية.
                      </p>
                    </div>
                  </div>

                  {canManage && (
                    <button
                      onClick={() => onProgramTournament(sport.id)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                    >
                      برمجة وإعداد البطولة الآن
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Guidance note inside main modal */}
          <div className="p-4 bg-blue-50/50 border border-blue-200/70 rounded-2xl flex items-center justify-between gap-3 text-slate-700 shadow-3xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center font-bold shrink-0">
                ℹ️
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">استعراض وإدارة المؤسسات التعليمية المشاركة</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  يرجى الضغط على زر <strong className="text-blue-700">"دخول واستعراض المؤسسات المشاركة 🔓"</strong> داخل بطاقة الصنف المطلوب أعلاه للولوج إلى اللائحة التفصيلية وتنزيل لوائح المشاركة.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            🏆 بطولة إقليمية مدرسية بمديرية تاوريرت
          </div>

          <div className="flex items-center gap-2">
            {canManage && (
              <button
                onClick={() => handleExportCategoryExcel('ALL')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="h-4 w-4" />
                <span>تصدير جميع الفئات (Excel)</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>

      {/* INNER MODAL: Dedicated branch viewing window for participating schools */}
      {activeBranchModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
            {/* Header */}
            <div className={`p-4 sm:p-5 text-white flex items-center justify-between gap-4 ${
              activeBranchModal === 'non_club'
                ? 'bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900'
                : 'bg-gradient-to-r from-amber-600 via-amber-700 to-yellow-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-xs border ${
                  activeBranchModal === 'non_club'
                    ? 'bg-white/15 border-white/20 text-white'
                    : 'bg-white/20 border-white/30 text-white'
                }`}>
                  {activeBranchModal === 'non_club' ? '⚪' : '🟡'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/20">
                      {activeBranchModal === 'non_club' ? 'بطولة غير المنتمين للأندية' : 'بطولة المنتمين للأندية'}
                    </span>
                    <span className="text-xs text-white/80 font-bold">• {sport.name}</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                    {selectedSchoolNameForView
                      ? `مشاركات مؤسسة: ${selectedSchoolNameForView}`
                      : (activeBranchModal === 'non_club'
                          ? 'المؤسسات التعليمية المشاركة (غير المنتمين)'
                          : 'المؤسسات التعليمية المشاركة (المنتمون للأندية)')}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer hover:scale-102"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">تسجيل مشاركين بهذا الصنف</span>
                  <span className="sm:hidden">تسجيل</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveBranchModal(null);
                    setSelectedSchoolNameForView(null);
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="الرجوع للأصناف الرئيسية"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/60 space-y-4">
              {selectedSchoolNameForView === null ? (
                /* Schools List View inside the Branch */
                <div className="space-y-4">
                  {/* Search and summary */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-3xs">
                    <div className="flex items-center gap-2 flex-1">
                      <Search className="h-4 w-4 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="ابحث عن مؤسسة تعليمية أو فئة عمرية في هذا الصنف..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full text-xs border-0 focus:ring-0 focus:outline-none text-slate-800 placeholder-slate-400"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                        عدد المؤسسات: {participatingSchools.length}
                      </span>
                      {canManage && (
                        <button
                          onClick={() => handleExportCategoryExcel('ALL')}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>تصدير Excel</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Grid of schools */}
                  {participatingSchools.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {participatingSchools.map((sch) => (
                        <div
                          key={sch.name}
                          onClick={() => setSelectedSchoolNameForView(sch.name)}
                          className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-3xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between min-h-[180px] group"
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100 shrink-0 text-base">
                                  🏫
                                </div>
                                <h4 className="text-sm font-black text-slate-800 leading-tight group-hover:text-blue-700 transition-colors">
                                  {sch.name}
                                </h4>
                              </div>
                              <span className="text-[10px] font-black bg-blue-50 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200 shrink-0 whitespace-nowrap">
                                {sch.totalCount} مشارك(ة)
                              </span>
                            </div>

                            {/* Gender breakdown */}
                            <div className="flex gap-2 text-[10px] font-bold text-slate-500">
                              <span className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">👦 ذكور: {sch.maleCount}</span>
                              <span className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">👧 إناث: {sch.femaleCount}</span>
                            </div>

                            {/* Categories tags */}
                            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                              {sch.categories.map((catId) => (
                                <span
                                  key={catId}
                                  className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/50"
                                >
                                  {getCategoryName(catId)}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPdfSchoolName(sch.name);
                                setIsPdfModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                              title="معاينة لائحة المشاركة"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>لائحة المشاركة</span>
                            </button>

                            <div className="flex items-center gap-1 text-[11px] font-black text-blue-600 group-hover:text-blue-700">
                              <span>دخول واستعراض</span>
                              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl text-slate-400 space-y-3">
                      <Building2 className="h-12 w-12 mx-auto text-slate-300" />
                      <p className="text-sm font-bold text-slate-700">لا توجد مؤسسات تعليمية مسجلة في هذا الصنف حالياً</p>
                      <p className="text-xs text-slate-400">يمكنكم تسجيل التلاميذ والفرق مباشرة بالضغط على الزر أعلاه</p>
                      <button
                        type="button"
                        onClick={() => setIsRegisterModalOpen(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>تسجيل مشاركين الآن</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Selected School Drilldown inside Branch */
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* School header bar */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-3xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedSchoolNameForView(null)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                        title="الرجوع للائحة المؤسسات بهذا الصنف"
                      >
                        <ArrowRight className="w-4 h-4" />
                        <span>رجوع للمؤسسات</span>
                      </button>

                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block">مشاركات المؤسسة التعليمية:</span>
                        <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                          <span>{selectedSchoolNameForView}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            activeBranchModal === 'non_club'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {activeBranchModal === 'non_club' ? 'غير المنتمين للأندية' : 'المنتمون للأندية'}
                          </span>
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1.5 rounded-xl">
                        إجمالي المشاركين: {schoolStudents.length} تلميذ(ة)
                      </span>

                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleExportCategoryExcel('ALL')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>تصدير Excel</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setPdfSchoolName(selectedSchoolNameForView);
                          setIsPdfModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        title="معاينة وعرض لائحة المشاركة الرسمية للطباعة والتحميل"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>عرض لائحة المشاركة</span>
                      </button>
                    </div>
                  </div>

                  {/* Categories Breakdown and Student Tables */}
                  {Object.keys(groupedSchoolStudents).length > 0 ? (
                    <div className="space-y-4">
                      {Object.entries(groupedSchoolStudents).map(([catId, studentsVal]) => {
                        const studentsList = studentsVal as Student[];
                        return (
                          <div
                            key={catId}
                            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-3xs"
                          >
                            <div className="p-3 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between">
                              <span className="text-xs font-black text-slate-800 flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                                <span>الفئة الرياضية: {getCategoryName(catId)}</span>
                              </span>
                              <span className="text-[10px] font-black bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-300/50">
                                {studentsList.length} تلميذ(ة) مشارك
                              </span>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-right text-xs">
                                <thead className="bg-slate-50/70 text-slate-600 font-bold border-b border-slate-200">
                                  <tr>
                                    <th className="p-3 text-center w-12">#</th>
                                    <th className="p-3">الاسم والنسب</th>
                                    <th className="p-3">رقم مسار</th>
                                    <th className="p-3">الجنس</th>
                                    <th className="p-3">تاريخ الازدياد</th>
                                    {sport.id === 'athletics' && <th className="p-3">التخصص الفرعي</th>}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-800">
                                  {studentsList.map((stud, idx) => (
                                    <tr key={stud.id || `st-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                      <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                                      <td className="p-3 font-bold text-slate-900">{stud.fullName}</td>
                                      <td className="p-3 font-mono text-[11px] text-slate-600">{stud.massarNumber || '-'}</td>
                                      <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                          stud.gender === 'Male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                                        }`}>
                                          {stud.gender === 'Male' ? 'ذكر' : 'أنثى'}
                                        </span>
                                      </td>
                                      <td className="p-3 font-medium text-slate-600">{stud.birthDate || 'غير متوفر'}</td>
                                      {sport.id === 'athletics' && (
                                        <td className="p-3 font-bold text-purple-700">{stud.athleticsSpecialty || 'عام'}</td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl text-slate-400">
                      <p className="text-xs font-bold text-slate-600">لا توجد مشاركات مسجلة لهذه المؤسسة في هذا الصنف</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer of Inner Modal */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-500 font-medium">
                {selectedSchoolNameForView ? `مؤسسة: ${selectedSchoolNameForView}` : 'نافذة المؤسسات المشاركة في الصنف'}
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveBranchModal(null);
                  setSelectedSchoolNameForView(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>العودة للأصناف الرئيسية</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Student Modal */}
      <RegisterStudentModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        sport={sport}
        preselectedCategory={selectedCatId !== 'ALL' ? selectedCatId : undefined}
        preselectedGender={selectedGender !== 'ALL' ? selectedGender : undefined}
        preselectedAffiliation={selectedAffiliation}
        schools={schools}
        registrationDeadline={currentDeadline}
        onRegistered={() => {
          if (onRefreshData) onRefreshData();
        }}
      />

      {/* Edit Deadline Modal */}
      <EditDeadlineModal
        isOpen={isEditDeadlineOpen}
        onClose={() => setIsEditDeadlineOpen(false)}
        sport={sport}
        tournaments={tournaments}
        onUpdated={() => {
          if (onRefreshData) onRefreshData();
        }}
      />
      
      {isPdfModalOpen && currentSchoolForPdf && (
        <ParticipationFormPdfModal
          isOpen={isPdfModalOpen}
          onClose={() => {
            setIsPdfModalOpen(false);
            setPdfSchoolName(null);
          }}
          sport={sport}
          schoolName={currentSchoolForPdf}
          students={targetSchoolStudents}
          season={activeSeason}
        />
      )}
    </div>
  );
};
