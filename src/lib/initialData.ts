import { Tournament, Match, School, Team, Venue } from '../types';

export const INITIAL_TOURNAMENTS: Tournament[] = [
  {
    id: 'tourn-1',
    name: 'البطولة الإقليمية المدرسية لكرة القدم (ذكور)',
    seasonId: 'season-2025-2026',
    sportId: 'football',
    ageCategory: 'U17 (15-17 سنة)',
    gender: 'Male',
    level: 'High',
    scope: 'Provincial',
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-03-25'),
    status: 'Scheduled',
    description: 'البطولة الإقليمية الرسمية المؤهلة للبطولة الجهوية للرياضة المدرسية بجهة الشرق.',
    managerName: 'ذ. عبد الرحيم بلقاسم',
    managerPhone: '0661234567',
    managerEmail: 'belkacem.foot@taourirt.ma',
    accessCode: 'FB-2026'
  },
  {
    id: 'tourn-2',
    name: 'دوري كرة اليد للإناث - السلك الإعدادي',
    seasonId: 'season-2025-2026',
    sportId: 'handball',
    ageCategory: 'U15 (13-15 سنة)',
    gender: 'Female',
    level: 'Middle',
    scope: 'Provincial',
    startDate: new Date('2026-03-05'),
    endDate: new Date('2026-03-20'),
    status: 'Ongoing',
    description: 'المنافسات الإقليمية لكرة اليد إناث بالمركب الرياضي بتاوريرت.',
    managerName: 'ذة. فاطمة الزهراء بنعلي',
    managerPhone: '0663456789',
    managerEmail: 'benali.hand@taourirt.ma',
    accessCode: 'HB-7740'
  },
  {
    id: 'tourn-3',
    name: 'البطولة الإقليمية للكرة الطائرة (مختلط)',
    seasonId: 'season-2025-2026',
    sportId: 'volleyball',
    ageCategory: 'U17 (15-17 سنة)',
    gender: 'Mixed',
    level: 'High',
    scope: 'Provincial',
    startDate: new Date('2026-03-10'),
    endDate: new Date('2026-03-30'),
    status: 'Scheduled',
    description: 'إقصائيات الكرة الطائرة للثانويات التأهيلية بتاوريرت والعيون سيدي ملوك.',
    managerName: 'ذ. رشيد الداودي',
    managerPhone: '0662345678',
    managerEmail: 'daoudi.volley@taourirt.ma',
    accessCode: 'VB-5512'
  },
  {
    id: 'tourn-4',
    name: 'دوري كرة السلة 3x3 - فئة الفتيان',
    seasonId: 'season-2025-2026',
    sportId: 'basketball',
    ageCategory: 'U15 (13-15 سنة)',
    gender: 'Male',
    level: 'Middle',
    scope: 'Provincial',
    startDate: new Date('2026-02-15'),
    endDate: new Date('2026-02-28'),
    status: 'Completed',
    description: 'المنافسات المفتوحة لكرة السلة 3x3 لفرق المؤسسات الإعدادية.',
    managerName: 'ذ. مصطفى الغازي',
    managerPhone: '0666789012',
    managerEmail: 'ghazi.basket@taourirt.ma',
    accessCode: 'BB-9031'
  }
];

export const INITIAL_SCHOOLS: School[] = [
  { id: 'sch-1', name: 'ثانوية الفتح التأهيلية', type: 'تأهيلي', commune: 'تاوريرت المركز', teacherName: 'ذ. عبد الرحيم بلقاسم', phone: '0661234567', principalPhone: '0661998877' },
  { id: 'sch-2', name: 'ثانوية علال الفاسي التأهيلية', type: 'تأهيلي', commune: 'العيون سيدي ملوك', teacherName: 'ذ. رشيد الداودي', phone: '0662345678', principalPhone: '0662887766' },
  { id: 'sch-3', name: 'إعدادية ابن سينا', type: 'إعدادي', commune: 'تاوريرت', teacherName: 'ذة. فاطمة الزهراء بنعلي', phone: '0663456789', principalPhone: '0663776655' },
  { id: 'sch-4', name: 'إعدادية سيدي لحسن', type: 'إعدادي', commune: 'سيدي لحسن', teacherName: 'ذ. حميد بنعيسى', phone: '0664567890', principalPhone: '0664665544' },
  { id: 'sch-5', name: 'مجموعة مدارس دبدو', type: 'ابتدائي', commune: 'دبدو', teacherName: 'ذ. يوسف المراكشي', phone: '0665678901', principalPhone: '0665554433' },
  { id: 'sch-6', name: 'ثانوية الزيتون التأهيلية', type: 'تأهيلي', commune: 'تاوريرت', teacherName: 'ذ. مصطفى الغازي', phone: '0666789012', principalPhone: '0666443322' }
];

export const INITIAL_VENUES: Venue[] = [
  { id: 'ven-1', name: 'القاعة المغطاة للرياضات بتاوريرت', city: 'تاوريرت', address: 'شارع الحسن الثاني، تاوريرت', capacity: 1500 },
  { id: 'ven-2', name: 'الملعب البلدي تاوريرت', city: 'تاوريرت', address: 'حي المسيرة، تاوريرت', capacity: 3000 },
  { id: 'ven-3', name: 'القاعة الرياضية بالعيون سيدي ملوك', city: 'العيون سيدي ملوك', address: 'طريق وجدة، العيون', capacity: 800 },
  { id: 'ven-4', name: 'ملاعب ثانوية الفتح', city: 'تاوريرت', address: 'قرب المديرية الإقليمية', capacity: 400 }
];

export const INITIAL_MATCHES: Match[] = [
  {
    id: 'mat-1',
    tournamentId: 'tourn-1',
    sportId: 'football',
    ageCategory: 'الفتيان (U18)',
    gender: 'Male',
    stage: 'نصف النهائي',
    team1Id: 'sch-1',
    team2Id: 'sch-2',
    date: new Date(),
    startTime: '10:00',
    venueId: 'ven-2',
    status: 'Scheduled',
    score1: 0,
    score2: 0,
    updatedAt: new Date()
  },
  {
    id: 'mat-2',
    tournamentId: 'tourn-2',
    sportId: 'handball',
    ageCategory: 'الصغار (U15)',
    gender: 'Female',
    stage: 'دور المجموعات - الجولة 2',
    team1Id: 'sch-3',
    team2Id: 'sch-4',
    date: new Date(),
    startTime: '11:30',
    venueId: 'ven-1',
    status: 'Ongoing',
    score1: 14,
    score2: 12,
    updatedAt: new Date()
  },
  {
    id: 'mat-3',
    tournamentId: 'tourn-4',
    sportId: 'basketball',
    ageCategory: 'الصغار (U15)',
    gender: 'Male',
    stage: 'المباراة النهائية',
    team1Id: 'sch-1',
    team2Id: 'sch-6',
    date: new Date(),
    startTime: '15:00',
    venueId: 'ven-1',
    status: 'Completed',
    score1: 21,
    score2: 18,
    notes: 'تتويج ثانوية الفتح بكأس البطولة الإقليمية لكرة السلة',
    scorers: 'ثانوية الفتح: 21 نقطة | ثانوية الزيتون: 18 نقطة',
    updatedAt: new Date()
  }
];
