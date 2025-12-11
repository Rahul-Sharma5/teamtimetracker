
import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { updateEmployeeProfile } from '../services/firestore';
import { Play, Pause, RotateCcw, Brain, Coffee, Zap, BellOff, Volume2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

const FocusMode: React.FC = () => {
  const { currentUser } = useStore();
  
  // Timer Configuration
  const modes: Record<TimerMode, { label: string, minutes: number, color: string, ringColor: string, bg: string, icon: any, statusText: string, statusEmoji: string }> = {
    focus: { 
        label: 'Focus', 
        minutes: 25, 
        color: 'text-rose-500', 
        ringColor: 'stroke-rose-500',
        bg: 'bg-rose-50',
        icon: Brain,
        statusText: 'Deep Focus',
        statusEmoji: '🧠' 
    },
    shortBreak: { 
        label: 'Short Break', 
        minutes: 5, 
        color: 'text-emerald-600', 
        ringColor: 'stroke-emerald-500',
        bg: 'bg-emerald-50',
        icon: Coffee,
        statusText: 'Recharging',
        statusEmoji: '☕'
    },
    longBreak: { 
        label: 'Long Break', 
        minutes: 15, 
        color: 'text-blue-600', 
        ringColor: 'stroke-blue-500',
        bg: 'bg-blue-50',
        icon: Zap,
        statusText: 'On Break',
        statusEmoji: '🔋'
    }
  };

  const [currentMode, setCurrentMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(modes.focus.minutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  // Audio refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = async () => {
    if (!currentUser) return;

    if (!isActive) {
      // STARTING
      setIsActive(true);
      const modeConfig = modes[currentMode];
      await updateEmployeeProfile(currentUser.id, {
          currentStatus: modeConfig.statusText,
          currentStatusEmoji: modeConfig.statusEmoji
      });
    } else {
      // PAUSING
      setIsActive(false);
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(modes[currentMode].minutes * 60);
  };

  const handleModeChange = (mode: TimerMode) => {
    setIsActive(false);
    setCurrentMode(mode);
    setTimeLeft(modes[mode].minutes * 60);
  };

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Timer Finished
      if (timerRef.current) clearInterval(timerRef.current);
      setIsActive(false);
      
      if (currentMode === 'focus') {
          setSessionCount(prev => prev + 1);
      }
      
      // Reset Status
      if(currentUser) {
          updateEmployeeProfile(currentUser.id, {
              currentStatus: 'Available',
              currentStatusEmoji: '👋'
          });
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, currentMode]);

  const progress = ((modes[currentMode].minutes * 60 - timeLeft) / (modes[currentMode].minutes * 60)) * 100;
  const CurrentIcon = modes[currentMode].icon;
  const activeConfig = modes[currentMode];

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] w-full max-w-4xl mx-auto px-4 animate-in fade-in zoom-in-95 duration-500">
       
       <div className="text-center space-y-3 mb-10">
           <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-slate-100 mb-2">
                <BellOff className="w-6 h-6 text-slate-400" />
           </div>
           <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Focus Zone</h2>
           <p className="text-slate-500 text-sm md:text-base font-medium">Select a mode to automatically update your status.</p>
       </div>

       <Card className="w-full max-w-lg bg-white/80 backdrop-blur-xl border-white/50 shadow-2xl overflow-visible relative">
           {/* Decorative blurred glow behind card */}
           <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] rounded-full blur-[100px] opacity-20 -z-10 transition-colors duration-700 ${currentMode === 'focus' ? 'bg-rose-400' : currentMode === 'shortBreak' ? 'bg-emerald-400' : 'bg-blue-400'}`}></div>

           <div className="p-8 flex flex-col items-center">
               
               {/* Segmented Mode Control */}
               <div className="flex p-1.5 bg-slate-100/80 rounded-2xl mb-10 w-full relative">
                   {(Object.keys(modes) as TimerMode[]).map((m) => (
                       <button
                           key={m}
                           onClick={() => handleModeChange(m)}
                           className={`relative flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 z-10 ${
                               currentMode === m 
                               ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' 
                               : 'text-slate-400 hover:text-slate-600'
                           }`}
                       >
                           {modes[m].label}
                       </button>
                   ))}
               </div>

               {/* Timer Visual */}
               <div className="relative w-64 h-64 md:w-72 md:h-72 mb-10 flex items-center justify-center">
                   {/* Background Circle */}
                   <svg className="w-full h-full transform -rotate-90">
                       <circle
                           cx="50%"
                           cy="50%"
                           r="45%"
                           stroke="currentColor"
                           strokeWidth="8"
                           fill="transparent"
                           className="text-slate-100"
                       />
                       {/* Progress Circle */}
                       <circle
                           cx="50%"
                           cy="50%"
                           r="45%"
                           stroke="currentColor"
                           strokeWidth="8"
                           fill="transparent"
                           strokeDasharray="283%" // Approx 2 * PI * 45
                           strokeDashoffset={`${283 * (1 - progress / 100)}%`}
                           strokeLinecap="round"
                           className={`transition-all duration-1000 ease-linear ${activeConfig.ringColor}`}
                       />
                   </svg>

                   {/* Center Content */}
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <div className={`p-3 rounded-full mb-3 transition-colors duration-500 ${activeConfig.bg} bg-opacity-50`}>
                            <CurrentIcon className={`w-8 h-8 transition-colors duration-500 ${activeConfig.color}`} />
                       </div>
                       <div className="text-6xl md:text-7xl font-black text-slate-800 tracking-tighter tabular-nums leading-none">
                           {formatTime(timeLeft)}
                       </div>
                       <p className={`text-xs font-bold uppercase tracking-widest mt-3 transition-colors duration-300 ${isActive ? 'text-slate-800' : 'text-slate-400'}`}>
                           {isActive ? 'Session Active' : 'Ready to Start'}
                       </p>
                   </div>
               </div>

               {/* Controls */}
               <div className="flex items-center gap-6 w-full justify-center">
                   <Button
                       variant="ghost"
                       onClick={resetTimer}
                       className="h-14 w-14 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all"
                       title="Reset Timer"
                   >
                       <RotateCcw className="w-6 h-6" />
                   </Button>

                   <Button
                       onClick={toggleTimer}
                       className={`h-20 w-20 rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-all active:scale-95 ${isActive ? 'bg-white text-slate-800 border-2 border-slate-100 hover:bg-slate-50' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                   >
                       {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                   </Button>
                   
                   <div className="h-14 w-14 flex items-center justify-center rounded-full text-slate-300">
                        <Volume2 className="w-6 h-6" />
                   </div>
               </div>
           </div>
       </Card>

       {/* Daily Stats */}
       <div className="mt-8 flex items-center gap-3 animate-in slide-in-from-bottom-2 fade-in duration-700">
           <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
               <span className="flex items-center justify-center w-8 h-8 bg-rose-100 text-rose-600 rounded-full text-sm font-bold">
                   {sessionCount}
               </span>
               <span className="text-sm font-bold text-slate-600">Focus Sessions Completed</span>
           </div>
       </div>

    </div>
  );
};

export default FocusMode;
    