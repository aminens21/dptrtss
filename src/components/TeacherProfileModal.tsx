import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DataService, SPORTS_MAP } from '../lib/dataService';
import {
  User as UserIcon,
  MapPin,
  CreditCard,
  Award,
  Mail,
  Phone,
  Save,
  AlertCircle,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export const TeacherProfileModal: React.FC = () => {
  const { userProfile, updateProfileState, isProfileModalOpen, setIsProfileModalOpen, closeProfileModal } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [leaseNumber, setLeaseNumber] = useState('');
  const [refereeSpecialty, setRefereeSpecialty] = useState<string[]>([]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Check if teacher profile is incomplete on first load
  useEffect(() => {
    if (userProfile && userProfile.role === 'TEACHER') {
      const isIncomplete = !userProfile.workLocation || !userProfile.leaseNumber;
      if (isIncomplete) {
        setIsProfileModalOpen(true);
      }
    }
  }, [userProfile, setIsProfileModalOpen]);

  // Sync form data when modal opens or userProfile changes
  useEffect(() => {
    if (userProfile && isProfileModalOpen) {
      setFullName(userProfile.fullName || '');
      setWorkLocation(userProfile.workLocation || '');
      setLeaseNumber(userProfile.leaseNumber || '');
      setRefereeSpecialty(
        Array.isArray(userProfile.refereeSpecialty)
          ? userProfile.refereeSpecialty
          : userProfile.refereeSpecialty
          ? [userProfile.refereeSpecialty]
          : []
      );
      setPhone(userProfile.phone || '');
      setEmail(userProfile.email || '');
    }
  }, [userProfile, isProfileModalOpen]);

  if (!isProfileModalOpen || !userProfile) return null;

  const isIncomplete = userProfile.role === 'TEACHER' && (!userProfile.workLocation || !userProfile.leaseNumber);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!fullName.trim()) {
      toast.error('الرجاء إدخال الإسم الكامل');
      return;
    }
    if (!workLocation.trim()) {
      toast.error('الرجاء إدخال مقر العمل');
      return;
    }
    if (!leaseNumber.trim()) {
      toast.error('الرجاء إدخال رقم التأجير');
      return;
    }
    if (!phone.trim()) {
      toast.error('الرجاء إدخال رقم الهاتف');
      return;
    }

    setLoading(true);
    try {
      const updatedData = {
        fullName: fullName.trim(),
        workLocation: workLocation.trim(),
        leaseNumber: leaseNumber.trim(),
        refereeSpecialty: refereeSpecialty,
        phone: phone.trim(),
        updatedAt: new Date()
      };

      // 1. Update in backend/local cache
      await DataService.updateUserProfile(userProfile.id, updatedData);

      // 2. Update in Auth state
      updateProfileState(updatedData);

      toast.success('تم حفظ وتحديث البيانات الشخصية بنجاح!');
      closeProfileModal();
    } catch (error) {
      console.error('Error updating teacher profile:', error);
      toast.error('حدث خطأ أثناء حفظ البيانات. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" dir="rtl">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-5 text-white relative shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-lg">
                <UserIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold">
                  {isIncomplete ? 'استكمال البيانات الشخصية للأستاذ' : 'الملف الشخصي وتعديل البيانات'}
                </h3>
                <p className="text-xs text-blue-100/80 mt-0.5">
                  {isIncomplete
                    ? 'يرجى ملء الاستمارة لتفعيل حسابكم وتسهيل تواصل الإدارة معكم'
                    : 'يمكنك تعديل معلوماتك الشخصية ومقر عملك وتخصصاتك في التحكيم في أي وقت'}
                </p>
              </div>
            </div>
            {!isIncomplete && (
              <button
                type="button"
                onClick={closeProfileModal}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {isIncomplete && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2.5 text-amber-800 text-[11px] leading-relaxed">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                يرجى إدخال معلوماتكم الشخصية بدقة. هذه البيانات ستمكن المسؤول المركزي للمديرية من الإطلاع عليها وتعيينكم في لجان التحكيم وإدارتكم في الأنشطة الرياضية بنجاح.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                <span>الإسم الكامل *</span>
              </label>
              <input
                type="text"
                required
                className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                placeholder="مثال: أحمد العمراني"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            {/* Email (Read Only) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>البريد الإلكتروني (غير قابل للتعديل)</span>
              </label>
              <input
                type="email"
                disabled
                className="w-full text-xs px-3 py-2.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg cursor-not-allowed font-mono"
                value={email}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Lease Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                  <span>رقم التأجير *</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                  placeholder="مثال: 1245789"
                  value={leaseNumber}
                  onChange={(e) => setLeaseNumber(e.target.value)}
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>رقم الهاتف *</span>
                </label>
                <input
                  type="tel"
                  required
                  className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                  placeholder="مثال: 0661234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {/* Work Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>مقر العمل (المؤسسة التعليمية) *</span>
              </label>
              <input
                type="text"
                required
                className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                placeholder="مثال: ثانوية الفتح التأهيلية"
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
              />
            </div>

            {/* Sports Specialization in Refereeing */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-slate-400" />
                <span>التخصصات الرياضية في التحكيم (يمكن اختيار أكثر من تخصص)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SPORTS_MAP).map(([key, sport]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (refereeSpecialty.includes(key)) {
                        setRefereeSpecialty(refereeSpecialty.filter(s => s !== key));
                      } else {
                        setRefereeSpecialty([...refereeSpecialty, key]);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
                      refereeSpecialty.includes(key)
                        ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <span>{sport.icon}</span>
                    <span>{sport.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            {!isIncomplete && (
              <button
                type="button"
                onClick={closeProfileModal}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'جاري حفظ البيانات...' : (isIncomplete ? 'حفظ البيانات والاستمرار' : 'حفظ التعديلات')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

