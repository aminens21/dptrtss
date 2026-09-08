import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DataService, SPORTS_MAP, AGE_CATEGORIES, getAgeCategoriesForSeason } from '../lib/dataService';
import { Student, Sport } from '../types';
import {
  Users,
  Plus,
  Trash2,
  CalendarDays,
  User,
  GraduationCap,
  Building,
  Upload,
  UserPlus,
  ArrowRight,
  AlertCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';

export const TeacherTeams: React.FC = () => {
  const { userProfile, openProfileModal } = useAuth();
  
  // Data State
  const [sportsConfig, setSportsConfig] = useState<Sport[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState('2026/2027');
  
  // Selected Context
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
  
  // New Student Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [birthDate, setBirthDate] = useState('');
  const [category, setCategory] = useState('');
  const [photo, setPhoto] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // Verification: Teacher profile completeness
  const isProfileIncomplete = userProfile?.role === 'TEACHER' && (!userProfile.workLocation || !userProfile.leaseNumber);
  const schoolName = userProfile?.workLocation || 'مؤسسة غير محددة';

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [config, allStudents, season] = await Promise.all([
        DataService.getSportsConfig(),
        DataService.getStudents(),
        DataService.getActiveSeason()
      ]);
      setSportsConfig(config);
      setCurrentSeason(season);
      
      // Filter students of this teacher's school only
      if (userProfile?.workLocation) {
         setStudents(allStudents.filter(s => s.schoolName === userProfile.workLocation));
      } else {
        setStudents(allStudents);
      }
    } catch (error) {
      console.error('Error loading teacher team data:', error);
      toast.error('حدث خطأ أثناء تحميل معطيات الفريق');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSport = (sportId: string) => {
    setSelectedSportId(sportId);
    
    // Automatically pre-select first active category of this sport if any
    const sport = sportsConfig.find(s => s.id === sportId);
    if (sport && sport.ageCategories && sport.ageCategories.length > 0) {
      setCategory(sport.ageCategories[0]);
    } else {
      setCategory('');
    }
  };

  // Helper to compress image on client-side to extremely small file size
  const compressImage = (dataUrl: string, maxWidth = 300, maxHeight = 300, quality = 0.5): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Drag and Drop/File Upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Support up to 12MB since we compress it anyway
    if (file.size > 12 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 12 ميغابايت.');
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const originalBase64 = reader.result as string;
        // Compress base64 to under 20-30KB
        const compressedBase64 = await compressImage(originalBase64);
        
        // Calculate size for logging/display
        const rawLength = compressedBase64.length - 'data:image/jpeg;base64,'.length;
        const sizeInKB = Math.round((rawLength * 3) / 4 / 1024);

        setPhoto(compressedBase64);
        toast.success(`تم حفظ الصورة وحجمها مخفض جداً (${sizeInKB} KB)`);
      } catch (err) {
        console.error("Compression error:", err);
        toast.error('حدث خطأ أثناء معالجة وضغط الصورة');
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      toast.error('حدث خطأ أثناء قراءة الملف');
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSportId) return;

    if (!fullName.trim()) {
      toast.error('يرجى إدخال الإسم والنسب للتلميذ');
      return;
    }
    if (!birthDate) {
      toast.error('يرجى تحديد تاريخ الازدياد');
      return;
    }
    if (!category) {
      toast.error('يرجى تحديد الفئة الرياضية');
      return;
    }

    if (birthDate && category) {
      const seasonalCats = getAgeCategoriesForSeason(currentSeason);
      const catConfig = seasonalCats.find(c => c.id === category);
      if (catConfig && catConfig.years && catConfig.years.length > 0) {
        const birthYear = new Date(birthDate).getFullYear();
        let isValid = false;
        if (category === 'U12') {
          const startYear = catConfig.years[0];
          isValid = birthYear >= startYear;
        } else if (category === 'U20') {
          const startYear = catConfig.years[0];
          isValid = birthYear >= startYear;
        } else {
          isValid = catConfig.years.includes(birthYear);
        }
        
        if (!isValid) {
          const yearsMessage = (category === 'U12' || category === 'U20')
            ? `مواليد سنة ${catConfig.years[0]} وما بعد` 
            : `مواليد السنوات التالية: ${catConfig.years.join(' / ')}`;
          toast.error(`خطأ في السن: الفئة الرياضية المختارة (${catConfig.shortName || category}) مخصصة لـ ${yearsMessage}. تاريخ الميلاد المدخل (سنة ${birthYear}) غير مطابق لمواليد هذه الفئة.`);
          return;
        }
      }
    }

    try {
      const studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> = {
        fullName: fullName.trim(),
        gender,
        birthDate,
        category,
        schoolId: userProfile?.id || 'unknown_school',
        schoolName: schoolName,
        sportId: selectedSportId,
        photoUrl: photo || undefined
      };

      const newStudent = await DataService.addStudent(studentData);
      setStudents(prev => [newStudent, ...prev]);
      
      // Reset Form
      setFullName('');
      setBirthDate('');
      setPhoto('');
      setIsFormOpen(false);
      
      toast.success('تم تسجيل وإضافة التلميذ إلى الفريق بنجاح!');
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error('تعذر تسجيل التلميذ حالياً');
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا التلميذ من الفريق؟')) return;

    try {
      await DataService.deleteStudent(studentId);
      setStudents(prev => prev.filter(s => s.id !== studentId));
      toast.success('تم حذف التلميذ من اللائحة بنجاح');
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('تعذر حذف التلميذ');
    }
  };

  // Helpers
  const getSportName = (id: string) => SPORTS_MAP[id]?.name || id;
  const getSportIcon = (id: string) => SPORTS_MAP[id]?.icon || '🏆';
  
  const getCategoryLabel = (catId: string) => {
    const seasonalCats = getAgeCategoriesForSeason(currentSeason);
    const found = seasonalCats.find(c => c.id === catId);
    return found ? found.name : catId;
  };

  // Filter students for the currently selected sport
  const activeSportStudents = students.filter(s => s.sportId === selectedSportId);

  // Active Sport Configuration
  const activeSportConfig = sportsConfig.find(s => s.id === selectedSportId);
  const activeSportCategories = activeSportConfig?.ageCategories || [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[50vh]">
        <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent mb-3"></div>
        <p className="text-xs text-slate-500 font-medium">جاري تحميل لوحة فرق المؤسسة...</p>
      </div>
    );
  }

  // If profile is incomplete, force profile updates
  if (isProfileIncomplete) {
    return (
      <div className="max-w-xl mx-auto mt-8 bg-white p-6 md:p-8 rounded-2xl border border-slate-200/80 shadow-md text-center space-y-4" dir="rtl">
        <div className="w-14 h-14 bg-amber-50 text-amber-600 border border-amber-100 rounded-full flex items-center justify-center mx-auto text-2xl font-black">
          ⚠️
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-800">يرجى استكمال معلوماتكم الشخصية أولاً</h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            قبل البدء في تسجيل وتشكيل فرق مؤسستكم ودخول التخصصات الرياضية، يتطلب منكم النظام ملء البيانات الضرورية في ملفكم الشخصي (مقر العمل ورقم التأجير).
          </p>
        </div>
        <button
          onClick={openProfileModal}
          className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <span>استكمال بيانات الأستاذ الآن</span>
          <ArrowRight className="h-4 w-4 rotate-180" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span>فضاء تسجيل فرق ومؤطري المؤسسة</span>
            </h2>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded border border-emerald-200">
              {schoolName}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            مرحباً بك يا أستاذ. يمكنك الآن الدخول إلى أي تخصص رياضي تريده لتسجيل لائحة تلاميذ مؤسستك المشاركين في المسابقات الإقليمية.
          </p>
        </div>
        <button
          onClick={loadInitialData}
          className="self-start md:self-auto flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer transition-all bg-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>تحديث المعطيات</span>
        </button>
      </div>

      {/* Main Layout Screen */}
      {!selectedSportId ? (
        // Mode 1: Selection of Sport
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-700 tracking-wider">اختر التخصص الرياضي الذي تريد تسجيل فريق مؤسستك فيه:</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sportsConfig.map((sport) => {
              const mapped = SPORTS_MAP[sport.id] || { name: sport.name, icon: '🏆' };
              const count = students.filter(s => s.sportId === sport.id).length;
              const hasConfiguredCategories = sport.ageCategories && sport.ageCategories.length > 0;

              return (
                <div
                  key={sport.id}
                  onClick={() => handleSelectSport(sport.id)}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-40 group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform" />
                  
                  <div className="space-y-2">
                    <span className="text-3xl block">{mapped.icon}</span>
                    <h4 className="text-xs md:text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {mapped.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {hasConfiguredCategories 
                        ? `الفئات المفعلة: ${sport.ageCategories?.map(getCategoryLabel).join(' - ')}`
                        : 'لم يتم تفعيل أي فئة بعد'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-bold">المسجلون بالفريق:</span>
                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                      {count} تلاميذ
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Mode 2: Sport Workspace
        <div className="space-y-5">
          {/* Back button and sport header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-4 md:p-5 rounded-2xl shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedSportId(null)}
                className="p-2 hover:bg-slate-800 rounded-xl transition-all border border-slate-700 shrink-0"
                title="رجوع"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getSportIcon(selectedSportId)}</span>
                  <h3 className="text-base font-bold">فريق {getSportName(selectedSportId)}</h3>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  تأطير وإدخال لوائح التلاميذ الخاصة بـ <span className="font-bold text-blue-400">{schoolName}</span> للمشاركة في منافسات هذه الرياضة.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 font-bold">
                إجمالي التلاميذ: {activeSportStudents.length}
              </span>
              <button
                onClick={() => setIsFormOpen(true)}
                disabled={!activeSportCategories || activeSportCategories.length === 0}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>إضافة تلميذ جديد</span>
              </button>
            </div>
          </div>

          {/* Alert if sport categories aren't configured yet */}
          {(!activeSportCategories || activeSportCategories.length === 0) && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex gap-3 text-red-800 text-xs leading-relaxed max-w-2xl">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold">تنبيه: لا توجد فئات مفعلة حالياً لهذه الرياضة!</p>
                <p className="mt-0.5 opacity-90">
                  لم يقم المسؤول الرئيسي للمديرية بتفعيل وتعيين فئات عمرية محددة لتخصص {getSportName(selectedSportId)} بعد. يرجى الاتصال بالمسير المركزي لتخصيص الفئات حتى تتمكن من إدخال لوائح التلاميذ.
                </p>
              </div>
            </div>
          )}

          {/* Register Student Form (as inline card when open) */}
          {isFormOpen && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-sm max-w-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h4 className="text-xs md:text-sm font-bold text-slate-800 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-blue-600" />
                  <span>تسجيل تلميذ جديد في الفريق</span>
                </h4>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  إلغاء
                </button>
              </div>

              <form onSubmit={handleAddStudent} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name and Surname */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      الاسم الكامل للتلميذ(ة) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: عمر البقالي"
                      className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      الجنس *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGender('Male')}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          gender === 'Male'
                            ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-3xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <span>👦</span>
                        <span>ذكر</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setGender('Female')}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          gender === 'Female'
                            ? 'bg-pink-50 border-pink-500 text-pink-700 shadow-3xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                        }`}
                      >
                        <span>👧</span>
                        <span>أنثى</span>
                      </button>
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      تاريخ الازدياد *
                    </label>
                    <input
                      type="date"
                      required
                      className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                  </div>

                  {/* Category Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      الفئة الرياضية المعنية *
                    </label>
                    <select
                      required
                      className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold text-slate-700"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {activeSportCategories.map((catId) => (
                        <option key={catId} value={catId}>
                          {getCategoryLabel(catId)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Photo Upload */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      صورة التلميذ (اختياري)
                    </label>
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                      <div className="w-16 h-16 rounded-full border bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-3xs">
                        {photo ? (
                          <img src={photo} alt="Preview" className="w-full h-full object-cover" referrerpolicy="no-referrer" />
                        ) : (
                          <User className="w-8 h-8 text-slate-300" />
                        )}
                      </div>
                      
                      <div className="flex-1 text-center sm:text-right space-y-1">
                        <p className="text-[11px] font-bold text-slate-700">التقاط صورة مباشرة أو رفع ملف صورة التلميذ</p>
                        <p className="text-[10px] text-slate-400">سيتم ضغط وتصغير حجم الصورة تلقائياً للحفاظ على مساحة التخزين وسرعة التصفح</p>
                        
                        <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start">
                          <label className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all shadow-3xs cursor-pointer">
                            <Upload className="h-3.5 w-3.5 text-white/80" />
                            <span>التقاط بالكاميرا 📸</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={handlePhotoUpload}
                            />
                          </label>

                          <label className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg text-[10px] font-extrabold text-slate-600 transition-colors shadow-3xs cursor-pointer">
                            <Upload className="h-3.5 w-3.5 text-slate-400" />
                            <span>اختر صورة من الجهاز</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handlePhotoUpload}
                            />
                          </label>

                          {photo && (
                            <button
                              type="button"
                              onClick={() => setPhoto('')}
                              className="text-[10px] text-red-500 hover:text-red-700 hover:underline font-bold self-center px-1"
                            >
                              إلغاء الصورة
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>{uploading ? 'جاري رفع الملف...' : 'حفظ وتسجيل التلميذ'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Student Roster Table/Grid */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h4 className="text-xs md:text-sm font-bold text-slate-800">
                لائحة التلاميذ المسجلين بالفريق للفئة الرياضية الحالية ({activeSportStudents.length} تلاميذ)
              </h4>
            </div>

            {activeSportStudents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 bg-slate-50/20 uppercase tracking-wider">
                      <th className="p-4">الصورة</th>
                      <th className="p-4">الاسم والنسب</th>
                      <th className="p-4">الجنس</th>
                      <th className="p-4">تاريخ الازدياد</th>
                      <th className="p-4">الفئة</th>
                      <th className="p-4">المؤسسة</th>
                      <th className="p-4 text-left">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {activeSportStudents.map((stud) => (
                      <tr key={stud.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 whitespace-nowrap">
                          <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-3xs">
                            {stud.photoUrl ? (
                              <img src={stud.photoUrl} alt={stud.fullName} className="w-full h-full object-cover" referrerpolicy="no-referrer" />
                            ) : (
                              <span className="text-sm font-bold text-slate-400">
                                {stud.gender === 'Male' ? '👦' : '👧'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap font-bold text-slate-800">
                          {stud.fullName}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                            stud.gender === 'Male'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-pink-50 text-pink-700 border-pink-200'
                          }`}>
                            {stud.gender === 'Male' ? 'ذكر' : 'أنثى'}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap font-mono font-bold text-slate-600">
                          {stud.birthDate}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <span className="bg-slate-100 text-slate-800 font-extrabold text-[10px] px-2 py-0.5 rounded border border-slate-200">
                            {getCategoryLabel(stud.category)}
                          </span>
                        </td>
                        <td className="p-4 whitespace-nowrap text-slate-500 font-bold">
                          {stud.schoolName}
                        </td>
                        <td className="p-4 whitespace-nowrap text-left">
                          <button
                            onClick={() => handleDeleteStudent(stud.id)}
                            title="حذف التلميذ"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-xl">
                  📋
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">لا يوجد أي تلاميذ مسجلين حالياً</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                    اضغط على زر "إضافة تلميذ جديد" بالأعلى للبدء في تشكيل وإدخال لائحة فريق مؤسستك لهذه الرياضة.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
