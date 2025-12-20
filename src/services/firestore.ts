
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  Timestamp, 
  doc, 
  updateDoc,
  orderBy,
  deleteDoc,
  limit,
  setDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase';
import { Employee, AttendanceRecord, BreakRecord, LeaveRecord, BreakType, LeaveStatus, CompanySettings, LocationData, Announcement, Notification, Task, TaskStatus, TaskComment } from '../types';

// Collections
const EMPLOYEES_COL = 'employees';
const ATTENDANCE_COL = 'attendance';
const BREAKS_COL = 'breaks';
const LEAVES_COL = 'leaves';
const SETTINGS_COL = 'settings';
const ANNOUNCEMENTS_COL = 'announcements';
const NOTIFICATIONS_COL = 'notifications';
const TASKS_COL = 'tasks';
const TASK_COMMENTS_COL = 'task_comments';
const SETTINGS_DOC_ID = 'company_location'; // Single doc strategy

// Helpers
const getTodayDateString = () => new Date().toISOString().split('T')[0];

// --- Employees ---

export const getEmployees = async (): Promise<Employee[]> => {
  const q = query(collection(db, EMPLOYEES_COL));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Employee));
};

export const getEmployeeByPhone = async (phone: string): Promise<Employee | null> => {
  const q = query(collection(db, EMPLOYEES_COL), where('phone', '==', phone.trim()));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() as any } as Employee;
  }
  return null;
};

export const getEmployeeByEmail = async (email: string): Promise<Employee | null> => {
  const q = query(collection(db, EMPLOYEES_COL), where('email', '==', email.toLowerCase().trim()));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() as any } as Employee;
  }
  return null;
};

export const createEmployee = async (employeeData: Omit<Employee, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, EMPLOYEES_COL), employeeData);
  return docRef.id;
};

export const deleteEmployee = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, EMPLOYEES_COL, id));
  } catch (error) {
    console.error("Firestore: Error deleting employee document:", error);
    throw error;
  }
};

export const updateEmployeeStatus = async (id: string, status: 'active' | 'inactive'): Promise<void> => {
    const ref = doc(db, EMPLOYEES_COL, id);
    await updateDoc(ref, { status });
};

export const updateEmployeePassword = async (id: string, newPassword: string): Promise<void> => {
    const ref = doc(db, EMPLOYEES_COL, id);
    await updateDoc(ref, { password: newPassword });
};

export const updateEmployeeProfile = async (id: string, data: Partial<Employee>): Promise<void> => {
    const ref = doc(db, EMPLOYEES_COL, id);
    await updateDoc(ref, data);
};

// --- Attendance ---

export const getTodayAttendance = async (employeeId: string): Promise<AttendanceRecord | null> => {
  return getAttendanceByDate(employeeId, getTodayDateString());
};

export const getAttendanceByDate = async (employeeId: string, date: string): Promise<AttendanceRecord | null> => {
  const q = query(
    collection(db, ATTENDANCE_COL),
    where('employeeId', '==', employeeId),
    where('date', '==', date)
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() as any } as AttendanceRecord;
  }
  return null;
};

export const getAttendanceHistory = async (employeeId: string, limitCount: number = 5): Promise<AttendanceRecord[]> => {
  const q = query(
    collection(db, ATTENDANCE_COL),
    where('employeeId', '==', employeeId)
  );
  
  const snapshot = await getDocs(q);
  const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as AttendanceRecord));
  records.sort((a, b) => b.date.localeCompare(a.date));
  return records.slice(0, limitCount);
};

export const getWeeklyAttendance = async (employeeId: string): Promise<AttendanceRecord[]> => {
    return getAttendanceHistory(employeeId, 14);
};

export const getTodayTeamAttendance = async (): Promise<AttendanceRecord[]> => {
  const today = getTodayDateString();
  const q = query(collection(db, ATTENDANCE_COL), where('date', '==', today));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as AttendanceRecord));
};

