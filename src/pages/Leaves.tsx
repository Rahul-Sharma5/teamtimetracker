
import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { applyLeave, getLeaves, getEmployees, requestLeaveCancellation } from '../services/firestore';
import { LeaveRecord, Employee } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CalendarOff, Plus, CalendarDays, FileText, UserCheck, X, Clock, Check, Briefcase, Calendar, ChevronDown, RotateCcw, Loader2, AlertCircle } from 'lucide-react';

const Leaves: React.FC = () => {
  const { currentUser } = useStore();
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [targetLeaveId, setTargetLeaveId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  
  // Form State
  const [reason, setReason] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [toWhom, setToWhom] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayType, setHalfDayType] = useState<'first' | 'second'>('first');

  const fetchData = async () => {
    if (currentUser) {
      // CRITICAL: Only show leaves for the CURRENT user
      const data = await getLeaves(currentUser.id);
      const sorted = data.sort((a, b) => new Date(b.dateFrom).getTime() - new Date(a.dateFrom).getTime());
      setLeaves(sorted);

      // Fetch potential approvers
      const allEmployees = await getEmployees();
      let potentialApprovers: Employee[] = [];

      // Logic: Managers can only send requests to Admin. Employees can send to Manager or Admin.
      if (currentUser.role === 'Manager') {
          potentialApprovers = allEmployees.filter(e => e.role === 'Admin');
      } else {
          potentialApprovers = allEmployees.filter(e => e.role === 'Manager' || e.role === 'Admin');
      }
      // Filter out self just in case an Admin is viewing
      setManagers(potentialApprovers.filter(e => e.id !== currentUser.id));
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !toWhom) {
        alert("Please select a reporting manager.");
        return;
    }

    const duration = calculateDuration();
    if (duration <= 0) {
        alert("Please select valid dates.");
        return;
    }

    setIsSubmitting(true);
    try {
        const selectedManager = managers.find(m => m.name === toWhom);
        const approverId = selectedManager?.id;

        await applyLeave(
            currentUser.id, 
            currentUser.name, 
            dateFrom, 
            isHalfDay ? dateFrom : dateTo, // Ensure dateTo is correct even if not synced in state
            reason, 
            toWhom, 
            isHalfDay, 
            halfDayType,
            approverId
        );
        
        // Reset and hide form
        setReason('');
        setDateFrom('');
        setDateTo('');
        setToWhom('');
        setIsHalfDay(false);
        setHalfDayType('first');
        setShowForm(false);
        
        // Refresh local list
        await fetchData();
    } catch (err) {
        console.error("Submission error:", err);
        alert("Failed to submit leave request.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleOpenCancelModal = (leaveId: string) => {
      setTargetLeaveId(leaveId);
      setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!currentUser || !targetLeaveId) return;
    
    setIsCancelling(targetLeaveId);
    try {
        await requestLeaveCancellation(targetLeaveId, currentUser.name);
        setCancelModalOpen(false);
        setTargetLeaveId(null);
        await fetchData();
    } catch (e) {
        console.error("Cancellation request error:", e);
        alert("Failed to request cancellation.");
    } finally {
        setIsCancelling(null);
    }
  };

  const calculateDuration = () => {
    if (isHalfDay) return 0.5;
    if (!dateFrom || !dateTo) return 0;
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    if (end < start) return 0;
    const diff = end.getTime() - start.getTime();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    return days + 1;
  };

  const totalDays = calculateDuration();
  const totalApprovedLeaves = leaves.filter(l => l.status === 'approved').length;
  const annualAllowance = 24; 
  const remainingLeaves = Math.max(0, annualAllowance - totalApprovedLeaves);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Leave Balance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none shadow-lg shadow-primary/20">
                <CardContent className="p-6 flex flex-col justify-between h-full">
                     <div className="flex justify-between items-start">
                         <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                             <Briefcase className="w-6 h-6 text-white" />
                         </div>
                         <span className="text-primary-foreground/80 text-xs font-bold uppercase tracking-wider">Annual Quota</span>
                     </div>
                     <div className="mt-4">
                         <span className="text-4xl font-bold">{annualAllowance}</span>
                         <span className="text-sm font-medium text-primary-foreground/80 ml-2">Days</span>
                     </div>
                </CardContent>
           </Card>

           <Card className="bg-white border-slate-100 shadow-sm">
                <CardContent className="p-6 flex flex-col justify-between h-full">
                     <div className="flex justify-between items-start">
                         <div className="p-2 bg-blue-50 rounded-xl">
                             <Check className="w-6 h-6 text-blue-600" />
                         </div>
                         <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Approved / Used</span>
                     </div>
                     <div className="mt-4">
                         <span className="text-4xl font-bold text-slate-800">{totalApprovedLeaves}</span>
                         <span className="text-sm font-medium text-slate-400 ml-2">Days</span>
                     </div>
                </CardContent>
           </Card>

           <Card className="bg-white border-slate-100 shadow-sm">
                <CardContent className="p-6 flex flex-col justify-between h-full">
                     <div className="flex justify-between items-start">
                         <div className="p-2 bg-amber-50 rounded-xl">
                             <Calendar className="w-6 h-6 text-amber-600" />
                         </div>
                         <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Remaining</span>
                     </div>
                     <div className="mt-4">
                         <span className="text-4xl font-bold text-amber-600">{remainingLeaves}</span>
                         <span className="text-sm font-medium text-slate-400 ml-2">Days</span>
                     </div>
                </CardContent>
           </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">My Leave History</h2>
          <p className="text-slate-500">View and manage your personal leave requests.</p>
        </div>
        <Button 
          onClick={() => setShowForm(!showForm)} 
          className={`${showForm ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' : 'bg-gradient-to-r from-primary to-primary/90 hover:to-primary text-white shadow-lg shadow-primary/30'} transition-all rounded-xl px-6 py-4 font-bold border-none h-12`}
        >
          {showForm ? (
            <><X className="mr-2 h-4 w-4" /> Close Form</>
          ) : (
            <><Plus className="mr-2 h-4 w-4" /> Apply New Leave</>
          )}
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/20 bg-white/80 backdrop-blur-sm shadow-xl animate-in fade-in slide-in-from-top-4">
          <CardHeader>
            <CardTitle className="text-slate-800">New Leave Request Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Leave Duration</label>
                 <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setIsHalfDay(false)}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 font-bold text-sm transition-all flex items-center justify-center ${!isHalfDay ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-transparent bg-white text-slate-500 hover:bg-slate-100'}`}
                    >
                        <CalendarDays className="w-4 h-4 mr-2" /> Full Day(s)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsHalfDay(true)}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 font-bold text-sm transition-all flex items-center justify-center ${isHalfDay ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'border-transparent bg-white text-slate-500 hover:bg-slate-100'}`}
                    >
                        <Clock className="w-4 h-4 mr-2" /> Half Day
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {!isHalfDay ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 flex items-center">
                        <CalendarDays className="w-4 h-4 mr-2 text-primary" /> From Date
                      </label>
                      <input 
                        required={!isHalfDay}
                        type="date" 
                        className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 flex items-center">
                        <CalendarDays className="w-4 h-4 mr-2 text-primary" /> To Date
                      </label>
                      <input 
                        required={!isHalfDay}
                        type="date" 
                        className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 flex items-center">
                        <CalendarDays className="w-4 h-4 mr-2 text-primary" /> Date
                      </label>
                      <input 
                        required={isHalfDay}
                        type="date" 
                        className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                        value={dateFrom}
                        onChange={(e) => {
                            setDateFrom(e.target.value);
                            setDateTo(e.target.value); // Sync internally
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-primary" /> Session
                      </label>
                      <div className="relative">
                         <select
                            className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm appearance-none font-medium"
                            value={halfDayType}
                            onChange={(e) => setHalfDayType(e.target.value as 'first' | 'second')}
                         >
                            <option value="first">First Half (Morning)</option>
                            <option value="second">Second Half (Afternoon)</option>
                         </select>
                         <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                             <ChevronDown className="w-4 h-4" />
                         </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {totalDays > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-primary uppercase tracking-wide">Total Leave Duration</span>
                    <span className="text-sm font-bold text-slate-800 bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-100">
                        {totalDays} Day{totalDays !== 1 ? 's' : ''}
                    </span>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-primary" /> Reason
                </label>
                <textarea 
                  required
                  className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm resize-none"
                  placeholder="Why are you taking this leave?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center">
                  <UserCheck className="w-4 h-4 mr-2 text-primary" /> Reporting Manager
                </label>
                <div className="relative">
                    <select 
                      required
                      className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm appearance-none font-medium text-slate-700"
                      value={toWhom}
                      onChange={(e) => setToWhom(e.target.value)}
                    >
                        <option value="" disabled>Select Reporting Manager</option>
                        {managers.map(mgr => (
                            <option key={mgr.id} value={mgr.name}>{mgr.name}</option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                        <ChevronDown className="w-4 h-4" />
                    </div>
                </div>
            </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-primary to-primary/80 hover:to-primary text-white px-8 py-6 rounded-xl font-bold shadow-lg shadow-primary/30 active:scale-95 border-none h-14">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2"/> : null}
                  Submit Request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {leaves.length === 0 ? (
          <div className="text-center py-16 text-slate-400 bg-white/50 rounded-2xl border border-dashed border-slate-300">
            <CalendarOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No leave history found.</p>
            <p className="text-sm">Requests you submit will appear here.</p>
          </div>
        ) : (
          leaves.map((leave) => (
            <div key={leave.id} className="group bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white shadow-sm hover:shadow-md transition-all duration-200 flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 text-xs rounded-full font-bold uppercase tracking-wide
                      ${leave.status === 'approved' ? 'bg-green-100 text-green-700' : 
                        leave.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                        leave.status === 'cancel_requested' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                        leave.status === 'cancelled' ? 'bg-slate-100 text-slate-500' :
                        'bg-amber-100 text-amber-700'}`}>
                      {leave.status === 'cancel_requested' ? 'Cancellation Pending' : leave.status}
                    </span>
                    
                    {leave.isHalfDay && (
                        <span className="flex items-center px-2 py-1 text-[10px] rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-100">
                            <Clock className="w-3 h-3 mr-1" /> 
                            Half Day ({leave.halfDayType === 'first' ? 'Morning' : 'Afternoon'})
                        </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{leave.reason}</h3>
                  
                  {leave.adminResponse && (
                      <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                          <span className="font-bold text-slate-500 text-xs uppercase block mb-1">Manager Note</span>
                          <span className="text-slate-700">{leave.adminResponse}</span>
                      </div>
                  )}

                  <div className="text-sm text-slate-500 flex flex-wrap gap-x-6 gap-y-2 mt-2">
                    <span className="flex items-center">
                        <CalendarDays className="w-4 h-4 mr-1 text-slate-400" /> 
                        {leave.isHalfDay 
                           ? new Date(leave.dateFrom).toLocaleDateString() 
                           : `${new Date(leave.dateFrom).toLocaleDateString()} - ${new Date(leave.dateTo).toLocaleDateString()}`
                        }
                    </span>
                    <span className="flex items-center"><UserCheck className="w-4 h-4 mr-1 text-slate-400" /> Approver: {leave.toWhom}</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end justify-center md:pl-6 md:border-l border-slate-100 gap-2">
                   {(leave.status === 'approved' || leave.status === 'pending') && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-white text-red-500 border-red-100 hover:bg-red-50 h-9 rounded-lg font-bold text-xs"
                            onClick={() => handleOpenCancelModal(leave.id)}
                            disabled={isCancelling === leave.id}
                        >
                            {isCancelling === leave.id ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : <RotateCcw className="w-3 h-3 mr-1" />}
                            Request Cancel
                        </Button>
                   )}
                   <div className="hidden md:flex flex-col items-end">
                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Applied On</span>
                        <span className="text-sm font-medium text-slate-700">{new Date(leave.appliedOn).toLocaleDateString()}</span>
                   </div>
                </div>
            </div>
          ))
        )}
      </div>

      {/* Modern Cancellation Confirmation Modal */}
      {cancelModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-sm">
              <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
                  <div className="flex flex-col items-center text-center">
                      <div className="h-14 w-14 bg-red-100 rounded-full flex items-center justify-center mb-4 ring-4 ring-white shadow-sm">
                          <RotateCcw className="h-7 w-7 text-red-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">Cancel Leave Request?</h3>
                      <p className="text-slate-500 mb-6 text-sm font-medium leading-relaxed">
                          This request will be sent to your manager for approval. The leave will be revoked once they confirm.
                      </p>
                      <div className="flex gap-3 w-full">
                          <Button 
                            onClick={() => { setCancelModalOpen(false); setTargetLeaveId(null); }} 
                            variant="ghost" 
                            className="flex-1 text-slate-500 hover:bg-slate-100 rounded-xl font-bold"
                          >
                              No, Keep it
                          </Button>
                          <Button 
                            onClick={handleConfirmCancel} 
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg border-none font-bold h-12"
                          >
                              {isCancelling ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Yes, Request Cancel'}
                          </Button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Leaves;
