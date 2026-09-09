import React, { useState, useMemo } from 'react';
import { Tournament, Student, School, User, Sport, Match } from '../types';
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
  ShieldCheck,
  Phone,
  Calendar,
  Layers,
  Settings,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Lock,
  Edit
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
  onProgramTournament
}) => {
  const [selectedCatId, setSelectedCatId] = useState<string>('ALL');
  const [selectedGender, setSelectedGender] = useState<'ALL' | 'Male' | 'Female'>('ALL');
  const [search, setSearch] = useState('');

  if (!isOpen || !sport) return null;

  // Head of Technical Committee assigned to this sport
  const techHead = teachers.find(tch =>
    tch.isTechCommitteeHead &&
    (tch.techCommitteeSports?.includes(sport.id) || tch.sportId === sport.id)
  );

  // Categories list configured for this sport
  const seasonalCategories = getAgeCategoriesForSeason(activeSeason);
  const sportCategories = (sport.ageCategories && sport.ageCategories.length > 0)
    ? sport.ageCategories
    : seasonalCategories.map(c => c.id);

  // Students registered for this sport
  const sportStudents = allStudents.filter(s => s.sportId === sport.id);

  // Filter students by active category tab & gender & search
  const filteredStudents = sportStudents.filter(s => {
    const matchCategory = selectedCatId === 'ALL' || s.category === selectedCatId;
    const matchGender = selectedGender === 'ALL' || s.gender === selectedGender;
    const matchSearch = !search.trim() ||
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      (s.schoolName || '').toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchGender && matchSearch;
  });

  // Matches for this sport
  const sportMatches = matches.filter(m => m.sportId === sport.id);

  const getCategoryName = (catId: string) => {
    const found = seasonalCategories.find(c => c.id === catId);
    return found ? found.shortName || found.name : catId;
  };

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

        if (sport.id === 'athletics') {
          base['التخصص الفرعي'] = p.athleticsSpecialty || 'غير محدد';
        }

        return base;
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      worksheet['!views'] = [{ RTL: true }];
      const workbook = XLSX.utils.book_new();
      const sheetName = isAll ? 'جميع المشاركين' : getCategoryName(catId).substring(0, 30);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

      const fileName = `مشاركي_بطولة_${sport.name.replace(/\s+/g, '_')}_${isAll ? 'جميع_الفئات' : catId}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.dismiss(loadToastId);
      toast.success('تم تصدير ملف الإكسيل بنجاح!');
    } catch (e) {
      console.error(e);
      toast.dismiss(loadToastId);
      toast.error('تعذر تصدير الملف');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        
        {/* Top Header */}
        <div className={`p-4 md:p-6 border-b flex items-start justify-between gap-4 ${
          isProgrammed
            ? 'bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white border-slate-800'
            : 'bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 text-white border-slate-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl text-2xl md:text-3xl flex items-center justify-center border shadow-xs shrink-0 ${
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

              <h2 className="text-lg md:text-xl font-black text-white mt-1 leading-tight">
                البطولة الإقليمية المدرسية لـ {sport.name}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 font-medium line-clamp-1">
                {sport.description || `المسابقات والبطولات المدرسية الخاصة بـ ${sport.name} بمديرية تاوريرت`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50">

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

          {/* Age Categories Navigation Tabs */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-3xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800">الفئات العمرية المدمجة بهذه البطولة:</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">
                إجمالي التلميذات والتلاميذ المسجلين: {sportStudents.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedCatId('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCatId === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                جميع الفئات ({sportStudents.length})
              </button>

              {sportCategories.map(catId => {
                const count = sportStudents.filter(s => s.category === catId).length;
                return (
                  <button
                    key={catId}
                    onClick={() => setSelectedCatId(catId)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedCatId === catId
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{getCategoryName(catId)}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      selectedCatId === catId ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search & Gender Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-3xs">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="ابحث بالاسم أو اسم المؤسسة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs border-0 focus:ring-0 focus:outline-none text-slate-800 placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
              <span className="text-[11px] font-bold text-slate-500">الجنس:</span>
              <button
                onClick={() => setSelectedGender('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  selectedGender === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setSelectedGender('Male')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  selectedGender === 'Male' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ذكور
              </button>
              <button
                onClick={() => setSelectedGender('Female')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  selectedGender === 'Female' ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                إناث
              </button>

              <button
                onClick={() => handleExportCategoryExcel(selectedCatId)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer mr-2"
                title="تصدير هذه القائمة إكسيل"
              >
                <Download className="h-3.5 w-3.5" />
                <span>تصدير Excel</span>
              </button>
            </div>
          </div>

          {/* Students Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-3xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-blue-600" />
                <span>لائحة التلاميذ المسجلين ({filteredStudents.length}):</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                الفئة المختارة: {selectedCatId === 'ALL' ? 'جميع الفئات' : getCategoryName(selectedCatId)}
              </span>
            </div>

            {filteredStudents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100/70 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3 text-center w-12">#</th>
                      <th className="p-3">الاسم والنسب</th>
                      <th className="p-3">الجنس</th>
                      <th className="p-3">الفئة العمرية</th>
                      <th className="p-3">المؤسسة التعليمية</th>
                      {sport.id === 'athletics' && <th className="p-3">التخصص الفرعي</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredStudents.map((stud, idx) => (
                      <tr key={stud.id || `st-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">{stud.fullName}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            stud.gender === 'Male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                          }`}>
                            {stud.gender === 'Male' ? 'ذكر' : 'أنثى'}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-700">{getCategoryName(stud.category)}</td>
                        <td className="p-3 font-medium text-slate-600">{stud.schoolName}</td>
                        {sport.id === 'athletics' && (
                          <td className="p-3 font-bold text-purple-700">{stud.athleticsSpecialty || 'عام'}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Users className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">لا يوجد تلاميذ مسجلين حالياً في هذا الصنف/الفئة</p>
                <p className="text-[11px] text-slate-400">يمكن للأساتذة المؤطرين إضافة وتوجيه رخص التلاميذ لهذه البطولة عبر فضاء الفريق المدرسي.</p>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 font-medium">
            🏆 بطولة إقليمية مدرسية بمديرية تاوريرت
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportCategoryExcel('ALL')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="h-4 w-4" />
              <span>تصدير جميع الفئات (Excel)</span>
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
