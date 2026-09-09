import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataService, SPORTS_MAP, getAgeCategoriesForSeason } from '../lib/dataService';
import { Sport, Tournament } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  Settings,
  Save,
  Check,
  AlertCircle,
  RefreshCw,
  Trophy,
  Plus,
  X,
  Calendar,
  Trash2,
  PlusCircle,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
  Layers,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';

const PRESET_EMOJIS = ['🏸', '🥋', '🏹', '🏊‍♂️', '🤸‍♀️', '🥊', '🧗', '🤼', '🏓', '🎾', '🏐', '🏀', '⚽', '🎯', '🚴‍♂️', '♟️', '🏃', '🏆'];

const CustomCategoryForm: React.FC<{ onAdd: (name: string) => void }> = ({ onAdd }) => {
  const [value, setValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
      setIsEditing(false);
    }
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-all shadow-3xs cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>إضافة فئة يدوياً</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1.5 max-w-xs">
      <input
        type="text"
        required
        autoFocus
        placeholder="مثال: البراعم U11"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="px-2.5 py-1.5 text-xs bg-white border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 placeholder-slate-400"
      />
      <button
        type="submit"
        className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
        title="إضافة"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setIsEditing(false)}
        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-xs font-bold cursor-pointer transition-colors"
        title="إلغاء"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </form>
  );
};

