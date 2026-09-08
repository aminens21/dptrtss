import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DataService, SPORTS_MAP, deduplicateById } from '../lib/dataService';
import { School, Match } from '../types';
import {
  Plus,
  Search,
  School as SchoolIcon,
  MapPin,
  User,
  Users,
  Phone,
  PhoneCall,
  Edit3,
  Trash2,
  Filter,
  CheckCircle2,
  Building2,
  GraduationCap
} from 'lucide-react';
import { CreateSchoolModal } from '../components/CreateSchoolModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { SchoolParticipantsModal } from '../components/SchoolParticipantsModal';
import toast from 'react-hot-toast';

export const Schools: React.FC = () => {
  const { userProfile } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [communeFilter, setCommuneFilter] = useState<string>('ALL');
  const [selectedSport, setSelectedSport] = useState<string>('ALL');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [schoolToDelete, setSchoolToDelete] = useState<School | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedSchoolForParticipants, setSelectedSchoolForParticipants] = useState<School | null>(null);

  // CENTRAL_ADMIN, SPORT_MANAGER, and Technical Committee Head (رئيس اللجنة التقنية) can manage participating schools and principal phone
  const isTechCommitteeHead = !!userProfile?.isTechCommitteeHead;
  const canManage = userProfile?.role === 'CENTRAL_ADMIN' || 
                    userProfile?.role === 'SPORT_MANAGER' || 
                    isTechCommitteeHead;

  // Determine user's primary/preferred sport specialty for automatic focus on login
  const preferredSportId = useMemo(() => {
    if (!userProfile) return 'ALL';
    
    // 1. Sport Manager
    if (userProfile.role === 'SPORT_MANAGER') {
      return userProfile.sportId || 'ALL';
    }
    
    // 2. Technical Committee Head
    if (userProfile.isTechCommitteeHead && userProfile.techCommitteeSports && userProfile.techCommitteeSports.length > 0) {
      return userProfile.techCommitteeSports[0];
    }
    
    // 3. Technical Committee Member
    if (userProfile.isTechCommitteeMember && userProfile.techCommitteeSportsMemberOf && userProfile.techCommitteeSportsMemberOf.length > 0) {
      return userProfile.techCommitteeSportsMemberOf[0];
    }
    
    // 4. Fallback userProfile.sportId
    if (userProfile.sportId) {
      return userProfile.sportId;
    }
    
    return 'ALL';
  }, [userProfile]);

  // Set initial selected sport to user preferred specialty upon login/data load
  useEffect(() => {
    if (preferredSportId && preferredSportId !== 'ALL') {
      setSelectedSport(preferredSportId);
    }
  }, [preferredSportId]);

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    setLoading(true);
    try {
      const [list, mList, studList] = await Promise.all([
        DataService.getSchools(),
        DataService.getMatches(),
        DataService.getStudents()
      ]);
      setSchools(deduplicateById<School>(list));
      setMatches(mList);
      setStudents(studList);
    } catch (e) {
      console.error(e);
      toast.error('تعذر تحميل لائحة المؤسسات والفرق');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchool = async (schoolData: Omit<School, 'id'>) => {
    try {
      if (editingSchool) {
        await DataService.updateSchool(editingSchool.id, schoolData);
        setSchools(prev => deduplicateById<School>(prev.map(s => s.id === editingSchool.id ? { ...s, ...schoolData } : s)));
        toast.success('تم تحديث بيانات المؤسسة بنجاح');
        setEditingSchool(null);
      } else {
        const created = await DataService.addSchool(schoolData);
        setSchools(prev => deduplicateById<School>([created, ...prev]));
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

  const participatingSchoolIdsForSport = useMemo(() => {
    if (selectedSport === 'ALL') return null;

    const ids = new Set<string>();

    // 1. Schools with matches in this sport
    matches.forEach(m => {
      if (m.sportId === selectedSport) {
        if (m.team1Id) ids.add(m.team1Id);
        if (m.team2Id) ids.add(m.team2Id);
      }
    });

    // 2. Schools with registered students in this sport
    students.forEach(s => {
      if (s.sportId === selectedSport) {
        // Find school by name or schoolId
        const school = schools.find(sch => sch.id === s.schoolId || sch.name === s.schoolName);
        if (school) {
          ids.add(school.id);
        }
      }
    });

    return ids;
  }, [selectedSport, matches, students, schools]);

  const filtered = schools.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                        s.commune.toLowerCase().includes(search.toLowerCase()) ||
                        s.teacherName.toLowerCase().includes(search.toLowerCase()) ||
                        (s.phone || '').includes(search) ||
                        (s.principalPhone || '').includes(search);
    const matchType = typeFilter === 'ALL' || s.type === typeFilter;
    const matchCommune = communeFilter === 'ALL' || s.commune.includes(communeFilter);
    const matchSport = selectedSport === 'ALL' || (participatingSchoolIdsForSport && participatingSchoolIdsForSport.has(s.id));
    return matchSearch && matchType && matchCommune && matchSport;
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
      <div className="flex flex-col lg:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
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

        {/* Sport Filter Dropdown */}
        <div className="flex items-center gap-2 w-full lg:w-auto border-t lg:border-t-0 lg:border-r border-slate-100 pt-2 lg:pt-0 lg:pr-3 shrink-0">
          <label htmlFor="schools-sport-filter" className="text-xs font-bold text-slate-600 whitespace-nowrap flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            <span>الرياضة:</span>
          </label>
          <select
            id="schools-sport-filter"
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[160px]"
          >
            <option value="ALL">🏆 جميع الرياضات</option>
            {Object.entries(SPORTS_MAP).map(([id, info]) => (
              <option key={id} value={id}>
                {info.icon} {info.name}
              </option>
            ))}
          </select>
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

      {/* Sport Participation Notice Banner */}
      {selectedSport !== 'ALL' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-blue-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xl shrink-0">{SPORTS_MAP[selectedSport]?.icon || '🏆'}</span>
            <div>
              <span className="font-bold">المؤسسات المشاركة في بطولة {SPORTS_MAP[selectedSport]?.name}:</span>{' '}
              <span className="text-blue-700">اضغط على أي مؤسسة للاطلاع الفوري على لائحة التلاميذ المشاركين وتصديرها بصيغة Excel.</span>
            </div>
          </div>
          <button
            onClick={() => setSelectedSport('ALL')}
            className="text-blue-700 hover:text-blue-900 font-bold underline text-[11px] shrink-0 self-end sm:self-auto cursor-pointer"
          >
            عرض جميع الرياضات ({schools.length})
          </button>
        </div>
      )}

      {/* School Cards Grid */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.length > 0 ? (
            filtered.map((s) => {
              const schoolStudentsForSport = students.filter(
                stud => (stud.schoolId === s.id || stud.schoolName === s.name) && (selectedSport === 'ALL' || stud.sportId === selectedSport)
              );
              const count = schoolStudentsForSport.length;

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSchoolForParticipants(s)}
                  className="flex flex-col justify-between rounded-xl bg-white p-4 border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all space-y-3 cursor-pointer group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 shrink-0 font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
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
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSchool(s);
                              setIsModalOpen(true);
                            }}
                            title="تعديل المؤسسة"
                            className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSchoolToDelete(s);
                            }}
                            title="حذف المؤسسة"
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="text-xs md:text-sm font-bold text-slate-800 leading-snug group-hover:text-blue-700 transition-colors">
                      {s.name}
                    </h3>

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

                  <div className="space-y-1.5 pt-1">
                    {/* Teacher Phone */}
                    {s.phone && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <User className="h-3 w-3 text-blue-500" />
                          <span>هاتف المؤطر:</span>
                        </span>
                        <a
                          href={`tel:${s.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-slate-700 hover:text-blue-600 font-bold"
                          dir="ltr"
                        >
                          {s.phone}
                        </a>
                      </div>
                    )}

                    {/* Principal Phone (هاتف مدير المؤسسة) */}
                    <div className={`pt-1.5 ${s.phone ? 'border-t border-slate-100/70' : 'pt-2 border-t border-slate-100'} flex items-center justify-between text-[11px]`}>
                      <span className="text-amber-900 font-semibold flex items-center gap-1">
                        <PhoneCall className="h-3 w-3 text-amber-600" />
                        <span>هاتف المدير:</span>
                      </span>
                      {s.principalPhone ? (
                        <a
                          href={`tel:${s.principalPhone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-amber-950 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold hover:bg-amber-100 transition-colors"
                          dir="ltr"
                          title="الاتصال بمدير المؤسسة"
                        >
                          {s.principalPhone}
                        </a>
                      ) : canManage ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSchool(s);
                            setIsModalOpen(true);
                          }}
                          className="text-[10px] text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 px-2 py-0.5 rounded font-bold transition-colors cursor-pointer"
                          title="إضافة رقم هاتف مدير المؤسسة"
                        >
                          + إضافة هاتف المدير
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[10px]">غير مسجل</span>
                      )}
                    </div>

                    {/* Participant List Click Trigger Footer */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 group-hover:text-blue-700">
                        <Users className="h-3.5 w-3.5 text-blue-600" />
                        <span>
                          {selectedSport !== 'ALL'
                            ? `لائحة المشاركين (${count} ${count === 1 ? 'تلميذ' : 'تلاميذ'})`
                            : `المشاركون المسجلون (${count})`}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-blue-600 group-hover:text-blue-800 flex items-center gap-0.5 group-hover:translate-x-[-2px] transition-all">
                        <span>عرض اللائحة</span>
                        <span className="text-xs">←</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
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

      {/* School Participants Modal for Filtered Sport */}
      <SchoolParticipantsModal
        isOpen={!!selectedSchoolForParticipants}
        onClose={() => setSelectedSchoolForParticipants(null)}
        school={selectedSchoolForParticipants}
        sportId={selectedSport}
        allStudents={students}
      />
    </div>
  );
};
