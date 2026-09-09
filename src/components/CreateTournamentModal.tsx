import React, { useState, useEffect } from 'react';
import { Tournament, Sport } from '../types';
import { AGE_CATEGORIES, DataService, getAgeCategoriesForSeason, SPORTS_MAP } from '../lib/dataService';
import { X, Trophy, Calendar, Users, Target, Award, Sparkles, ShieldCheck, RefreshCw, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  allowedSportIds?: string[] | null;
  preselectedSportId?: string;
  onCreated: (tournaments: Omit<Tournament, 'id'>[]) => Promise<void>;
}

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({
  isOpen,
  onClose,
  allowedSportIds,
  preselectedSportId,
  onCreated
}) => {
  const [name, setName] = useState('');
  const [sportId, setSportId] = useState('football');
  const [selectedLevels, setSelectedLevels] = useState<('Primary' | 'Middle' | 'High')[]>(['High']);
  
  // Custom states for multi-select categories and gender combinations
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['U15']);
  const [genderSelection, setGenderSelection] = useState<'Male' | 'Female' | 'Both' | 'Mixed'>('Both');

  // Sports Configuration for custom/dynamic categories
  const [sportsConfig, setSportsConfig] = useState<Sport[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [currentSeason, setCurrentSeason] = useState('2026/2027');

  useEffect(() => {
    if (isOpen) {
      setLoadingConfig(true);
      Promise.all([
        DataService.getSportsConfig(),
        DataService.getActiveSeason()
      ])
        .then(([config, season]) => {
          setSportsConfig(config);
          setCurrentSeason(season);
          setLoadingConfig(false);
        })
        .catch(err => {
          console.error("Error loading sports config in modal:", err);
          setLoadingConfig(false);
        });
    }
  }, [isOpen]);

  // Filter sports based on allowedSportIds for Tech Committee Head
  const availableSports = React.useMemo(() => {
    if (!allowedSportIds || allowedSportIds.length === 0) return sportsConfig;
    return sportsConfig.filter(s => allowedSportIds.includes(s.id));
  }, [sportsConfig, allowedSportIds]);

  // Auto-set sportId to preselectedSportId or first allowed sport
  useEffect(() => {
    if (preselectedSportId) {
      setSportId(preselectedSportId);
    } else if (availableSports.length > 0) {
      const isCurrentValid = availableSports.some(s => s.id === sportId);
      if (!isCurrentValid) {
        setSportId(availableSports[0].id);
      }
    }
  }, [availableSports, preselectedSportId]);

  const seasonalCategories = getAgeCategoriesForSeason(currentSeason);
  const activeSportConfig = sportsConfig.find(s => s.id === sportId);
  const activeCategoriesForSport = activeSportConfig?.ageCategories || seasonalCategories.map(c => c.id);

  // Fallback default selection when sportId changes and selected categories are not in the active list
  useEffect(() => {
    if (activeCategoriesForSport.length > 0) {
      const hasOverlap = selectedCategories.some(catId => activeCategoriesForSport.includes(catId));
      if (!hasOverlap) {
        setSelectedCategories([activeCategoriesForSport[0]]);
      }
    }
  }, [sportId, sportsConfig, activeCategoriesForSport]);

  // Transform IDs list to render items
  const categoriesToRender = activeCategoriesForSport.map(catId => {
    const predefined = seasonalCategories.find(c => c.id === catId);
    return {
      id: catId,
      name: predefined ? predefined.name : catId,
      shortName: predefined ? predefined.shortName : catId
    };
  });
  
  const [scope, setScope] = useState<'Provincial' | 'Regional'>('Provincial');
  const [status, setStatus] = useState<Tournament['status']>('Scheduled');
  const [startDate, setStartDate] = useState('2026-03-01');
  const [endDate, setEndDate] = useState('2026-03-30');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleToggleCategory = (catId: string) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!name.trim()) {
      toast.error('يرجى إدخال اسم البطولة الأساسي');
      return;
    }

    if (allowedSportIds && allowedSportIds.length > 0 && !allowedSportIds.includes(sportId)) {
      toast.error('غير مسموح لك بإضافة بطولة في هذه الرياضة. يمكنك الإضافة فقط في تخصصك المسند.');
      return;
    }

    if (selectedCategories.length === 0) {
      toast.error('يرجى تحديد فئة عمرية واحدة على الأقل');
      return;
    }

    setIsSubmitting(true);
    try {
      // Determine genders to generate based on selection
      const gendersToGenerate: ('Male' | 'Female' | 'Mixed')[] = [];
      if (genderSelection === 'Both') {
        gendersToGenerate.push('Male', 'Female');
      } else if (genderSelection === 'Male') {
        gendersToGenerate.push('Male');
      } else if (genderSelection === 'Female') {
        gendersToGenerate.push('Female');
      } else {
        gendersToGenerate.push('Mixed');
      }

      // Generate combinations: categories x genders
      const tournamentsBatch: Omit<Tournament, 'id'>[] = [];

      if (sportId === 'cross_country') {
        tournamentsBatch.push({
          name: name.trim() || 'البطولة الإقليمية المدرسية للعدو الريفي',
          seasonId: currentSeason,
          sportId: 'cross_country',
          ageCategory: 'جميع الفئات العمرية (8 فئات مدمجة)',
          gender: 'Mixed',
          level: selectedLevels.join(','),
          scope,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status,
          description: description.trim() || 'البطولة الإقليمية المدرسية للعدو الريفي بمشاركة جميع الفئات والأجناس الثمانية المعتمدة (U12, U15, U18, U20 ذكور وإناث).'
        });
      } else {
        for (const catId of selectedCategories) {
          const catObj = seasonalCategories.find(c => c.id === catId);
          const catShortName = catObj ? catObj.shortName : catId;
          const catFullName = catObj ? catObj.name : catId;

          for (const gen of gendersToGenerate) {
            const genderLabel = gen === 'Male' ? 'ذكور' : gen === 'Female' ? 'إناث' : 'مختلط';
            
            // Formulate distinct tournament name
            const finalTournamentName = `${name.trim()} - ${genderLabel} (${catShortName})`;

            tournamentsBatch.push({
              name: finalTournamentName,
              seasonId: currentSeason,
              sportId,
              ageCategory: catFullName,
              gender: gen,
              level: selectedLevels.join(','),
              scope,
              startDate: new Date(startDate),
              endDate: new Date(endDate),
              status,
              description: description.trim() || 'بطولة مدرسية رسمية بمديرية تاوريرت'
            });
          }
        }
      }

      // Submit batch array of tournaments
      await onCreated(tournamentsBatch);

      // Reset Form fields
      setName('');
      setDescription('');
      setSelectedCategories(['U15']);
      setSelectedLevels(['High']);
      setGenderSelection('Both');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء محاولة إنشاء البطولات');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">إضافة وإعداد بطولة إقليمية متعددة</h3>
              <p className="text-[11px] text-slate-500 font-medium">يقوم النظام بتوليد بطولات منفصلة لكل فئة وجنس محدد</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Tournament Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الاسم الأساسي للبطولة / الدوري <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="مثال: البطولة الإقليمية المدرسية لكرة السلة"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-[10px] text-slate-400 block mt-1 leading-relaxed">
              * سيقوم النظام بإضافة لواحق الجنس والفئة تلقائياً (مثال: - ذكور (البراعم U12)) لكل نسخة يتم توليدها.
            </span>
          </div>

          {/* Sport & Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                النوع الرياضي
              </label>
              <select
                value={sportId}
                onChange={(e) => setSportId(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {availableSports.length > 0
                  ? availableSports.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.icon || SPORTS_MAP[s.id]?.icon || '🏆'} {s.name}
                      </option>
                    ))
                  : Object.entries(SPORTS_MAP)
                      .filter(([id]) => !allowedSportIds || allowedSportIds.includes(id))
                      .map(([id, info]) => (
                        <option key={id} value={id}>
                          {info.icon} {info.name}
                        </option>
                      ))}
              </select>
              {allowedSportIds && allowedSportIds.length > 0 && (
                <span className="text-[10px] text-amber-700 font-bold block mt-1 bg-amber-50 p-1.5 rounded border border-amber-200">
                  🔒 رئيس لجنة تقنية: مسند لك إضافة بطولات في تخصصك فقط.
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الأسلاك التعليمية المعنية * (يمكن تحديد سلك أو أكثر)
              </label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {[
                  { id: 'Primary', label: 'ابتدائي (Primaire)' },
                  { id: 'Middle', label: 'إعدادي (Collège)' },
                  { id: 'High', label: 'تأهيلي (Lycée)' }
                ].map((item) => {
                  const isSelected = selectedLevels.includes(item.id as any);
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setSelectedLevels(prev =>
                          prev.includes(item.id as any)
                            ? (prev.length > 1 ? prev.filter(x => x !== item.id) : prev)
                            : [...prev, item.id as any]
                        );
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white shadow-3xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Gender and Multi-select Age Categories */}
          <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-150 rounded-xl">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                تحديد الجنس (اختر لتوليد فروع الجنس)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGenderSelection('Both')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    genderSelection === 'Both'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  👫 الجنسين معاً (ذكور + إناث)
                </button>
                <button
                  type="button"
                  onClick={() => setGenderSelection('Male')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    genderSelection === 'Male'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  👦 ذكور فقط
                </button>
                <button
                  type="button"
                  onClick={() => setGenderSelection('Female')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    genderSelection === 'Female'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  👧 إناث فقط
                </button>
                <button
                  type="button"
                  onClick={() => setGenderSelection('Mixed')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    genderSelection === 'Mixed'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  👥 مختلط (Mixed)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                تحديد الفئات العمرية المستهدفة (اختر فئة أو أكثر لتوليد فروع الفئات) <span className="text-red-500">*</span>
              </label>
              {loadingConfig ? (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  <span>جاري تحميل فئات التخصص الرياضي...</span>
                </div>
              ) : categoriesToRender.length === 0 ? (
                <p className="text-[11px] font-bold text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  ⚠️ لم يتم تفعيل أو إضافة أي فئة لهذا التخصص بعد في لوحة التحكم.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                  {categoriesToRender.map((cat) => {
                    const isChecked = selectedCategories.includes(cat.id);
                    return (
                      <label
                        key={cat.id}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCategory(cat.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                        <span>{cat.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ البداية
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ الاختتام المتوقع
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Scope & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نطاق البطولة
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as any)}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Provincial">إقليمية (مديرية تاوريرت)</option>
                <option value="Regional">تأهيلية جهوية (جهة الشرق)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                حالة البطولة
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Scheduled">مبرمجة وقيد الإعداد</option>
                <option value="Ongoing">جارية ومفتوحة</option>
                <option value="Draft">مسودة أولية</option>
              </select>
            </div>
          </div>

          {/* Technical Committee Authority Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-700" />
                <h4 className="text-xs font-bold text-blue-900">إشراف وضوابط البطولة</h4>
              </div>
              <span className="text-[10px] bg-blue-100/80 text-blue-800 font-bold px-2 py-0.5 rounded">
                اللجنة التقنية
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              يتولى رئيس اللجنة التقنية المكلّف بهذا الصنف الرياضي (والمعيّن من طرف المسؤول المركزي) كامل صلاحيات الإشراف والضوابط وإدارة المباريات والنتائج للبطولة.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات أو توصيف إضافي
            </label>
            <textarea
              rows={2}
              placeholder="مثال: تجرى المباريات بالقاعة المغطاة بتاوريرت، ويتأهل الفائز للبطولة الجهوية بوجدة..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
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
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:bg-blue-300 cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>جاري إنشاء {selectedCategories.length * (genderSelection === 'Both' ? 2 : 1)} بطولات...</span>
                </>
              ) : (
                <span>حفظ وإنشاء {selectedCategories.length * (genderSelection === 'Both' ? 2 : 1)} بطولات</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
