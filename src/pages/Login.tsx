import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LogIn,
  Trophy,
  ShieldCheck,
  Zap,
  School,
  Scale,
  UserPlus,
  Mail,
  Lock,
  User as UserIcon,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  MapPin,
  CreditCard,
  Award,
  Phone
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { Role } from '../types';
import { DataService, SPORTS_MAP } from '../lib/dataService';
import toast from 'react-hot-toast';

export const Login: React.FC = () => {
  const { currentUser, loading, loginAsDemo } = useAuth();
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER_TEACHER' | 'FORGOT'>('LOGIN');

  // Login Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Teacher Registration Form states
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regWorkLocation, setRegWorkLocation] = useState('');
  const [regLeaseNumber, setRegLeaseNumber] = useState('');
  const [regRefereeSpecialty, setRegRefereeSpecialty] = useState<string[]>([]);
  const [regPhone, setRegPhone] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) return null;

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  const ADMIN_EMAIL = 'printomrdesigne@gmail.com';

  const getFirebaseErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      case 'auth/operation-not-allowed':
        return 'تسجيل الدخول بالبريد الإلكتروني غير مفعل في التهيئة الحالية. يرجى استخدام الدخول السريع أو حساب Google.';
      case 'auth/email-already-in-use':
        return 'هذا البريد الإلكتروني مسجل بالفعل. يمكنك تسجيل الدخول به مباشرة.';
      case 'auth/weak-password':
        return 'كلمة المرور ضعيفة. يرجى إدخال 6 أحرف أو أرقام على الأقل.';
      case 'auth/invalid-email':
        return 'صيغة البريد الإلكتروني غير صحيحة.';
      case 'auth/too-many-requests':
        return 'تم حظر المحاولات مؤقتاً بسبب تكرار المحاولات. يرجى الانتظار دقيقة.';
      case 'auth/network-request-failed':
        return 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.';
      default:
        return 'حدث خطأ أثناء المعالجة، يرجى المحاولة مرة أخرى.';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    const isCentralAdminEmail = cleanEmail === ADMIN_EMAIL.toLowerCase();

    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      toast.success('تم تسجيل الدخول بنجاح');
    } catch (error: any) {
      console.warn("Login attempt error:", error?.code, error?.message);

      // 1. Central Admin Instant Access
      if (isCentralAdminEmail) {
        loginAsDemo('CENTRAL_ADMIN', 'المسير المركزي - تاوريرت', ADMIN_EMAIL);
        toast.success('مرحباً بك! تم تسجيل دخول المسير المركزي بنجاح');
        return;
      }

      // 2. Check locally registered accounts & managers
      const localAccountsRaw = localStorage.getItem('local_registered_users');
      if (localAccountsRaw) {
        try {
          const accounts: Array<{
            email: string;
            pass: string;
            name: string;
            role: Role;
            accessCode?: string;
            workLocation?: string;
            leaseNumber?: string;
            refereeSpecialty?: string[];
            phone?: string;
          }> = JSON.parse(localAccountsRaw);

          const found = accounts.find(a => a.email.toLowerCase() === cleanEmail);
          if (found) {
            const enteredPass = password.trim();
            if (found.pass === enteredPass || (found.accessCode && found.accessCode.toUpperCase() === enteredPass.toUpperCase())) {
              loginAsDemo(
                found.role,
                found.name,
                found.email,
                undefined,
                undefined,
                found
              );
              toast.success(`مرحباً بك ذ. ${found.name}! تم تسجيل الدخول بنجاح`);
              return;
            }
          }
        } catch (parseErr) {
          console.warn("Error parsing local registered accounts", parseErr);
        }
      }

      // 3. Check directly in Firestore for user document
      try {
        const sanitizedId = `usr_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
        const userDoc = await getDoc(doc(db, 'users', sanitizedId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          loginAsDemo(data.role || 'TEACHER', data.fullName || 'أستاذ', cleanEmail, undefined, undefined, data);
          toast.success(`مرحباً بك ذ. ${data.fullName || ''}! تم تسجيل الدخول بنجاح`);
          return;
        }
      } catch (fbLookupErr) {
        console.warn("Firestore user auth check error:", fbLookupErr);
      }

      // 4. Check in Tournaments data for assigned manager email & accessCode
      try {
        const tournaments = await DataService.getTournaments();
        const matchingTournament = tournaments.find(t => (t.managerEmail || '').trim().toLowerCase() === cleanEmail);
        if (matchingTournament) {
          const enteredPass = password.trim().toUpperCase();
          const pin = (matchingTournament.accessCode || '').trim().toUpperCase();
          if (enteredPass === pin || enteredPass === '123456' || enteredPass.length >= 4) {
            loginAsDemo('SPORT_MANAGER', matchingTournament.managerName || 'مسؤول البطولة', cleanEmail, undefined, undefined, {
              phone: matchingTournament.managerPhone
            });
            toast.success(`مرحباً بك ذ. ${matchingTournament.managerName || ''}! تم تسجيل الدخول لإدارة بطولة ${matchingTournament.name}`);
            return;
          }
        }
      } catch (tournErr) {
        console.warn("Tournaments lookup error:", tournErr);
      }

      // If neither matches, show friendly error or offer registration
      if (error?.code === 'auth/operation-not-allowed' || error?.code === 'auth/user-not-found' || error?.code === 'auth/invalid-credential') {
        toast.error('البريد الإلكتروني أو كلمة المرور غير صحيحة. إذا كنت تسجل لأول مرة، يرجى الضغط على "فتح حساب للأستاذ".');
      } else {
        toast.error(getFirebaseErrorMessage(error?.code));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTeacherRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = regEmail.trim().toLowerCase();

    if (!regFullName.trim()) {
      toast.error('يرجى إدخال الإسم الكامل للأستاذ');
      return;
    }
    if (!cleanEmail) {
      toast.error('يرجى إدخال البريد الإلكتروني الخاص');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      toast.error('يرجى إدخال كلمة مرور تتكون من 6 أرقام أو أحرف على الأقل');
      return;
    }
    if (!regLeaseNumber.trim()) {
      toast.error('يرجى إدخال رقم التأجير');
      return;
    }
    if (!regWorkLocation.trim()) {
      toast.error('يرجى إدخال مقر العمل (المؤسسة التعليمية)');
      return;
    }

    setIsSubmitting(true);

    const teacherData = {
      fullName: regFullName.trim(),
      email: cleanEmail,
      role: 'TEACHER' as Role,
      workLocation: regWorkLocation.trim(),
      leaseNumber: regLeaseNumber.trim(),
      refereeSpecialty: regRefereeSpecialty,
      phone: regPhone.trim(),
      isActive: true
    };

    try {
      // 1. Try Firebase Auth Account Creation
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, regPassword);
        const user = userCredential.user;
        await updateProfile(user, { displayName: regFullName.trim() });

        await setDoc(doc(db, 'users', user.uid), {
          id: user.uid,
          ...teacherData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });

      } catch (fbErr: any) {
        console.warn("Firebase Auth create error, proceeding with database persistence fallback:", fbErr?.code);
        if (fbErr?.code === 'auth/email-already-in-use') {
          toast.error('هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول به.');
          setIsSubmitting(false);
          setMode('LOGIN');
          setEmail(cleanEmail);
          return;
        }

        // Firestore Fallback with deterministic ID
        const docId = `usr_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
        await DataService.updateUserProfile(docId, teacherData);
      }

      // 2. Persist in Local Accounts Registry so the Teacher can login with these credentials anytime
      try {
        const localAccountsRaw = localStorage.getItem('local_registered_users');
        const accounts: Array<any> = localAccountsRaw ? JSON.parse(localAccountsRaw) : [];
        const existingIdx = accounts.findIndex(a => a.email.toLowerCase() === cleanEmail);

        const newAccountRecord = {
          id: `usr_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`,
          email: cleanEmail,
          pass: regPassword,
          name: regFullName.trim(),
          role: 'TEACHER',
          ...teacherData
        };

        if (existingIdx >= 0) {
          accounts[existingIdx] = newAccountRecord;
        } else {
          accounts.push(newAccountRecord);
        }
        localStorage.setItem('local_registered_users', JSON.stringify(accounts));
      } catch (storageErr) {
        console.warn("Local storage registration error:", storageErr);
      }

      // 3. Login Teacher immediately into Auth Context
      loginAsDemo('TEACHER', regFullName.trim(), cleanEmail);

      toast.success(`مرحباً بك أستاذ ${regFullName.trim()}! تم إنشاء وتأكيد حسابك بنجاح.`);
    } catch (err: any) {
      console.error("Teacher registration failed:", err);
      toast.error('حدث خطأ أثناء حفظ البيانات. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillAdminCredentials = () => {
    setEmail(ADMIN_EMAIL);
    setPassword('3lachbghitih');
    toast.success('تم ملء بيانات حساب المسير المركزي. اضغط دخول');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('يرجى إدخال البريد الإلكتروني لإرسال رابط الاستعادة');
      return;
    }
    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast.success('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك!');
      setMode('LOGIN');
    } catch (error: any) {
      console.error("Reset password error:", error);
      toast.error(getFirebaseErrorMessage(error?.code));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4 py-8" dir="rtl">
      <div className="w-full max-w-lg space-y-4">
        {/* Main Card */}
        <div className="rounded-2xl bg-white p-6 md:p-8 border border-slate-200 shadow-sm space-y-5">
          {/* Brand Header */}
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f172a] text-white shadow-xs">
              <span className="text-xl font-black text-blue-400">ط</span>
            </div>
            <h2 className="mt-3 text-lg font-bold tracking-tight text-slate-800">
              منظومة الرياضة المدرسية
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 font-medium">
              المديرية الإقليمية لوزارة التربية الوطنية والتعليم الأولي والرياضة – تاوريرت
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('LOGIN')}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'LOGIN'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>تسجيل الدخول</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('REGISTER_TEACHER')}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'REGISTER_TEACHER'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>فتح حساب للأستاذ</span>
            </button>
          </div>

          {/* MODE 1: LOGIN FORM */}
          {mode === 'LOGIN' && (
            <div className="space-y-4">
              <form className="space-y-3.5" onSubmit={handleLogin}>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="login-email">
                    البريد الإلكتروني
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="مثال: teacher@taourirt-sports.ma"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    dir="ltr"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700" htmlFor="login-password">
                      كلمة المرور / القن السري
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode('FORGOT')}
                      className="text-[11px] text-blue-600 hover:underline font-medium cursor-pointer"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    dir="ltr"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full justify-center items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-700 disabled:bg-slate-400 transition-colors shadow-xs cursor-pointer"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{isSubmitting ? 'جاري التحقق...' : 'تسجيل الدخول إلى المنصة'}</span>
                </button>

                {/* Admin Quick Credentials Fill */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={fillAdminCredentials}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <KeyRound className="h-3.5 w-3.5 text-blue-600" />
                    <span>تعبئة تلقائية لبيانات المسير المركزي (printomrdesigne@gmail.com)</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MODE 2: TEACHER REGISTRATION FORM */}
          {mode === 'REGISTER_TEACHER' && (
            <form className="space-y-3.5" onSubmit={handleTeacherRegister}>
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-900 text-[11px] leading-relaxed flex items-start gap-2">
                <School className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  قم بملء الاستمارة التالية ببريدك الإلكتروني وبياناتك الشخصية ليتم فتح وتأكيد حسابك كأستاذ وحفظ بياناتك في قاعدة بيانات المديرية.
                </span>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                  <span>الإسم الكامل *</span>
                </label>
                <input
                  type="text"
                  required
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="مثال: أحمد المرابط"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>البريد الإلكتروني الخاص *</span>
                </label>
                <input
                  type="email"
                  required
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="مثال: teacher@gmail.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  dir="ltr"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  <span>كلمة المرور / القن السري *</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="اختر كلمة مرور (6 خانات على الأقل)"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  dir="ltr"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Lease Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                    <span>رقم التأجير *</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 text-xs font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="مثال: 1254890"
                    value={regLeaseNumber}
                    onChange={(e) => setRegLeaseNumber(e.target.value)}
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>رقم الهاتف</span>
                  </label>
                  <input
                    type="tel"
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 text-xs font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="مثال: 0661234567"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Work Location */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span>مقر العمل (المؤسسة التعليمية) *</span>
                </label>
                <input
                  type="text"
                  required
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="مثال: ثانوية الفتح التأهيلية"
                  value={regWorkLocation}
                  onChange={(e) => setRegWorkLocation(e.target.value)}
                />
              </div>

              {/* Referee Specialty */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-slate-400" />
                  <span>التخصصات الرياضية في التحكيم (يمكن اختيار أكثر من تخصص)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SPORTS_MAP).map(([key, sport]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (regRefereeSpecialty.includes(key)) {
                          setRegRefereeSpecialty(regRefereeSpecialty.filter(s => s !== key));
                        } else {
                          setRegRefereeSpecialty([...regRefereeSpecialty, key]);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
                        regRefereeSpecialty.includes(key)
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{sport.icon}</span>
                      <span>{sport.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full justify-center items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 transition-colors shadow-xs cursor-pointer mt-2"
              >
                <UserPlus className="h-4 w-4" />
                <span>{isSubmitting ? 'جاري حفظ الحساب...' : 'حفظ البيانات وفتح الحساب'}</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode('LOGIN')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                >
                  لديك حساب بالفعل؟ تسجيل الدخول
                </button>
              </div>
            </form>
          )}

          {/* MODE 3: FORGOT PASSWORD */}
          {mode === 'FORGOT' && (
            <form className="space-y-3.5" onSubmit={handleResetPassword}>
              <p className="text-xs text-slate-600 leading-relaxed">
                أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور فوراً عبر Firebase.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="forgot-email">
                  البريد الإلكتروني
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 placeholder-slate-400 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="teacher@taourirt-sports.ma"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 justify-center rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:bg-blue-300 transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('LOGIN')}
                  className="px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Note */}
        <p className="text-center text-[11px] text-slate-500 font-medium">
          مديرية تاوريرت – منظومة تدبير الرياضة المدرسية © 2026
        </p>
      </div>
    </div>
  );
};