export const punchIn = async (employeeId: string, location?: LocationData, mood?: string): Promise<void> => {
  const today = getTodayDateString();
  const record: any = {
    employeeId,
    date: today,
    punchIn: new Date().toISOString(),
    punchOut: null,
    workingHours: 0,
    workLog: '',
    mood: mood || 'neutral',
    ...(location ? { punchInLocation: location } : {})
  };

  await addDoc(collection(db, ATTENDANCE_COL), record);
};

export const punchOut = async (recordId: string, punchInTime: string, location?: LocationData, workLog?: string): Promise<void> => {
  const now = new Date();
  const start = new Date(punchInTime);
  const durationMs = now.getTime() - start.getTime();
  const workingHoursMinutes = Math.floor(durationMs / 1000 / 60);

  const recordRef = doc(db, ATTENDANCE_COL, recordId);
  const updates: any = {
    punchOut: now.toISOString(),
    workingHours: workingHoursMinutes,
    ...(location ? { punchOutLocation: location } : {}),
    ...(workLog !== undefined ? { workLog } : {})
  };

  await updateDoc(recordRef, updates);
};

export const updateWorkLog = async (recordId: string, workLog: string): Promise<void> => {
  const recordRef = doc(db, ATTENDANCE_COL, recordId);
  await updateDoc(recordRef, { workLog });
};

export const getAllAttendance = async (): Promise<AttendanceRecord[]> => {
  const q = query(collection(db, ATTENDANCE_COL));
  const snapshot = await getDocs(q);
  const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as AttendanceRecord));
  return records.sort((a, b) => b.date.localeCompare(a.date));
};

// --- Breaks ---

export const getTodayBreaks = async (employeeId: string): Promise<BreakRecord[]> => {
  const today = getTodayDateString();
  const q = query(
    collection(db, BREAKS_COL),
    where('employeeId', '==', employeeId),
    where('date', '==', today)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as BreakRecord));
};

export const getAllBreaks = async (): Promise<BreakRecord[]> => {
  const q = query(collection(db, BREAKS_COL));
  const snapshot = await getDocs(q);
  const records = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as BreakRecord));
  return records.sort((a, b) => b.date.localeCompare(a.date));
};

export const startBreak = async (employeeId: string, breakType: BreakType): Promise<void> => {
  const today = getTodayDateString();
  const record: Omit<BreakRecord, 'id'> = {
    employeeId,
    date: today,
    breakType,
    breakStart: new Date().toISOString(),
    breakEnd: null,
    duration: 0
  };
  await addDoc(collection(db, BREAKS_COL), record);
};

export const endBreak = async (breakId: string, startTime: string): Promise<void> => {
  const now = new Date();
  const start = new Date(startTime);
  const durationMs = now.getTime() - start.getTime();
  const minutes = Math.floor(durationMs / 1000 / 60);

  const recordRef = doc(db, BREAKS_COL, breakId);
  await updateDoc(recordRef, {
    breakEnd: now.toISOString(),
    duration: minutes
  });
};

// --- Leaves & Notifications ---

export const applyLeave = async (
  employeeId: string,
  employeeName: string, 
  dateFrom: string,
  dateTo: string,
  reason: string,
  toWhom: string,
  isHalfDay: boolean = false,
  halfDayType?: 'first' | 'second',
  approverId?: string
): Promise<void> => {
  const record = {
    employeeId,
    dateFrom,
    dateTo: isHalfDay ? dateFrom : dateTo,
    reason,
    toWhom,
    status: 'pending' as LeaveStatus,
    appliedOn: new Date().toISOString(),
    isHalfDay: !!isHalfDay,
    ...(isHalfDay && halfDayType ? { halfDayType } : {})
  };

  await addDoc(collection(db, LEAVES_COL), record);

  try {
      let targetId = approverId;
      if (!targetId) {
          const allEmployees = await getEmployees();
          const target = allEmployees.find(e => e.name === toWhom);
          if (target) targetId = target.id;
      }

      if (targetId) {
          await addDoc(collection(db, NOTIFICATIONS_COL), {
              recipientId: targetId,
              message: `${employeeName} requested leave for ${isHalfDay ? dateFrom : `${dateFrom} to ${dateTo}`}`,
              type: 'info',
              read: false,
              createdAt: new Date().toISOString(),
              link: '/team'
          });
      }
  } catch (err) {
      console.error("Failed to send notifications", err);
  }
};

