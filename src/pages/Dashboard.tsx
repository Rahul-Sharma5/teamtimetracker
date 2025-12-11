
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { getAttendanceByDate, punchIn, punchOut, getWeeklyAttendance, getCompanySettings, updateCompanySettings, updateWorkLog, getAnnouncements, getTodayTeamAttendance, getEmployees, subscribeToNotifications, markNotificationAsRead, clearNotifications } from '../services/firestore';
import { AttendanceRecord, CompanySettings, LocationData, Announcement, Employee, Notification } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Play, Square, Clock, Calendar, Activity, History, MapPin, AlertTriangle, RefreshCw, ShieldAlert, Globe, ExternalLink, ChevronDown, FileText, Bell, Megaphone, Users, Trash2, BarChart2, Smile, Frown, Meh, Zap, Brain } from 'lucide-react';

const MAPPLS_KEY = 'viucbkxttvlqxvilccraufoblaokkqyckznr';

const Dashboard: React.FC = () => {
  const { currentUser } = useStore();
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<{day: string, hours: number, date: string, isToday: boolean}[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [onlineColleagues, setOnlineColleagues] = useState<{name: string, punchIn: string, id: string, status?: string, statusEmoji?: string, mood?: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Mood State
  const [selectedMood, setSelectedMood] = useState('happy');

  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Date Filter State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Location State
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error' | 'out-of-range' | 'denied'>('loading');
  const [distance, setDistance] = useState<number>(0);
  const [checkingLocation, setCheckingLocation] = useState(false);

  // Work Log State
  const [workLog, setWorkLog] = useState('');
  const [isSavingLog, setIsSavingLog] = useState(false);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Notification Subscription
  useEffect(() => {
      if (currentUser) {
          const unsubscribe = subscribeToNotifications(currentUser.id, (data) => {
              setNotifications(data);
          });
          return () => unsubscribe();
      }
  }, [currentUser]);

  // Click Outside Notification Dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const record = await getAttendanceByDate(currentUser.id, selectedDate);
      const weeklyRaw = await getWeeklyAttendance(currentUser.id);
      const settings = await getCompanySettings();
      const announce = await getAnnouncements();
      
      // Calculate Weekly Stats (Last 7 days)
      const last7Days = [];
      for(let i=6; i>=0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const rec = weeklyRaw.find(r => r.date === dateStr);
          const hours = rec ? parseFloat((rec.workingHours / 60).toFixed(1)) : 0;
          
          last7Days.push({
              day: d.toLocaleDateString(undefined, {weekday: 'short'}),
              hours: hours,
              date: dateStr,
              isToday: dateStr === selectedDate
          });
      }
      setWeeklyStats(last7Days);
      setHistory(weeklyRaw.slice(0, 5)); // Just show recent 5 in list

      const [todaysTeamAttendance, allEmployees] = await Promise.all([
          getTodayTeamAttendance(),
          getEmployees()
      ]);

      setAttendance(record);
      setCompanySettings(settings);
      setAnnouncements(announce);
      
      // Calculate Online Colleagues with Status
      const activeMap = new Map<string, {time: string, mood?: string}>(); 
      todaysTeamAttendance.forEach(r => {
          if (r.punchIn && !r.punchOut) {
              activeMap.set(r.employeeId, { time: r.punchIn, mood: r.mood });
          }
      });
      
      const empMap = new Map(allEmployees.map(e => [e.id, e]));
      const online = Array.from(activeMap.entries()).map(([id, data]) => {
          const emp = empMap.get(id);
          return {
              id,
              name: emp?.name || 'Unknown',
              punchIn: data.time,
              status: emp?.currentStatus,
              statusEmoji: emp?.currentStatusEmoji,
              mood: data.mood
          };
      }).filter(u => u.id !== currentUser.id); // Exclude self

      setOnlineColleagues(online);

      // Set Work Log if exists
      if (record?.workLog) {
          setWorkLog(record.workLog);
      } else {
          setWorkLog('');
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser, selectedDate]);
  
  // Notification Handlers
  const handleNotificationClick = async (notif: Notification) => {
      if (!notif.read) {
          await markNotificationAsRead(notif.id);
      }
      if (notif.link) {
          navigate(notif.link);
          setShowNotifications(false);
      }
  };

  const handleClearAllNotifications = async () => {
      if(currentUser) await clearNotifications(currentUser.id);
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;

  // --- GEOLOCATION LOGIC ---

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const checkLocation = (isBackground: boolean = false) => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      return;
    }
    
    if (!companySettings) return;

    setCheckingLocation(true);
    
    // Only show loading state for manual or initial checks, not periodic background updates
    if (!isBackground) {
        setLocationStatus('loading');
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const dist = calculateDistance(userLat, userLng, companySettings.latitude, companySettings.longitude);
        
        setDistance(Math.round(dist));
        
        // Strictly check if within radius
        if (dist <= companySettings.radius) {
          setLocationStatus('success');
        } else {
          setLocationStatus('out-of-range');
        }
        setCheckingLocation(false);
      },
      (error) => {
        console.error(`Geolocation error (${error.code}): ${error.message}`);
        // Only update error status if it's not a background check, or if we want to show persistent errors
        if (!isBackground) {
            if (error.code === 1) {
                setLocationStatus('denied');
            } else {
                setLocationStatus('error');
            }
        }
        setCheckingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Enhanced "Retry" that acts as "Mark Territory" for all users
  const handleRetryAndUpdateLocation = () => {
      if (!navigator.geolocation) {
          alert("Geolocation is not supported by your browser");
          return;
      }
      
      if (!companySettings) {
          checkLocation(false);
          return;
      }
      
      setCheckingLocation(true);
      setLocationStatus('loading');

      navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
              // Construct the updated settings object
              const updatedData = {
                  latitude,
                  longitude,
                  radius: companySettings.radius, // Keep existing radius
                  locationName: companySettings.locationName, // Keep existing name
                  teamName: companySettings.teamName, // Keep existing team name
                  teamLogoUrl: companySettings.teamLogoUrl // Keep existing logo
              };
              
              // Update in Firestore
              await updateCompanySettings(updatedData);
              
              // Update local state immediately
              setCompanySettings(prev => prev ? { ...prev, latitude, longitude } : null);
              setDistance(0); // We are at the center
              setLocationStatus('success');
          } catch (err) {
              console.error("Failed to auto-update location", err);
              // Fallback to standard check if write fails
              checkLocation(false);
          } finally {
              setCheckingLocation(false);
          }
      }, (error) => {
          console.error(`Geo error: ${error.message}`);
          setLocationStatus(error.code === 1 ? 'denied' : 'error');
          setCheckingLocation(false);
      }, { enableHighAccuracy: true });
  };

  // Check location whenever settings load, and then periodically
  useEffect(() => {
      let intervalId: ReturnType<typeof setInterval>;

      if (companySettings) {
          // Initial check
          checkLocation(false);

          // Real-time updates: Check every 10 seconds silently
          intervalId = setInterval(() => {
              checkLocation(true);
          }, 10000);
      }

      return () => {
          if (intervalId) clearInterval(intervalId);
      };
  }, [companySettings]);

  const getLocationPayload = async (): Promise<LocationData | undefined> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
         resolve(undefined);
         return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
           const { latitude, longitude } = position.coords;
           let inOffice = false;
           
           // CRITICAL: Determine inOffice status based on current settings at moment of punch
           if (companySettings) {
               const dist = calculateDistance(latitude, longitude, companySettings.latitude, companySettings.longitude);
               inOffice = dist <= companySettings.radius;
               console.log(`Punch Location Check: Dist=${dist}m, Radius=${companySettings.radius}m, InOffice=${inOffice}`);
           }
           
           resolve({
             lat: latitude,
             lng: longitude,
             inOffice: inOffice
           });
        },
        (error) => {
           console.error(`Geo error during punch (${error.code}): ${error.message}`);
           resolve(undefined);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handlePunchIn = async () => {
    if (!currentUser) return;
    setPunching(true);
    try {
        const location = await getLocationPayload();
        await punchIn(currentUser.id, location, selectedMood);
        
        // Refresh data
        fetchData();
        setWorkLog(''); // Reset log for new day
        
        // Refresh status immediately
        if (location && companySettings) {
            setDistance(Math.round(calculateDistance(location.lat, location.lng, companySettings.latitude, companySettings.longitude)));
            setLocationStatus(location.inOffice ? 'success' : 'out-of-range');
        }
    } catch (error) {
        console.error(error);
    } finally {
        setPunching(false);
    }
  };

  const handlePunchOut = async () => {
    if (!attendance || !attendance.punchIn) return;
    setPunching(true);
    try {
        const location = await getLocationPayload();
        await punchOut(attendance.id, attendance.punchIn, location, workLog);
        fetchData();
    } catch (error) {
        console.error(error);
    } finally {
        setPunching(false);
    }
  };
  
  const handleSaveLog = async () => {
      if (!attendance) return;
      setIsSavingLog(true);
      try {
          await updateWorkLog(attendance.id, workLog);
      } catch (error) {
          console.error(error);
      } finally {
          setIsSavingLog(false);
      }
  };

  const showPicker = () => {
    try {
      dateInputRef.current?.showPicker();
    } catch(e) {}
  };

  const getMoodEmoji = (mood?: string) => {
      switch(mood) {
          case 'happy': return '😄';
          case 'energetic': return '⚡';
          case 'neutral': return '😐';
          case 'tired': return '😴';
          case 'stressed': return '🤯';
          default: return '😐';
      }
  };

  if (loading) return <div className="p-8 text-slate-500 animate-pulse">Loading dashboard data...</div>;

  const isPunchedIn = attendance && attendance.punchIn && !attendance.punchOut;
  const isPunchedOut = attendance && attendance.punchOut;
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;

  // Logic for Button Appearance
  let punchButtonColor = "";
  let punchButtonText = "";
  let punchButtonIcon = null;

  if (locationStatus === 'success') {
      punchButtonColor = isPunchedIn 
          ? "bg-red-500/20 border-red-200/40 hover:bg-red-500/30" 
          : "bg-white/20 border-white/30 hover:bg-white/30 hover:border-white/60";
      punchButtonText = isPunchedIn ? "PUNCH OUT" : "PUNCH IN";
      punchButtonIcon = isPunchedIn ? Square : Play;
  } else if (locationStatus === 'out-of-range') {
      // Remote Mode
      punchButtonColor = isPunchedIn
          ? "bg-red-500/20 border-red-200/40 hover:bg-red-500/30"
          : "bg-amber-500/20 border-amber-300/40 hover:bg-amber-500/30 hover:border-amber-300/60";
      punchButtonText = isPunchedIn ? "OUT (REMOTE)" : "IN (REMOTE)";
      punchButtonIcon = isPunchedIn ? Square : Globe;
  } else {
      // Error/Denied Mode
      punchButtonColor = "bg-slate-500/20 border-slate-400/30 hover:bg-slate-500/30";
      punchButtonText = isPunchedIn ? "OUT (NO GPS)" : "IN (NO GPS)";
      punchButtonIcon = isPunchedIn ? Square : AlertTriangle;
  }

  // Disable if viewing past date
  if (!isToday) {
      punchButtonColor = "bg-slate-100/20 border-slate-200/20 opacity-50 cursor-not-allowed";
      punchButtonText = "HISTORY VIEW";
  }

  // Calculate working hours for display
  let workingDisplay = "0h 0m";
  if (attendance?.workingHours) {
    const h = Math.floor(attendance.workingHours / 60);
    const m = attendance.workingHours % 60;
    workingDisplay = `${h}h ${m}m`;
  }

  const PunchIcon = punchButtonIcon || Play;
  const officeName = companySettings?.locationName || "Office";

  const renderLocationBadge = (loc?: LocationData) => {
      if (!loc) return <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded ml-1">No Loc</span>;
      
      const mapsUrl = `https://mappls.com/@${loc.lat},${loc.lng},18z`;
      
      // Calculate distance if not in office and settings are available
      let distanceText = "";
      if (!loc.inOffice && companySettings) {
          const dist = calculateDistance(loc.lat, loc.lng, companySettings.latitude, companySettings.longitude);
          distanceText = dist > 1000 ? `(${(dist/1000).toFixed(1)}km)` : `(${Math.round(dist)}m)`;
      }

      // STRICT CHECK: Use saved boolean first
      return loc.inOffice 
        ? (
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="group/link text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full ml-1 flex items-center inline-flex hover:bg-primary/20 transition-colors" title="View on Mappls">
            <MapPin className="w-2.5 h-2.5 mr-1" /> Office 
          </a>
        )
        : (
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="group/link text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full ml-1 flex items-center inline-flex hover:bg-amber-200 transition-colors" title={`View on Mappls - ${distanceText} away`}>
            <Globe className="w-2.5 h-2.5 mr-1" /> Remote {distanceText}
          </a>
        );
  }

  return (
    <div className="space-y-8 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Overview</h2>
          <p className="text-slate-500 mt-1">Welcome back, <span className="font-semibold text-primary">{currentUser?.name}</span>. Here's your daily summary.</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Notification Bell (Moved from Sidebar) */}
            <div className="relative z-50" ref={notifRef}>
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="h-10 w-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:text-primary hover:bg-primary/10 transition-all shadow-sm relative"
                >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-red-500 border-2 border-white animate-pulse"></span>
                    )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 z-[100] overflow-hidden animate-in fade-in zoom-in-95 origin-top-right ring-1 ring-black/5">
                        <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Notifications</h4>
                            {notifications.length > 0 && (
                                <button onClick={handleClearAllNotifications} className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                                    <Trash2 className="w-3 h-3"/> Clear All
                                </button>
                            )}
                        </div>
                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                                    <div className="bg-slate-50 p-3 rounded-full mb-2">
                                        <Bell className="w-6 h-6 opacity-30" />
                                    </div>
                                    <p className="text-xs font-medium">No new notifications</p>
                                </div>
                            ) : (
                                notifications.map(notif => (
                                    <div 
                                        key={notif.id} 
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!notif.read ? 'bg-blue-50/40' : ''}`}
                                    >
                                        <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${!notif.read ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-transparent'}`}></div>
                                        <div>
                                            <p className={`text-sm leading-snug ${!notif.read ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{notif.message}</p>
                                            <p className="text-[10px] text-slate-400 mt-1.5 font-medium">{new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Date Picker Button */}
            <div className="relative group cursor-pointer flex-1 md:w-auto" onClick={showPicker}>
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                <Calendar className="w-4 h-4 text-primary" />
                </div>
                <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="full-click-date block w-full md:w-40 pl-10 pr-8 py-2.5 bg-white rounded-full shadow-sm border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer hover:bg-slate-50 hover:border-primary/30 transition-all"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none z-20">
                <ChevronDown className="w-3 h-3 text-primary/70" />
                </div>
            </div>
        </div>
      </div>

      {/* Notice Board Section */}
      {announcements.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-0.5 shadow-lg animate-in fade-in slide-in-from-top-2">
             <div className="bg-white/95 backdrop-blur-md rounded-[14px] p-4">
                 <div className="flex items-center gap-2 mb-3">
                     <Megaphone className="w-5 h-5 text-indigo-600 animate-pulse" />
                     <h3 className="font-bold text-indigo-900">Notice Board</h3>
                 </div>
                 <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                     {announcements.map(ann => (
                         <div key={ann.id} className={`p-3 rounded-xl border flex items-start gap-3 ${
                             ann.type === 'urgent' ? 'bg-red-50 border-red-100' : 
                             ann.type === 'success' ? 'bg-green-50 border-green-100' : 
                             'bg-slate-50 border-slate-100'
                         }`}>
                             <Bell className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                 ann.type === 'urgent' ? 'text-red-500' : 
                                 ann.type === 'success' ? 'text-green-500' : 
                                 'text-slate-500'
                             }`} />
                             <div className="flex-1">
                                 <p className="text-sm font-medium text-slate-800">{ann.message}</p>
                                 <p className="text-[10px] text-slate-400 mt-1">{new Date(ann.createdAt).toLocaleDateString()} • Posted by {ann.createdBy}</p>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
          </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Time Card - Themed Gradient */}
        <Card className="lg:col-span-2 border-none shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] overflow-hidden relative group flex flex-col">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-primary/60"></div>
          {/* Glassy overlay blobs */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-colors duration-500"></div>
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          
          <CardContent className="p-10 md:p-14 flex-1 flex flex-col md:flex-row items-center justify-between text-center md:text-left relative z-10">
             <div>
                <p className="text-primary-foreground/80 font-medium text-lg mb-1">Current Time</p>
                <div className="text-6xl md:text-7xl font-bold tabular-nums tracking-tight text-white drop-shadow-md">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  <span className="text-2xl md:text-3xl text-primary-foreground/70 ml-2 font-normal">
                    {currentTime.toLocaleTimeString([], { second: '2-digit' }).split(':')[0]}
                  </span>
                </div>
                <div className="flex flex-col gap-1 mt-4">
                    <p className="text-primary-foreground/80 flex items-center justify-center md:justify-start gap-2">
                        <Clock className="w-5 h-5" /> {Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </p>
                    
                    {/* Location Status Badge */}
                    <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                         {locationStatus === 'loading' && (
                             <span className="flex items-center text-xs bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white border border-white/10">
                                 <RefreshCw className="w-3 h-3 mr-2 animate-spin" /> Locating...
                             </span>
                         )}
                         {locationStatus === 'success' && (
                             <span className="flex items-center text-xs bg-emerald-400/30 backdrop-blur-md px-3 py-1 rounded-full text-white border border-emerald-300/30 font-bold">
                                 <MapPin className="w-3 h-3 mr-2" /> {officeName} ({distance}m)
                             </span>
                         )}
                         {locationStatus === 'out-of-range' && (
                             <div className="flex flex-col items-start gap-1">
                                 <span className="flex items-center text-xs bg-amber-500/30 backdrop-blur-md px-3 py-1 rounded-full text-amber-50 border border-amber-300/30 font-bold">
                                     <Globe className="w-3 h-3 mr-2" /> Remote ({distance}m away)
                                 </span>
                             </div>
                         )}
                         {(locationStatus === 'denied' || locationStatus === 'error') && (
                             <div className="flex flex-col items-start gap-1">
                                 <span className="flex items-center text-xs bg-slate-800/30 backdrop-blur-md px-3 py-1 rounded-full text-slate-100 border border-slate-400/30 font-bold">
                                     <AlertTriangle className="w-3 h-3 mr-2" /> GPS Error
                                 </span>
                             </div>
                         )}
                         <button onClick={handleRetryAndUpdateLocation} className="text-[10px] text-white/70 hover:text-white underline decoration-dotted ml-1" title="Mark Territory / Retry">
                            Retry
                         </button>
                    </div>
                </div>
             </div>
             
             <div className="mt-8 md:mt-0 relative flex flex-col items-center gap-4">
                {/* Mood Selector - Only Show Before Punching In */}
                {!attendance && isToday && (
                    <div className="flex gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-full border border-white/20 mb-2">
                        {[
                            { id: 'happy', icon: '😄', label: 'Great' },
                            { id: 'energetic', icon: '⚡', label: 'Energetic' },
                            { id: 'neutral', icon: '😐', label: 'Okay' },
                            { id: 'tired', icon: '😴', label: 'Tired' },
                            { id: 'stressed', icon: '🤯', label: 'Stressed' }
                        ].map((mood) => (
                            <button
                                key={mood.id}
                                onClick={() => setSelectedMood(mood.id)}
                                className={`h-8 w-8 flex items-center justify-center rounded-full transition-all text-lg
                                    ${selectedMood === mood.id ? 'bg-white shadow-md scale-110' : 'hover:bg-white/20 opacity-70 hover:opacity-100'}`}
                                title={mood.label}
                            >
                                {mood.icon}
                            </button>
                        ))}
                    </div>
                )}

                {!attendance ? (
                  <button 
                    onClick={handlePunchIn}
                    disabled={punching || !isToday}
                    className={`group relative flex items-center justify-center w-40 h-40 rounded-full backdrop-blur-md border-4 transition-all duration-300 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] cursor-pointer hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed ${punchButtonColor}`}
                  >
                    <div className="flex flex-col items-center text-white">
                      {punching ? <RefreshCw className="w-12 h-12 animate-spin mb-2"/> : <PunchIcon className="w-12 h-12 fill-current mb-2" />}
                      <span className="font-bold tracking-wide text-sm">{punching ? 'Processing...' : punchButtonText}</span>
                    </div>
                  </button>
                ) : isPunchedIn ? (
                  <button 
                    onClick={handlePunchOut}
                    disabled={punching || !isToday}
                    className={`group relative flex items-center justify-center w-40 h-40 rounded-full backdrop-blur-md border-4 transition-all duration-300 cursor-pointer hover:scale-105 disabled:opacity-70 disabled:cursor-not-allowed ${punchButtonColor}`}
                  >
                     <div className="flex flex-col items-center text-white">
                      {punching ? <RefreshCw className="w-10 h-10 animate-spin mb-2"/> : <PunchIcon className="w-10 h-10 fill-current mb-2" />}
                      <span className="font-bold tracking-wide text-sm">{punching ? 'Processing...' : punchButtonText}</span>
                    </div>
                  </button>
                ) : (
                  <div className="w-40 h-40 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center flex-col text-white">
                    <span className="text-3xl">🎉</span>
                    <span className="font-bold mt-2 text-sm">DONE</span>
                  </div>
                )}
             </div>
          </CardContent>
        </Card>

        {/* Stats & Pulse Column */}
        <div className="flex flex-col gap-6 h-full">
            {/* Today Stats */}
            <Card className="flex flex-col justify-center border-white/60 bg-white/60 backdrop-blur-xl shadow-xl flex-1">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-slate-700">
                    <Activity className="w-5 h-5 text-primary" />
                    {isToday ? "Today's Stats" : "History Stats"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center space-y-4">
                    <div className="p-3 bg-white/80 rounded-xl border border-primary/20 shadow-sm flex justify-between items-center">
                        <div>
                             <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Current Mood</span>
                             <span className="text-2xl">{getMoodEmoji(attendance?.mood)}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Status</span>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize
                                ${isPunchedIn ? 'bg-green-100 text-green-700 ring-1 ring-green-200' : isPunchedOut ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'bg-slate-100 text-slate-600'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${isPunchedIn ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                {isPunchedIn ? 'Active' : isPunchedOut ? 'Done' : 'Idle'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white/80 rounded-xl border border-primary/20 shadow-sm">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Started</span>
                        <div className="text-base font-bold text-slate-800 mt-1">
                            {attendance?.punchIn ? new Date(attendance.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </div>
                        </div>
                        <div className="p-3 bg-white/80 rounded-xl border border-primary/20 shadow-sm">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Hours</span>
                        <div className="text-base font-bold text-primary mt-1">
                            {workingDisplay}
                        </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Team Pulse Widget */}
            <Card className="flex flex-col border-white/60 bg-white/60 backdrop-blur-xl shadow-lg flex-1 overflow-hidden">
                <CardHeader className="pb-2 pt-4">
                    <CardTitle className="flex items-center gap-2 text-slate-700 text-sm">
                        <Users className="w-4 h-4 text-primary" /> Team Pulse
                        <span className="ml-auto text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{onlineColleagues.length} Active</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto max-h-[150px] custom-scrollbar px-4 pb-2">
                    {onlineColleagues.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4 italic">No other teammates online.</p>
                    ) : (
                        <div className="space-y-2">
                            {onlineColleagues.map(colleague => (
                                <div key={colleague.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/80 transition-colors group">
                                    <div className="relative flex-shrink-0">
                                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-300">
                                            {colleague.mood ? getMoodEmoji(colleague.mood) : colleague.name.charAt(0)}
                                        </div>
                                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-center">
                                            <p className="text-xs font-bold text-slate-700 truncate">{colleague.name}</p>
                                            {colleague.statusEmoji && <span className="text-xs">{colleague.statusEmoji}</span>}
                                        </div>
                                        <div className="flex justify-between items-center mt-0.5">
                                            <p className="text-[10px] text-slate-400">In at {new Date(colleague.punchIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                            {colleague.status && <p className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 truncate max-w-[80px]">{colleague.status}</p>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>

      {/* Weekly Activity Chart */}
      <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-5 h-5 text-indigo-500" />
              <h3 className="text-lg font-bold text-slate-800">Weekly Activity</h3>
          </div>
          <Card className="border border-slate-100 shadow-sm bg-white/70 backdrop-blur-sm">
              <CardContent className="p-6">
                  <div className="flex items-end justify-between h-40 gap-2 md:gap-4">
                      {weeklyStats.map((stat, idx) => {
                          const heightPct = Math.min(100, (stat.hours / 12) * 100); // Assume 12h max for visuals
                          return (
                              <div key={idx} className="flex flex-col items-center justify-end h-full flex-1 group">
                                  <div className="relative w-full flex justify-center items-end h-full">
                                      <div 
                                          className={`w-full max-w-[30px] rounded-t-lg transition-all duration-1000 ease-out relative group-hover:opacity-80
                                            ${stat.isToday ? 'bg-primary' : 'bg-slate-300'}`}
                                          style={{ height: `${heightPct || 5}%` }}
                                      >
                                          {/* Tooltip */}
                                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                              {stat.hours} hrs
                                          </div>
                                      </div>
                                  </div>
                                  <span className={`text-[10px] font-bold mt-2 uppercase ${stat.isToday ? 'text-primary' : 'text-slate-400'}`}>
                                      {stat.day}
                                  </span>
                              </div>
                          )
                      })}
                  </div>
              </CardContent>
          </Card>
      </div>

      {/* Daily Work Log Section - Visible when punched in or punched out */}
      {(isPunchedIn || isPunchedOut) && isToday && (
        <div className="bg-white/70 backdrop-blur-md border border-primary/20 rounded-2xl p-6 shadow-sm animate-in slide-in-from-bottom-4 mt-8 relative overflow-hidden">
            
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-primary" />
                    Today's Work Log
                </h3>
                {isPunchedIn && (
                    <div className="flex gap-2">
                        <Button 
                            onClick={handleSaveLog} 
                            disabled={isSavingLog}
                            size="sm" 
                            variant="secondary" 
                            className="bg-white border border-slate-200 text-slate-600 text-xs h-8"
                        >
                           {isSavingLog ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : null}
                           {isSavingLog ? 'Saving...' : 'Save Draft'}
                        </Button>
                    </div>
                )}
            </div>
            <textarea 
                className="w-full min-h-[100px] p-4 rounded-xl bg-white border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none text-slate-700 text-sm leading-relaxed transition-all placeholder:text-slate-400"
                placeholder={isPunchedIn ? "What are you working on today? List your tasks here..." : "No work log submitted for today."}
                value={workLog}
                onChange={(e) => setWorkLog(e.target.value)}
                disabled={!isPunchedIn} // Read-only after punch out
            />
            <p className="text-xs text-slate-400 mt-2 flex justify-between">
                <span>{isPunchedIn ? "Don't forget to save your log." : "You have punched out. This log is finalized."}</span>
                <span>{workLog.length} chars</span>
            </p>
        </div>
      )}

      {/* Recent Activity Section */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-bold text-slate-800">Recent Activity</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.length === 0 ? (
                <div className="col-span-full p-8 text-center text-slate-400 bg-white/50 rounded-xl border border-dashed border-slate-300">
                    No recent history found.
                </div>
            ) : (
                history.map(rec => {
                    const workMin = rec.workingHours || 0;
                    const h = Math.floor(workMin / 60);
                    const m = workMin % 60;
                    
                    return (
                    <div key={rec.id} className="bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center hover:shadow-md transition-shadow">
                        <div>
                            <div className="font-bold text-slate-700">{new Date(rec.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}</div>
                            <div className="text-xs text-slate-500 mt-1 flex flex-col gap-0.5">
                                <div className="flex items-center">
                                    <span className="w-8 text-slate-400">In:</span> 
                                    {rec.punchIn ? new Date(rec.punchIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'} 
                                    {renderLocationBadge(rec.punchInLocation)}
                                </div>
                                <div className="flex items-center">
                                    <span className="w-8 text-slate-400">Out:</span>
                                    {rec.punchOut ? new Date(rec.punchOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                                    {rec.punchOut && renderLocationBadge(rec.punchOutLocation)}
                                </div>
                            </div>
                            {rec.workLog && (
                                <div className="mt-2 pt-2 border-t border-slate-100">
                                    <p className="text-[10px] text-slate-400 truncate max-w-[150px]" title={rec.workLog}>
                                        📝 {rec.workLog}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                             <div className="text-lg font-bold text-primary">{h}h {m}m</div>
                             <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Worked</div>
                        </div>
                    </div>
                    )
                })
            )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
