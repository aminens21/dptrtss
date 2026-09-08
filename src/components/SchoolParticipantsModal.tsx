import React, { useState } from 'react';
import { School, Student } from '../types';
import { SPORTS_MAP, AGE_CATEGORIES } from '../lib/dataService';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  X,
  Users,
  Trophy,
  Download,
  Printer,
  ExternalLink,
  MapPin,
  User,
  Phone,
  PhoneCall,
  Calendar,
  Sparkles,
  Filter,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SchoolParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School | null;
  sportId: string;
  allStudents: Student[];
}

export const SchoolParticipantsModal: React.FC<SchoolParticipantsModalProps> = ({
  isOpen,
  onClose,
  school,
  sportId,
  allStudents
}) => {
  const navigate = useNavigate();
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('ALL');

  if (!isOpen || !school) return null;

  // Filter students belonging to this school
  const schoolStudents = allStudents.filter(
    s => s.schoolId === school.id || s.schoolName === school.name
  );

  // Filter by sport if a specific sport is selected
  const sportStudents = sportId === 'ALL'
    ? schoolStudents
    : schoolStudents.filter(s => s.sportId === sportId);

  // Filter by category if selected
  const displayedStudents = activeCategoryFilter === 'ALL'
    ? sportStudents
    : sportStudents.filter(s => s.category === activeCategoryFilter);

  const sportInfo = sportId !== 'ALL' ? SPORTS_MAP[sportId] : null;

  const maleCount = sportStudents.filter(s => s.gender === 'Male').length;
  const femaleCount = sportStudents.filter(s => s.gender === 'Female').length;

  const categoriesPresent = Array.from(new Set(sportStudents.map(s => s.category).filter(Boolean)));

  const handleExportExcel = () => {
    try {
      const sportLabel = sportInfo ? sportInfo.name : 'جميع الرياضات';
      const rows = sportStudents.map((s, index) => {
        const catInfo = AGE_CATEGORIES.find(c => c.id === s.category);
        const sSport = SPORTS_MAP[s.sportId];
        return {
          'الرقم الترتيبي': index + 1,
          'الاسم والنسب': s.fullName,
          'الجنس': s.gender === 'Male' ? 'ذكر' : 'أنثى',
          'تاريخ الازدياد': s.birthDate || 'غير محدد',
          'الفئة العمرية': catInfo ? catInfo.shortName : s.category || 'غير محدد',
          'الرياضة': sSport ? sSport.name : s.sportId,
          'نوع المشاركة / التخصص': s.athleticsSpecialty || (s.participationType === 'school_team' ? 'فريق المؤسسة' : 'فردي'),
          'المسافة': s.distance || '---',
          'المؤسسة التعليمية': school.name,
          'الجماعة': school.commune,
          'الأستاذ المؤطر': school.teacherName,
          'هاتف المؤطر': school.phone || '---',
          'هاتف مدير المؤسسة': school.principalPhone || '---'
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet['!views'] = [{ RTL: true }];

      const workbook = XLSX.utils.book_new();
      const cleanSheetName = (sportInfo ? sportInfo.name : 'المشاركون').substring(0, 30);
      XLSX.utils.book_append_sheet(workbook, worksheet, cleanSheetName);

      const fileName = `لائحة_مشاركي_${school.name.replace(/\s+/g, '_')}_${sportLabel.replace(/\s+/g, '_')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success('تم تصدير لائحة المشاركين بصيغة Excel بنجاح!');
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء تصدير اللائحة');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleNavigateToManage = () => {
    onClose();
    const query = new URLSearchParams();
    if (sportId !== 'ALL') {
      query.set('sport', sportId);
    }
    query.set('school', school.name);
    navigate(`/teacher-teams?${query.toString()}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150" dir="rtl">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-4 sm:p-5 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-1">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-2xl shrink-0">
                {sportInfo ? sportInfo.icon : '🏫'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] bg-blue-500/40 text-blue-100 font-bold px-2.5 py-0.5 rounded-full border border-blue-300/30">
                    {sportInfo ? `بطولة ${sportInfo.name}` : 'جميع الرياضات'}
                  </span>
                  <span className="text-[11px] bg-white/20 text-white font-medium px-2 py-0.5 rounded-full">
                    {school.type}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black mt-1 text-white leading-tight">
                  لائحة المشاركين: {school.name}
                </h2>
                <div className="flex items-center gap-3 text-xs text-blue-100/90 mt-1 flex-wrap font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-blue-200" />
                    {school.commune}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-blue-200" />
                    المؤطر: {school.teacherName}
                  </span>
                  {school.phone && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono" dir="ltr">
                        <Phone className="h-3 w-3 text-blue-200" />
                        المؤطر: {school.phone}
                      </span>
                    </>
                  )}
                  {school.principalPhone && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded border border-amber-300/30 font-bold" dir="ltr">
                        <PhoneCall className="h-3 w-3 text-amber-300" />
                        المدير: {school.principalPhone}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Buttons inside Header */}
            <div className="flex items-center gap-2 pt-2 sm:pt-0 self-end sm:self-center">
              <button
                onClick={handleExportExcel}
                disabled={sportStudents.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                title="تصدير هذه اللائحة إلى إكسيل"
              >
                <Download className="h-3.5 w-3.5" />
                <span>إكسيل (Excel)</span>
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors cursor-pointer"
                title="طباعة لائحة المشاركين"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">طباعة</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:px-5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 sm:gap-6 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Users className="h-4 w-4 text-blue-600" />
              <span>إجمالي المسجلين:</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-black text-sm">
                {sportStudents.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span>ذكور:</span>
              <span className="font-bold text-blue-700">{maleCount}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 font-medium">
              <span>إناث:</span>
              <span className="font-bold text-rose-600">{femaleCount}</span>
            </div>
          </div>

          {/* Category Filter Pills if more than 1 category */}
          {categoriesPresent.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-slate-400 ml-1">تصفية:</span>
              <button
                onClick={() => setActiveCategoryFilter('ALL')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                  activeCategoryFilter === 'ALL'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                الكل ({sportStudents.length})
              </button>
              {categoriesPresent.map(catId => {
                const catObj = AGE_CATEGORIES.find(c => c.id === catId);
                const count = sportStudents.filter(s => s.category === catId).length;
                return (
                  <button
                    key={catId}
                    onClick={() => setActiveCategoryFilter(catId)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                      activeCategoryFilter === catId
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {catObj ? catObj.shortName : catId} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Scrollable Content: Student List */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {displayedStudents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayedStudents.map((stud, idx) => {
                const catInfo = AGE_CATEGORIES.find(c => c.id === stud.category);
                const studSport = SPORTS_MAP[stud.sportId] || { name: stud.sportId, icon: '🏆' };

                return (
                  <div
                    key={stud.id}
                    className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all"
                  >
                    {/* Student Photo or Avatar */}
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                      {stud.photoUrl ? (
                        <img
                          src={stud.photoUrl}
                          alt={stud.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl">
                          {stud.gender === 'Female' ? '👧' : '👦'}
                        </span>
                      )}
                    </div>

                    {/* Student Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {idx + 1}. {stud.fullName}
                        </h4>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          stud.gender === 'Male'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {stud.gender === 'Male' ? 'ذكر' : 'أنثى'}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                        {/* Category Badge */}
                        <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-200/80">
                          {catInfo ? catInfo.shortName : stud.category}
                        </span>

                        {/* Birth Date */}
                        {stud.birthDate && (
                          <span className="text-slate-500 font-medium font-mono flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {stud.birthDate}
                          </span>
                        )}
                      </div>

                      {/* Details / Specialty / Distance */}
                      {(stud.participationType || stud.athleticsSpecialty || stud.distance) && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center gap-2 text-[10px] text-slate-600">
                          {stud.participationType && (
                            <span className="font-bold text-blue-800 bg-blue-50 px-1.5 py-0.2 rounded">
                              {stud.participationType === 'school_team' ? 'فريق المؤسسة' : 'مشاركة فردية'}
                            </span>
                          )}
                          {stud.athleticsSpecialty && (
                            <span className="font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded">
                              {stud.athleticsSpecialty}
                            </span>
                          )}
                          {stud.distance && (
                            <span className="font-medium text-slate-500 font-mono">
                              المسافة: {stud.distance}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Users className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700">لا يوجد تلاميذ مسجلين لهذه المؤسسة في هذا التخصص حالياً</p>
              <p className="text-xs text-slate-400 mt-1">
                يمكن للأستاذ المؤطر إضافة وتأكيد تسجيل التلاميذ عبر منصة فرق المؤسسة
              </p>
              <button
                onClick={handleNavigateToManage}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>فتح صفحة تسجيل وتأطير الفرق</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 p-3 sm:px-5 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            منظومة تدبير الأنشطة الرياضية المدرسية - مديرية تاوريرت
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleNavigateToManage}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>إدارة وتسجيل الفريق</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
