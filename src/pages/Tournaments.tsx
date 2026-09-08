import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DataService, SPORTS_MAP, getAgeCategoriesForSeason, deduplicateById } from '../lib/dataService';
import { Tournament, User, Student, School } from '../types';
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
  ExternalLink
} from 'lucide-react';
import { CreateTournamentModal } from '../components/CreateTournamentModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { CrossCountryChampionshipModal } from '../components/CrossCountryChampionshipModal';
import toast from 'react-hot-toast';

export const Tournaments: React.FC = () => {
  const { userProfile } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [activeSeason, setActiveSeason] = useState('2026/2027');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCcModalOpen, setIsCcModalOpen] = useState(false);
  const [filterSport, setFilterSport] = useState<string>('ALL');

  // Deletion Modal state
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Only CENTRAL_ADMIN and Technical Committee Heads can create, assign or delete tournaments
  const isCentralAdmin = userProfile?.role === 'CENTRAL_ADMIN';
  const isSportManager = userProfile?.role === 'SPORT_MANAGER';
  const isTechCommitteeHead = userProfile?.isTechCommitteeHead === true;
  const canCreate = isCentralAdmin || isTechCommitteeHead;

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
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const [list, season, allTeachers, studentsList, schoolsList] = await Promise.all([
        DataService.getTournaments(),
        DataService.getActiveSeason(),
        DataService.getTeachers(),
        DataService.getStudents(),
        DataService.getSchools()
      ]);
      setTournaments(deduplicateById(list));
      setTeachers(deduplicateById(allTeachers));
      setAllStudents(deduplicateById(studentsList));
      setSchools(deduplicateById(schoolsList));
      if (season) {
        setActiveSeason(season);
      }
    } catch (e) {
      console.error(e);
      toast.error('تعذر تحميل البطولات');
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
    } catch (e) {
      toast.error('حدث خطأ أثناء حفظ البطولة');
    }
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

  const getCategoryLabel = (catId: string) => {
    const seasonalCats = getAgeCategoriesForSeason(activeSeason);
    const found = seasonalCats.find(c => c.id === catId);
    return found ? found.name : catId;
  };

  const handleExportParticipants = async (tournament: Tournament) => {
    const loadToastId = toast.loading('جاري تحضير وتصدير لائحة المشاركين...');
    try {
      // 1. Fetch all students
      const allStudents = await DataService.getStudents();
      
      // 2. Filter students for this tournament
      const participants = allStudents.filter(s => {
        const matchSport = s.sportId === tournament.sportId;
        const matchCategory = s.category === tournament.ageCategory;
        const matchGender = tournament.gender === 'Mixed' || s.gender === tournament.gender;
        return matchSport && matchCategory && matchGender;
      });

      if (participants.length === 0) {
        toast.dismiss(loadToastId);
        toast.error('لا يوجد تلاميذ مسجلين في هذه البطولة حالياً لتصديرهم.');
        return;
      }

      // 3. Prepare data for Excel
      const excelData = participants.map((p, index) => {
        const base: any = {
          'الرقم الترتيبي': index + 1,
          'الاسم والنسب': p.fullName,
          'الجنس': p.gender === 'Male' ? 'ذكر' : 'أنثى',
          'تاريخ الازدياد': p.birthDate,
          'الفئة الرياضية': getCategoryLabel(p.category),
          'المؤسسة التعليمية': p.schoolName,
        };

        if (tournament.sportId === 'cross_country') {
          base['نوع المشاركة'] = p.participationType === 'school_team' ? 'فريق المؤسسة' : 'فردي';
          base['المسافة المبرمجة'] = p.distance || '';
        }

        if (tournament.sportId === 'athletics') {
          base['التخصص الفرعي'] = p.athleticsSpecialty || 'غير محدد';
        }

        return base;
      });

      // 4. Create workbook and sheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      // Enable RTL (Right-to-Left) sheet reading
      worksheet['!views'] = [{ RTL: true }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'لائحة المشاركين');

      // 5. Trigger download
      const fileName = `لائحة_مشاركي_بطولة_${tournament.name.replace(/\s+/g, '_')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.dismiss(loadToastId);
      toast.success('تم تصدير لائحة المشاركين بنجاح!');
    } catch (error) {
      console.error('Error exporting participants:', error);
      toast.dismiss(loadToastId);
      toast.error('حدث خطأ أثناء محاولة تصدير البيانات بصيغة إكسيل.');
    }
  };

  const handleExportAllCrossCountry = async () => {
    const loadToastId = toast.loading('جاري تحضير وتصدير ملف فئات العدو الريفي الثمانية...');
    try {
      // 1. Fetch all students
      const allStudents = await DataService.getStudents();
      
      // 2. Filter students registered in cross country
      const ccStudents = allStudents.filter(s => s.sportId === 'cross_country');

      if (ccStudents.length === 0) {
        toast.dismiss(loadToastId);
        toast.error('لا يوجد تلاميذ مسجلين في العدو الريفي حالياً لتصديرهم.');
        return;
      }

      // 3. Create workbook
      const workbook = XLSX.utils.book_new();
      let hasData = false;

      // 4. Define the 8 categories
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

      // 5. Generate sheets for each category
      ccCategories.forEach(cat => {
        const participants = ccStudents.filter(s => 
          s.category === cat.category && 
          s.gender === cat.gender
        );

        // Prepare sheet data. If empty, write a descriptive note.
        const sheetData = participants.length > 0 
          ? participants.map((p, index) => ({
              'الرقم الترتيبي': index + 1,
              'الاسم والنسب': p.fullName,
              'الجنس': p.gender === 'Male' ? 'ذكر' : 'أنثى',
              'تاريخ الازدياد': p.birthDate,
              'الفئة الرياضية': getCategoryLabel(p.category),
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
        // Enable RTL (Right-to-Left) sheet reading
        worksheet['!views'] = [{ RTL: true }];
        
        // Excel worksheet name limit is 31 chars
        const sheetName = cat.label.substring(0, 30);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });

      // 6. Trigger download
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

  const filtered = useMemo(() => {
    const unique = deduplicateById<Tournament>(tournaments);

    // Group all cross country tournaments into 1 unified single championship card
    const nonCcTournaments = unique.filter(t => t.sportId !== 'cross_country');
    const ccTournaments = unique.filter(t => t.sportId === 'cross_country');

    const firstCc = ccTournaments[0];
    const consolidatedCc: Tournament = {
      id: firstCc?.id || 'cross_country_unified_championship',
      name: 'البطولة الإقليمية المدرسية للعدو الريفي',
      seasonId: firstCc?.seasonId || activeSeason,
      sportId: 'cross_country',
      ageCategory: 'جميع الفئات العمرية (8 فئات مدمجة)',
      gender: 'Mixed',
      level: 'Primary,Middle,High',
      scope: firstCc?.scope || 'Provincial',
      startDate: firstCc?.startDate || new Date(),
      endDate: firstCc?.endDate || new Date(),
      status: firstCc?.status || 'Scheduled',
      description: 'البطولة الإقليمية المدرسيّة للعدو الريفي بمديرية تاوريرت تشمل كافة السباقات للفئات العمرية الـ8 الذكور والإناث (U12, U15, U18, U20).'
    };

    const combined = [consolidatedCc, ...nonCcTournaments];

    return combined.filter(t => {
      const techHead = teachers.find(tch => tch.isTechCommitteeHead && tch.techCommitteeSports?.includes(t.sportId));
      const headName = techHead?.fullName || '';
      const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
                          (t.description || '').toLowerCase().includes(search.toLowerCase()) ||
                          (t.ageCategory || '').toLowerCase().includes(search.toLowerCase()) ||
                          headName.toLowerCase().includes(search.toLowerCase());
      const matchSport = filterSport === 'ALL' || t.sportId === filterSport;
      return matchSearch && matchSport;
    });
  }, [tournaments, teachers, search, filterSport, activeSeason]);

  const getSportInfo = (sportId?: string) => {
    return SPORTS_MAP[sportId || 'football'] || { name: 'رياضة', icon: '🏆' };
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-bold text-slate-800">إدارة وبرمجة البطولات الإقليمية</h2>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200">
              مديرية تاوريرت
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            برمجة المسابقات والبطولات الإقليمية بإشراف رؤساء اللجن التقنية المعينين من طرف المسؤول المركزي
          </p>
        </div>

        {canCreate && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportAllCrossCountry}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>ملف العدو الريفي الموحد (8 فئات)</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة بطولة جديدة</span>
            </button>
          </div>
        )}
      </div>

      {/* Notice for Sport Managers */}
      {isSportManager && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-900 shadow-xs">
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
                برمجة البطولات العامة محجوزة للمسير المركزي. بصفتك مسؤولاً عن النشاط، يمكنك برمجة المباريات، تعيين المؤسسات المشاركة ومراكز التباري.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <a
              href="/matches"
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition-colors shadow-xs"
            >
              برمجة مباراة الآن
            </a>
            <a
              href="/schools"
              className="px-3 py-1.5 bg-white text-blue-700 border border-blue-300 rounded-lg font-bold text-xs hover:bg-blue-50 transition-colors"
            >
              المؤسسات والفرق
            </a>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-1 items-center px-2 w-full">
          <Search className="h-4 w-4 text-slate-400 ml-2 shrink-0" />
          <input
            type="text"
            placeholder="ابحث عن اسم البطولة، الرياضة، اسم المسؤول، أو القن السري..."
            className="w-full border-0 focus:ring-0 text-xs py-1 text-slate-800 placeholder-slate-400 focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Sport Filter Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto border-t sm:border-t-0 sm:border-r border-slate-100 pt-2 sm:pt-0 sm:pr-3 shrink-0">
          <label htmlFor="tournament-sport-filter" className="text-xs font-bold text-slate-600 whitespace-nowrap flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            <span>الرياضة:</span>
          </label>
          <select
            id="tournament-sport-filter"
            value={filterSport}
            onChange={(e) => setFilterSport(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[170px]"
          >
            <option value="ALL">🏆 جميع الرياضات</option>
            {Object.entries(SPORTS_MAP).map(([id, info]) => (
              <option key={id} value={id}>
                {info.icon} {info.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length > 0 ? (
            filtered.map((t, index) => {
              const sInfo = getSportInfo(t.sportId);
              const isManagerSpecialty = managerSportId && t.sportId === managerSportId;
              const techHead = teachers.find(tch => tch.isTechCommitteeHead && tch.techCommitteeSports?.includes(t.sportId));

              // Dedicated Card layout for Cross Country Championship
              if (t.sportId === 'cross_country') {
                return (
                  <div
                    key={t.id || `tourn-${index}`}
                    onClick={() => setIsCcModalOpen(true)}
                    className="flex flex-col rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white border border-slate-800 shadow-md overflow-hidden transition-all hover:shadow-xl hover:border-blue-500/50 cursor-pointer group"
                  >
                    <div className="p-4 md:p-5 flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-xs text-2xl flex items-center justify-center border border-white/20 shadow-xs group-hover:scale-105 transition-transform">
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
                          {t.name}
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed font-medium">
                          منافسات العدو الريفي المدرسي بمديرية تاوريرت تجمع كافة السباقات للفئات العمرية الـ8 الذكور والإناث.
                        </p>
                      </div>

                      {/* Categories Pills */}
                      <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-300 flex items-center justify-between">
                          <span>الفئات الثمانية المعتمدة (8 Categories):</span>
                          <span className="text-emerald-400 font-mono text-[9px]">U12 • U15 • U18 • U20</span>
                        </div>
                        <div className="flex flex-wrap gap-1 text-[10px]">
                          <span className="bg-blue-500/20 text-blue-200 px-1.5 py-0.5 rounded border border-blue-500/30">البراعم U12</span>
                          <span className="bg-emerald-500/20 text-emerald-200 px-1.5 py-0.5 rounded border border-emerald-500/30">الصغار U15</span>
                          <span className="bg-amber-500/20 text-amber-200 px-1.5 py-0.5 rounded border border-amber-500/30">الفتيان U18</span>
                          <span className="bg-purple-500/20 text-purple-200 px-1.5 py-0.5 rounded border border-purple-500/30">الشبان U20</span>
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

              return (
                <div
                  key={t.id || `tourn-${index}`}
                  className={`flex flex-col rounded-xl bg-white border shadow-xs overflow-hidden transition-all hover:shadow-sm ${
                    isManagerSpecialty
                      ? 'border-blue-300 ring-2 ring-blue-500/10'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="p-4 md:p-5 flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-xl flex items-center justify-center border border-blue-100">
                          {sInfo.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                              {sInfo.name}
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

                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                        t.status === 'Ongoing'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : t.status === 'Completed'
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {t.status === 'Scheduled' ? 'مبرمجة' : t.status === 'Ongoing' ? 'جارية حالياً' : t.status === 'Completed' ? 'منتهية' : 'مسودة'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 leading-snug">{t.name}</h3>

                    {/* Category & Level */}
                    <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">الفئة والجنس:</span>
                        <strong className="text-slate-800 font-bold">
                          {t.ageCategory} ({t.gender === 'Male' ? 'ذكور' : t.gender === 'Female' ? 'إناث' : 'مختلط'})
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">السلك:</span>
                        <strong className="text-slate-800 font-bold">
                          {(() => {
                            if (!t.level) return 'غير محدد';
                            return t.level.split(',').map(l => {
                              if (l === 'High') return 'الثانوي التأهيلي';
                              if (l === 'Middle') return 'الثانوي الإعدادي';
                              if (l === 'Primary') return 'التعليم الابتدائي';
                              return l;
                            }).join(' / ');
                          })()}
                        </strong>
                      </div>
                    </div>

                    {/* Technical Committee Head in Charge */}
                    <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 p-3 rounded-xl border border-blue-100/90 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <ShieldCheck className="h-4 w-4 text-blue-600" />
                          <span>المسؤول عن البطولة:</span>
                        </div>
                        <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                          رئيس اللجنة التقنية
                        </span>
                      </div>

                      {techHead ? (
                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="font-bold text-slate-900">{techHead.fullName}</span>
                          {techHead.phone && (
                            <span className="text-[11px] text-slate-600 font-medium font-mono flex items-center gap-1" dir="ltr">
                              <Phone className="h-3 w-3 text-slate-400" />
                              {techHead.phone}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-[11px] text-amber-700 font-medium pt-0.5">
                          ⚠️ لم يتم تعيين رئيس للجنة التقنية لهذا الصنف بعد (يعين من طرف المسؤول المركزي)
                        </div>
                      )}
                    </div>

                    {t.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-50/80 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">
                      🗓️ {new Date(t.startDate).toLocaleDateString('ar-MA')}
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      {canCreate && (
                        <button
                          onClick={() => handleExportParticipants(t)}
                          title="تصدير لائحة المشاركين بصيغة Excel"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/50 text-[10px] font-bold flex items-center gap-1 transition-all bg-white shadow-3xs cursor-pointer"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                          </svg>
                          <span>تصدير (Excel)</span>
                        </button>
                      )}

                      {canCreate && (
                        <button
                          onClick={(e) => promptDeleteTournament(t, e)}
                          title="حذف البطولة"
                          className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-500 bg-white rounded-xl border border-slate-200 text-center">
              <Trophy className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700 mb-1">لا توجد بطولات مطابقة</p>
              <p className="text-xs text-slate-400 mb-4">يمكنك إضافة بطولة إقليمية جديدة وبرمجتها بإشراف اللجنة التقنية</p>
              {canCreate && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                >
                  إضافة بطولة جديدة الآن
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create Tournament Modal */}
      <CreateTournamentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
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
        techHead={teachers.find(tch => tch.isTechCommitteeHead && tch.techCommitteeSports?.includes('cross_country'))}
        activeSeason={activeSeason}
      />
    </div>
  );
};