export const requestLeaveCancellation = async (leaveId: string, requesterName: string): Promise<void> => {
  const recordRef = doc(db, LEAVES_COL, leaveId);
  const leaveSnap = await getDoc(recordRef);
  
  if (!leaveSnap.exists()) return;
  const leaveData = leaveSnap.data() as LeaveRecord;

  // Update status to cancel_requested
  await updateDoc(recordRef, { status: 'cancel_requested' });

  // Find the original approver ID
  try {
      const allEmployees = await getEmployees();
      // Rule: The request goes to the person it was originally sent to (Manager/Admin)
      const target = allEmployees.find(e => e.name === leaveData.toWhom);
      
      if (target) {
          await addDoc(collection(db, NOTIFICATIONS_COL), {
              recipientId: target.id,
              message: `${requesterName} has requested to CANCEL their leave for ${leaveData.dateFrom}`,
              type: 'warning',
              read: false,
              createdAt: new Date().toISOString(),
              link: '/team'
          });
      }
  } catch (err) {
      console.error("Failed to send cancellation request notification", err);
  }
};

export const updateLeaveStatus = async (leaveId: string, status: LeaveStatus, adminResponse?: string): Promise<void> => {
  const recordRef = doc(db, LEAVES_COL, leaveId);
  const leaveSnap = await getDoc(recordRef);
  const updates: any = { status };
  if (adminResponse !== undefined) {
    updates.adminResponse = adminResponse;
  }
  await updateDoc(recordRef, updates);

  if (leaveSnap.exists()) {
      const leaveData = leaveSnap.data() as LeaveRecord;
      const type = status === 'approved' ? 'success' : status === 'rejected' ? 'error' : status === 'cancelled' ? 'info' : 'info';
      
      // Map readable labels for notifications
      let statusLabel = status.toUpperCase();
      if (status === 'cancel_requested') statusLabel = 'CANCELLATION PENDING';
      if (status === 'cancelled') statusLabel = 'CANCELLED';

      try {
          await addDoc(collection(db, NOTIFICATIONS_COL), {
              recipientId: leaveData.employeeId,
              message: `Your leave request for ${leaveData.dateFrom} has been ${statusLabel}.`,
              type: type,
              read: false,
              createdAt: new Date().toISOString(),
              link: '/leaves'
          });
      } catch (err) {
          console.error("Failed to send employee notification", err);
      }
  }
};

export const getLeaves = async (employeeId?: string): Promise<LeaveRecord[]> => {
  let q;
  if (employeeId) {
    q = query(collection(db, LEAVES_COL), where('employeeId', '==', employeeId));
  } else {
    q = query(collection(db, LEAVES_COL));
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as LeaveRecord));
};

// --- Notifications System ---

export const subscribeToNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
    const q = query(
        collection(db, NOTIFICATIONS_COL), 
        where('recipientId', '==', userId)
    );

    return onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Notification));
        notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        callback(notifs);
    }, (error) => {
        console.error("Notification subscription error:", error);
    });
};

export const markNotificationAsRead = async (notificationId: string) => {
    const ref = doc(db, NOTIFICATIONS_COL, notificationId);
    await updateDoc(ref, { read: true });
};

export const clearNotifications = async (userId: string) => {
    const q = query(collection(db, NOTIFICATIONS_COL), where('recipientId', '==', userId));
    const snapshot = await getDocs(q);
    const promises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(promises);
};

// --- Settings (Geofencing) ---

export const getCompanySettings = async (): Promise<CompanySettings> => {
  const snapshot = await getDocs(collection(db, SETTINGS_COL));
  const settingsDoc = snapshot.docs.find(d => d.id === SETTINGS_DOC_ID);
  
  if (settingsDoc) {
    return { id: settingsDoc.id, ...settingsDoc.data() as any } as CompanySettings;
  }
  
  return {
    latitude: 28.6273928,
    longitude: 77.3725545,
    radius: 300,
    locationName: 'Logix Cyber Park (Default)',
    updatedAt: new Date().toISOString()
  };
};

