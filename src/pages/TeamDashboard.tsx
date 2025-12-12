
import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { getAllAttendance, getEmployees, getAllBreaks, getLeaves, getCompanySettings, updateCompanySettings, updateLeaveStatus, getAnnouncements, createAnnouncement, deleteAnnouncement } from '../services/firestore';
import { AttendanceRecord, BreakRecord, LeaveRecord, CompanySettings, LocationData, Announcement, Employee } from '../types';
import { Users, Coffee, CalendarOff, Clock, Filter, ChevronRight, Calendar, MapPin, Navigation, Save, Loader2, Globe, ExternalLink, Download, FileText, Utensils, CheckCircle2, AlertCircle, Timer, ArrowRight, Check, X, ShieldCheck, Megaphone, Trash2, Bell, Map as MapIcon, LocateFixed, RotateCcw, Lock, Crosshair } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

// Define interface for props
interface LeaveCardItemProps {
  rec: LeaveRecord;
  showActions: boolean;
  employees: Record<string, Employee>;
  processingId: string | null;
  onAction: (id: string, status: 'approved' | 'rejected', note?: string) => void;
}

const LeaveCardItem: React.FC<LeaveCardItemProps> = ({ 
  rec, 
  showActions, 
  employees, 
  processingId, 
  onAction 
}) => {
    const employee = employees[rec.employeeId];
    const name = employee ? employee.name : 'Unknown';
    const designation = employee ? employee.designation : '';

    const isProcessing = processingId === rec.id;
    const isAnyProcessing = processingId !== null;
    const [note, setNote] = useState(rec.adminResponse || '');

    return (
        <div className={`group flex flex-col gap-4 bg-white/70 backdrop-blur-md border rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all 
            ${rec.status === 'pending' ? 'border-amber-200/50' : rec.status === 'rejected' ? 'border-red-200/50 bg-red-50/10' : 'border-emerald-200/50 bg-emerald-50/10'}`}>
           <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 flex-shrink-0">
                    {name.charAt(0)}
                </div>
                <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 truncate">{name}</h4>
                    {designation && <p className="text-xs text-primary font-semibold truncate">{designation}</p>}
                    <div className="flex items-center gap-2 mt-0.5">
                        {rec.isHalfDay ? (
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                            HALF DAY ({rec.halfDayType === 'first' ? 'Morning' : 'Evening'})
                            </span>
                        ) : (
                            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md whitespace-nowrap">
                            FULL DAY
                            </span>
                        )}
                    </div>
                </div>
              </div>
              
              <div className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 whitespace-nowrap
                ${rec.status === 'approved' ? 'bg-green-100 text-green-700' : 
                    rec.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                    'bg-amber-100 text-amber-700'}`}>
                {rec.status === 'approved' && <CheckCircle2 className="w-3 h-3"/>}
                {rec.status === 'rejected' && <AlertCircle className="w-3 h-3"/>}
                {rec.status === 'pending' && <Timer className="w-3 h-3"/>}
                {rec.status}
              </div>
           </div>

           <div className="flex-1 min-w-0 border-l-2 border-slate-100 pl-3 ml-1">
              <p className="text-sm text-slate-700 italic break-words">"{rec.reason}"</p>
              {!showActions && rec.adminResponse && (
                  <div className="mt-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Manager Response</p>
                      <p className="text-sm text-slate-700">{rec.adminResponse}</p>
                  </div>
              )}
           </div>

           <div className="mt-auto flex flex-col gap-3">
               <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 font-medium bg-slate-50/50 p-2 rounded-lg">
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-primary" />
                        {rec.isHalfDay ? rec.dateFrom : (
                        <>
                            {new Date(rec.dateFrom).toLocaleDateString()} 
                            <ArrowRight className="w-3 h-3 mx-1" /> 
                            {new Date(rec.dateTo).toLocaleDateString()}
                        </>
                        )}
                    </span>
                    <span className="hidden sm:inline text-slate-300">|</span>
                    <span className="w-full sm:w-auto truncate">Approver: {rec.toWhom}</span>
               </div>

               {/* Admin Actions */}
               {showActions && (
                   <div className="pt-2 flex flex-col gap-2">
                       <input 
                          type="text" 
                          placeholder="Add note (optional for approval, required for rejection)..." 
                          className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          disabled={isAnyProcessing}
                       />
                       <div className="grid grid-cols-2 gap-3">
                           <Button 
                              size="sm" 
                              onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onAction(rec.id, 'approved', note);
                              }}
                              disabled={isAnyProcessing}
                              className="bg-primary hover:bg-primary/90 text-white border-none rounded-lg font-bold relative z-10 transition-transform active:scale-95"
                           >
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Check className="w-4 h-4 mr-1"/> Approve</>}
                           </Button>
                           <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (!note.trim()) {
                                      alert("Please provide a reason for rejection.");
                                      return;
                                  }
                                  onAction(rec.id, 'rejected', note);
                              }}
                              disabled={isAnyProcessing}
                              className="bg-white text-red-600 border border-red-200 hover:bg-red-50 rounded-lg font-bold relative z-10 transition-transform active:scale-95"
                           >
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <><X className="w-4 h-4 mr-1"/> Reject</>}
                           </Button>
                       </div>
                   </div>
               )}
           </div>
        </div>
    );
};

const TeamDashboard: React.FC = () => {
  const { currentUser, setCompanySettings } = useStore();
  const [activeTab, setActiveTab] = useState<'attendance' | 'breaks' | 'leaves' | 'location' | 'announcements'>('attendance');
  
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [breakRecords, setBreakRecords] = useState<BreakRecord[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Location & Profile Settings State
  const [companySettings, setLocalSettings] = useState<CompanySettings | null>(null);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  
  // Form Fields
  const [newRadius, setNewRadius] = useState<number>(300);
  const [newLocationName, setNewLocationName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [newLat, setNewLat] = useState<number>(0);
  const [newLng, setNewLng] = useState<number>(0);
  
  const [employees, setEmployees] = useState<Record<string, Employee>>({}); 
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Admin Action State
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Announcement Form State
  const [announceMsg, setAnnounceMsg] = useState('');
  const [announceType, setAnnounceType] = useState<'info'|'urgent'|'success'>('info');
  const [isPostingAnnounce, setIsPostingAnnounce] = useState(false);
  
  const dateInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const emps = await getEmployees();
      const empMap: Record<string, Employee> = {};
      emps.forEach(e => empMap[e.id] = e);
      setEmployees(empMap);

      const [att, brk, lvs, settings, announce] = await Promise.all([
        getAllAttendance(),
        getAllBreaks(),
        getLeaves(),
        getCompanySettings(),
        getAnnouncements()
      ]);

      setAttendanceRecords(att);
      setBreakRecords(brk);
      setLeaveRecords(lvs);
      setLocalSettings(settings);
      setAnnouncements(announce);
      
      // Initialize form defaults
      if (settings) {
        setNewRadius(settings.radius);
        setNewLocationName(settings.locationName);
        setNewTeamName(settings.teamName || 'TeamTime');
        setNewLogoUrl(settings.teamLogoUrl || '');
        setNewLat(settings.latitude);
        setNewLng(settings.longitude);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getFilteredAttendance = () => attendanceRecords.filter(r => r.date === filterDate);
  const getFilteredBreaks = () => breakRecords.filter(r => r.date === filterDate);
  const getFilteredLeaves = () => leaveRecords.filter(r => 
    r.status === 'pending' || (r.dateFrom <= filterDate && r.dateTo >= filterDate)
  );

  // --- SETTINGS HANDLERS ---

  const handleSetCurrentLocation = () => {
      const isManagerOrLead = currentUser?.role === 'Manager' || currentUser?.role === 'Team Lead' || currentUser?.role === 'Admin';
      if (!isManagerOrLead) return;

      if (!navigator.geolocation) {
          alert("Geolocation is not supported by your browser");
          return;
      }
      
      setIsUpdatingLocation(true);
      
      navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Update inputs instead of saving immediately
          setNewLat(latitude);
          setNewLng(longitude);
          setIsUpdatingLocation(false);
          alert("GPS Coordinates captured! Review the details and click 'Save Config' to apply.");
          
      }, (error) => {
          console.error(`Geo error: ${error.message}`);
          alert("Could not fetch location. Check permissions.");
          setIsUpdatingLocation(false);
      }, { enableHighAccuracy: true });
  };

  const handleSaveSettings = async () => {
      if (!companySettings) return;
      setIsUpdatingLocation(true);
      try {
          const updatedData = {
              latitude: newLat,
              longitude: newLng,
              radius: newRadius,
              locationName: newLocationName,
              teamName: newTeamName,
              teamLogoUrl: newLogoUrl
          };

          await updateCompanySettings(updatedData);
          const updated = await getCompanySettings();
          setLocalSettings(updated);
          setCompanySettings(updated); // Update Global Store
          alert("Settings saved successfully.");
      } catch (error) {
          console.error(error);
          alert("Failed to save settings.");
      } finally {
          setIsUpdatingLocation(false);
      }
  };

  const handleResetLocation = async () => {
      if (!confirm("Reset office location to default (Logix Cyber Park)?")) return;
      setIsUpdatingLocation(true);
      try {
          const defaultSettings = {
              latitude: 28.6273928,
              longitude: 77.3725545,
              radius: 300,
              locationName: 'Logix Cyber Park (Default)',
              teamName: 'TeamTime',
              teamLogoUrl: ''
          };
          await updateCompanySettings(defaultSettings);
          const updated = await getCompanySettings();
          setLocalSettings(updated);
          setCompanySettings(updated);
          
          // Update form
          setNewLat(defaultSettings.latitude);
          setNewLng(defaultSettings.longitude);
          setNewRadius(300);
          setNewLocationName(defaultSettings.locationName);
          
          alert("Location reset to default.");
      } catch(e) {
          console.error(e);
      } finally {
          setIsUpdatingLocation(false);
      }
  }

  // ... (rest of methods)

  const handleLeaveAction = async (id: string, status: 'approved' | 'rejected', note?: string) => {
      if (!currentUser) return;
      
      const record = leaveRecords.find(l => l.id === id);
      if (!record) return;

      const isAuthorized = record.toWhom === currentUser.name || currentUser.role === 'Admin';

      if (!isAuthorized) {
          alert(`You are not authorized. This request is assigned to: ${record.toWhom}`);
          return;
      }

      setProcessingId(id);

      try {
          await updateLeaveStatus(id, status, note || '');
          setLeaveRecords(prev => prev.map(l => 
            l.id === id ? { ...l, status: status, adminResponse: note || '' } : l
          ));
      } catch (e) {
          console.error("Failed to update status", e);
          alert("Failed to update leave status.");
          const lvs = await getLeaves();
          setLeaveRecords(lvs);
      } finally {
          setProcessingId(null);
      }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;
      setIsPostingAnnounce(true);
      try {
          await createAnnouncement(announceMsg, announceType, currentUser.name);
          setAnnounceMsg('');
          const updated = await getAnnouncements();
          setAnnouncements(updated);
      } catch(e) {
          console.error(e);
      } finally {
          setIsPostingAnnounce(false);
      }
  };

  const handleDeleteAnnouncement = async (id: string) => {
      try {
          await deleteAnnouncement(id);
          setAnnouncements(prev => prev.filter(a => a.id !== id));
      } catch(e) {
          console.error(e);
      }
  };

  const downloadCSV = () => {
    const records = getFilteredAttendance();
    if (records.length === 0) {
        alert("No records to export for this date.");
        return;
    }

    const headers = ["Employee Name", "Date", "Punch In", "Punch Out", "Duration (Minutes)", "Work Log", "Status"];
    
    const csvRows = [headers.join(',')];

    records.forEach(rec => {
        const emp = employees[rec.employeeId];
        const name = emp ? emp.name : 'Unknown';
        const date = rec.date;
        const punchIn = rec.punchIn ? new Date(rec.punchIn).toLocaleTimeString() : '-';
        const punchOut = rec.punchOut ? new Date(rec.punchOut).toLocaleTimeString() : '-';
        const duration = rec.workingHours || 0;
        const workLog = rec.workLog ? `"${rec.workLog.replace(/"/g, '""')}"` : '';
        const status = (rec.punchIn && !rec.punchOut) ? 'Working' : 'Completed';

        const row = [
            `"${name}"`,
            date,
            punchIn,
            punchOut,
            duration,
            workLog,
            status
        ];
        csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${filterDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };


  const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-shrink-0 flex items-center px-4 py-2.5 md:px-5 md:py-3 text-sm font-bold rounded-xl transition-all duration-200 border whitespace-nowrap snap-center ${
        activeTab === id 
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 border-primary' 
          : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 border-slate-200'
      }`}
    >
      <Icon className={`w-4 h-4 mr-2 ${activeTab === id ? 'text-white' : ''}`} />
      {label}
    </button>
  );

  const showPicker = () => {
    try {
      dateInputRef.current?.showPicker();
    } catch (e) {}
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; 
    const φ1 = (Number(lat1) * Math.PI) / 180;
    const φ2 = (Number(lat2) * Math.PI) / 180;
    const Δφ = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
    const Δλ = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  const LocationIcon = ({ loc }: { loc?: LocationData }) => {
      if (!loc) return <span title="No location data" className="text-slate-300 text-[10px]">-</span>;
      
      const url = `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
      let distanceText = "";
      if (!loc.inOffice && companySettings) {
          const dist = calculateDistance(loc.lat, loc.lng, companySettings.latitude, companySettings.longitude);
          distanceText = dist > 1000 ? `(${(dist/1000).toFixed(1)}km)` : `(${Math.round(dist)}m)`;
      }

      if (loc.inOffice) {
          return (
             <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center text-emerald-600 hover:text-emerald-800 hover:underline bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-100 transition-colors max-w-full truncate">
                 <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                 <span className="text-[10px] font-bold uppercase tracking-wide truncate">Office</span>
             </a>
          )
      }
      
      return (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center text-amber-600 hover:text-amber-800 hover:underline bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-100 transition-colors max-w-full truncate">
             <Globe className="w-3 h-3 mr-1 flex-shrink-0" />
             <span className="text-[10px] font-bold uppercase tracking-wide truncate">Remote {distanceText}</span>
          </a>
      );
  };

  const renderAttendanceCards = () => {
    // ... same logic
    const records = getFilteredAttendance();
    const isToday = filterDate === new Date().toISOString().split('T')[0];

    if (records.length === 0 && !isToday) {
      return (
        <div className="text-center py-20 bg-white/50 rounded-3xl border border-dashed border-slate-300">
           <Clock className="h-12 w-12 mx-auto mb-3 text-slate-300" />
           <p className="text-lg font-bold text-slate-500">No attendance records</p>
           <p className="text-sm text-slate-400">No activity found for {new Date(filterDate).toLocaleDateString()}.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {records.length === 0 ? (
             <div className="text-center py-12 text-slate-400">No records yet for today.</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {records.map((rec) => {
                const emp = employees[rec.employeeId];
                const name = emp ? emp.name : 'Unknown';
                const designation = emp ? emp.designation : '';
                const isWorking = rec.punchIn && !rec.punchOut;
                const duration = rec.workingHours ? `${Math.floor(rec.workingHours / 60)}h ${rec.workingHours % 60}m` : '0h 0m';
                const dateStr = new Date(rec.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                return (
                    <Card key={rec.id} className="overflow-hidden border-slate-200 hover:shadow-lg transition-all duration-300 group bg-white/80 backdrop-blur-md">
                        <div className={`h-1.5 w-full ${isWorking ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm overflow-hidden ${isWorking ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {emp?.avatarUrl ? <img src={emp.avatarUrl} alt={name} className="w-full h-full object-cover"/> : name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 leading-tight">{name}</h4>
                                        <span className="text-xs text-slate-500 font-medium block">{designation || emp?.role || 'Team Member'}</span>
                                    </div>
                                </div>
                                {isWorking && (
                                    <span className="flex h-3 w-3 relative mt-1">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center divide-x divide-slate-100 border-y border-slate-100 py-4 mb-4 bg-slate-50/50 rounded-xl">
                                <div className="flex-1 px-2 text-center">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">In</div>
                                    <div className="font-mono font-bold text-slate-700">{rec.punchIn ? new Date(rec.punchIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</div>
                                </div>
                                <div className="flex-1 px-2 text-center">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Out</div>
                                    <div className="font-mono font-bold text-slate-700">{rec.punchOut ? new Date(rec.punchOut).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : '--:--'}</div>
                                </div>
                                <div className="flex-1 px-2 text-center">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hrs</div>
                                    <div className={`font-mono font-bold ${isWorking ? 'text-emerald-600' : 'text-slate-700'}`}>{duration}</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400 font-medium flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> 
                                        Punch In
                                    </span>
                                    {rec.punchInLocation ? <LocationIcon loc={rec.punchInLocation} /> : <span className="text-slate-300">-</span>}
                                </div>
                                {rec.punchOut && (
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400 font-medium flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div> 
                                            Punch Out
                                        </span>
                                        {rec.punchOutLocation ? <LocationIcon loc={rec.punchOutLocation} /> : <span className="text-slate-300">-</span>}
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-5 pt-3 border-t border-slate-50 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{dateStr}</span>
                                </div>
                                {rec.workLog && (
                                    <div className="group/log relative">
                                        <FileText className="w-4 h-4 text-slate-300 hover:text-emerald-500 cursor-help transition-colors" />
                                        <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover/log:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                                            <p className="line-clamp-3 italic">"{rec.workLog}"</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                );
                })}
            </div>
        )}
      </div>
    );
  };

  const renderBreaksCards = () => {
    // ... same logic
    const records = getFilteredBreaks();
    if (records.length === 0) {
        return (
          <div className="text-center py-20 bg-white/50 rounded-3xl border border-dashed border-slate-300">
             <Coffee className="h-12 w-12 mx-auto mb-3 text-slate-300" />
             <p className="text-lg font-bold text-slate-500">No breaks taken</p>
             <p className="text-sm text-slate-400">Everyone has been working hard!</p>
          </div>
        );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
         {records.map(rec => {
            const emp = employees[rec.employeeId];
            const name = emp ? emp.name : 'Unknown';
            const isActive = !rec.breakEnd;
            const isLunch = rec.breakType === 'lunch';

            return (
               <div key={rec.id} className={`relative overflow-hidden bg-white/70 backdrop-blur-md border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all ${isActive ? 'border-amber-300 ring-1 ring-amber-100' : 'border-white/50'}`}>
                  <div className="flex justify-between items-start mb-4">
                     <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-700 font-bold flex-shrink-0">
                            {name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                           <h4 className="font-bold text-slate-800 text-sm truncate">{name}</h4>
                           <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${isLunch ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                              {isLunch ? <Utensils className="w-3 h-3 mr-1 flex-shrink-0"/> : <Coffee className="w-3 h-3 mr-1 flex-shrink-0"/>}
                              {rec.breakType}
                           </span>
                        </div>
                     </div>
                     {isActive && <span className="flex h-3 w-3 relative flex-shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span></span>}
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50/50 rounded-xl p-2 border border-slate-100/50">
                     <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Started</span>
                        <p className="font-mono text-sm font-semibold text-slate-700">
                           {new Date(rec.breakStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                     </div>
                     <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Ended</span>
                        <p className="font-mono text-sm font-semibold text-slate-700">
                           {rec.breakEnd ? new Date(rec.breakEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                        </p>
                     </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">Duration</span>
                      <span className={`font-bold ${isActive ? 'text-amber-600 animate-pulse' : 'text-slate-800'}`}>
                         {rec.duration ? `${rec.duration} mins` : 'Ongoing...'}
                      </span>
                  </div>
               </div>
            );
         })}
      </div>
    );
  };

  const renderLocationSettings = () => {
      if (!companySettings) return null;
      const isManagerOrLead = currentUser?.role === 'Manager' || currentUser?.role === 'Team Lead' || currentUser?.role === 'Admin';

      // Ensure updated date is valid
      let lastUpdatedDate = 'N/A';
      try {
          if (companySettings.updatedAt) {
              lastUpdatedDate = new Date(companySettings.updatedAt).toLocaleDateString();
          }
      } catch (e) {}

      return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Card 1: Current Office Zone (Read-Only) */}
              <Card className="border-slate-200 bg-white shadow-md flex flex-col h-full">
                  <CardHeader className="border-b border-slate-100 pb-4">
                      <CardTitle className="flex items-center gap-2 text-slate-800">
                          <MapPin className="w-5 h-5 text-emerald-600" />
                          Current Office Zone
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex-1 flex flex-col gap-4">
                      {/* Active Location Details - Styled Green Container */}
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Active Location</p>
                          <h3 className="text-xl font-bold text-emerald-900 leading-tight mb-4">{companySettings.locationName || 'Unknown Office'}</h3>
                          
                          <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                              <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Latitude</p>
                                  <p className="font-mono font-bold text-slate-700">{companySettings.latitude.toFixed(6)}</p>
                              </div>
                              <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Longitude</p>
                                  <p className="font-mono font-bold text-slate-700">{companySettings.longitude.toFixed(6)}</p>
                              </div>
                              <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allowed Radius</p>
                                  <p className="font-bold text-slate-700">{companySettings.radius} meters</p>
                              </div>
                              <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Updated</p>
                                  <p className="font-bold text-slate-700">{lastUpdatedDate}</p>
                              </div>
                          </div>
                      </div>

                      {/* Google Maps Embed */}
                      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100 h-64 flex items-center justify-center relative flex-1 min-h-[250px]">
                          <iframe 
                              width="100%" 
                              height="100%" 
                              frameBorder="0" 
                              scrolling="no" 
                              marginHeight={0} 
                              marginWidth={0} 
                              title="Google Maps Preview"
                              src={`https://maps.google.com/maps?q=${companySettings.latitude},${companySettings.longitude}&z=15&output=embed`}
                              className="w-full h-full border-0 filter grayscale-[0] hover:grayscale-0 transition-all duration-500"
                          ></iframe>
                      </div>

                      {/* Footer Link */}
                      <div className="pt-2">
                          <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${companySettings.latitude},${companySettings.longitude}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                          >
                              <Globe className="w-3 h-3 mr-1" /> View on Google Maps
                          </a>
                          <p className="text-[10px] text-slate-400 mt-1">This map preview shows the center point of your office geofence.</p>
                      </div>
                  </CardContent>
              </Card>

              {/* Card 2: Update Geofence Form */}
              <Card className="border-slate-200 bg-white shadow-md flex flex-col h-full">
                  <CardHeader className="border-b border-slate-100 pb-4">
                      <CardTitle className="flex items-center gap-2 text-slate-800">
                          <Navigation className="w-5 h-5 text-blue-600" />
                          Update Geofence
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex-1 flex flex-col">
                      <div className={`space-y-6 flex-1`}>
                          
                          {/* Office Name Input */}
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Office Name</label>
                              <div className="relative">
                                  <input 
                                      type="text" 
                                      value={newLocationName}
                                      onChange={(e) => setNewLocationName(e.target.value)}
                                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                      placeholder="e.g. Aeologic Technologies Logix Cyber Park"
                                      disabled={!isManagerOrLead}
                                  />
                              </div>
                          </div>

                          {/* Coordinates Inputs - NEW: Allows manual entry for remote setup */}
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Latitude</label>
                                  <input 
                                      type="number" 
                                      value={newLat}
                                      onChange={(e) => setNewLat(parseFloat(e.target.value))}
                                      step="0.000001"
                                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                      disabled={!isManagerOrLead}
                                  />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Longitude</label>
                                  <input 
                                      type="number" 
                                      value={newLng}
                                      onChange={(e) => setNewLng(parseFloat(e.target.value))}
                                      step="0.000001"
                                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                      disabled={!isManagerOrLead}
                                  />
                              </div>
                          </div>

                          {/* Radius Slider */}
                          <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Allowed Radius (Meters)</label>
                              </div>
                              <div className={`flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 ${!isManagerOrLead ? 'opacity-60' : ''}`}>
                                  <div className="h-4 w-4 rounded-full bg-emerald-500 shadow-sm border border-emerald-600 flex-shrink-0"></div>
                                  <input 
                                      type="range" 
                                      min="50" 
                                      max="1000" 
                                      step="10"
                                      value={newRadius}
                                      onChange={(e) => setNewRadius(parseInt(e.target.value))}
                                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:cursor-not-allowed"
                                      disabled={!isManagerOrLead}
                                  />
                                  <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 text-sm font-bold text-slate-700 min-w-[60px] text-center shadow-sm">
                                      {newRadius}m
                                  </span>
                              </div>
                              <p className="text-[10px] text-slate-400">Typical office radius is 100-300 meters.</p>
                          </div>

                          <div className="mt-auto space-y-4 pt-6">
                              {/* Blue GPS Button - Enabled for ALL users */}
                              <Button 
                                  onClick={handleSetCurrentLocation}
                                  disabled={isUpdatingLocation || !isManagerOrLead}
                                  className={`w-full py-6 rounded-xl font-bold flex items-center justify-center text-sm transition-transform active:scale-95 shadow-lg
                                      ${!isManagerOrLead 
                                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200' 
                                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100'}`}
                              >
                                  {isUpdatingLocation ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Crosshair className="w-5 h-5 mr-2" />}
                                  {isManagerOrLead ? 'Use My Current GPS Position' : 'Restricted to Admin/Manager'}
                              </Button>
                              {isManagerOrLead && <p className="text-center text-[10px] text-slate-400">*Stand at the office center before clicking this.</p>}

                              {/* Divider & Secondary Config - Restricted to Admin/Manager */}
                              {isManagerOrLead && (
                                  <>
                                      <div className="relative flex items-center py-2">
                                          <div className="flex-grow border-t border-slate-100"></div>
                                          <span className="flex-shrink-0 mx-4 text-xs font-bold text-slate-300 uppercase">OR</span>
                                          <div className="flex-grow border-t border-slate-100"></div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-3">
                                          <Button 
                                              onClick={handleResetLocation}
                                              disabled={isUpdatingLocation}
                                              variant="secondary"
                                              className="bg-white text-slate-500 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 h-14 rounded-xl font-bold"
                                              title="Reset to Defaults"
                                          >
                                              <RotateCcw className="w-4 h-4 mr-2" /> Reset
                                          </Button>
                                          
                                          <Button 
                                              onClick={handleSaveSettings}
                                              disabled={isUpdatingLocation || !isManagerOrLead}
                                              variant="secondary"
                                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 h-14 rounded-xl font-bold border border-slate-200"
                                          >
                                              <Save className="w-4 h-4 mr-2" /> Save Config
                                          </Button>
                                      </div>
                                  </>
                              )}
                          </div>
                      </div>
                      
                      {!isManagerOrLead && (
                          <div className="mt-4 p-3 bg-slate-50 text-slate-500 text-xs font-medium rounded-lg text-center border border-slate-100">
                              <Lock className="w-3 h-3 inline mr-1 mb-0.5" />
                              Location settings are read-only for team members. Contact an admin to update the office geofence.
                          </div>
                      )}
                  </CardContent>
              </Card>
          </div>
      );
  };

  const renderLeavesCards = () => {
    // ... same logic
    const records = getFilteredLeaves();
    
    // Sort: Pending first, then by date desc
    const sortedRecords = [...records].sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.dateFrom).getTime() - new Date(a.dateFrom).getTime();
    });

    if (sortedRecords.length === 0) {
        return (
          <div className="text-center py-20 bg-white/50 rounded-3xl border border-dashed border-slate-300">
             <CalendarOff className="h-12 w-12 mx-auto mb-3 text-slate-300" />
             <p className="text-lg font-bold text-slate-500">No leave requests</p>
             <p className="text-sm text-slate-400">Everything looks clear for this period.</p>
          </div>
        );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedRecords.map(rec => {
              const isAssignedManager = rec.toWhom === currentUser?.name;
              const isAdmin = currentUser?.role === 'Admin';
              const showActions = rec.status === 'pending' && (isAssignedManager || isAdmin);

              return (
                  <LeaveCardItem 
                      key={rec.id}
                      rec={rec}
                      showActions={showActions}
                      employees={employees}
                      processingId={processingId}
                      onAction={handleLeaveAction}
                  />
              );
          })}
      </div>
    );
  };

  // ... (renderAnnouncements same as before)
  const renderAnnouncements = () => {
      const canManageAnnouncements = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';

      return (
          <div className="space-y-8">
              {/* Creation Form */}
              {canManageAnnouncements && (
                  <Card className="border-primary/20 bg-white shadow-md">
                      <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-primary">
                              <Megaphone className="w-5 h-5 text-primary" /> Post Announcement
                          </CardTitle>
                      </CardHeader>
                      <CardContent>
                          <form onSubmit={handlePostAnnouncement} className="flex flex-col gap-4">
                              <textarea 
                                  required
                                  value={announceMsg}
                                  onChange={(e) => setAnnounceMsg(e.target.value)}
                                  placeholder="Write your message here..."
                                  className="w-full p-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none min-h-[100px] resize-none text-sm font-medium"
                              />
                              <div className="flex justify-between items-center">
                                  <div className="flex gap-2">
                                      {['info', 'urgent', 'success'].map((type) => (
                                          <button
                                              key={type}
                                              type="button"
                                              onClick={() => setAnnounceType(type as any)}
                                              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${
                                                  announceType === type 
                                                  ? type === 'urgent' ? 'bg-red-500 text-white border-red-600' 
                                                  : type === 'success' ? 'bg-green-500 text-white border-green-600'
                                                  : 'bg-primary text-white border-primary'
                                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                              }`}
                                          >
                                              {type}
                                          </button>
                                      ))}
                                  </div>
                                  <Button 
                                      type="submit" 
                                      disabled={isPostingAnnounce}
                                      className="bg-gradient-to-r from-primary to-primary/80 hover:to-primary text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-primary/20"
                                  >
                                      {isPostingAnnounce ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post Notice'}
                                  </Button>
                              </div>
                          </form>
                      </CardContent>
                  </Card>
              )}

              {/* List */}
              <div className="grid gap-4">
                  {announcements.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>No announcements posted yet.</p>
                      </div>
                  ) : (
                      announcements.map(ann => (
                          <div key={ann.id} className={`relative p-5 rounded-2xl border flex items-start gap-4 shadow-sm transition-all hover:shadow-md ${
                               ann.type === 'urgent' ? 'bg-red-50/50 border-red-100' : 
                               ann.type === 'success' ? 'bg-green-50/50 border-green-100' : 
                               'bg-white border-slate-100'
                          }`}>
                              <div className={`p-3 rounded-xl flex-shrink-0 ${
                                   ann.type === 'urgent' ? 'bg-red-100 text-red-600' : 
                                   ann.type === 'success' ? 'bg-green-100 text-green-600' : 
                                   'bg-primary/10 text-primary'
                              }`}>
                                  <Megaphone className="w-5 h-5" />
                              </div>
                              
                              <div className="flex-1 min-w-0 pt-1">
                                  <p className="text-slate-800 font-medium leading-relaxed">{ann.message}</p>
                                  <div className="flex items-center gap-2 mt-3 text-xs text-slate-400 font-bold uppercase tracking-wider">
                                      <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                                      <span>•</span>
                                      <span>{ann.createdBy}</span>
                                      {ann.type !== 'info' && (
                                          <span className={`ml-2 px-2 py-0.5 rounded-md text-[10px] ${
                                              ann.type === 'urgent' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'
                                          }`}>{ann.type}</span>
                                      )}
                                  </div>
                              </div>

                              {canManageAnnouncements && (
                                  <button 
                                      onClick={() => handleDeleteAnnouncement(ann.id)}
                                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors absolute top-4 right-4"
                                      title="Delete Announcement"
                                  >
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                              )}
                          </div>
                      ))
                  )}
              </div>
          </div>
      );
  };

  if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse">Loading team data...</div>;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            {currentUser?.role === 'Manager' || currentUser?.role === 'Team Lead' || currentUser?.role === 'Admin' ? 'Admin Dashboard' : 'Team Insights'}
          </h2>
          <p className="text-slate-500 mt-1">Manage attendance, leave requests, and company settings.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            {/* Date Filter */}
            {activeTab !== 'location' && activeTab !== 'announcements' && (
            <div className="w-full sm:w-auto min-w-full sm:min-w-[260px]">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Filter by Date</label>
                <div className="relative group cursor-pointer" onClick={showPicker}>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                    <Filter className="h-4 w-4 text-primary" />
                </div>
                
                <input 
                    ref={dateInputRef}
                    type="date" 
                    className="full-click-date block w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 shadow-sm 
                            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary 
                            cursor-pointer appearance-none relative z-10 hover:border-primary/50 transition-colors"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    onClick={showPicker}
                />
                
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none z-20">
                    <Calendar className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                </div>
                </div>
            </div>
            )}

            {/* Export CSV Button */}
            {activeTab === 'attendance' && (
                <div className="w-full sm:w-auto">
                    <label className="hidden sm:block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">&nbsp;</label>
                    <Button 
                        onClick={downloadCSV}
                        className="w-full bg-slate-800 text-white hover:bg-primary py-3 rounded-xl shadow-md flex items-center justify-center gap-2 h-[46px]"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                </div>
            )}
        </div>
      </div>

      {/* Navigation Tabs - Scrollable on mobile */}
      <div className="flex gap-3 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0 snap-x">
        <TabButton id="attendance" label="Attendance" icon={Clock} />
        <TabButton id="breaks" label="Breaks" icon={Coffee} />
        <TabButton id="leaves" label="Leaves" icon={CalendarOff} />
        {(currentUser?.role === 'Manager' || currentUser?.role === 'Team Lead' || currentUser?.role === 'Admin') && <TabButton id="announcements" label="Notice Board" icon={Megaphone} />}
        {/* Renamed Mappls Zone to Office Zone */}
        <TabButton id="location" label="Office Zone" icon={MapIcon} />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
         {activeTab === 'attendance' && renderAttendanceCards()}
         {activeTab === 'breaks' && renderBreaksCards()}
         {activeTab === 'leaves' && renderLeavesCards()}
         {activeTab === 'announcements' && renderAnnouncements()}
         {activeTab === 'location' && renderLocationSettings()}
      </div>
    </div>
  );
};

export default TeamDashboard;
