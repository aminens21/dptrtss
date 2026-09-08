import React, { useEffect, useState } from 'react';
import { DataService, SPORTS_MAP } from '../lib/dataService';
import { User } from '../types';
import {
  GraduationCap,
  Search,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Award,
  Filter,
  RefreshCw,
  Copy,
  Check,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Teachers: React.FC = () => {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const data = await DataService.getTeachers();
      setTeachers(data);
    } catch (error) {
      console.error('Error loading teachers:', error);
      toast.error('حدث خطأ أثناء تحميل قائمة الأساتذة');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('تم النسخ إلى الحافظة');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Get unique work locations for filter dropdown
  const uniqueLocations = Array.from(
    new Set(teachers.map((t) => t.workLocation).filter(Boolean))
  ) as string[];

  // Filter teachers based on search term, selected specialization, and work location
  const filteredTeachers = teachers.filter((teacher) => {
    const matchesSearch =
      teacher.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (teacher.leaseNumber && teacher.leaseNumber.includes(searchTerm)) ||
      (teacher.workLocation && teacher.workLocation.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSport = selectedSport === '' || (Array.isArray(teacher.refereeSpecialty) ? teacher.refereeSpecialty.includes(selectedSport) : teacher.refereeSpecialty === selectedSport);
    const matchesLocation = selectedLocation === '' || teacher.workLocation === selectedLocation;

    return matchesSearch && matchesSport && matchesLocation;
  });

  // Calculate statistics
  const totalTeachers = teachers.length;
  const completedProfiles = teachers.filter(t => t.workLocation && t.leaseNumber).length;
  const incompleteProfiles = totalTeachers - completedProfiles;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header and Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-blue-600" />
            <span>لائحة هيئة التدريس (الأساتذة)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            إدارة ومتابعة ملفات أساتذة التربية البدنية والرياضية المسجلين بالمديرية وتفاصيل تخصصاتهم في التحكيم.
          </p>
        </div>
        <button
          onClick={loadTeachers}
          className="self-start md:self-auto flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-600 cursor-pointer transition-all bg-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>تحديث القائمة</span>
        </button>
      </div>

      {/* Stats Cards Dashboard Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">إجمالي الأساتذة المسجلين</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-slate-800">{totalTeachers}</h3>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <GraduationCap className="h-5 w-5" />
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">ملفات شخصية مكتملة</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-emerald-600">{completedProfiles}</h3>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <UserCheck className="h-5 w-5" />
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">ملفات تحتاج استكمال</p>
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-amber-600">{incompleteProfiles}</h3>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <AlertCircle className="h-5 w-5" />
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            className="w-full text-xs pr-9 pl-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-slate-400"
            placeholder="بحث بالإسم، رقم التأجير، المؤسسة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto">
          <Filter className="h-4 w-4 text-slate-400 shrink-0 hidden sm:block" />
          
          {/* Work Location Filter */}
          <select
            className="w-full sm:w-48 text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold cursor-pointer"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="">جميع مقرات العمل (المؤسسات)</option>
            {uniqueLocations.map((loc) => (
              <option key={loc} value={loc}>
                📍 {loc}
              </option>
            ))}
          </select>

          {/* Referee Specialty Filter */}
          <select
            className="w-full sm:w-48 text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-semibold cursor-pointer"
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
          >
            <option value="">جميع التخصصات الرياضية</option>
            {Object.entries(SPORTS_MAP).map(([key, sport]) => (
              <option key={key} value={key}>
                {sport.icon} {sport.name}
              </option>
            ))}
          </select>

          {(searchTerm || selectedSport || selectedLocation) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedSport('');
                setSelectedLocation('');
              }}
              className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2.5 rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              إلغاء الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* Main Table / Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-xs text-slate-500 font-medium">جاري تحميل لائحة الأساتذة...</p>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500 text-xs font-semibold">لا توجد نتائج تطابق خيارات البحث الحالية.</p>
          <button
            onClick={() => { setSearchTerm(''); setSelectedSport(''); }}
            className="mt-3 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
          >
            إعادة تعيين الفلاتر
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">الأستاذ</th>
                  <th className="px-6 py-4">رقم التأجير</th>
                  <th className="px-6 py-4">مقر العمل</th>
                  <th className="px-6 py-4">تخصص التحكيم</th>
                  <th className="px-6 py-4">معلومات الاتصال</th>
                  <th className="px-6 py-4">حالة الملف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTeachers.map((teacher) => {
                  const hasDetails = teacher.workLocation && teacher.leaseNumber;
                  const specialties = Array.isArray(teacher.refereeSpecialty) ? teacher.refereeSpecialty : (teacher.refereeSpecialty ? [teacher.refereeSpecialty] : []);

                  return (
                    <tr key={`desktop-${teacher.id}`} className="hover:bg-slate-50/50 transition-colors">
                      {/* Name & Role */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {teacher.fullName[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{teacher.fullName}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{teacher.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Lease Number */}
                      <td className="px-6 py-4 font-mono font-bold text-slate-700">
                        {teacher.leaseNumber ? (
                          <div className="flex items-center gap-1.5">
                            <span>{teacher.leaseNumber}</span>
                            <button
                              onClick={() => handleCopy(teacher.leaseNumber || '', `l-${teacher.id}`)}
                              className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors cursor-pointer"
                              title="نسخ رقم التأجير"
                            >
                              {copiedId === `l-${teacher.id}` ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">لم يدخل بعد</span>
                        )}
                      </td>

                      {/* Work Location */}
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {teacher.workLocation ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{teacher.workLocation}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">لم يدخل بعد</span>
                        )}
                      </td>

                      {/* Referee Specialty */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {specialties.length > 0 ? (
                            specialties.map(spec => {
                              const sportDetails = SPORTS_MAP[spec];
                              if (!sportDetails) return null;
                              return (
                                <span key={spec} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-md font-bold text-[11px]">
                                  <span>{sportDetails.icon}</span>
                                  <span>{sportDetails.name}</span>
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-slate-400 italic">لا يوجد تخصص</span>
                          )}
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-6 py-4">
                        <div className="space-y-1 text-[11px] text-slate-600">
                          {teacher.phone && (
                            <div className="flex items-center gap-1.5 font-medium">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <a href={`tel:${teacher.phone}`} className="hover:text-blue-600 hover:underline">
                                {teacher.phone}
                              </a>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <a href={`mailto:${teacher.email}`} className="hover:text-blue-600 hover:underline truncate max-w-[150px]">
                              {teacher.email}
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Profile Status */}
                      <td className="px-6 py-4">
                        {hasDetails ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                            <Check className="h-3 w-3" />
                            <span>مكتمل</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">
                            <AlertCircle className="h-3 w-3" />
                            <span>ناقص</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredTeachers.map((teacher) => {
              const hasDetails = teacher.workLocation && teacher.leaseNumber;
              const specialties = Array.isArray(teacher.refereeSpecialty) ? teacher.refereeSpecialty : (teacher.refereeSpecialty ? [teacher.refereeSpecialty] : []);

              return (
                <div key={`mobile-${teacher.id}`} className="p-4 space-y-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {teacher.fullName[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{teacher.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{teacher.email}</p>
                      </div>
                    </div>
                    {hasDetails ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                        <Check className="h-3 w-3" />
                        <span>مكتمل</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">
                        <AlertCircle className="h-3 w-3" />
                        <span>ناقص</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div>
                      <p className="text-slate-400 font-bold mb-1 text-[10px] uppercase">رقم التأجير</p>
                      {teacher.leaseNumber ? (
                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-700">
                          <span>{teacher.leaseNumber}</span>
                          <button
                            onClick={() => handleCopy(teacher.leaseNumber || '', `l-mob-${teacher.id}`)}
                            className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors cursor-pointer"
                          >
                            {copiedId === `l-mob-${teacher.id}` ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">لم يدخل بعد</span>
                      )}
                    </div>
                    <div>
                      <p className="text-slate-400 font-bold mb-1 text-[10px] uppercase">التخصص</p>
                      <div className="flex flex-wrap gap-1">
                        {specialties.length > 0 ? (
                          specialties.map(spec => {
                            const sportDetails = SPORTS_MAP[spec];
                            if (!sportDetails) return null;
                            return (
                              <span key={spec} className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                <span>{sportDetails.icon}</span>
                                <span>{sportDetails.name}</span>
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-slate-400 italic">لا يوجد تخصص</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    {teacher.workLocation && (
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{teacher.workLocation}</span>
                      </div>
                    )}
                    {teacher.phone && (
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <a href={`tel:${teacher.phone}`} className="hover:text-blue-600 hover:underline">
                          {teacher.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
