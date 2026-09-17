import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Student, School, User, Sport, Directorate } from '../types';
import { SPORTS_MAP, getAgeCategoriesForSeason, getCategoryGenderLabel, DataService, OfficialLogos } from '../lib/dataService';
import { downloadParticipationFormPdf, ParticipationPdfOptions } from '../lib/participationPdfService';
import {
  X,
  Download,
  Printer,
  FileText,
  Building,
  UserCheck,
  Calendar,
  Layers,
  Sparkles,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ParticipationFormPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  sport: Sport | null;
  schoolName: string;
  directorateName?: string;
  regionName?: string;
  season?: string;
  teacher?: {
    fullName?: string;
    workLocation?: string;
    leaseNumber?: string;
    phone?: string;
    photoUrl?: string;
  };
  students: Student[];
  preselectedCategory?: string;
  preselectedGender?: 'Male' | 'Female' | 'ALL';
  preselectedAffiliation?: 'non_club' | 'club_affiliated' | 'ALL';
}

export const ParticipationFormPdfModal: React.FC<ParticipationFormPdfModalProps> = ({
  isOpen,
  onClose,
  sport,
  schoolName,
  directorateName = 'المديرية الإقليمية بتاوريرت',
  regionName = 'الأكاديمية الجهوية للتربية والتكوين لجهة الشرق',
  season = '2025 – 2026',
  teacher,
  students,
  preselectedCategory = 'ALL',
  preselectedGender = 'ALL',
  preselectedAffiliation = 'ALL'
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(preselectedCategory);
  const [selectedGender, setSelectedGender] = useState<'Male' | 'Female' | 'ALL'>(preselectedGender);
  const [selectedAffiliation, setSelectedAffiliation] = useState<'non_club' | 'club_affiliated' | 'ALL'>(preselectedAffiliation);
  const [selectedCoachFilter, setSelectedCoachFilter] = useState<string>('ALL');
  const [isGenerating, setIsGenerating] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const availableCoaches = useMemo(() => {
    const names = new Set<string>();
    students.forEach(s => {
      if (s.coachName) names.add(s.coachName);
    });
    return Array.from(names);
  }, [students]);

  // Filter students by selected category, gender, and coach
  const filteredStudents = useMemo(() => {
    return students.filter(st => {
      if (!st) return false;
      const matchCat = selectedCategory === 'ALL' || (st.category && st.category.toUpperCase() === selectedCategory.toUpperCase());
      const matchGen = selectedGender === 'ALL' || st.gender === selectedGender;
      const matchAff = selectedAffiliation === 'ALL' || st.affiliationType === selectedAffiliation;
      const matchCoach = selectedCoachFilter === 'ALL' || st.coachName === selectedCoachFilter;
      return matchCat && matchGen && matchAff && matchCoach;
    });
  }, [students, selectedCategory, selectedGender, selectedAffiliation, selectedCoachFilter]);

  // Derive the best matching coach for the selected filter / category / gender
  const activeCoachFromStudents = useMemo(() => {
    // 1. Look in filtered students first
    const fromFiltered = filteredStudents.find(s => s.coachName && s.coachName.trim() !== '');
    if (fromFiltered) {
      return {
        name: fromFiltered.coachName || '',
        lease: fromFiltered.coachLeaseNumber || '',
        phone: fromFiltered.coachPhone || ''
      };
    }
    // 2. Look in all students
    const fromAll = students.find(s => s.coachName && s.coachName.trim() !== '');
    if (fromAll) {
      return {
        name: fromAll.coachName || '',
        lease: fromAll.coachLeaseNumber || '',
        phone: fromAll.coachPhone || ''
      };
    }
    // 3. Fallback to teacher profile
    return {
      name: teacher?.fullName || '',
      lease: teacher?.leaseNumber || '',
      phone: teacher?.phone || ''
    };
  }, [filteredStudents, students, teacher]);

  const [localCoachName, setLocalCoachName] = useState(activeCoachFromStudents.name);
  const [localCoachLease, setLocalCoachLease] = useState(activeCoachFromStudents.lease);
  const [localCoachPhone, setLocalCoachPhone] = useState(activeCoachFromStudents.phone);
  const [isSavingCoach, setIsSavingCoach] = useState(false);
  const [officialLogos, setOfficialLogos] = useState<OfficialLogos>({});

  useEffect(() => {
    if (isOpen) {
      DataService.getOfficialLogos().then(logos => {
        if (logos) setOfficialLogos(logos);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedCoachFilter !== 'ALL') {
      const matchStud = students.find(s => s.coachName === selectedCoachFilter);
      if (matchStud) {
        setLocalCoachName(matchStud.coachName || '');
        setLocalCoachLease(matchStud.coachLeaseNumber || '');
        setLocalCoachPhone(matchStud.coachPhone || '');
      }
    } else {
      setLocalCoachName(activeCoachFromStudents.name);
      setLocalCoachLease(activeCoachFromStudents.lease);
      setLocalCoachPhone(activeCoachFromStudents.phone);
    }
  }, [selectedCoachFilter, activeCoachFromStudents, students]);

  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(preselectedCategory);
      setSelectedGender(preselectedGender);
    }
  }, [isOpen, preselectedCategory, preselectedGender]);

  if (!isOpen || !sport) return null;

  const sportName = SPORTS_MAP[sport.id]?.name || sport.name || sport.id;
  const seasonalCategories = getAgeCategoriesForSeason(season);
  
  // Only display categories that actually have participating students to make preview clean, fallback to all if empty
  const availableCategories = (() => {
    const rawCats = (sport.ageCategories && sport.ageCategories.length > 0)
      ? sport.ageCategories
      : seasonalCategories.map(c => c.id);
    const activeCats = rawCats.filter(catId => students.some(s => s.category === catId));
    return activeCats.length > 0 ? activeCats : rawCats;
  })();

  const getCategoryLabel = (catId: string) => {
    if (catId === 'ALL') return 'جميع الفئات';
    return getCategoryGenderLabel(catId, selectedGender === 'ALL' ? undefined : selectedGender);
  };

  const getGenderLabel = (g: string) => {
    if (g === 'ALL') return 'ذكور وإناث';
    if (g === 'Male') return 'ذكور';
    if (g === 'Female') return 'إناث';
    return g;
  };

  const pdfOptions: ParticipationPdfOptions = {
    sport,
    schoolName,
    directorateName,
    regionName,
    season,
    categoryLabel: getCategoryLabel(selectedCategory),
    genderLabel: getGenderLabel(selectedGender),
    teacher: {
      fullName: localCoachName || '—',
      workLocation: teacher?.workLocation || schoolName,
      leaseNumber: localCoachLease || '—',
      phone: localCoachPhone || '—',
      photoUrl: teacher?.photoUrl
    },
    students: filteredStudents,
    officialLogos
  };

  const handleDownloadPdf = async () => {
    if (filteredStudents.length === 0) {
      toast.error('لا يوجد أي تلاميذ مسجلين في الفئة المحددة لتوليد المطبوع');
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading('جاري توليد مطبوع المشاركة بصيغة PDF...');
    try {
      const catSuffix = selectedCategory === 'ALL' ? 'جميع_الفئات' : selectedCategory;
      const genSuffix = selectedGender === 'ALL' ? 'مختلط' : selectedGender === 'Male' ? 'ذكور' : 'إناث';
      const cleanSchool = (schoolName || 'مؤسسة').replace(/\s+/g, '_');
      const filename = `مطبوع_مشاركة_${cleanSchool}_${sport.id}_${catSuffix}_${genSuffix}.pdf`;

      await downloadParticipationFormPdf(pdfOptions, filename);
      toast.success('تم تحميل مطبوع المشاركة بنجاح! جاهز للطباعة والتوقيع', { id: toastId });
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('تعذر توليد ملف PDF، يرجى المحاولة مرة أخرى', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // 12 rows minimum representation for preview
  const totalRowsCount = Math.max(12, filteredStudents.length);
  const rows: (Student | null)[] = [];
  for (let i = 0; i < totalRowsCount; i++) {
    rows.push(filteredStudents[i] || null);
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full my-auto flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-sky-800 via-sky-700 to-sky-900 text-white flex items-center justify-between border-b border-sky-600/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-xl shadow-inner">
              📄
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                <span>مطبوع لائحة المشاركة الرسمية (PDF)</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">
                  {sportName}
                </span>
              </h3>
              <p className="text-[11px] text-sky-100/90 mt-0.5">
                المطبوع الوزاري المعتمد للمشاركة في البطولة الإقليمية والجهوية للرياضة المدرسية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              title="إغلاق المعاينة"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">الفئة العمرية:</span>
              <select
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-3xs"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="ALL">جميع الفئات ({students.length} تلاميذ)</option>
                {availableCategories.map(catId => {
                  const count = students.filter(s => s.category === catId).length;
                  return (
                    <option key={catId} value={catId}>
                      {getCategoryLabel(catId)} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Gender Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">الجنس:</span>
              <select
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-3xs"
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value as any)}
              >
                <option value="ALL">الكل (ذكور وإناث)</option>
                <option value="Male">ذكور فقط</option>
                <option value="Female">إناث فقط</option>
              </select>
            </div>

            {/* Affiliation Filter */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-600">الانتماء:</span>
              <select
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-3xs"
                value={selectedAffiliation}
                onChange={(e) => setSelectedAffiliation(e.target.value as any)}
              >
                <option value="ALL">الكل</option>
                <option value="non_club">اللامنتمين (مدرسي فقط)</option>
                <option value="club_affiliated">المنتمين (للأندية)</option>
              </select>
            </div>

            {/* Coach Filter */}
            {availableCoaches.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-600">الأستاذ المؤطر:</span>
                <select
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-3xs"
                  value={selectedCoachFilter}
                  onChange={(e) => setSelectedCoachFilter(e.target.value)}
                >
                  <option value="ALL">جميع المؤطرين ({students.length} تلاميذ)</option>
                  {availableCoaches.map(cName => {
                    const count = students.filter(s => s.coachName === cName).length;
                    return (
                      <option key={cName} value={cName}>
                        {cName} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              عدد المشاركين المحددين: <strong className="text-sky-700">{filteredStudents.length}</strong>
            </span>
          </div>
        </div>

        {/* Dynamic Coach Editor Bar */}
        <div className="p-3 bg-blue-50/70 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-base">👨‍🏫</span>
            <span className="font-black text-slate-800">بيانات المؤطر على المطبوع:</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-600">الاسم:</span>
              <input
                type="text"
                placeholder="اسم المؤطر"
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 w-36 sm:w-44 focus:ring-1 focus:ring-blue-500"
                value={localCoachName}
                onChange={(e) => setLocalCoachName(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-600">SOM:</span>
              <input
                type="text"
                placeholder="رقم التأجير"
                className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 w-24 font-mono focus:ring-1 focus:ring-blue-500"
                value={localCoachLease}
                onChange={(e) => setLocalCoachLease(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-600">الهاتف:</span>
              <input
                type="text"
                placeholder="رقم الهاتف"
                className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 w-28 font-mono focus:ring-1 focus:ring-blue-500"
                value={localCoachPhone}
                onChange={(e) => setLocalCoachPhone(e.target.value)}
              />
            </div>

            <button
              type="button"
              disabled={isSavingCoach || !localCoachName.trim()}
              onClick={async () => {
                if (!localCoachName.trim()) {
                  toast.error('يرجى إدخال اسم المؤطر');
                  return;
                }
                const targets = filteredStudents.length > 0 ? filteredStudents : students;
                if (targets.length === 0) {
                  toast.error('لا يوجد مشاركون لحفظ بيانات المؤطر لهم');
                  return;
                }
                setIsSavingCoach(true);
                const toastId = toast.loading('جاري تثبيت وتحديث بيانات المؤطر...');
                try {
                  for (const st of targets) {
                    await DataService.updateStudent(st.id, {
                      coachName: localCoachName.trim(),
                      coachLeaseNumber: localCoachLease.trim(),
                      coachPhone: localCoachPhone.trim()
                    });
                    st.coachName = localCoachName.trim();
                    st.coachLeaseNumber = localCoachLease.trim();
                    st.coachPhone = localCoachPhone.trim();
                  }
                  toast.dismiss(toastId);
                  toast.success('تم تثبيت بيانات المؤطر بنجاح لجميع المشاركين المعنيين!');
                } catch (err) {
                  console.error('Error saving coach:', err);
                  toast.dismiss(toastId);
                  toast.error('حدث خطأ أثناء حفظ بيانات المؤطر');
                } finally {
                  setIsSavingCoach(false);
                }
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-[11px] rounded-lg shadow-3xs flex items-center gap-1 cursor-pointer transition-colors mr-auto"
              title="تثبيت هذه البيانات وحفظها تلقائياً على بطاقات التلاميذ"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSavingCoach ? 'جاري الحفظ...' : 'تثبيت المؤطر للتلاميذ'}</span>
            </button>
          </div>
        </div>

        {/* Document Preview Stage */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60">
          <div
            ref={printAreaRef}
            className="bg-white max-w-[780px] mx-auto p-6 sm:p-8 rounded-xl shadow-md border border-slate-200/90 text-slate-900 select-text"
            style={{ fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif" }}
          >
            {/* Top Official Header (Ministry in Center, FRMSS on Left and Right) */}
            <div className="flex items-center justify-between gap-4 pb-3 mb-3 border-b border-slate-200">
              <div className="w-1/4 flex justify-start">
                {officialLogos.frmssLogo ? (
                  <img 
                    src={officialLogos.frmssLogo} 
                    alt="شعار الجامعة الملكية" 
                    className="w-auto object-contain" 
                    style={{ height: `${officialLogos.frmssLogoHeight || 60}px` }}
                  />
                ) : (
                  <div className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1.5 rounded-lg border border-amber-200">
                    الجامعة الملكية للرياضة المدرسية
                  </div>
                )}
              </div>

              <div className="w-1/2 flex justify-center">
                {officialLogos.ministryLogo ? (
                  <img 
                    src={officialLogos.ministryLogo} 
                    alt="شعار الوزارة" 
                    className="w-auto object-contain" 
                    style={{ height: `${officialLogos.ministryLogoHeight || 80}px` }}
                  />
                ) : (
                  <div className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1.5 rounded-lg border border-blue-200">
                    وزارة التربية الوطنية
                  </div>
                )}
              </div>

              <div className="w-1/4 flex justify-end">
                {officialLogos.frmssLogo ? (
                  <img 
                    src={officialLogos.frmssLogo} 
                    alt="شعار الجامعة الملكية" 
                    className="w-auto object-contain" 
                    style={{ height: `${officialLogos.frmssLogoHeight || 60}px` }}
                  />
                ) : (
                  <div className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1.5 rounded-lg border border-amber-200">
                    الجامعة الملكية للرياضة المدرسية
                  </div>
                )}
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="border-2 border-sky-600 bg-sky-50 rounded-lg text-center p-2.5 mb-3.5">
              <h2 className="text-sm sm:text-base font-black text-sky-900 tracking-wide">
                لائحة المشاركة في البطولة المدرسية برسم الموسم الدراسي: {season}
              </h2>
              <p className="text-[10px] font-bold text-sky-700 mt-0.5 uppercase">
                LISTE DE PARTICIPATION AU CHAMPIONNAT SCOLAIRE
              </p>
            </div>

            {/* Info Box: Sport, Category, School, Directorate */}
            <div className="border border-sky-600 rounded-lg overflow-hidden mb-3 text-xs">
              <div className="grid grid-cols-12 border-b border-sky-200">
                <div className="col-span-2 bg-sky-600 text-white font-black p-1.5 text-right">
                  النشاط الرياضي:
                </div>
                <div className="col-span-4 bg-white p-1.5 font-bold text-slate-900 border-l border-slate-200">
                  {sportName}
                </div>
                <div className="col-span-3 bg-sky-600 text-white font-black p-1.5 text-right">
                  الفئة العمرية والجنس:
                </div>
                <div className="col-span-3 bg-white p-1.5 font-bold text-slate-900">
                  {getCategoryLabel(selectedCategory)} - {getGenderLabel(selectedGender)}
                </div>
              </div>
              <div className="grid grid-cols-12">
                <div className="col-span-2 bg-sky-600 text-white font-black p-1.5 text-right">
                  المؤسسة:
                </div>
                <div className="col-span-4 bg-white p-1.5 font-bold text-slate-900 border-l border-slate-200">
                  {schoolName}
                </div>
                <div className="col-span-3 bg-sky-600 text-white font-black p-1.5 text-right">
                  المديرية الإقليمية:
                </div>
                <div className="col-span-3 bg-white p-1.5 font-bold text-slate-900">
                  {directorateName}
                </div>
              </div>
            </div>

            {/* Teacher / Coach Supervisor Info Box */}
            <div className="border border-sky-600 rounded-lg overflow-hidden mb-3.5 text-xs">
              <div className="grid grid-cols-12 bg-sky-600 text-white font-black text-center text-[10.5px]">
                <div className="col-span-4 p-1.5 border-l border-sky-500">الأستاذ(ة) المؤطر(ة)</div>
                <div className="col-span-3 p-1.5 border-l border-sky-500">مقر العمل</div>
                <div className="col-span-2 p-1.5 border-l border-sky-500">رقم التأجير (SOM)</div>
                <div className="col-span-2 p-1.5 border-l border-sky-500">رقم الهاتف</div>
                <div className="col-span-1 p-1.5">الصورة</div>
              </div>
              <div className="grid grid-cols-12 bg-white text-center text-xs items-center">
                <div className="col-span-4 p-2 font-black text-slate-900 text-right border-l border-slate-200">
                  {localCoachName || teacher?.fullName || '—'}
                </div>
                <div className="col-span-3 p-2 font-bold text-slate-700 text-right border-l border-slate-200">
                  {teacher?.workLocation || schoolName}
                </div>
                <div className="col-span-2 p-2 font-mono font-bold text-slate-900 border-l border-slate-200">
                  {localCoachLease || teacher?.leaseNumber || '—'}
                </div>
                <div className="col-span-2 p-2 font-mono font-bold text-slate-900 border-l border-slate-200">
                  {localCoachPhone || teacher?.phone || '—'}
                </div>
                <div className="col-span-1 p-1 flex items-center justify-center">
                  {teacher?.photoUrl ? (
                    <img src={teacher.photoUrl} alt="Teacher" className="w-8 h-9 object-cover rounded border border-slate-300" referrerpolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-9 border border-dashed border-slate-300 rounded flex items-center justify-center text-[8px] text-slate-400">
                      صورة
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div className="border border-sky-600 rounded-lg overflow-hidden mb-4">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-sky-600 text-white font-black text-center text-[10.5px]">
                    <th className="p-1.5 border-l border-sky-500 w-8">ر.ت</th>
                    <th className="p-1.5 border-l border-sky-500 w-28">رقم مسار</th>
                    <th className="p-1.5 border-l border-sky-500">الاسم والنسب</th>
                    <th className="p-1.5 border-l border-sky-500 w-24">تاريخ الازدياد</th>
                    <th className="p-1.5 border-l border-sky-500 w-20">الفئة العمرية</th>
                    <th className="p-1.5 border-l border-sky-500 w-28">صنف المشاركة</th>
                    <th className="p-1.5 border-l border-sky-500">المؤسسة</th>
                    <th className="p-1.5 w-12">الصورة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((st, idx) => {
                    const rowNum = idx + 1;
                    if (st) {
                      return (
                        <tr key={st.id || idx} className={`text-center ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}>
                          <td className="p-1.5 font-bold text-slate-900 border-l border-slate-200">{rowNum}</td>
                          <td className="p-1.5 font-mono font-bold text-sky-800 border-l border-slate-200">
                            {st.massarNumber || '—'}
                          </td>
                          <td className="p-1.5 font-bold text-slate-900 text-right border-l border-slate-200">{st.fullName}</td>
                          <td className="p-1.5 font-mono text-slate-700 border-l border-slate-200">{st.birthDate}</td>
                          <td className="p-1.5 font-bold text-slate-900 border-l border-slate-200">{st.category}</td>
                          <td className="p-1.5 font-bold text-slate-700 text-center border-l border-slate-200">
                            {st.affiliationType === 'club_affiliated' ? 'للمنتمين للأندية' : 'لا منتمين'}
                          </td>
                          <td className="p-1.5 font-semibold text-slate-700 text-right border-l border-slate-200">{st.schoolName || schoolName}</td>
                          <td className="p-1 flex items-center justify-center">
                            {st.photoUrl ? (
                              <img src={st.photoUrl} alt={st.fullName} className="w-7 h-8 object-cover rounded border border-slate-300" referrerpolicy="no-referrer" />
                            ) : (
                              <div className="w-7 h-8 border border-dashed border-slate-200 rounded flex items-center justify-center text-[7px] text-slate-400">
                                صورة
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    } else {
                      return (
                        <tr key={`empty-${idx}`} className={`text-center ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}>
                          <td className="p-1.5 font-bold text-slate-300 border-l border-slate-200">{rowNum}</td>
                          <td className="p-1.5 border-l border-slate-200"></td>
                          <td className="p-1.5 border-l border-slate-200"></td>
                          <td className="p-1.5 border-l border-slate-200"></td>
                          <td className="p-1.5 border-l border-slate-200"></td>
                          <td className="p-1.5 border-l border-slate-200"></td>
                          <td className="p-1.5 border-l border-slate-200"></td>
                          <td className="p-1 flex items-center justify-center">
                            <div className="w-7 h-8 border border-dashed border-slate-200 rounded"></div>
                          </td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>

            {/* Signatures & Stamps Footer */}
            <div className="grid grid-cols-3 gap-4 pt-2 text-center text-xs font-bold text-slate-800">
              <div className="p-2 border border-dashed border-slate-300 rounded-lg">
                <p className="font-extrabold text-slate-900">أستاذ(ة) التربية البدنية المؤطر(ة)</p>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">(توقيع وخاتم الأستاذ)</p>
                <div className="h-12 mt-2"></div>
              </div>

              <div className="p-2 border border-dashed border-slate-300 rounded-lg">
                <p className="font-extrabold text-slate-900">رئيس(ة) المؤسسة التعليمية</p>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">(اسم وتوقيع وخاتم مدير المؤسسة)</p>
                <div className="h-12 mt-2"></div>
              </div>

              <div className="p-2 border border-dashed border-slate-300 rounded-lg">
                <p className="font-extrabold text-sky-900">المدير(ة) الإقليمي(ة) / رئيس الفرع</p>
                <p className="text-[10px] text-slate-500 font-normal mt-0.5">(اسم وتوقيع وخاتم الفرع الإقليمي)</p>
                <div className="h-12 mt-2"></div>
              </div>
            </div>

            <p className="text-[9px] text-slate-400 text-center mt-3 pt-2 border-t border-slate-200">
              منظومة تدبير البطولات المدرسية • وثيقة رسمية معتمدة للمشاركة في المنافسات الإقليمية والجهوية
            </p>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>المطبوع مطابق تماماً للمواصفات والترويسة الوزارية الرسمية</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            >
              إغلاق
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{isGenerating ? 'جاري التوليد...' : 'تحميل مطبوع المشاركة (PDF)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
