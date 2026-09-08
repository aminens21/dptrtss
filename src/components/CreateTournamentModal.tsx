import React, { useState, useEffect } from 'react';
import { Tournament, Sport } from '../types';
import { AGE_CATEGORIES, DataService, getAgeCategoriesForSeason } from '../lib/dataService';
import { X, Trophy, Calendar, Users, Target, Award, Sparkles, KeyRound, UserCheck, RefreshCw, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface CreateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (tournaments: Omit<Tournament, 'id'>[]) => Promise<void>;
}

export const CreateTournamentModal: React.FC<CreateTournamentModalProps> = ({
  isOpen,
  onClose,
  onCreated
}) => {
  const [name, setName] = useState('');
  const [sportId, setSportId] = useState('football');
  const [level, setLevel] = useState<'Primary' | 'Middle' | 'High'>('High');
  
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
  
  // Manager & Access Code
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [accessCode, setAccessCode] = useState(() => {
    return 'TR-' + Math.floor(1000 + Math.random() * 9000);
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const generateNewCode = () => {
    const prefixes: Record<string, string> = {
      football: 'FB',
      futsal: 'FT',
      handball: 'HB',
      volleyball: 'VB',
      basketball: 'BB',
      athletics: 'ATH',
      table_tennis: 'TT',
      chess: 'CH'
    };
    const prefix = prefixes[sportId] || 'TR';
    const rand = Math.floor(1000 + Math.random() * 9000);
    setAccessCode(`${prefix}-${rand}`);
  };

  const handleToggleCategory = (catId: string) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('يرجى إدخال اسم البطولة الأساسي');
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
            level,
            scope,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            status,
            description: description.trim() || 'بطولة مدرسية رسمية بمديرية تاوريرت',
            managerName: managerName.trim() || undefined,
            managerPhone: managerPhone.trim() || undefined,
            managerEmail: managerEmail.trim() || undefined,
            accessCode: accessCode.trim() || undefined
          });
        }
      }

      // Submit batch array of tournaments
      await onCreated(tournamentsBatch);

      // Reset Form fields
      setName('');
      setDescription('');
      setManagerName('');
      setManagerPhone('');
      setManagerEmail('');
      setSelectedCategories(['U15']);
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
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="football">⚽ كرة القدم</option>
                <option value="futsal">⚽ كرة القدم داخل القاعة (Futsal)</option>
                <option value="handball">🤾 كرة اليد</option>
                <option value="volleyball">🏐 الكرة الطائرة</option>
                <option value="basketball">🏀 كرة السلة</option>
                <option value="athletics">🏃 ألعاب القوى والعدو الريفي</option>
                <option value="table_tennis">🏓 كرة الطاولة</option>
                <option value="badminton">🏸 البادمنتون</option>
                <option value="chess">♟️ الشطرنج المدرسي</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                السلك التعليمي
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as any)}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="High">الثانوي التأهيلي (Lycée)</option>
                <option value="Middle">الثانوي الإعدادي (Collège)</option>
                <option value="Primary">التعليم الابتدائي (Primaire)</option>
              </select>
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

          {/* Tournament Manager & Secret PIN (تخصيص المسؤول والقن السري) */}
          <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-blue-700" />
                <h4 className="text-xs font-bold text-blue-900">تخصيص مسؤول البطولة والقن السري الموحد للنسخ المولّدة</h4>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                صلاحيات الإشراف
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  اسم الأستاذ / المسؤول عن البطولة
                </label>
                <input
                  type="text"
                  placeholder="مثال: ذ. عبد الرحيم بلقاسم"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  رقم هاتف المسؤول (للتواصل والإشعار)
                </label>
                <input
                  type="tel"
                  placeholder="مثال: 0661234567"
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                  <span>القن السري للبطولة (PIN)</span>
                </label>
                <button
                  type="button"
                  onClick={generateNewCode}
                  className="text-[10px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>توليد قن سري تلقائي</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="مثال: FB-2026 أو 4821"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="w-full text-xs font-mono font-bold tracking-wider rounded-lg border border-slate-200 px-3 py-2 text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-500 whitespace-nowrap bg-white px-2 py-2 rounded-lg border border-slate-200">
                  سيستخدم المسؤول نفس القن لإدخال نتائج كل البطولات المولّدة
                </span>
              </div>
            </div>
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
