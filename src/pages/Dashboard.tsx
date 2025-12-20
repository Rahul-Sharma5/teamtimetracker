
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { getAttendanceByDate, punchIn, punchOut, getWeeklyAttendance, getCompanySettings, updateWorkLog, getAnnouncements, getTodayTeamAttendance, getEmployees } from '../services/firestore';
import { AttendanceRecord, CompanySettings, LocationData, Announcement } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Play, Square, Clock, Calendar, Activity, History, MapPin, AlertTriangle, RefreshCw, Globe, ChevronDown, FileText, Megaphone, Users, BarChart2, Navigation, MapPinOff } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { currentUser } = useStore();
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<{day: string, hours: number, date: string, isToday: boolean}[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [onlineColleagues, setOnlineColleagues] = useState<{
      name: string, 
      punchIn: string, 
      id: string, 
      status?: string, 
      statusEmoji?: string, 
      mood?: string,
      location?: LocationData 
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Mood State
  const [selectedMood, setSelectedMood] = useState('happy');

  // Date Filter State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Location State
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error' | 'out-of-range' | 'denied'>('loading');
  const [distance, setDistance] = useState<number>(0);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number, accuracy: number} | null>(null);
  const [showLocationAlert, setShowLocationAlert] = useState(false);

  // Work Log State
  const [workLog, setWorkLog] = useState('');
  const [isSavingLog, setIsSavingLog] = useState(false);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const record = await getAttendanceByDate(currentUser.id, selectedDate);
      const weeklyRaw = await getWeeklyAttendance(currentUser.id);
      const settings = await getCompanySettings();
      const announce = await getAnnouncements();
      
      const last7Days = [];
      for(let i=6; i>=0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const rec = weeklyRaw.find(r => r.date === dateStr);
          const hours = rec ? parseFloat((rec.workingHours / 60).toFixed(1)) : 0;
          last7Days.push({ day: d.toLocaleDateString(undefined, {weekday: 'short'}), hours: hours, date: dateStr, isToday: dateStr === selectedDate });
      }
      setWeeklyStats(last7Days);
      setHistory(weeklyRaw.slice(0, 5));

      const [todaysTeamAttendance, allEmployees] = await Promise.all([ getTodayTeamAttendance(), getEmployees() ]);

      setAttendance(record);
      setCompanySettings(settings);
      setAnnouncements(announce);
      
      const activeMap = new Map<string, {time: string, mood?: string, location?: LocationData}>(); 
      todaysTeamAttendance.forEach(r => { if (r.punchIn && !r.punchOut) { activeMap.set(r.employeeId, { time: r.punchIn, mood: r.mood, location: r.punchInLocation }); } });
      const empMap = new Map(allEmployees.map(e => [e.id, e]));
      const online = Array.from(activeMap.entries()).map(([id, data]) => {
          const emp = empMap.get(id);
          return { id, name: emp?.name || 'Unknown', punchIn: data.time, status: emp?.currentStatus, statusEmoji: emp?.currentStatusEmoji, mood: data.mood, location: data.location };
      }).filter(u => u.id !== currentUser.id);

      setOnlineColleagues(online);
      setWorkLog(record?.workLog || '');
    } catch (error) { console.error("Failed to fetch dashboard data", error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [currentUser, selectedDate]);
  
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

  const checkLocation = (isBackground: boolean = false) => {
    if (!navigator.geolocation) { setLocationStatus('error'); return; }
    if (!companySettings) return;
    setCheckingLocation(true);
    if (!isBackground) setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserCoords({ lat: latitude, lng: longitude, accuracy });
        const dist = calculateDistance(latitude, longitude, companySettings.latitude, companySettings.longitude);
        setDistance(Math.round(dist));
        setLocationStatus(dist <= companySettings.radius ? 'success' : 'out-of-range');
        setCheckingLocation(false);
      },
      (error) => {
        console.error(`Geo error: ${error.code}`);
        if (!isBackground) setLocationStatus(error.code === 1 ? 'denied' : 'error');
        setCheckingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const handleRefreshLocation = async () => {
      if (!navigator.geolocation) { alert("Geolocation is not supported"); return; }
      setCheckingLocation(true); setLocationStatus('loading');
      try {
          const freshSettings = await getCompanySettings(); setCompanySettings(freshSettings);
          navigator.geolocation.getCurrentPosition((position) => {
              const { latitude, longitude, accuracy } = position.coords;
              setUserCoords({ lat: latitude, lng: longitude, accuracy });
              if (freshSettings) {
                 const dist = calculateDistance(latitude, longitude, freshSettings.latitude, freshSettings.longitude);
                 setDistance(Math.round(dist));
                 setLocationStatus(dist <= freshSettings.radius ? 'success' : 'out-of-range');
              }
              setCheckingLocation(false);
          }, (error) => { setLocationStatus(error.code === 1 ? 'denied' : 'error'); setCheckingLocation(false); }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
      } catch (e) { console.error(e); setCheckingLocation(false); }
  };

  useEffect(() => {
      let intervalId: any;
      if (companySettings) { checkLocation(false); intervalId = setInterval(() => checkLocation(true), 10000); }
      return () => clearInterval(intervalId);
  }, [companySettings]);

  const getLocationPayload = async (): Promise<LocationData | undefined> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(undefined); return; }
      getCompanySettings().then(settings => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
               const { latitude, longitude } = position.coords;
               let inOffice = settings ? calculateDistance(latitude, longitude, settings.latitude, settings.longitude) <= settings.radius : false;
               resolve({ lat: latitude, lng: longitude, inOffice });
            },
            (error) => { console.error(`Punch error: ${error.code}`); resolve(undefined); },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
      });
    });
  };

  const handlePunchIn = async () => {
    if (!currentUser) return;
    if (locationStatus === 'error' || locationStatus === 'denied') { setShowLocationAlert(true); return; }
    setPunching(true);
    try {
        const location = await getLocationPayload();
        if (!location) { setPunching(false); setShowLocationAlert(true); return; }
        await punchIn(currentUser.id, location, selectedMood);
        fetchData(); setWorkLog('');
    } catch (error) { console.error(error); } finally { setPunching(false); }
  };

  const handlePunchOut = async () => {
    if (!attendance || !attendance.punchIn) return;
    if (locationStatus === 'error' || locationStatus === 'denied') { setShowLocationAlert(true); return; }
    setPunching(true);
    try {
        const location = await getLocationPayload();
        if (!location) { setPunching(false); setShowLocationAlert(true); return; }
        await punchOut(attendance.id, attendance.punchIn, location, workLog);
        fetchData();
    } catch (error) { console.error(error); } finally { setPunching(false); }
  };
  
  const handleSaveLog = async () => {
      if (!attendance) return;
      setIsSavingLog(true);
      try { await updateWorkLog(attendance.id, workLog); } catch (error) { console.error(error); } finally { setIsSavingLog(false); }
  };

  const handleDateClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    try { dateInputRef.current?.showPicker(); } catch (err) {}
  };

  const getMoodEmoji = (mood?: string) => {
      switch(mood) { case 'happy': return '😄'; case 'energetic': return '⚡'; case 'neutral': return '😐'; case 'tired': return '😴'; case 'stressed': return '🤯'; default: return '😐'; }
  };

  if (loading) return <div className="p-8 text-slate-500 animate-pulse">Loading dashboard data...</div>;

  const isPunchedIn = attendance && attendance.punchIn && !attendance.punchOut;
  const isPunchedOut = attendance && attendance.punchOut;
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  let punchButtonColor = ""; let punchButtonText = ""; let punchButtonIcon = null;

  if (locationStatus === 'success') {
      punchButtonColor = isPunchedIn ? "bg-red-500/20 border-red-200/40 hover:bg-red-500/30" : "bg-white/20 border-white/30 hover:bg-white/30 hover:border-white/60";
      punchButtonText = isPunchedIn ? "PUNCH OUT" : "PUNCH IN";
      punchButtonIcon = isPunchedIn ? Square : Play;
  } else if (locationStatus === 'out-of-range') {
      punchButtonColor = isPunchedIn ? "bg-red-500/20 border-red-200/40 hover:bg-red-500/30" : "bg-amber-500/20 border-amber-300/40 hover:bg-amber-500/30 hover:border-amber-300/60";
      punchButtonText = isPunchedIn ? "OUT (REMOTE)" : "IN (REMOTE)";
      punchButtonIcon = isPunchedIn ? Square : Globe;
  } else {
      punchButtonColor = "bg-slate-500/20 border-slate-400/30 hover:bg-slate-500/30";
      punchButtonText = isPunchedIn ? "OUT (NO GPS)" : "IN (NO GPS)";
      punchButtonIcon = isPunchedIn ? Square : AlertTriangle;
  }
  if (!isToday) { punchButtonColor = "bg-slate-100/20 border-slate-200/20 opacity-50 cursor-not-allowed"; punchButtonText = "HISTORY VIEW"; }

  let workingDisplay = "0h 0m";
  if (attendance?.workingHours) { workingDisplay = `${Math.floor(attendance.workingHours / 60)}h ${attendance.workingHours % 60}m`; }
  const PunchIcon = punchButtonIcon || Play;

  return (
    <div className="space-y-8 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-3xl font-bold tracking-tight text-slate-900">Overview</h2><p className="text-slate-500 mt-1">Welcome back, <span className="font-semibold text-primary">{currentUser?.name}</span>.</p></div>
        <div className="flex items-center gap-4 w-full md:w-auto"><div className="relative group cursor-pointer flex-1 md:w-auto" onClick={handleDateClick}><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20"><Calendar className="w-4 h-4 text-primary" /></div><input ref={dateInputRef} type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="full-click-date block w-full md:w-40 pl-10 pr-8 py-2.5 bg-white rounded-full shadow-sm border border-slate-200 text-sm font-bold text-slate-700 focus:outline-none cursor-pointer" /><div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none z-20"><ChevronDown className="w-3 h-3 text-primary/70" /></div></div></div>
      </div>

      {announcements.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-0.5 shadow-lg animate-in fade-in slide-in-from-top-2"><div className="bg-white/95 backdrop-blur-md rounded-[14px] p-4"><div className="flex items-center gap-2 mb-3"><Megaphone className="w-5 h-5 text-indigo-600 animate-pulse" /><h3 className="font-bold text-indigo-900">Notice Board</h3></div><div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">{announcements.map(ann => (<div key={ann.id} className={`p-3 rounded-xl border flex items-start gap-3 ${ann.type === 'urgent' ? 'bg-red-50 border-red-100' : ann.type === 'success' ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-100' }`}><Megaphone className={`w-4 h-4 mt-0.5 flex-shrink-0 ${ann.type === 'urgent' ? 'text-red-500' : ann.type === 'success' ? 'text-green-500' : 'text-slate-500'}`} /><div className="flex-1"><p className="text-sm font-medium text-slate-800">{ann.message}</p><p className="text-[10px] text-slate-400 mt-1">{new Date(ann.createdAt).toLocaleDateString()} • {ann.createdBy}</p></div></div>))}</div></div></div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] overflow-hidden relative group flex flex-col"><div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-primary/60"></div><div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div><div className="absolute -left-20 -bottom-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div><CardContent className="p-10 md:p-14 flex-1 flex flex-col md:flex-row items-center justify-between text-center md:text-left relative z-10"><div><p className="text-primary-foreground/80 font-medium text-lg mb-1">Current Time</p><div className="text-6xl md:text-7xl font-bold tabular-nums tracking-tight text-white drop-shadow-md">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<span className="text-2xl md:text-3xl text-primary-foreground/70 ml-2 font-normal">{currentTime.toLocaleTimeString([], { second: '2-digit' }).split(':')[0]}</span></div><div className="flex flex-col gap-1 mt-4"><p className="text-primary-foreground/80 flex items-center justify-center md:justify-start gap-2"><Clock className="w-5 h-5" /> {Intl.DateTimeFormat().resolvedOptions().timeZone}</p><div className="flex flex-col items-center md:items-start gap-2 mt-2">{locationStatus === 'loading' && <span className="flex items-center text-xs bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white border border-white/10"><RefreshCw className="w-3 h-3 mr-2 animate-spin" /> Locating...</span>}{locationStatus === 'success' && <span className="flex items-center text-xs bg-emerald-400/30 backdrop-blur-md px-3 py-1 rounded-full text-white border border-emerald-300/30 font-bold shadow-sm"><MapPin className="w-3 h-3 mr-2" /> In Office ({distance}m)</span>}{locationStatus === 'out-of-range' && <span className="flex items-center text-xs bg-amber-500/30 backdrop-blur-md px-3 py-1 rounded-full text-amber-50 border border-amber-300/30 font-bold shadow-sm"><Globe className="w-3 h-3 mr-2" /> Remote ({distance > 1000 ? (distance/1000).toFixed(1) + 'km' : distance + 'm'})</span>}{(locationStatus === 'denied' || locationStatus === 'error') && <span className="flex items-center text-xs bg-slate-800/30 backdrop-blur-md px-3 py-1 rounded-full text-slate-100 border border-slate-400/30 font-bold shadow-sm"><AlertTriangle className="w-3 h-3 mr-2" /> GPS Error</span>}</div><button onClick={handleRefreshLocation} disabled={checkingLocation} className="text-[10px] text-white/70 hover:text-white underline decoration-dotted mt-2 flex items-center justify-center md:justify-start gap-1">{checkingLocation ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Retry GPS'}</button></div></div><div className="mt-8 md:mt-0 relative flex flex-col items-center gap-4">{!attendance && isToday && (<div className="flex gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-full border border-white/20 mb-2">{[ { id: 'happy', icon: '😄' }, { id: 'energetic', icon: '⚡' }, { id: 'neutral', icon: '😐' }, { id: 'tired', icon: '😴' }, { id: 'stressed', icon: '🤯' } ].map((m) => (<button key={m.id} onClick={() => setSelectedMood(m.id)} className={`h-8 w-8 flex items-center justify-center rounded-full transition-all text-lg ${selectedMood === m.id ? 'bg-white shadow-md scale-110' : 'hover:bg-white/20 opacity-70'}`}>{m.icon}</button>))}</div>)}{!attendance ? (<button onClick={handlePunchIn} disabled={punching || !isToday || locationStatus === 'loading'} className={`group relative flex items-center justify-center w-40 h-40 rounded-full backdrop-blur-md border-4 transition-all duration-300 shadow-xl cursor-pointer hover:scale-105 disabled:opacity-70 ${punchButtonColor}`}><div className="flex flex-col items-center text-white">{punching ? <RefreshCw className="w-12 h-12 animate-spin mb-2"/> : <PunchIcon className="w-12 h-12 fill-current mb-2" />}<span className="font-bold tracking-wide text-sm">{punching ? '...' : punchButtonText}</span></div></button>) : isPunchedIn ? (<button onClick={handlePunchOut} disabled={punching || !isToday} className={`group relative flex items-center justify-center w-40 h-40 rounded-full backdrop-blur-md border-4 transition-all duration-300 cursor-pointer hover:scale-105 disabled:opacity-70 ${punchButtonColor}`}><div className="flex flex-col items-center text-white">{punching ? <RefreshCw className="w-10 h-10 animate-spin mb-2"/> : <PunchIcon className="w-10 h-10 fill-current mb-2" />}<span className="font-bold tracking-wide text-sm">{punching ? '...' : punchButtonText}</span></div></button>) : (<div className="w-40 h-40 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center flex-col text-white"><span className="text-3xl">🎉</span><span className="font-bold mt-2 text-sm">DONE</span></div>)}</div></CardContent></Card>
        <div className="flex flex-col gap-6 h-full"><Card className="flex flex-col justify-center border-white/60 bg-white/60 backdrop-blur-xl shadow-xl flex-1"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-slate-700"><Activity className="w-5 h-5 text-primary" /> {isToday ? "Today" : "History"}</CardTitle></CardHeader><CardContent className="flex-1 flex flex-col justify-center space-y-4"><div className="p-3 bg-white/80 rounded-xl border border-primary/20 shadow-sm flex justify-between items-center"><div><span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Mood</span><span className="text-2xl">{getMoodEmoji(attendance?.mood)}</span></div><div className="text-right"><span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Status</span><span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${isPunchedIn ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{isPunchedIn ? 'Active' : isPunchedOut ? 'Done' : 'Idle'}</span></div></div><div className="grid grid-cols-2 gap-3"><div className="p-3 bg-white/80 rounded-xl border border-primary/20 shadow-sm"><span className="text-[10px] text-slate-500 font-bold uppercase">In</span><div className="text-base font-bold text-slate-800 mt-1">{attendance?.punchIn ? new Date(attendance.punchIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</div></div><div className="p-3 bg-white/80 rounded-xl border border-primary/20 shadow-sm"><span className="text-[10px] text-slate-500 font-bold uppercase">Time</span><div className="text-base font-bold text-primary mt-1">{workingDisplay}</div></div></div></CardContent></Card><Card className="flex flex-col border-white/60 bg-white/60 backdrop-blur-xl shadow-lg flex-1 overflow-hidden"><CardHeader className="pb-2 pt-4"><CardTitle className="flex items-center gap-2 text-slate-700 text-sm"><Users className="w-4 h-4 text-primary" /> Team Pulse</CardTitle></CardHeader><CardContent className="flex-1 overflow-y-auto max-h-[150px] custom-scrollbar px-4 pb-2">{onlineColleagues.length === 0 ? (<p className="text-xs text-slate-400 text-center py-4 italic">Quiet day...</p>) : (<div className="space-y-2">{onlineColleagues.map(c => (<div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/80 transition-colors"><div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 border border-slate-300">{c.mood ? getMoodEmoji(c.mood) : c.name.charAt(0)}</div><div className="min-w-0 flex-1"><p className="text-xs font-bold text-slate-700 truncate">{c.name}</p><p className="text-[10px] text-slate-400">In at {new Date(c.punchIn).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p></div></div>))}</div>)}</CardContent></Card></div>
      </div>

      <div className="mt-8"><div className="flex items-center gap-2 mb-4"><BarChart2 className="w-5 h-5 text-indigo-500" /><h3 className="text-lg font-bold text-slate-800">Weekly Activity</h3></div><Card className="border border-slate-100 shadow-sm bg-white/70 backdrop-blur-sm"><CardContent className="p-6"><div className="flex items-end justify-between h-40 gap-2 md:gap-4">{weeklyStats.map((stat, idx) => (<div key={idx} className="flex flex-col items-center justify-end h-full flex-1 group"><div className="relative w-full flex justify-center items-end h-full"><div className={`w-full max-w-[30px] rounded-t-lg transition-all duration-1000 ${stat.isToday ? 'bg-primary' : 'bg-slate-300'}`} style={{ height: `${Math.min(100, (stat.hours / 12) * 100) || 5}%` }}></div></div><span className={`text-[10px] font-bold mt-2 uppercase ${stat.isToday ? 'text-primary' : 'text-slate-400'}`}>{stat.day}</span></div>))}</div></CardContent></Card></div>

      {(isPunchedIn || isPunchedOut) && isToday && (
        <div className="bg-white/70 backdrop-blur-md border border-primary/20 rounded-2xl p-6 shadow-sm animate-in slide-in-from-bottom-4 mt-8"><div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold text-slate-800 flex items-center"><FileText className="w-5 h-5 mr-2 text-primary" />Today's Log</h3>{isPunchedIn && <Button onClick={handleSaveLog} disabled={isSavingLog} size="sm" variant="secondary" className="bg-white border border-slate-200 text-slate-600 text-xs h-8">{isSavingLog ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : 'Save Log'}</Button>}</div><textarea className="w-full min-h-[100px] p-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-none text-slate-700 text-sm placeholder:text-slate-400" placeholder="Summary of progress..." value={workLog} onChange={(e) => setWorkLog(e.target.value)} disabled={!isPunchedIn} /><p className="text-[10px] text-slate-400 mt-2 italic">{isPunchedIn ? "Drafts are saved locally." : "Log is finalized."}</p></div>
      )}

      {/* Standardized Viewport Centered Alert */}
      {showLocationAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-sm">
            <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
                <div className="flex flex-col items-center text-center">
                    <div className="h-14 w-14 bg-red-100 rounded-full flex items-center justify-center mb-4 ring-4 ring-white shadow-sm"><MapPinOff className="h-7 w-7 text-red-600" /></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Location Required</h3>
                    <p className="text-slate-500 mb-6 text-sm font-medium leading-relaxed">We cannot verify your workspace without GPS. Please enable location services.</p>
                    <div className="flex gap-3 w-full"><Button onClick={() => setShowLocationAlert(false)} variant="ghost" className="flex-1 text-slate-500 hover:bg-slate-100 rounded-xl">Cancel</Button><Button onClick={() => { setShowLocationAlert(false); handleRefreshLocation(); }} className="flex-1 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg border-none">Try Again</Button></div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
