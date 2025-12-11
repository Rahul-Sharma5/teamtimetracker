
export interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  status: 'active' | 'inactive';
  avatarUrl?: string;
  password?: string; // Added for authentication
  joiningDate?: string; // Added for profile details
  designation?: string; // Added for job title
  phone?: string; // Added for profile contact
  bio?: string; // Added for profile bio
  currentStatus?: string; // Added: Text status e.g. "Deep Work"
  currentStatusEmoji?: string; // Added: Emoji e.g. "🧠"
}

export interface LocationData {
  lat: number;
  lng: number;
  inOffice: boolean;
  error?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // ISO Date string YYYY-MM-DD
  punchIn: string | null; // ISO Timestamp
  punchOut: string | null; // ISO Timestamp
  workingHours: number; // In minutes
  punchInLocation?: LocationData;
  punchOutLocation?: LocationData;
  workLog?: string; // Added: Daily task report
  mood?: string; // Added: 'happy' | 'neutral' | 'tired' | 'stressed'
}

export type BreakType = 'lunch' | 'short1' | 'short2';

export interface BreakRecord {
  id: string;
  employeeId: string;
  date: string;
  breakType: BreakType;
  breakStart: string; // ISO Timestamp
  breakEnd: string | null; // ISO Timestamp
  duration: number; // In minutes
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRecord {
  id: string;
  employeeId: string;
  dateFrom: string;
  dateTo: string;
  reason: string;
  toWhom: string; // Manager name
  status: LeaveStatus;
  appliedOn: string;
  isHalfDay?: boolean;
  halfDayType?: 'first' | 'second';
  adminResponse?: string; // Added: Manager's note
}

export interface Announcement {
  id: string;
  message: string;
  type: 'info' | 'urgent' | 'success';
  createdBy: string;
  createdAt: string;
}

export interface CompanySettings {
  id?: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  locationName: string;
  updatedAt: string;
  teamName?: string;
  teamLogoUrl?: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export type TaskPriority = 'normal' | 'urgent';
export type TaskStatus = 'pending' | 'processing' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedBy: string; // Name of assigner
  assignedById: string; // ID of assigner
  assignedTo: string; // ID of assignee
  assignedToName: string; // Name of assignee
  assignedDate: string; // ISO Timestamp
  dueDate?: string | null; // ISO Date string YYYY-MM-DD or null
  priority: TaskPriority;
  status: TaskStatus;
  updatedAt?: string;
  completedAt?: string; // Timestamp when task was moved to completed
}
