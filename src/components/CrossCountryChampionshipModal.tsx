import React, { useState, useMemo } from 'react';
import { Tournament, Student, School, User } from '../types';
import { SPORTS_MAP, getAgeCategoriesForSeason } from '../lib/dataService';
import { AppLogo } from './AppLogo';
import * as XLSX from 'xlsx';
import {
  X,
  Trophy,
  Users,
  Search,
  Filter,
  Download,
  Printer,
  ShieldCheck,
  Phone,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface CrossCountryCategoryDef {
  id: string;
  category: string; // 'U12' | 'U15' | 'U18' | 'U20'
  gender: 'Male' | 'Female';
  titleAr: string;
  shortLabel: string;
  genderLabel: string;
  distance: string;
  icon: string;
  colorClass: string;
}

export const CROSS_COUNTRY_CATEGORIES: CrossCountryCategoryDef[] = [
  {
    id: 'u12_male',
    category: 'U12',
    gender: 'Male',
    titleAr: 'سباق البراعم ذكور (U12)',
    shortLabel: 'البراعم ذكور (U12)',
    genderLabel: 'ذكور',
    distance: '1500 م',
    icon: '👦',
    colorClass: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
  },
  {
    id: 'u12_female',
    category: 'U12',
    gender: 'Female',
    titleAr: 'سباق البرعمات إناث (U12)',
    shortLabel: 'البرعمات إناث (U12)',
    genderLabel: 'إناث',
    distance: '1000 م',
    icon: '👧',
    colorClass: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100'
  },
  {
    id: 'u15_male',
    category: 'U15',
    gender: 'Male',
    titleAr: 'سباق الصغار ذكور (U15)',
    shortLabel: 'الصغار ذكور (U15)',
    genderLabel: 'ذكور',
    distance: '3000 م',
    icon: '👦',
    colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
  },
  {
    id: 'u15_female',
    category: 'U15',
    gender: 'Female',
    titleAr: 'سباق الصغيرات إناث (U15)',
    shortLabel: 'الصغيرات إناث (U15)',
    genderLabel: 'إناث',
    distance: '2000 م',
    icon: '👧',
    colorClass: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
  },
  {
    id: 'u18_male',
    category: 'U18',
    gender: 'Male',
    titleAr: 'سباق الفتيان ذكور (U18)',
    shortLabel: 'الفتيان ذكور (U18)',
    genderLabel: 'ذكور',
    distance: '4000 م',
    icon: '🏃‍♂️',
    colorClass: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
  },
  {
    id: 'u18_female',
    category: 'U18',
    gender: 'Female',
    titleAr: 'سباق الفتيات إناث (U18)',
    shortLabel: 'الفتيات إناث (U18)',
    genderLabel: 'إناث',
    distance: '3000 م',
    icon: '🏃‍♀️',
    colorClass: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
  },
  {
    id: 'u20_male',
    category: 'U20',
    gender: 'Male',
    titleAr: 'سباق الشبان ذكور (U20)',
    shortLabel: 'الشبان ذكور (U20)',
    genderLabel: 'ذكور',
    distance: '5000 م',
    icon: '🏃‍♂️',
    colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
  },
  {
    id: 'u20_female',
    category: 'U20',
    gender: 'Female',
    titleAr: 'سباق الشابات إناث (U20)',
    shortLabel: 'الشابات إناث (U20)',
    genderLabel: 'إناث',
    distance: '3000 م',
    icon: '🏃‍♀️',
    colorClass: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
  }
];

interface CrossCountryChampionshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournaments: Tournament[];
  allStudents: Student[];
  schools: School[];
  techHead?: User;
  activeSeason: string;
}