export const updateCompanySettings = async (settings: Omit<CompanySettings, 'id' | 'updatedAt'>): Promise<void> => {
  await setDoc(doc(db, SETTINGS_COL, SETTINGS_DOC_ID), {
    ...settings,
    updatedAt: new Date().toISOString()
  });
};

// --- Announcements ---

export const getAnnouncements = async (): Promise<Announcement[]> => {
  const snapshot = await getDocs(collection(db, ANNOUNCEMENTS_COL));
  const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Announcement));
  return data.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const createAnnouncement = async (message: string, type: 'info' | 'urgent' | 'success', createdBy: string): Promise<void> => {
  await addDoc(collection(db, ANNOUNCEMENTS_COL), {
    message,
    type,
    createdBy,
    createdAt: new Date().toISOString()
  });
};

export const deleteAnnouncement = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, ANNOUNCEMENTS_COL, id));
};

// --- Task Management ---

export const createTask = async (task: Omit<Task, 'id' | 'status' | 'assignedDate'>): Promise<void> => {
  const newTask = {
    ...task,
    status: 'pending',
    assignedDate: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await addDoc(collection(db, TASKS_COL), newTask);

  try {
    const dueInfo = task.dueDate ? ` Due: ${task.dueDate}.` : '';
    await addDoc(collection(db, NOTIFICATIONS_COL), {
      recipientId: task.assignedTo,
      message: `New Task Assigned: "${task.title}" by ${task.assignedBy}. Priority: ${task.priority.toUpperCase()}.${dueInfo}`,
      type: task.priority === 'urgent' ? 'warning' : 'info',
      read: false,
      createdAt: new Date().toISOString(),
      link: '/tasks'
    });
  } catch(e) {
    console.warn("Failed to send task notification", e);
  }
};

export const updateTask = async (taskId: string, updates: Partial<Omit<Task, 'id'>>): Promise<void> => {
  const ref = doc(db, TASKS_COL, taskId);
  await updateDoc(ref, { 
    ...updates,
    updatedAt: new Date().toISOString() 
  });
};

export const getTasks = async (): Promise<Task[]> => {
  const q = query(collection(db, TASKS_COL));
  const snapshot = await getDocs(q);
  const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Task));
  return tasks.sort((a, b) => new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime());
};

export const updateTaskStatus = async (taskId: string, status: TaskStatus, updatedById: string): Promise<void> => {
  const ref = doc(db, TASKS_COL, taskId);
  const now = new Date().toISOString();
  
  const taskSnap = await getDoc(ref);
  const taskData = taskSnap.data() as Task;

  const updates: any = { 
    status,
    updatedAt: now 
  };

  if (status === 'completed') {
      updates.completedAt = now;
  } else if (taskData?.status === 'completed') {
      updates.completedAt = null; 
  }

  await updateDoc(ref, updates);

  if (status === 'completed' && taskData && taskData.assignedById !== updatedById) {
     try {
       await addDoc(collection(db, NOTIFICATIONS_COL), {
         recipientId: taskData.assignedById,
         message: `Task "${taskData.title}" marked as completed by ${taskData.assignedToName}`,
         type: 'success',
         read: false,
         createdAt: now,
         link: '/tasks'
       });
     } catch(e) {
       console.warn("Failed to send completion notification", e);
     }
  }
};

export const deleteTask = async (taskId: string): Promise<void> => {
  await deleteDoc(doc(db, TASKS_COL, taskId));
};

// --- Task Comments ---

export const getTaskComments = async (taskId: string): Promise<TaskComment[]> => {
  const q = query(collection(db, TASK_COMMENTS_COL), where('taskId', '==', taskId));
  const snapshot = await getDocs(q);
  const comments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as TaskComment));
  return comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

export const addTaskComment = async (comment: Omit<TaskComment, 'id'>): Promise<void> => {
  await addDoc(collection(db, TASK_COMMENTS_COL), comment);
};
