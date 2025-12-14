
import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { getTodayBreaks, startBreak, endBreak } from '../services/firestore';
import { BreakRecord, BreakType } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Coffee, Utensils, Timer, ChevronRight, CheckCircle2 } from 'lucide-react';

interface BreakCardProps {
    type: BreakType;
    title: string;
    icon: React.ReactNode;
    limit: string;
    colorClass: string;
    breaks: BreakRecord[];
    onStart: (type: BreakType) => void;
    onEnd: (id: string, start: string) => void;
}

const BreakCard: React.FC<BreakCardProps> = ({ type, title, icon, limit, colorClass, breaks, onStart, onEnd }) => {
    const record = breaks.find(b => b.breakType === type);
    const activeBreak = breaks.find(b => !b.breakEnd);
    
    // Status Logic
    let status: 'completed' | 'active' | 'available' = 'available';
    if (record) {
        if (record.breakEnd) status = 'completed';
        else status = 'active';
    }

    return (
      <Card className={`relative overflow-hidden border-white/60 bg-white/60 backdrop-blur-xl shadow-lg transition-all duration-300 ${status === 'active' ? 'ring-2 ring-offset-2 ring-amber-400 transform scale-[1.02]' : 'hover:translate-y-1'}`}>
        <div className={`absolute top-0 left-0 w-full h-1.5 ${colorClass}`}></div>
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl bg-white border border-slate-100 shadow-sm ${status === 'active' ? 'animate-pulse ring-2 ring-amber-100' : ''}`}>
              {icon}
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Limit</span>
              <p className="text-lg font-bold text-slate-700">{limit}</p>
            </div>
          </div>

          <h3 className="text-xl font-bold text-slate-800 mb-1">{title}</h3>
          
          <div className="min-h-[24px] mb-6">
            {status === 'completed' ? (
               <span className="inline-flex items-center text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-md">
                 <CheckCircle2 className="w-4 h-4 mr-1.5" />
                 Completed ({record?.duration}m)
               </span>
            ) : status === 'active' ? (
               <span className="inline-flex items-center text-sm font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md animate-pulse">
                 <Timer className="w-4 h-4 mr-1.5" />
                 In Progress...
               </span>
            ) : (
               <span className="text-sm text-slate-400 font-medium">Ready to start</span>
            )}
          </div>

          {status === 'available' && (
            <Button 
              className="w-full bg-slate-800 text-white hover:bg-primary transition-colors rounded-xl py-5 font-medium shadow-md" 
              onClick={() => onStart(type)}
              disabled={!!activeBreak}
            >
              Start Break <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          )}

          {status === 'active' && record && (
            <Button 
              className="w-full bg-amber-500 hover:bg-amber-600 text-white border-none rounded-xl py-5 font-bold shadow-lg shadow-amber-200" 
              onClick={() => onEnd(record.id, record.breakStart)}
            >
              End Break Now
            </Button>
          )}

          {status === 'completed' && (
            <Button variant="secondary" disabled className="w-full bg-slate-100 text-slate-400 border-none rounded-xl py-5">
              Break Taken
            </Button>
          )}
        </CardContent>
      </Card>
    );
};

const Breaks: React.FC = () => {
  const { currentUser } = useStore();
  const [breaks, setBreaks] = useState<BreakRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBreaks = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await getTodayBreaks(currentUser.id);
      setBreaks(data);
    } catch (error) {
      console.error("Error fetching breaks", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBreaks();
  }, [currentUser]);

  const handleStartBreak = async (type: BreakType) => {
    if (!currentUser) return;
    await startBreak(currentUser.id, type);
    await fetchBreaks();
  };

  const handleEndBreak = async (breakId: string, start: string) => {
    await endBreak(breakId, start);
    await fetchBreaks();
  };

  const activeBreak = breaks.find(b => !b.breakEnd);

  if (loading) return <div className="p-8 text-slate-500 animate-pulse">Loading breaks...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Daily Breaks</h2>
        <p className="text-slate-500 max-w-2xl">
           Taking regular breaks improves productivity. Please adhere to the allocated times.
        </p>
      </div>

      {activeBreak && (
        <div className="bg-amber-50/80 backdrop-blur-sm border border-amber-200 rounded-2xl p-4 flex items-center shadow-sm animate-in slide-in-from-top-2">
          <div className="p-2 bg-amber-100 rounded-full mr-4">
             <Timer className="h-6 w-6 text-amber-600" />
          </div>
          <div>
             <h4 className="font-bold text-amber-800">Break in Progress</h4>
             <p className="text-sm text-amber-700">
                You are currently on a <span className="font-semibold capitalize">{activeBreak.breakType} break</span>. 
                Remember to end it when you return.
             </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <BreakCard 
           type="lunch" 
           title="Lunch Break" 
           icon={<Utensils className="h-6 w-6 text-emerald-500" />} 
           limit="60 min" 
           colorClass="bg-emerald-500"
           breaks={breaks}
           onStart={handleStartBreak}
           onEnd={handleEndBreak}
        />
        <BreakCard 
           type="short1" 
           title="Morning Break" 
           icon={<Coffee className="h-6 w-6 text-teal-500" />} 
           limit="15 min" 
           colorClass="bg-teal-500"
           breaks={breaks}
           onStart={handleStartBreak}
           onEnd={handleEndBreak}
        />
        <BreakCard 
           type="short2" 
           title="Afternoon Break" 
           icon={<Coffee className="h-6 w-6 text-lime-500" />} 
           limit="15 min" 
           colorClass="bg-lime-500"
           breaks={breaks}
           onStart={handleStartBreak}
           onEnd={handleEndBreak}
        />
      </div>
    </div>
  );
};

export default Breaks;