export const CrossCountryChampionshipModal: React.FC<CrossCountryChampionshipModalProps> = ({
  isOpen,
  onClose,
  tournaments,
  allStudents,
  schools,
  techHead,
  activeSeason
}) => {
  const [selectedCatId, setSelectedCatId] = useState<string>('u12_male');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'school_team' | 'individual'>('ALL');
  const [filterSchool, setFilterSchool] = useState<string>('ALL');

  // Filter students participating in cross country
  const ccStudents = useMemo(() => {
    return allStudents.filter(s => s.sportId === 'cross_country');
  }, [allStudents]);

  // General championship info from tournaments or defaults
  const representativeTournament = tournaments.find(t => t.sportId === 'cross_country') || {
    name: 'البطولة الإقليمية المدرسية للعدو الريفي',
    status: 'Scheduled',
    startDate: new Date(),
    endDate: new Date(),
    description: 'المنافسات الرسمية لبطولة العدو الريفي المدرسي بمديرية تاوريرت المؤهلة للبطولة الجهوية للرياضة المدرسية.'
  };

  // Selected category object
  const activeCategory = CROSS_COUNTRY_CATEGORIES.find(c => c.id === selectedCatId) || CROSS_COUNTRY_CATEGORIES[0];

  // Participants in active category
  const activeCategoryParticipants = useMemo(() => {
    return ccStudents.filter(s => s.category === activeCategory.category && s.gender === activeCategory.gender);
  }, [ccStudents, activeCategory]);

  // Filtered participants by search, type, and school
  const filteredParticipants = useMemo(() => {
    return activeCategoryParticipants.filter(p => {
      const matchSearch = p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.schoolName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === 'ALL' || p.participationType === filterType;
      const matchSchool = filterSchool === 'ALL' || p.schoolId === filterSchool || p.schoolName === filterSchool;
      return matchSearch && matchType && matchSchool;
    });
  }, [activeCategoryParticipants, searchQuery, filterType, filterSchool]);

  if (!isOpen) return null;

  // Total summary statistics
  const totalRunners = ccStudents.length;
  const boysCount = ccStudents.filter(s => s.gender === 'Male').length;
  const girlsCount = ccStudents.filter(s => s.gender === 'Female').length;
  const teamRunnersCount = ccStudents.filter(s => s.participationType === 'school_team').length;
  const individualRunnersCount = ccStudents.filter(s => s.participationType === 'individual').length;
  
  // Unique participating schools
  const participatingSchoolIds = Array.from(new Set(ccStudents.map(s => s.schoolId || s.schoolName)));

  // Export single category to Excel
  const handleExportCategoryExcel = (cat: CrossCountryCategoryDef) => {
    const participants = ccStudents.filter(s => s.category === cat.category && s.gender === cat.gender);
    if (participants.length === 0) {
      toast.error(`لا يوجد تلاميذ مسجلين في ${cat.titleAr} حالياً لتصديرهم.`);
      return;
    }

    const excelData = participants.map((p, index) => ({
      'الرقم الترتيبي': index + 1,
      'الاسم والنسب': p.fullName,
      'الجنس': p.gender === 'Male' ? 'ذكر' : 'أنثى',
      'تاريخ الازدياد': p.birthDate,
      'الفئة الرياضية': cat.shortLabel,
      'المسافة المقررة': cat.distance,
      'المؤسسة التعليمية': p.schoolName,
      'نوع المشاركة': p.participationType === 'school_team' ? 'فريق المؤسسة (جماعي)' : 'مشاركة فردية'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet['!views'] = [{ RTL: true }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, cat.shortLabel.substring(0, 30));

    const fileName = `لائحة_مشاركي_${cat.titleAr.replace(/\s+/g, '_')}_${activeSeason.replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success(`تم تصدير لائحة ${cat.titleAr} بنجاح!`);
  };

  // Export all 8 categories in one unified workbook
  const handleExportAllUnifiedWorkbook = () => {
    if (ccStudents.length === 0) {
      toast.error('لا يوجد تلاميذ مسجلين في العدو الريفي حالياً لتصديرهم.');
      return;
    }

    const workbook = XLSX.utils.book_new();

    CROSS_COUNTRY_CATEGORIES.forEach(cat => {
      const participants = ccStudents.filter(s => s.category === cat.category && s.gender === cat.gender);
      const sheetData = participants.length > 0
        ? participants.map((p, index) => ({
            'الرقم الترتيبي': index + 1,
            'الاسم والنسب': p.fullName,
            'الجنس': p.gender === 'Male' ? 'ذكر' : 'أنثى',
            'تاريخ الازدياد': p.birthDate,
            'الفئة الرياضية': cat.shortLabel,
            'المسافة المقررة': cat.distance,
            'المؤسسة التعليمية': p.schoolName,
            'نوع المشاركة': p.participationType === 'school_team' ? 'فريق المؤسسة (جماعي)' : 'مشاركة فردية'
          }))
        : [
            {
              'تنبيه': 'لا يوجد تلاميذ مسجلين في هذه الفئة بعد'
            }
          ];

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      worksheet['!views'] = [{ RTL: true }];
      const sheetName = cat.shortLabel.substring(0, 30);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    const fileName = `ملف_العدو_الريفي_الموحد_للفئات_الثمانية_${activeSeason.replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('تم تصدير الملف الموحد لجميع الفئات الثمانية بنجاح!');
  };

  const handlePrintCategory = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Top Header Banner */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border-b border-slate-800 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center shrink-0">
                <AppLogo size={36} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                    البطولة الإقليمية المدرسية للعدو الريفي
                  </h2>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                    8 فئات عمرية مدمجة
                  </span>
                  <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded">
                    الموسم {activeSeason}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 font-medium">
                  المديرية الإقليمية تاوريرت • الفرع الإقليمي للجامعة الملكية للرياضة المدرسية
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Metrics & Technical Head Ribbon */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-base">
                🏃
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-medium">إجمالي العدائين</div>
                <div className="text-sm font-black text-white">{totalRunners} تلميذ(ة)</div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-base">
                🏫
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-medium">المؤسسات المشاركة</div>
                <div className="text-sm font-black text-white">{participatingSchoolIds.length} مؤسسة</div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-base">
                👥
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-medium">توزيع المشاركات</div>
                <div className="text-xs font-bold text-slate-200">
                  {boysCount} ذكور / {girlsCount} إناث
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-base">
                🛡️
              </div>
              <div className="truncate">
                <div className="text-[10px] text-slate-400 font-medium">رئيس اللجنة التقنية</div>
                <div className="text-xs font-bold text-amber-300 truncate">
                  {techHead ? techHead.fullName : 'ذ. عبد الرحيم بلقاسم'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Categories 8-Tab Ribbon */}
        <div className="bg-slate-100 p-2 sm:p-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-blue-600" />
              <span>الفئات المشاركة الثمانية المعتمدة (8 Categories):</span>
            </span>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              اضغط على أي فئة لاستعراض تفاصيلها ولائحة المشاركين بها
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
            {CROSS_COUNTRY_CATEGORIES.map((cat, idx) => {
              const isSelected = selectedCatId === cat.id;
              const countInCat = ccStudents.filter(s => s.category === cat.category && s.gender === cat.gender).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`p-2 rounded-xl text-right transition-all flex flex-col justify-between border cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-400/30'
                      : `${cat.colorClass} shadow-xs`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs">{cat.icon}</span>
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-white text-slate-800 border border-slate-200/60'
                      }`}
                    >
                      {countInCat}
                    </span>
                  </div>
                  <div className="mt-1">
                    <div className={`text-[11px] font-black leading-tight truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      {cat.shortLabel}
                    </div>
                    <div className={`text-[9px] font-semibold mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                      المسافة: {cat.distance}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Category Content Area */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Active Category Header Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-2xl shrink-0">
                {activeCategory.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    {activeCategory.titleAr}
                  </h3>
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-md">
                    المسافة المقررة: {activeCategory.distance}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-md">
                    {activeCategory.genderLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  ضوابط المشاركة: سقف <strong>5 تلاميذ</strong> كفريق للمؤسسة (Team) + سقف <strong>3 تلاميذ</strong> للمشاركة الفردية.
                </p>
              </div>
            </div>

            {/* Quick Category Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleExportCategoryExcel(activeCategory)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                title="تصدير لائحة هذه الفئة إلى Excel"
              >
                <Download className="h-3.5 w-3.5" />
                <span>تصدير الفئة (Excel)</span>
              </button>
            </div>
          </div>

          {/* Search & Sub-filters */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex flex-1 items-center px-2 w-full bg-white rounded-lg border border-slate-200">
              <Search className="h-3.5 w-3.5 text-slate-400 ml-2 shrink-0" />
              <input
                type="text"
                placeholder="ابحث بالاسم، النسب، أو اسم المؤسسة..."
                className="w-full border-0 focus:ring-0 text-xs py-1.5 text-slate-800 placeholder-slate-400 focus:outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-full sm:w-auto"
              >
                <option value="ALL">جميع أنواع المشاركة</option>
                <option value="school_team">فريق المؤسسة (جماعي)</option>
                <option value="individual">مشاركة فردية</option>
              </select>

              <select
                value={filterSchool}
                onChange={(e) => setFilterSchool(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer w-full sm:w-auto max-w-[180px]"
              >
                <option value="ALL">جميع المؤسسات</option>
                {schools.map(sch => (
                  <option key={sch.id} value={sch.id}>
                    {sch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table of Registered Athletes */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>لائحة العدائين المسجلين في {activeCategory.shortLabel}</span>
              <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                المجموع: {filteredParticipants.length} عداء(ة)
              </span>
            </div>

            {filteredParticipants.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-bold">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-12">#</th>
                      <th className="py-2.5 px-3">العداء(ة)</th>
                      <th className="py-2.5 px-3">المؤسسة التعليمية</th>
                      <th className="py-2.5 px-3 text-center">نوع المشاركة</th>
                      <th className="py-2.5 px-3 text-center">المسافة</th>
                      <th className="py-2.5 px-3 text-center">تاريخ الازدياد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredParticipants.map((runner, index) => (
                      <tr key={runner.id || `runner-${index}`} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            {runner.photoUrl ? (
                              <img
                                src={runner.photoUrl}
                                alt={runner.fullName}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                                {runner.gender === 'Male' ? '🏃‍♂️' : '🏃‍♀️'}
                              </div>
                            )}
                            <div>
                              <div className="font-black text-slate-900 text-xs">{runner.fullName}</div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                {runner.gender === 'Male' ? 'تلميذ (ذكر)' : 'تلميذة (أنثى)'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-800">{runner.schoolName}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              runner.participationType === 'school_team'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {runner.participationType === 'school_team' ? '👥 فريق المؤسسة' : '👤 مشاركة فردية'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap font-bold text-blue-700">
                          {runner.distance || activeCategory.distance}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {runner.birthDate || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl font-bold">
                  🏃
                </div>
                <p className="text-xs font-bold text-slate-700">لا يوجد تلاميذ مسجلين في هذه الفئة حالياً</p>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  يمكن للأساتذة المؤطرين تسجيل فرقهم في فئة {activeCategory.shortLabel} عبر فضاء "فرق المؤسسة" مع احترام السقف المحدد.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-medium">
              يتم تحديث لوائح المشاركين تلقائياً بمجرد تأكيد الأستاذ المؤطر لتسجيل الفريق.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleExportAllUnifiedWorkbook}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>تحميل الملف الموحد لجميع الفئات (Excel)</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
