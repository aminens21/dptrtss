import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DataService, SPORTS_MAP } from '../lib/dataService';
import { compressImageToBase64 } from '../lib/imageUtils';
import { CameraCaptureModal } from './CameraCaptureModal';
import {
  User as UserIcon,
  MapPin,
  CreditCard,
  Award,
  Mail,
  Phone,
  Save,
  AlertCircle,
  X,
  Camera,
  Upload,
  Trash2,
  Sparkles
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
  const [photoUrl, setPhotoUrl] = useState('');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)');
      return;
    }

    try {
      setIsProcessingPhoto(true);
      // Compress to lightweight Base64 to save storage space and bandwidth
      const compressed = await compressImageToBase64(file, {
        maxWidth: 320,
        maxHeight: 320,
        quality: 0.82
      });
      setPhotoUrl(compressed);
      toast.success('تمت معالجة وضغط الصورة بنجاح');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء معالجة الصورة');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

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
      setPhotoUrl(userProfile.photoUrl || '');
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
        photoUrl: photoUrl || undefined,
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
                    : 'يمكنك تعديل معلوماتك الشخصية وصورتك ومقر عملك وتخصصاتك في التحكيم'}
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
                مرحباً بك! لإتمام إعداد حسابكم الرياضي وتعيينكم في لجان التحكيم، يرجى استكمال رقم التأجير، مقر العمل، ورقم الهاتف وتخصص التحكيم.
              </span>
            </div>
          )}

          {/* Teacher Photo Upload Box (Compressed & Mobile Camera) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={fullName || 'Teacher photo'}
                    className="w-16 h-16 rounded-full object-cover border-2 border-blue-500 shadow-sm"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-slate-400">
                    <UserIcon className="w-8 h-8" />
                  </div>
                )}
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full shadow cursor-pointer transition-transform hover:scale-110"
                    title="حذف الصورة"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">صورة الأستاذ(ة) المؤطر(ة)</span>
                  {photoUrl && (
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ✓ تم تسجيل الصورة
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                  يمكنك التقاط صورتك مباشرة عبر كاميرا هاتفك المحمول أو رفع صورة من جهازك.
                </p>
                {isProcessingPhoto && (
                  <span className="text-[10px] text-blue-600 font-bold animate-pulse block mt-1">
                    جاري ضغط ومعالجة الصورة...
                  </span>
                )}
              </div>
            </div>

            {/* Quick Action Buttons for Camera & File */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => mobileCameraInputRef.current?.click()}
                className="py-2 px-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>التقاط بالكاميرا مباشرة 📸</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>فتح الكاميرا المباشرة 📷</span>
              </button>

              <button
                type="button"
                onClick={() => fileUploadInputRef.current?.click()}
                className="sm:col-span-2 py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>اختيار صورة من ملفات الجهاز 📁</span>
              </button>
            </div>

            {/* Native Mobile Camera Input */}
            <input
              ref={mobileCameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={handlePhotoSelect}
            />

            {/* File Upload Input */}
            <input
              ref={fileUploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>

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

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(capturedBase64) => {
          setPhotoUrl(capturedBase64);
        }}
        title="التقاط صورة الأستاذ(ة) المؤطر(ة)"
      />
    </div>
  );
};


