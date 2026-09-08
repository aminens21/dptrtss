import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DataService, SPORTS_MAP } from '../lib/dataService';
import { Tournament } from '../types';
import {
  Plus,
  Search,
  Trophy,
  Calendar,
  Filter,
  Sparkles,
  Trash2,
  Users,
  Layers,
  ShieldCheck,
  UserCheck,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Edit3,
  Phone,
  Check,
  Star
} from 'lucide-react';
import { CreateTournamentModal } from '../components/CreateTournamentModal';
import { AssignManagerModal } from '../components/AssignManagerModal';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import toast from 'react-hot-toast';

export const Tournaments: React.FC = () => {
  const { userProfile } = useAuth();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeSeason, setActiveSeason] = useState('2026/2027');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterSport, setFilterSport] = useState<string>('ALL');

  // Selected tournament for assigning manager & PIN
  const [selectedTournamentForManager, setSelectedTournamentForManager] = useState<Tournament | null>(null);

  // Deletion Modal state
  const [tournamentToDelete, setTournamentToDelete] = useState<Tournament | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Map to track visible PINs
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Only CENTRAL_ADMIN and Technical Committee Heads can create, assign or delete tournaments
  const isCentralAdmin = userProfile?.role === 'CENTRAL_ADMIN';
  const isSportManager = userProfile?.role === 'SPORT_MANAGER';
  const isTechCommitteeHead = userProfile?.isTechCommitteeHead === true;
  const canCreate = isCentralAdmin || isTechCommitteeHead;

  // Determine manager sport specialty
  const managerSportId = useMemo(() => {
    if (!isSportManager) return undefined;
    if (userProfile?.sportId) return userProfile.sportId;
    const assignedTourn = tournaments.find(t =>
      (t.managerEmail && t.managerEmail.toLowerCase() === userProfile?.email?.toLowerCase()) ||
      (t.managerName && t.managerName === userProfile?.fullName)
    );
    return assignedTourn?.sportId || 'basketball';
  }, [userProfile, isSportManager, tournaments]);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    setLoading(true);
    try {
      const [list, season] = await Promise.all([
        DataService.getTournaments(),
        DataService.getActiveSeason()
      ]);
      setTournaments(list);
      if (season) {
        setActiveSeason(season);
      }
    } catch (e) {
      console.error(e);
      toast.error('تعذر تحميل البطولات');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = async (newTourns: Omit<Tournament, 'id'> | Omit<Tournament, 'id'>[]) => {
    try {
      const items = Array.isArray(newTourns) ? newTourns : [newTourns];
      const createdItems: Tournament[] = [];
      
      for (const item of items) {
        const created = await DataService.addTournament(item);
        createdItems.push(created);
      }
      
      setTournaments(prev => [...createdItems, ...prev]);
      
      if (items.length > 1) {
        toast.success(`تم إنشاء وبرمجة ${items.length} بطولات بنجاح وفقاً للفئات والأجناس المحددة!`);
      } else {
        toast.success('تمت إضافة البطولة وبرمجتها بنجاح!');
      }
    } catch (e) {
      toast.error('حدث خطأ أثناء حفظ البطولة');
    }
  };

  const handleSaveManager = async (
    tournamentId: string,
    data: { managerName?: string; managerPhone?: string; managerEmail?: string; accessCode?: string }
  ) => {
    try {
      await DataService.updateTournament(tournamentId, data);
      setTournaments(prev => prev.map(t => t.id === tournamentId ? { ...t, ...data } : t));
      toast.success('تم تعيين وحفظ مسؤول البطولة والقن السري بنجاح!');
    } catch (e) {
      toast.error('حدث خطأ أثناء حفظ التخصيص');
    }
  };

  const togglePinVisibility = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setVisiblePins(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyPin = (t: Tournament, e: React.MouseEvent) => {
    e.stopPropagation();
    const pin = t.accessCode || 'غير محدد';
    const text = `بطولة: ${t.name}\nالمسؤول: ${t.managerName || 'غير محدد'}\nالقن السري (PIN): ${pin}\nمنظومة الرياضة المدرسية - تاوريرت`;
    navigator.clipboard.writeText(text);
    setCopiedId(t.id);
    toast.success(`تم نسخ القن السري (${pin}) بنجاح`);
    setTimeout(() => setCopiedId(null), 3000);
  };

  const promptDeleteTournament = (t: Tournament, e: React.MouseEvent) => {
    e.stopPropagation();
    setTournamentToDelete(t);
  };

  const handleConfirmDelete = async () => {
    if (!tournamentToDelete) return;
    setIsDeleting(true);
    try {
      await DataService.deleteTournament(tournamentToDelete.id);
      setTournaments(prev => prev.filter(t => t.id !== tournamentToDelete.id));
      toast.success('تم حذف البطولة بنجاح');
      setTournamentToDelete(null);
    } catch (e) {
      toast.error('تعذر حذف البطولة');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = tournaments.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
                        (t.description || '').toLowerCase().includes(search.toLowerCase()) ||
                        (t.managerName || '').toLowerCase().includes(search.toLowerCase()) ||
                        (t.accessCode || '').toLowerCase().includes(search.toLowerCase());
    const matchSport = filterSport === 'ALL' || t.sportId === filterSport;
    return matchSearch && matchSport;
  });

  const getSportInfo = (sportId?: string) => {
    return SPORTS_MAP[sportId || 'football'] || { name: 'رياضة', icon: '🏆' };
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base md:text-lg font-bold text-slate-800">إدارة وبرمجة البطولات الإقليمية</h2>
            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded border border-blue-200">
              مديرية تاوريرت
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            برمجة المسابقات، تعيين الأساتذة المسؤولين، وتوليد الأقنان السرية (PIN) للإشراف على المباريات
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة بطولة جديدة</span>
          </button>
        )}
      </div>

      {/* Notice for Sport Managers */}
      {isSportManager && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold shadow-xs shrink-0">
              {managerSportId ? SPORTS_MAP[managerSportId]?.icon : '🏅'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-800">
                  فضاء مسؤول النشاط الرياضي {managerSportId ? `(${SPORTS_MAP[managerSportId]?.name})` : ''}
                </span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  صلاحيات مخصصة
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                برمجة البطولات العامة محجوزة للمسير المركزي. بصفتك مسؤولاً عن النشاط، يمكنك برمجة المباريات، تعيين المؤسسات المشاركة ومراكز التباري.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <a
              href="/matches"
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition-colors shadow-xs"
            >
              برمجة مباراة الآن
            </a>
            <a
              href="/schools"
              className="px-3 py-1.5 bg-white text-blue-700 border border-blue-300 rounded-lg font-bold text-xs hover:bg-blue-50 transition-colors"
            >
              المؤسسات والفرق
            </a>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-1 items-center px-2 w-full">
          <Search className="h-4 w-4 text-slate-400 ml-2 shrink-0" />
          <input
            type="text"
            placeholder="ابحث عن اسم البطولة، الرياضة، اسم المسؤول، أو القن السري..."
            className="w-full border-0 focus:ring-0 text-xs py-1 text-slate-800 placeholder-slate-400 focus:outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Sport Filter Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto border-t sm:border-t-0 sm:border-r border-slate-100 pt-2 sm:pt-0 sm:pr-3 shrink-0">
          <label htmlFor="tournament-sport-filter" className="text-xs font-bold text-slate-600 whitespace-nowrap flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            <span>الرياضة:</span>
          </label>
          <select
            id="tournament-sport-filter"
            value={filterSport}
            onChange={(e) => setFilterSport(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[170px]"
          >
            <option value="ALL">🏆 جميع الرياضات</option>
            {Object.entries(SPORTS_MAP).map(([id, info]) => (
              <option key={id} value={id}>
                {info.icon} {info.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="h-7 w-7 animate-spin rounded-full border-3 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length > 0 ? (
            filtered.map((t) => {
              const isPinVisible = visiblePins[t.id];
              const isCopied = copiedId === t.id;
              const sInfo = getSportInfo(t.sportId);
              const isManagerSpecialty = managerSportId && t.sportId === managerSportId;

              return (
                <div
                  key={t.id}
                  className={`flex flex-col rounded-xl bg-white border shadow-xs overflow-hidden transition-all hover:shadow-sm ${
                    isManagerSpecialty
                      ? 'border-blue-300 ring-2 ring-blue-500/10'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="p-4 md:p-5 flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-xl flex items-center justify-center border border-blue-100">
                          {sInfo.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                              {sInfo.name}
                            </span>
                            {isManagerSpecialty && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] bg-amber-50 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                                <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                تخصصك
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-slate-400">الموسم {activeSeason}</span>
                        </div>
                      </div>

                      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                        t.status === 'Ongoing'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : t.status === 'Completed'
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {t.status === 'Scheduled' ? 'مبرمجة' : t.status === 'Ongoing' ? 'جارية حالياً' : t.status === 'Completed' ? 'منتهية' : 'مسودة'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 leading-snug">{t.name}</h3>

                    {/* Category & Level */}
                    <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">الفئة والجنس:</span>
                        <strong className="text-slate-800 font-bold">
                          {t.ageCategory} ({t.gender === 'Male' ? 'ذكور' : t.gender === 'Female' ? 'إناث' : 'مختلط'})
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">السلك:</span>
                        <strong className="text-slate-800 font-bold">
                          {t.level === 'High' ? 'الثانوي التأهيلي' : t.level === 'Middle' ? 'الثانوي الإعدادي' : 'التعليم الابتدائي'}
                        </strong>
                      </div>
                    </div>

                    {/* Assigned Manager & Secret PIN Box */}
                    <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 p-3 rounded-xl border border-blue-100/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                          <span>المسؤول عن البطولة:</span>
                        </div>
                        {canCreate && (
                          <button
                            onClick={() => setSelectedTournamentForManager(t)}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-white hover:bg-blue-50 px-2 py-0.5 rounded border border-blue-200 transition-colors cursor-pointer"
                          >
                            <Edit3 className="h-2.5 w-2.5" />
                            <span>تخصيص / تعديل</span>
                          </button>
                        )}
                      </div>

                      <div className="text-xs font-bold text-blue-900 pr-1">
                        {t.managerName ? (
                          <div className="flex items-center justify-between">
                            <span>{t.managerName}</span>
                            {t.managerPhone && (
                              <span className="text-[10px] text-slate-500 font-medium font-mono flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5 text-slate-400" />
                                {t.managerPhone}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-600 text-[11px] font-medium flex items-center gap-1">
                            ⚠️ لم يتم تعيين مسؤول بعد
                          </span>
                        )}
                      </div>

                      {/* Access PIN Code */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 text-xs">
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                          <KeyRound className="h-3 w-3 text-amber-600" />
                          <span>القن السري (PIN):</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                            {isPinVisible || isCentralAdmin || isManagerSpecialty
                              ? (t.accessCode || '---')
                              : (t.accessCode ? '••••••' : '---')}
                          </span>

                          <button
                            onClick={(e) => togglePinVisibility(t.id, e)}
                            title={isPinVisible ? 'إخفاء القن' : 'إظهار القن'}
                            className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-white"
                          >
                            {isPinVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>

                          {t.accessCode && (
                            <button
                              onClick={(e) => handleCopyPin(t, e)}
                              title="نسخ القن السري للمسؤول"
                              className="text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-white transition-colors"
                            >
                              {isCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {t.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-50/80 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">
                      🗓️ {new Date(t.startDate).toLocaleDateString('ar-MA')}
                    </span>
                    
                    {canCreate && (
                      <button
                        onClick={(e) => promptDeleteTournament(t, e)}
                        title="حذف البطولة"
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-slate-500 bg-white rounded-xl border border-slate-200 text-center">
              <Trophy className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700 mb-1">لا توجد بطولات مطابقة</p>
              <p className="text-xs text-slate-400 mb-4">يمكنك إضافة بطولة إقليمية جديدة وتعيين مسؤولها وقنها السري</p>
              {canCreate && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
                >
                  إضافة بطولة جديدة الآن
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create Tournament Modal */}
      <CreateTournamentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleCreateTournament}
      />

      {/* Assign Manager & PIN Modal */}
      <AssignManagerModal
        isOpen={!!selectedTournamentForManager}
        onClose={() => setSelectedTournamentForManager(null)}
        tournament={selectedTournamentForManager}
        onSave={handleSaveManager}
      />

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!tournamentToDelete}
        onClose={() => setTournamentToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="حذف البطولة الإقليمية"
        message="هل أنت متأكد من رغبتك في حذف هذه البطولة نهائياً؟ سيتم مسح كافة البيانات والإعدادات المرتبطة بها."
        itemName={tournamentToDelete?.name}
        isDeleting={isDeleting}
      />
    </div>
  );
};

