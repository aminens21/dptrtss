import React, { useState } from 'react';
import { School } from '../types';
import { X, School as SchoolIcon, MapPin, User, Phone, Layers } from 'lucide-react';

interface CreateSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (school: Omit<School, 'id'>) => Promise<void>;
  initialData?: School | null;
}

export const CreateSchoolModal: React.FC<CreateSchoolModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState(initialData?.type || 'تأهيلي');
  const [commune, setCommune] = useState(initialData?.commune || 'تاوريرت');
  const [teacherName, setTeacherName] = useState(initialData?.teacherName || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync initialData when opening for edit
  React.useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(initialData.type);
      setCommune(initialData.commune);
      setTeacherName(initialData.teacherName);
      setPhone(initialData.phone || '');
    } else {
      setName('');
      setType('تأهيلي');
      setCommune('تاوريرت');
      setTeacherName('');
      setPhone('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !teacherName.trim()) {
      alert('يرجى إدخال اسم المؤسسة واسم الأستاذ المؤطر');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        name: name.trim(),
        type,
        commune: commune.trim(),
        teacherName: teacherName.trim(),
        phone: phone.trim() || undefined
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" dir="rtl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <SchoolIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {initialData ? 'تعديل بيانات المؤسسة المشاركة' : 'إضافة مؤسسة تعليمية مشاركة'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">تسجيل المؤسسة والفرق التابعة لها بمديرية تاوريرت</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم المؤسسة التعليمية *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: ثانوية الفتح التأهيلية"
              className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">السلك التعليمي</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="تأهيلي">ثانوي تأهيلي</option>
                <option value="إعدادي">ثانوي إعدادي</option>
                <option value="ابتدائي">تعليم ابتدائي</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الجماعة / المدينة</label>
              <select
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="تاوريرت">تاوريرت المركز</option>
                <option value="العيون سيدي ملوك">العيون سيدي ملوك</option>
                <option value="دبدو">دبدو</option>
                <option value="سيدي لحسن">سيدي لحسن</option>
                <option value="سيدي علي بلقاسم">سيدي علي بلقاسم</option>
                <option value="مستكمار">مستكمار</option>
                <option value="قطيطير">قطيطير</option>
                <option value="أهل واد زا">أهل واد زا</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الأستاذ المؤطر (EPS) *</label>
              <input
                type="text"
                required
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="مثال: ذ. عبد الرحيم بلقاسم"
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف للتواصل</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06XXXXXXXX"
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
                dir="ltr"
              />
            </div>
          </div>

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
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:bg-blue-300 cursor-pointer"
            >
              {isSubmitting ? 'جاري الحفظ...' : initialData ? 'تحديث البيانات' : 'إضافة المؤسسة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
