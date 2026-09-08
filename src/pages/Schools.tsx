import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DataService } from '../lib/dataService';
import { School } from '../types';
import {
  Plus,
  Search,
  School as SchoolIcon,
  MapPin,
  User,
  Phone,
  Edit3,
  Trash2,
  Filter,
  CheckCircle2,
  Building2,
  GraduationCap
} from 'lucide-react';
import { CreateSchoolModal } from '../components/CreateSchoolModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import toast from 'react-hot-toast';

export const Schools: React.FC = () => {
  const { userProfile } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [communeFilter, setCommuneFilter] = useState<string>('ALL');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Both CENTRAL_ADMIN and SPORT_MANAGER can manage participating schools
  const canManage = userProfile?.role === 'CENTRAL_ADMIN' || userProfile?.role === 'SPORT_MANAGER';

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    setLoading(true);
    try {
      const list = await DataService.getSchools();
      setSchools(list);
    } catch (e) {
      console.error(e);
      toast.error('تعذر تحميل لائحة المؤسسات');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchool = async (schoolData: Omit<School, 'id'>) => {
    try {
      if (editingSchool) {
        await DataService.updateSchool(editingSchool.id, schoolData);
        setSchools(prev => prev.map(s => s.id === editingSchool.id ? { ...s, ...schoolData } : s));
        toast.success('تم تحديث بيانات المؤسسة بنجاح');
        setEditingSchool(null);
      } else {
        const created = await DataService.addSchool(schoolData);
        setSchools(prev => [created, ...prev]);
        toast.success('تمت إضافة المؤسسة التعليمية بنجاح');
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء حفظ المؤسسة');
    }
  };

  const handleConfirmDelete = async () => {
    if (!schoolToDelete) return;
    setIsDeleting(true);
    try {
      await DataService.deleteSchool(schoolToDelete.id);
      setSchools(prev => prev.filter(s => s.id !== schoolToDelete.id));
      toast.success('تم حذف المؤسسة بنجاح');
      setSchoolToDelete(null);
    } catch (e) {
      toast.error('تعذر حذف المؤسسة');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = schools.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                        s.commune.toLowerCase().includes(search.toLowerCase()) ||
                        s.teacherName.toLowerCase().includes(search.toLowerCase()) ||
                        (s.phone || '').includes(search);
    const matchType = typeFilter === 'ALL' || s.type === typeFilter;
    const matchCommune = communeFilter === 'ALL' || s.commune.includes(communeFilter);
    return matchSearch && matchType && matchCommune;
  });

  const highSchoolsCount = schools.filter(s => s.type === 'تأهيلي').length;
  const middleSchoolsCount = schools.filter(s => s.type === 'إعدادي').length;
  const primarySchoolsCount = schools.filter(s => s.type === 'ابتدائي').length;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-bold text-slate-800">دليل المؤسسات والفرق المشاركة</h2>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200">
              مديرية تاوريرت
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            قائمة المؤسسات التعليمية (تأهيلي، إعدادي، ابتدائي) والأساتذة المؤطرين للفرق الرياضية
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => {
              setEditingSchool(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة مؤسسة مشاركة</span>
          </button>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setTypeFilter('تأهيلي')}
          className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
            typeFilter === 'تأهيلي'
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-blue-200'
          }`}
        >
          <span className="text-[10px] font-bold text-blue-700 uppercase">الثانوي التأهيلي</span>
          <p className="text-lg md:text-xl font-black text-slate-800 mt-1">{highSchoolsCount}</p>
        </button>

        <button
          onClick={() => setTypeFilter('إعدادي')}
          className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
            typeFilter === 'إعدادي'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-200'
          }`}
        >
          <span className="text-[10px] font-bold text-emerald-700 uppercase">الثانوي الإعدادي</span>
          <p className="text-lg md:text-xl font-black text-emerald-700 mt-1">{middleSchoolsCount}</p>
        </button>

        <button
          onClick={() => setTypeFilter('ابتدائي')}
          className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
            typeFilter === 'ابتدائي'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-amber-200'
          }`}
        >
          <span className="text-[10px] font-bold text-amber-700 uppercase">التعليم الابتدائي</span>
          <p className="text-lg md:text-xl font-black text-slate-800 mt-1">{primarySchoolsCount}</p>
        </button>
      </div>

      {/* Filter and search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-1 items-center px-2 w-full">
          <Search className="h-4 w-4 text-slate-400 ml-2 shrink-0" />
          <input
            type="text"
            placeholder="ابحث باسم المؤسسة، الجماعة، أو الأستاذ المؤطر..."
            className="w-full border-0 focus:ring-0 text-xs py-1 text-slate-800 placeholder-slate-400 focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: `الكل (${schools.length})` },
            { id: 'تأهيلي', label: 'تأهيلي' },
            { id: 'إعدادي', label: 'إعدادي' },
            { id: 'ابتدائي', label: 'ابتدائي' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                typeFilter === f.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* School Cards Grid */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.length > 0 ? (
            filtered.map((s) => (
              <div
                key={s.id}
                className="flex flex-col justify-between rounded-xl bg-white p-4 border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 shrink-0 font-bold">
                        🏫
                      </div>
                      <div>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${
                          s.type === 'تأهيلي'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : s.type === 'إعدادي'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {s.type === 'تأهيلي' ? 'ثانوي تأهيلي' : s.type === 'إعدادي' ? 'ثانوي إعدادي' : 'ابتدائي'}
                        </span>
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingSchool(s);
                            setIsModalOpen(true);
                          }}
                          title="تعديل المؤسسة"
                          className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setSchoolToDelete(s)}
                          title="حذف المؤسسة"
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="text-xs md:text-sm font-bold text-slate-800 leading-snug">{s.name}</h3>

                  <div className="mt-2 text-[11px] text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{s.commune}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      <User className="h-3.5 w-3.5 text-blue-600" />
                      <span>المؤطر: {s.teacherName}</span>
                    </div>
                  </div>
                </div>

                {s.phone && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">الهاتف:</span>
                    <span className="font-mono text-slate-700 font-bold" dir="ltr">{s.phone}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-500 bg-white rounded-xl border border-slate-200 text-center">
              <SchoolIcon className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700 mb-1">لا توجد مؤسسات مطابقة</p>
              {canManage && (
                <button
                  onClick={() => {
                    setEditingSchool(null);
                    setIsModalOpen(true);
                  }}
                  className="mt-3 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                >
                  إضافة مؤسسة جديدة الآن
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit School Modal */}
      <CreateSchoolModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSchool(null);
        }}
        onSave={handleSaveSchool}
        initialData={editingSchool}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!schoolToDelete}
        onClose={() => setSchoolToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="حذف المؤسسة التعليمية"
        message="هل أنت متأكد من رغبتك في حذف هذه المؤسسة من دليل المشاركين؟"
        itemName={schoolToDelete?.name}
        isDeleting={isDeleting}
      />
    </div>
  );
};