export const SportsConfig: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [sportsList, setSportsList] = useState<Sport[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentSeason, setCurrentSeason] = useState('2026/2027');
  const [savingSeason, setSavingSeason] = useState(false);
  const [seasonsList, setSeasonsList] = useState<string[]>(['2025/2026', '2026/2027']);
  const [newSeasonInput, setNewSeasonInput] = useState('');
  const [isAddingSeason, setIsAddingSeason] = useState(false);
  const [savingNewSeason, setSavingNewSeason] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PROGRAMMED' | 'UNPROGRAMMED'>('ALL');

  // New Sport Modal State (Exclusive to CENTRAL_ADMIN)
  const [isAddSportModalOpen, setIsAddSportModalOpen] = useState(false);
  const [newSportName, setNewSportName] = useState('');
  const [newSportId, setNewSportId] = useState('');
  const [newSportIcon, setNewSportIcon] = useState('🏸');
  const [newSportDescription, setNewSportDescription] = useState('');
  const [newSportCategories, setNewSportCategories] = useState<string[]>([]);
  const [newSportStudentLimit, setNewSportStudentLimit] = useState<string>('');
  const [newSportIsProgrammed, setNewSportIsProgrammed] = useState<boolean>(true);
  const [isSubmittingSport, setIsSubmittingSport] = useState(false);

  const isCentralAdmin = userProfile?.role === 'CENTRAL_ADMIN';
  const isTechCommitteeHead = userProfile?.isTechCommitteeHead === true;
  const mySports = userProfile?.techCommitteeSports || [];

  const visibleSportsList = useMemo(() => {
    return sportsList.filter(s => {
      if (isCentralAdmin) return true;
      if (isTechCommitteeHead) {
        return mySports.includes(s.id);
      }
      return false;
    });
  }, [sportsList, isCentralAdmin, isTechCommitteeHead, mySports]);

  // Helper function to resolve programmed status
  const isSportProgrammed = (s: Sport): boolean => {
    if (s.isProgrammed !== undefined) return s.isProgrammed;
    if (s.id === 'cross_country') return true;
    if (tournaments.some(t => t.sportId === s.id)) return true;
    return (s.ageCategories && s.ageCategories.length > 0 && s.studentLimit !== undefined && s.studentLimit > 0) || false;
  };

  // Filtered sports list by search and status
  const filteredSports = useMemo(() => {
    return visibleSportsList.filter(s => {
      const isProg = isSportProgrammed(s);
      if (statusFilter === 'PROGRAMMED' && !isProg) return false;
      if (statusFilter === 'UNPROGRAMMED' && isProg) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = s.name.toLowerCase().includes(q);
        const matchId = s.id.toLowerCase().includes(q);
        return matchName || matchId;
      }
      return true;
    });
  }, [visibleSportsList, statusFilter, searchQuery]);

  // Counters
  const programmedCount = useMemo(() => {
    return visibleSportsList.filter(s => isSportProgrammed(s)).length;
  }, [visibleSportsList]);

  const unprogrammedCount = useMemo(() => {
    return visibleSportsList.filter(s => !isSportProgrammed(s)).length;
  }, [visibleSportsList]);

  useEffect(() => {
    loadSportsAndSeason();
  }, []);

  // Initialize categories for new sport modal when season loads
  useEffect(() => {
    if (currentSeason && newSportCategories.length === 0) {
      const defaultCats = getAgeCategoriesForSeason(currentSeason).map(c => c.id);
      setNewSportCategories(defaultCats);
    }
  }, [currentSeason]);

  const loadSportsAndSeason = async () => {
    setLoading(true);
    try {
      const [config, season, seasons, tourns] = await Promise.all([
        DataService.getSportsConfig(),
        DataService.getActiveSeason(),
        DataService.getSeasons(),
        DataService.getTournaments()
      ]);
      setSportsList(config);
      setCurrentSeason(season);
      setSeasonsList(seasons);
      setTournaments(tourns);
    } catch (error) {
      console.error('Error loading sports config and season:', error);
      toast.error('حدث خطأ أثناء تحميل إعدادات الفئات والموسم الرياضي');
    } finally {
      setLoading(false);
    }
  };

  const handleSeasonChange = async (newSeason: string) => {
    setSavingSeason(true);
    try {
      await DataService.setActiveSeason(newSeason);
      setCurrentSeason(newSeason);
      
      // Dispatch custom event to notify AppLayout to update immediately
      window.dispatchEvent(new CustomEvent('seasonChanged', { detail: newSeason }));
      
      toast.success(`تم تغيير الموسم الرياضي النشط بنجاح إلى: ${newSeason}`);
    } catch (error) {
      console.error('Error changing sports season:', error);
      toast.error('تعذر حفظ الموسم الرياضي الجديد');
    } finally {
      setSavingSeason(false);
    }
  };

  const handleAddSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSeason = newSeasonInput.trim();
    
    const pattern = /^\d{4}[\/\-]\d{4}$/;
    if (!pattern.test(cleanSeason)) {
      toast.error('يرجى إدخال الموسم بالصيغة الصحيحة، مثال: 2027/2028');
      return;
    }

    if (seasonsList.includes(cleanSeason)) {
      toast.error('هذا الموسم مضاف بالفعل في النظام');
      return;
    }

    setSavingNewSeason(true);
    try {
      await DataService.addSeason(cleanSeason);
      toast.success(`تمت إضافة الموسم الجديد "${cleanSeason}" بنجاح`);
      setNewSeasonInput('');
      setIsAddingSeason(false);
      const updatedSeasons = await DataService.getSeasons();
      setSeasonsList(updatedSeasons);
      
      // Auto-switch to the new season
      await handleSeasonChange(cleanSeason);
    } catch (error) {
      console.error('Error adding new season:', error);
      toast.error('حدث خطأ أثناء إضافة الموسم الرياضي الجديد');
    } finally {
      setSavingNewSeason(false);
    }
  };

  const handleToggleCategory = (sportId: string, categoryId: string) => {
    setSportsList(prev => prev.map(s => {
      if (s.id !== sportId) return s;
      const currentCats = s.ageCategories || [];
      const updatedCats = currentCats.includes(categoryId)
        ? currentCats.filter(id => id !== categoryId)
        : [...currentCats, categoryId];
      return { ...s, ageCategories: updatedCats };
    }));
  };

  const handleSelectAllCategories = (sportId: string) => {
    setSportsList(prev => prev.map(s => {
      if (s.id !== sportId) return s;
      const allCategoryIds = getAgeCategoriesForSeason(currentSeason).map(c => c.id);
      return { ...s, ageCategories: allCategoryIds };
    }));
  };

  const handleClearAllCategories = (sportId: string) => {
    setSportsList(prev => prev.map(s => {
      if (s.id !== sportId) return s;
      return { ...s, ageCategories: [] };
    }));
  };

  // Status Mode Toggle (مبرمجة vs في طور الإعداد)
  const handleToggleSportProgrammedStatus = (sportId: string, targetStatus: boolean) => {
    setSportsList(prev => prev.map(s => {
      if (s.id !== sportId) return s;
      return { ...s, isProgrammed: targetStatus };
    }));
  };

  const handleSaveSportConfig = async (
    sportId: string,
    ageCategories: string[],
    studentLimit?: number,
    athleticsSpecialties?: string[],
    isProgrammed?: boolean
  ) => {
    setSavingId(sportId);
    try {
      await DataService.updateSportCategories(
        sportId,
        ageCategories,
        studentLimit,
        athleticsSpecialties,
        undefined,
        undefined,
        isProgrammed
      );
      toast.success('تم حفظ وتعديل إعدادات وضوابط التخصص الرياضي بنجاح');
    } catch (error) {
      console.error('Error updating sport categories:', error);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSavingId(null);
    }
  };

  // Central Admin: Delete custom sport
  const handleDeleteSport = async (sportId: string, sportName: string) => {
    if (!isCentralAdmin) return;
    if (!window.confirm(`هل أنت متأكد من حذف التخصص الرياضي "${sportName}" نهائياً من المنظومة؟`)) {
      return;
    }

    setDeletingId(sportId);
    try {
      await DataService.deleteSport(sportId);
      setSportsList(prev => prev.filter(s => s.id !== sportId));
      toast.success(`تم حذف التخصص الرياضي "${sportName}" بنجاح`);
    } catch (error) {
      console.error('Error deleting sport:', error);
      toast.error('حدث خطأ أثناء محاولة حذف الرياضة');
    } finally {
      setDeletingId(null);
    }
  };

  // Central Admin: Create new sport submission
  const handleCreateNewSport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCentralAdmin) {
      toast.error('عفواً، إضافة التخصصات الرياضية صلاحية حصرية للمسير المركزي فقط.');
      return;
    }

    const cleanName = newSportName.trim();
    if (!cleanName) {
      toast.error('يرجى إدخال اسم الرياضة');
      return;
    }

    if (newSportCategories.length === 0) {
      toast.error('يرجى اختيار فئة عمرية واحدة على الأقل للمشاركة');
      return;
    }

    const limitVal = newSportStudentLimit.trim() === '' ? undefined : parseInt(newSportStudentLimit, 10);
    if (limitVal !== undefined && (isNaN(limitVal) || limitVal < 0)) {
      toast.error('يرجى إدخال عدد صحيح موجب لسقف عدد المشاركين');
      return;
    }

    setIsSubmittingSport(true);
    try {
      const addedSport = await DataService.addSport({
        name: cleanName,
        id: newSportId.trim() || undefined,
        icon: newSportIcon.trim() || '🏆',
        description: newSportDescription.trim() || undefined,
        ageCategories: newSportCategories,
        studentLimit: limitVal
      });

      // Update programmed status
      await DataService.updateSportCategories(
        addedSport.id,
        newSportCategories,
        limitVal,
        [],
        undefined,
        undefined,
        newSportIsProgrammed
      );

      toast.success(`تمت إضافة الرياضة الجديدة "${cleanName}" بنجاح وتحديد حالتها وسقف مشاركيها.`);
      
      // Reset form
      setNewSportName('');
      setNewSportId('');
      setNewSportIcon('🏸');
      setNewSportDescription('');
      setNewSportStudentLimit('');
      setNewSportIsProgrammed(true);
      setIsAddSportModalOpen(false);

      // Reload sports list
      await loadSportsAndSeason();
    } catch (error) {
      console.error('Error creating new sport:', error);
      toast.error('حدث خطأ أثناء إضافة النوع الرياضي الجديد');
    } finally {
      setIsSubmittingSport(false);
    }
  };

  // Guard: if user is neither central admin nor tech committee head
  if (!loading && !isCentralAdmin && !isTechCommitteeHead) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl border border-red-200 shadow-sm text-center space-y-4" dir="rtl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">صلاحية الدخول غير متوفرة</h2>
        <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
          صفحة الإعدادات والضوابط مخصصة حصرياً للمسير المركزي ورؤساء اللجن التقنية الإقليمية لضبط الفئات، وسقف المشاركة، ووضع الرياضات (مبرمجة أو في طور الإعداد).
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <span>العودة إلى لوحة التحكم</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-blue-600" />
              <span>الإعدادات والضوابط: إدارة وضعية البطولات والرياضات</span>
            </h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              isCentralAdmin 
                ? 'bg-blue-50 text-blue-700 border-blue-100' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-100'
            }`}>
              {isCentralAdmin ? 'المسير المركزي (تحكم شامل)' : 'رئيس اللجنة التقنية (التخصصات المسندة)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            {isCentralAdmin 
              ? 'تفعيل الرياضات والتحكم في وضعيتها (مبرمجة ومفتوحة للتسجيل أو في طور الإعداد)، وتحديد الفئات العمرية وسقف المشاركين لكل بطولة.'
              : 'مراجعة وتعديل وضعية البطولات وضوابط الفئات العمرية وسقف المشاركين للتخصصات الرياضية الواقعة تحت إشرافك المباشر.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {/* Add New Sport Button - CENTRAL ADMIN ONLY */}
          {isCentralAdmin && (
            <button
              onClick={() => {
                const defaultCats = getAgeCategoriesForSeason(currentSeason).map(c => c.id);
                setNewSportCategories(defaultCats);
                setIsAddSportModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
            >
              <PlusCircle className="h-4 w-4" />
              <span>إضافة نوع رياضي جديد</span>
            </button>
          )}

          <button
            onClick={loadSportsAndSeason}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer transition-all bg-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {/* Overview Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">إجمالي التخصصات</span>
            <span className="text-lg font-black text-slate-800">{visibleSportsList.length}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">بطولات مبرمجة ومفتوحة</span>
            <span className="text-lg font-black text-emerald-700">{programmedCount}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">في طور الإعداد</span>
            <span className="text-lg font-black text-amber-700">{unprogrammedCount}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">الموسم الرياضي</span>
            <span className="text-sm font-black text-purple-800">{currentSeason}</span>
          </div>
        </div>
      </div>

      {/* Current Sports Season Setup Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <Calendar className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-xs md:text-sm font-bold text-slate-800">تحديد وتفعيل الموسم الرياضي النشط</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">بناءً على اختيار الموسم، يتم تلقائياً تحديث تعريف المواليد المقبولة للفئات العمرية (U12, U15, U18, U20).</p>
            </div>
          </div>
          
          {isCentralAdmin && !isAddingSeason && (
            <button
              type="button"
              onClick={() => setIsAddingSeason(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl shadow-3xs cursor-pointer transition-all shrink-0 self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>إضافة موسم جديد</span>
            </button>
          )}
        </div>

        {isCentralAdmin && isAddingSeason && (
          <form onSubmit={handleAddSeason} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="space-y-1 flex-1">
              <label className="block text-[10px] font-bold text-slate-500">صيغة الموسم الرياضي الجديد (YYYY/YYYY):</label>
              <input
                type="text"
                required
                autoFocus
                placeholder="مثال: 2027/2028"
                value={newSeasonInput}
                onChange={(e) => setNewSeasonInput(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 placeholder-slate-400"
              />
            </div>
            <div className="flex items-center gap-2 pt-4 sm:pt-0 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setIsAddingSeason(false);
                  setNewSeasonInput('');
                }}
                className="px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={savingNewSeason}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
              >
                {savingNewSeason && <RefreshCw className="h-3 w-3 animate-spin" />}
                <span>حفظ وتفعيل الموسم</span>
              </button>
            </div>
          </form>
        )}

        <div className="flex items-center gap-3 pt-1">
          {isCentralAdmin ? (
            <select
              value={currentSeason}
              onChange={(e) => handleSeasonChange(e.target.value)}
              disabled={savingSeason}
              className="px-4 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 cursor-pointer disabled:opacity-50"
            >
              {seasonsList.map((season) => (
                <option key={season} value={season}>
                  الموسم الرياضي: {season} {season === '2026/2027' ? '(الموسم الحالي)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <span className="px-4 py-2 text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl text-slate-700">
              الموسم الرياضي المعتمد: {currentSeason}
            </span>
          )}

          {savingSeason && (
            <span className="text-[10px] text-blue-600 flex items-center gap-1.5 animate-pulse font-medium">
              <RefreshCw className="h-3 w-3 animate-spin" />
              جاري حفظ وتغيير الموسم...
            </span>
          )}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="ابحث باسم الرياضة أو رمزها..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            جميع البطولات ({visibleSportsList.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PROGRAMMED')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'PROGRAMMED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>المبرمجة ({programmedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('UNPROGRAMMED')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'UNPROGRAMMED'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>في طور الإعداد ({unprogrammedCount})</span>
          </button>
        </div>
      </div>

      {/* Info Alert */}
      <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-xl flex gap-3 text-amber-900 text-xs leading-relaxed">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
        <div>
          <p className="font-bold text-amber-950">ملاحظة تنظيمية هامة للمسير ورؤساء اللجن التقنية:</p>
          <p className="mt-0.5 text-amber-800 leading-normal">
            من هذه الشاشة، يمكنك التبديل المباشر لوضعية أي رياضة بين <strong>"🟢 مبرمجة ومفتوحة للتسجيل"</strong> أو <strong>"⚪ في طور الإعداد"</strong>. عند اختيار "في طور الإعداد"، تظهر البطولة رمادية في المنصة حتى يتم اعتمادها وبرمجتها رسمياً.
          </p>
        </div>
      </div>

      {/* Sports List */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredSports.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-slate-500">
              <Trophy className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">لا توجد تخصصات رياضية تطابق خيارات البحث المحددة</p>
              <p className="text-xs text-slate-400 mt-1">جرب تغيير فلتر الحالة أو كلمة البحث لعرض باقي الرياضات.</p>
            </div>
          ) : (
            filteredSports.map((sport) => {
              const mappedSport = SPORTS_MAP[sport.id] || { name: sport.name, icon: sport.icon || '🏆' };
              const activeCategories = sport.ageCategories || [];
              const seasonalCategories = getAgeCategoriesForSeason(currentSeason);
              const isProgrammed = isSportProgrammed(sport);

              return (
                <div
                  key={sport.id}
                  className={`bg-white rounded-2xl border transition-all p-5 space-y-5 ${
                    isProgrammed
                      ? 'border-slate-200/80 shadow-xs hover:border-blue-300'
                      : 'border-amber-200/90 bg-amber-50/10 shadow-xs hover:border-amber-300'
                  }`}
                >
                  {/* Top Bar: Icon, Name, Badge, & Programmed Status Selector */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-3xs">
                        {sport.icon || mappedSport.icon}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-800">{sport.name || mappedSport.name}</h3>
                          {sport.isCustom && (
                            <span className="text-[9px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                              صنف مضاف
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                            isProgrammed 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isProgrammed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <span>{isProgrammed ? '🟢 مبرمجة ومفتوحة' : '⚪ في طور الإعداد'}</span>
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">رمز الرياضة: {sport.id}</span>
                      </div>
                    </div>

                    {/* STATUS SWITCHER TOGGLE BUTTONS */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 px-2">وضع البطولة:</span>
                      <div className="flex items-center gap-1 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleToggleSportProgrammedStatus(sport.id, true)}
                          className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isProgrammed
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>🟢 مبرمجة</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleSportProgrammedStatus(sport.id, false)}
                          className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            !isProgrammed
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          <span>⚪ في طور الإعداد</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Programmed Status Explanation Banner */}
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    {isProgrammed ? (
                      <span className="text-emerald-800 font-semibold">
                        ✅ وضعية البطولة حالياً: <strong className="font-bold">مبرمجة ومتاحة للتسجيل</strong>. تظهر باللون الأخضر في القائمة الرئيسية للبطولات ويمكن للأساتذة والمؤسسات تسجيل الفرق والتلاميذ فوراً.
                      </span>
                    ) : (
                      <span className="text-amber-800 font-semibold">
                        ⏳ وضعية البطولة حالياً: <strong className="font-bold">في طور الإعداد (غير مبرمجة)</strong>. تظهر باللون الرمادي في منصة البطولات بانتظار استكمال الضوابط والبرمجة الرسمية من طرف رئيس اللجنة التقنية.
                      </span>
                    )}
                  </p>

                  {/* Categories Selector */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-blue-600" />
                        <span>الفئات العمرية المعنية بالتخصص:</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectAllCategories(sport.id)}
                          className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          تحديد الكل
                        </button>
                        <span className="text-slate-300 text-xs">|</span>
                        <button
                          type="button"
                          onClick={() => handleClearAllCategories(sport.id)}
                          className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
                        >
                          إلغاء الكل
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                      {seasonalCategories.map((cat) => {
                        const isSelected = activeCategories.includes(cat.id);
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleToggleCategory(sport.id, cat.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                                : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-white hover:border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                            <span>{cat.name}</span>
                          </button>
                        );
                      })}

                      {/* Display custom categories */}
                      {activeCategories.filter(catId => !seasonalCategories.some(c => c.id === catId)).map((customCatName) => (
                        <span
                          key={customCatName}
                          className="flex items-center gap-1.5 bg-blue-600 border border-blue-600 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-xs"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>{customCatName}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedCats = activeCategories.filter(c => c !== customCatName);
                              setSportsList(prev => prev.map(s => s.id === sport.id ? { ...s, ageCategories: updatedCats } : s));
                            }}
                            className="p-0.5 hover:bg-blue-700 rounded-full transition-colors cursor-pointer mr-1 inline-flex items-center justify-center"
                            title="حذف الفئة المخصصة"
                          >
                            <X className="h-3 w-3 text-white" />
                          </button>
                        </span>
                      ))}

                      {/* Add Custom Category Button and Form */}
                      <CustomCategoryForm
                        onAdd={(customName) => {
                          if (activeCategories.includes(customName)) {
                            toast.error('هذه الفئة مضافة بالفعل');
                            return;
                          }
                          const updatedCats = [...activeCategories, customName];
                          setSportsList(prev => prev.map(s => s.id === sport.id ? { ...s, ageCategories: updatedCats } : s));
                          toast.success(`تمت إضافة الفئة "${customName}" للمعاينة (تذكر الضغط على حفظ التغييرات)`);
                        }}
                      />
                    </div>
                  </div>

                  {/* Student Limit Setup */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-500 shrink-0" />
                      <label className="text-xs font-bold text-slate-700">
                        الحد الأقصى لعدد التلاميذ المسموح بمشاركتهم لكل مؤسسة:
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="غير محدود"
                        value={sport.studentLimit ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                          setSportsList(prev => prev.map(s => s.id === sport.id ? { ...s, studentLimit: val } : s));
                        }}
                        className="w-28 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-center"
                      />
                      <span className="text-[11px] text-slate-400 font-medium">
                        تلميذ(ة) (اتركه فارغاً أو 0 بدون سقف)
                      </span>
                    </div>
                  </div>

                  {/* Athletics Specialties Setup */}
                  {sport.id === 'athletics' && (
                    <div className="pt-3 border-t border-slate-100 space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      <label className="block text-xs font-bold text-slate-700">
                        تخصصات ألعاب القوى المتاحة للتسجيل:
                      </label>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {(sport.athleticsSpecialties || ['القفز الطولي العلوي', 'القفز الطولي', 'جري 80 متر']).map((spec, sIdx) => (
                          <span key={sIdx} className="inline-flex items-center gap-1.5 bg-white text-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200">
                            <span>{spec}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const currentSpecs = sport.athleticsSpecialties || ['القفز الطولي العلوي', 'القفز الطولي', 'جري 80 متر'];
                                const updatedSpecs = currentSpecs.filter((_, i) => i !== sIdx);
                                setSportsList(prev => prev.map(s => s.id === 'athletics' ? { ...s, athleticsSpecialties: updatedSpecs } : s));
                              }}
                              className="text-slate-400 hover:text-red-500 font-black cursor-pointer transition-colors"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        
                        {/* Inline form to add athletics specialty */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            id="new-athletics-spec-input"
                            placeholder="تخصص جديد..."
                            className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const input = e.currentTarget;
                                const val = input.value.trim();
                                if (val) {
                                  const currentSpecs = sport.athleticsSpecialties || ['القفز الطولي العلوي', 'القفز الطولي', 'جري 80 متر'];
                                  if (currentSpecs.includes(val)) {
                                    toast.error('هذا التخصص مضاف بالفعل');
                                    return;
                                  }
                                  const updatedSpecs = [...currentSpecs, val];
                                  setSportsList(prev => prev.map(s => s.id === 'athletics' ? { ...s, athleticsSpecialties: updatedSpecs } : s));
                                  input.value = '';
                                }
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.getElementById('new-athletics-spec-input') as HTMLInputElement;
                              const val = input?.value.trim();
                              if (val) {
                                const currentSpecs = sport.athleticsSpecialties || ['القفز الطولي العلوي', 'القفز الطولي', 'جري 80 متر'];
                                if (currentSpecs.includes(val)) {
                                  toast.error('هذا التخصص مضاف بالفعل');
                                  return;
                                }
                                const updatedSpecs = [...currentSpecs, val];
                                setSportsList(prev => prev.map(s => s.id === 'athletics' ? { ...s, athleticsSpecialties: updatedSpecs } : s));
                                input.value = '';
                              }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            + إضافة
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Save & Delete Action Buttons */}
                  <div className="shrink-0 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2 justify-end">
                    {/* Delete button for custom sports (Central Admin only) */}
                    {isCentralAdmin && sport.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSport(sport.id, sport.name || mappedSport.name)}
                        disabled={deletingId === sport.id}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs px-3 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                        title="حذف هذا الصنف المضاف"
                      >
                        {deletingId === sport.id ? (
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        <span>حذف الصنف المضاف</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleSaveSportConfig(sport.id, activeCategories, sport.studentLimit, sport.athleticsSpecialties, isProgrammed)}
                      disabled={savingId !== null}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {savingId === sport.id ? (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      <span>حفظ تغييرات {sport.name}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ADD NEW SPORT MODAL (CENTRAL ADMIN ONLY) */}
      {isAddSportModalOpen && isCentralAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">إضافة نوع رياضي جديد إلى المنظومة</h3>
                  <p className="text-[11px] text-slate-500 font-medium">خاص بالمسير المركزي - تحديد الفئات العمرية وسقف المشاركين والحالة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateNewSport} className="p-5 md:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Sport Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم التخصص أو النوع الرياضي <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="مثال: كرة الريشة الطائرة (الريشة)، الرماية بالنبال، السباحة المدرسية..."
                  value={newSportName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewSportName(name);
                    // auto generate latin slug if empty
                    if (!newSportId || newSportId.startsWith('sport_')) {
                      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '');
                      if (slug) setNewSportId(slug);
                    }
                  }}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              {/* Initial Programmed Status Switcher */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  حالة البطولة الأولية (مبرمجة أم في طور الإعداد)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSportIsProgrammed(true)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      newSportIsProgrammed
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>🟢 مبرمجة ومفتوحة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewSportIsProgrammed(false)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      !newSportIsProgrammed
                        ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Clock className="h-4 w-4" />
                    <span>⚪ في طور الإعداد</span>
                  </button>
                </div>
              </div>

              {/* Icon / Emoji Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الرمز التعبيري للرياضة (الأيقونة)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewSportIcon(emoji)}
                      className={`text-lg w-9 h-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                        newSportIcon === emoji
                          ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="أو اكتب رمز إيموجي مخصص..."
                    value={newSportIcon}
                    onChange={(e) => setNewSportIcon(e.target.value)}
                    className="w-24 text-center text-sm rounded-xl border border-slate-200 px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-400">سيظهر هذا الرمز بجانب اسم الرياضة في البطولات واللوائح</span>
                </div>
              </div>

              {/* Unique Technical Key (Slug/ID) & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المعرف التقني باللاتينية (اختياري)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: badminton أو archery"
                    value={newSportId}
                    onChange={(e) => setNewSportId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">اتركه فارغاً للتوليد التلقائي</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الوصف التوضيحي (اختياري)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: منافسات بطولة كرة الريشة المدرسية"
                    value={newSportDescription}
                    onChange={(e) => setNewSportDescription(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Age Categories Configuration */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    تحديد الفئات العمرية المشاركة المعنية <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allCatIds = getAgeCategoriesForSeason(currentSeason).map(c => c.id);
                        setNewSportCategories(allCatIds);
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      تحديد الكل
                    </button>
                    <span className="text-slate-300 text-xs">|</span>
                    <button
                      type="button"
                      onClick={() => setNewSportCategories([])}
                      className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                    >
                      إلغاء الكل
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {getAgeCategoriesForSeason(currentSeason).map((cat) => {
                    const isSelected = newSportCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setNewSportCategories(prev =>
                            prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]
                          );
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Student Limit (سقف المشاركين لكل مؤسسة) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  سقف عدد المشاركين (التلاميذ) المسموح بهم لكل مؤسسة
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="number"
                    min="0"
                    placeholder="غير محدود"
                    value={newSportStudentLimit}
                    onChange={(e) => setNewSportStudentLimit(e.target.value)}
                    className="w-32 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 text-center"
                  />
                  <span className="text-xs text-slate-500">
                    تلميذ(ة) لكل مؤسسة (اتركه فارغاً أو 0 ليكون العدد مفتوحاً)
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  * مثال: 8 لاعبين لكرة السلة المصغرة، أو 12 لاعباً، إلخ. لن يتمكن الأستاذ من تجاوز هذا العدد عند تعبئة لائحة الفريق.
                </p>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddSportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSport}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingSport ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>حفظ وإضافة الرياضة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SportsConfig;
