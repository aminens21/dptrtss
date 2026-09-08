import React, { useEffect, useState } from 'react';
import { DataService, SPORTS_MAP, AGE_CATEGORIES, getAgeCategoriesForSeason } from '../lib/dataService';
import { Sport } from '../types';
import {
  Settings,
  Save,
  Check,
  Award,
  AlertCircle,
  RefreshCw,
  Trophy,
  ChevronRight,
  Plus,
  X,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [sportsList, setSportsList] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [currentSeason, setCurrentSeason] = useState('2026/2027');
  const [savingSeason, setSavingSeason] = useState(false);
  const [seasonsList, setSeasonsList] = useState<string[]>(['2025/2026', '2026/2027']);
  const [newSeasonInput, setNewSeasonInput] = useState('');
  const [isAddingSeason, setIsAddingSeason] = useState(false);
  const [savingNewSeason, setSavingNewSeason] = useState(false);

  useEffect(() => {
    loadSportsAndSeason();
  }, []);

  const loadSportsAndSeason = async () => {
    setLoading(true);
    try {
      const [config, season, seasons] = await Promise.all([
        DataService.getSportsConfig(),
        DataService.getActiveSeason(),
        DataService.getSeasons()
      ]);
      setSportsList(config);
      setCurrentSeason(season);
      setSeasonsList(seasons);
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

  const handleSaveSportConfig = async (sportId: string, ageCategories: string[]) => {
    setSavingId(sportId);
    try {
      await DataService.updateSportCategories(sportId, ageCategories);
      toast.success('تم حفظ وتعديل الفئات للتخصص الرياضي بنجاح');
    } catch (error) {
      console.error('Error updating sport categories:', error);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600 animate-spin-slow" />
              <span>التحكم في فئات التخصص الرياضي</span>
            </h2>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-100">
              خاص بالمسير الرئيسي
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            يتحكم المسير الرئيسي هنا في تفعيل وتحديد الفئات العمرية المسموح لها بالمشاركة والتسجيل في كل تخصص رياضي على حدة.
          </p>
        </div>
        <button
          onClick={loadSportsAndSeason}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer transition-all bg-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث الإعدادات</span>
        </button>
      </div>

      {/* Current Sports Season Setup Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs max-w-4xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-xs md:text-sm font-bold text-slate-800">تحديد الموسم الرياضي النشط</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">بناءً على اختيار الموسم، يتم تلقائياً تحديث تعريف المواليد المقبولة للفئات العمرية (U12, U15, U18, U20/مواليد 2009 ومابعد).</p>
            </div>
          </div>
          
          {!isAddingSeason && (
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

        {isAddingSeason && (
          <form onSubmit={handleAddSeason} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3 max-w-2xl animate-in fade-in slide-in-from-top-2 duration-150">
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
          {savingSeason && (
            <span className="text-[10px] text-blue-600 flex items-center gap-1.5 animate-pulse font-medium">
              <RefreshCw className="h-3 w-3 animate-spin" />
              جاري حفظ وتغيير الموسم...
            </span>
          )}
        </div>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 text-amber-800 text-xs leading-relaxed max-w-4xl">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
        <div>
          <p className="font-bold">ملاحظة تنظيمية هامة للمسير:</p>
          <p className="mt-0.5 opacity-90">
            التغييرات التي تقوم بها هنا ستؤثر مباشرة على فضاءات الأساتذة عند تسجيل فرق مؤسساتهم؛ حيث لن تظهر لهم إلا الفئات التي قمت بتفعيلها وتظليلها باللون الأزرق لكل تخصص رياضي.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 max-w-4xl">
          {sportsList.map((sport) => {
            const mappedSport = SPORTS_MAP[sport.id] || { name: sport.name, icon: '🏆' };
            const activeCategories = sport.ageCategories || [];
            const seasonalCategories = getAgeCategoriesForSeason(currentSeason);

            return (
              <div
                key={sport.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all p-5 flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                {/* Sport Info */}
                <div className="space-y-1.5 min-w-[200px]">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-3xs">
                      {mappedSport.icon}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{mappedSport.name}</h3>
                      <span className="text-[10px] text-slate-400 font-medium">رمز: {sport.id}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mr-1.5">
                    {sport.description || `تخصيص الفئات المتاحة لـ ${mappedSport.name}`}
                  </p>
                </div>

                {/* Categories Selector */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-bold text-slate-700">الفئات الرياضية المعنية بالتخصص:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSelectAllCategories(sport.id)}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        تحديد الكل
                      </button>
                      <span className="text-slate-300 text-xs">|</span>
                      <button
                        type="button"
                        onClick={() => handleClearAllCategories(sport.id)}
                        className="text-[10px] font-bold text-slate-500 hover:underline"
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

                    {/* Display custom categories (ones that are not predefined) */}
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

                {/* Save Button */}
                <div className="shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleSaveSportConfig(sport.id, activeCategories)}
                    disabled={savingId !== null}
                    className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingId === sport.id ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    <span>حفظ التغييرات</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
