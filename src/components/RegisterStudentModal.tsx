import React, { useState, useEffect, useMemo } from 'react';
import { Sport, Student, School } from '../types';
import { DataService, getAgeCategoriesForSeason, SPORTS_MAP, getCategoryGenderLabel } from '../lib/dataService';
import { useAuth } from '../contexts/AuthContext';
import { X, GraduationCap, User, Calendar, Upload, AlertCircle, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface RegisterStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sport: Sport | null;
  preselectedCategory?: string;
  preselectedGender?: 'Male' | 'Female';
  preselectedAffiliation?: 'non_club' | 'club_affiliated';
  schools: School[];
  registrationDeadline?: any;
  onRegistered: () => void;
}

export const RegisterStudentModal: React.FC<RegisterStudentModalProps> = ({
  isOpen,
  onClose,
  sport,
  preselectedCategory,
  preselectedGender,
  preselectedAffiliation,
  schools,
  registrationDeadline,
  onRegistered
}) => {
  const { userProfile } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [massarNumber, setMassarNumber] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>(preselectedGender || 'Male');
  const [birthDate, setBirthDate] = useState('');
  const [category, setCategory] = useState(preselectedCategory || 'U15');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [participationType, setParticipationType] = useState<'individual' | 'school_team'>('individual');
  const [affiliationType, setAffiliationType] = useState<'non_club' | 'club_affiliated'>(preselectedAffiliation || 'non_club');
  const [athleticsSpecialty, setAthleticsSpecialty] = useState('');
  const [photo, setPhoto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSeason, setCurrentSeason] = useState('2026/2027');

  useEffect(() => {
    DataService.getActiveSeason().then(setCurrentSeason);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCategory(preselectedCategory || 'U15');
      setGender(preselectedGender || 'Male');
      setAffiliationType(preselectedAffiliation || 'non_club');

      // Reset text inputs to prevent stale data between modal openings
      setFullName('');
      setMassarNumber('');
      setBirthDate('');
      setPhoto('');
      setAthleticsSpecialty('');
    }
  }, [isOpen, preselectedCategory, preselectedGender, preselectedAffiliation]);

  // Synchronize school auto-selection based on userProfile and schools list
  useEffect(() => {
    if (isOpen) {
      if (userProfile?.workLocation) {
        const match = schools.find(s => 
          s.name && (
            s.name.trim().toLowerCase() === userProfile.workLocation!.trim().toLowerCase() ||
            s.name.includes(userProfile.workLocation!) ||
            userProfile.workLocation!.includes(s.name)
          )
        );
        if (match) {
          setSelectedSchoolId(match.id);
        } else {
          setSelectedSchoolId('');
        }
      } else {
        setSelectedSchoolId('');
      }
    }
  }, [isOpen, userProfile, schools]);

  const isExpired = useMemo(() => {
    if (!registrationDeadline) return false;
    let targetDate: Date;
    if (typeof registrationDeadline === 'object' && registrationDeadline !== null && 'toDate' in registrationDeadline && typeof registrationDeadline.toDate === 'function') {
      targetDate = registrationDeadline.toDate();
    } else if (registrationDeadline instanceof Date) {
      targetDate = registrationDeadline;
    } else {
      targetDate = new Date(registrationDeadline);
    }
    return !isNaN(targetDate.getTime()) && targetDate.getTime() < Date.now();
  }, [registrationDeadline]);

  if (!isOpen || !sport) return null;

  const seasonalCategories = getAgeCategoriesForSeason(currentSeason);
  const availableCategories = (sport.ageCategories && sport.ageCategories.length > 0)
    ? sport.ageCategories
    : seasonalCategories.map(c => c.id);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً (يجب أن يكون أقل من 2 ميغابايت)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhoto(reader.result as string);
      toast.success('تم تحميل الصورة الشخصية بنجاح');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isExpired) {
      toast.error('انتهى أجل التسجيل المحدد لهذه البطولة ولا يمكن إضافة مشاركين جديد!');
      return;
    }

    if (!fullName.trim()) {
      toast.error('يرجى إدخال اسم ونسب التلميذ(ة)');
      return;
    }
    if (!birthDate) {
      toast.error('يرجى اختيار تاريخ الميلاد');
      return;
    }
    if (!category) {
      toast.error('يرجى اختيار الفئة الرياضية');
      return;
    }

    if (sport.id === 'athletics' && !athleticsSpecialty) {
      toast.error('يرجى تحديد تخصص ألعاب القوى');
      return;
    }

    // Verify Age category match
    if (birthDate && category) {
      const catConfig = seasonalCategories.find(c => c.id === category);
      if (catConfig && catConfig.years && catConfig.years.length > 0) {
        const birthYear = new Date(birthDate).getFullYear();
        let isValid = false;
        if (category === 'U12' || category === 'U20') {
          isValid = birthYear >= catConfig.years[0];
        } else {
          isValid = catConfig.years.includes(birthYear);
        }

        if (!isValid) {
          const msg = (category === 'U12' || category === 'U20')
            ? `مواليد ${catConfig.years[0]} وما بعد`
            : `مواليد السنوات: ${catConfig.years.join(' / ')}`;
          toast.error(`تاريخ الازدياد (سنة ${birthYear}) غير مطابق للفئة ${catConfig.shortName || category} (${msg})`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      let resolvedSchoolName = userProfile?.workLocation || '';
      let resolvedSchoolId = userProfile?.id || '';

      if (userProfile?.role === 'TEACHER') {
        if (!userProfile?.workLocation) {
          toast.error('يرجى تحديد مقر عملك (المؤسسة التعليمية) في ملفك الشخصي لتسجيل تلاميذ مؤسستك.');
          setIsSubmitting(false);
          return;
        }
        const matched = schools.find(s => s.name === userProfile.workLocation || s.name.includes(userProfile.workLocation!));
        resolvedSchoolName = userProfile.workLocation;
        resolvedSchoolId = matched ? matched.id : `sch-${userProfile.workLocation.replace(/\s+/g, '-')}`;
      } else {
        const chosenSchool = schools.find(s => s.id === selectedSchoolId);
        if (chosenSchool) {
          resolvedSchoolName = chosenSchool.name;
          resolvedSchoolId = chosenSchool.id;
        } else {
          toast.error('يرجى اختيار المؤسسة التعليمية للتلميذ من لائحة المؤسسات المعتمدة.');
          setIsSubmitting(false);
          return;
        }
      }

      const studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> = {
        fullName: fullName.trim(),
        massarNumber: massarNumber.trim() || undefined,
        gender,
        birthDate,
        category,
        schoolId: resolvedSchoolId,
        schoolName: resolvedSchoolName,
        sportId: sport.id,
        photoUrl: photo || undefined,
        affiliationType,
        ...(sport.id === 'cross_country' ? {
          participationType,
          distance: category === 'U12' ? '1500م' : category === 'U15' ? '2000م' : category === 'U18' ? '3000م' : '4000م'
        } : {}),
        ...(sport.id === 'athletics' ? {
          athleticsSpecialty
        } : {})
      };

      await DataService.addStudent(studentData);
      toast.success(`تم تسجيل التلميذ(ة) ${fullName} ببطولة ${sport.name} بنجاح!`);
      
      // Reset & close
      setFullName('');
      setMassarNumber('');
      setPhoto('');
      onRegistered();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء عملية التسجيل');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 relative z-[101]">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 text-blue-300 flex items-center justify-center font-bold border border-blue-400/30 text-lg">
              🎓
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                تسجيل تلميذ(ة) جديد في بطولة {sport.name}
              </h3>
              <p className="text-[11px] text-slate-300">
                إدخال البيانات الرسمية المشاركة بالمؤسسة التعليمية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Expired Warning Banner */}
        {isExpired && (
          <div className="p-3 bg-red-50 border-b border-red-200 flex items-center gap-2.5 text-red-900 text-xs font-bold">
            <Lock className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p>انتهى أجل التسجيل المحدد لهذه البطولة أوتوماتيكياً.</p>
              <p className="text-[10px] text-red-700 font-normal mt-0.5">
                لا يمكن إضافة أو تعديل قائمة التلاميذ والفرق بعد انقضاء الوقت المحدد من طرف رئيس اللجنة التقنية.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Student Name, Massar ID & Photo */}
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  الاسم والنسب الكامل للتلميذ(ة) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  disabled={isExpired}
                  placeholder="مثال: محمد العمراوي"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  رقم مسار (Code Massar)
                </label>
                <input
                  type="text"
                  disabled={isExpired}
                  placeholder="مثال: G134567890 أو F123456789"
                  value={massarNumber}
                  onChange={(e) => setMassarNumber(e.target.value.toUpperCase())}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-800 font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 uppercase"
                />
              </div>
            </div>

            {/* Photo Avatar */}
            <div className="flex flex-col items-center pt-1">
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                الصورة (اختياري)
              </label>
              <label className={`relative w-14 h-16 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden ${
                photo ? 'border-blue-500' : 'border-slate-300 hover:border-blue-400 bg-slate-50'
              }`}>
                {photo ? (
                  <img src={photo} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-5 h-5 text-slate-400" />
                )}
                <input
                  type="file"
                  disabled={isExpired}
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Gender & BirthDate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                الجنس <span className="text-red-500">*</span>
              </label>
              <select
                disabled={isExpired}
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              >
                <option value="Male">ذكر (👦)</option>
                <option value="Female">أنثى (👧)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                تاريخ الازدياد <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                disabled={isExpired}
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Category selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              الفئة العمرية الرياضية <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableCategories.map(catId => {
                const isSelected = category === catId;
                return (
                  <button
                    type="button"
                    key={catId}
                    disabled={isExpired}
                    onClick={() => setCategory(catId)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{getCategoryGenderLabel(catId, gender, currentSeason)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* School selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>المؤسسة التعليمية</span>
              {userProfile?.role === 'TEACHER' && (
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  مؤسستك المعتمدة
                </span>
              )}
            </label>
            {userProfile?.role === 'TEACHER' ? (
              <div className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2.5 bg-slate-50 text-slate-800 font-bold flex items-center justify-between">
                <span>{userProfile?.workLocation || 'يرجى تحديد المؤسسة في ملفكم الشخصي أولاً'}</span>
                <span className="text-[10px] text-slate-400 font-normal">مغلق (مؤسستك فقط)</span>
              </div>
            ) : (
              <select
                disabled={isExpired}
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              >
                <option value="">-- {userProfile?.workLocation || 'اختر المؤسسة'} --</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.commune})</option>
                ))}
              </select>
            )}
          </div>

          {/* Athletics Specialization */}
          {sport.id === 'athletics' && (
            <div>
              <label className="block text-xs font-bold text-purple-900 mb-1">
                تخصص ألعاب القوى الفرعي <span className="text-red-500">*</span>
              </label>
              <select
                disabled={isExpired}
                value={athleticsSpecialty}
                onChange={(e) => setAthleticsSpecialty(e.target.value)}
                className="w-full text-xs rounded-xl border border-purple-200 bg-purple-50/40 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- اختر التخصص (مثل القفز الطولي / جري 80م) --</option>
                {(sport.athleticsSpecialties || [
                  'سباق 80 متر حواجز',
                  'سباق 100 متر',
                  'سباق 800 متر',
                  'القفز الطولي',
                  'القفز العالي',
                  'رمي الجلة (Poids)',
                  'رمي القرص (Disque)',
                  'رمي الرمح (Javelot)'
                ]).map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>
          )}

          {/* Affiliation Type: non_club vs club_affiliated */}
          {!preselectedAffiliation && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                صفة الانتماء الرياضي للتلميذ(ة) <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isExpired}
                  onClick={() => setAffiliationType('non_club')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    affiliationType === 'non_club'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  ⚪ غير منتمي لنادي (مدرسي فقط)
                </button>
                <button
                  type="button"
                  disabled={isExpired}
                  onClick={() => setAffiliationType('club_affiliated')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    affiliationType === 'club_affiliated'
                      ? 'bg-amber-400 text-amber-950 font-extrabold border-amber-500 shadow-xs ring-1 ring-amber-400'
                      : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  🟡 منتمي لنادي / عصبة
                </button>
              </div>
            </div>
          )}

          {/* Cross Country Participation type */}
          {sport.id === 'cross_country' && (
            <div>
              <label className="block text-xs font-bold text-indigo-900 mb-1">
                نوع المشاركة في العدو الريفي
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isExpired}
                  onClick={() => setParticipationType('individual')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    participationType === 'individual'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  فردي (3 مشاركين)
                </button>
                <button
                  type="button"
                  disabled={isExpired}
                  onClick={() => setParticipationType('school_team')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    participationType === 'school_team'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  فريق المؤسسة (5 مشاركين)
                </button>
              </div>
            </div>
          )}

          {/* Submit buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isExpired}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-xs disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>جاري الحفظ...</span>
              ) : (
                <>
                  <GraduationCap className="w-4 h-4" />
                  <span>تأكيد تسجيل التلميذ(ة)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
