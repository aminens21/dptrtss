export type Role = 'CENTRAL_ADMIN' | 'SPORT_MANAGER' | 'TEACHER' | 'REFEREE';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: Role;
  sportId?: string; // For SPORT_MANAGER e.g. 'basketball', 'football'
  assignedTournamentId?: string; // Specific assigned tournament
  isActive: boolean;
  createdAt: any; // Firestore Timestamp
  updatedAt: any;
  createdBy?: string;
  workLocation?: string; // مقر العمل
  leaseNumber?: string; // رقم التأجير
  refereeSpecialty?: string[]; // التخصصات الرياضية في التحكيم
  isTechCommitteeHead?: boolean; // رئيس لجنة تقنية
  techCommitteeSports?: string[]; // التخصصات الرياضية التي يترأس لجنتها التقنية
  isTechCommitteeMember?: boolean; // عضو لجنة تقنية
  techCommitteeSportsMemberOf?: string[]; // التخصصات الرياضية التي يشارك في لجنتها التقنية كعضو
}

export interface Sport {
  id: string;
  name: string;
  description: string;
  managerId?: string;
  ageCategories?: string[]; // الفئات المعنية بالتخصص الرياضي التي حددها المسير الرئيسي
}

export interface Tournament {
  id: string;
  name: string;
  seasonId: string;
  sportId: string;
  ageCategory: string;
  gender: 'Male' | 'Female' | 'Mixed';
  level: 'Primary' | 'Middle' | 'High';
  scope: 'Provincial' | 'Regional';
  startDate: any;
  endDate: any;
  status: 'Draft' | 'Scheduled' | 'Ongoing' | 'Completed' | 'Archived';
  description?: string;
  managerName?: string;
  managerPhone?: string;
  managerEmail?: string;
  accessCode?: string; // القن السري المخصص لمسؤول البطولة
}

export interface School {
  id: string;
  name: string;
  type: string;
  commune: string;
  teacherName: string;
  phone?: string;
}

export interface Team {
  id: string;
  name: string;
  schoolId: string;
  sportId: string;
  gender: 'Male' | 'Female' | 'Mixed';
  category: string;
}

export interface Referee {
  id: string;
  fullName: string;
  phone: string;
  specialty?: string[];
  isActive: boolean;
  isTeacher?: boolean;
}

export interface Match {
  id: string;
  tournamentId: string;
  sportId: string;
  stage: string;
  team1Id: string;
  team2Id: string;
  ageCategory?: string;
  gender?: 'Male' | 'Female' | 'Mixed';
  date: any;
  startTime: string;
  endTime?: string;
  venueId: string;
  referee1Id?: string;
  referee2Id?: string;
  referees?: string[]; // Array to support more than 2 referees
  status: 'Scheduled' | 'Ongoing' | 'Completed' | 'Postponed' | 'Cancelled';
  score1?: number;
  score2?: number;
  penalty1?: number;
  penalty2?: number;
  winnerId?: string;
  notes?: string;
  scorers?: string;
  updatedBy?: string;
  updatedAt: any;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  address: string;
  capacity?: number;
  notes?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: any;
  priority: 'Low' | 'Medium' | 'High';
  expiryDate: any;
  authorId: string;
}

export interface Student {
  id: string;
  fullName: string;
  gender: 'Male' | 'Female'; // ذكر ، أنثى
  birthDate: string; // YYYY-MM-DD
  category: string; // e.g. 'U12', 'U15', 'U18', 'U20', 'OPEN'
  schoolId: string; // link to school (teacher's school)
  schoolName: string; // cache school name
  sportId: string; // chosen sport
  photoUrl?: string; // photo data url or URL
  createdAt: any;
  updatedAt: any;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  sportId?: string; // التخصص الرياضي المعني
  role?: Role | 'ALL'; // الصفة المعنية (أستاذ، حكم، إلخ)
  userIds?: string[]; // مستخدمين محددين مستهدفين بالخصوص
  createdAt: any;
  readBy?: string[]; // قائمة معرفات المستخدمين الذين قرأوا الإشعار
}

