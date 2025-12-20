
import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { getTasks, createTask, updateTask, updateTaskStatus, deleteTask, getEmployees, getTaskComments, addTaskComment } from '../services/firestore';
import { Task, Employee, TaskPriority, TaskStatus, TaskComment } from '../types';
import { Plus, Clock, CheckCircle2, User, Loader2, X, PlayCircle, Trash2, Calendar, Timer, Edit2, Search, ListFilter, AlertCircle, ChevronDown, MessageSquare, Send, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

// --- Components ---

interface TaskCardProps {
  task: Task;
  currentUser: Employee | null;
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, currentUser, onDelete, onEdit, onStatusChange }) => {
    const isUrgent = task.priority === 'urgent';
    const isAssigner = (currentUser?.id && task.assignedById === currentUser.id) || 
                       (currentUser?.name && task.assignedBy === currentUser.name);
    const isAdmin = currentUser?.role === 'Admin';
    const canManage = isAdmin || isAssigner;
    
    let durationString = '';
    let isOverdue = false;
    let dueString = '';

    if (task.status === 'completed' && task.completedAt && task.assignedDate) {
        const start = new Date(task.assignedDate);
        const end = new Date(task.completedAt);
        const diffMs = end.getTime() - start.getTime();
        if (diffMs > 0) {
            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            if (days > 0) durationString = `${days}d ${hours}h`;
            else if (hours > 0) durationString = `${hours}h ${minutes}m`;
            else durationString = `${minutes}m`;
        } else {
            durationString = '< 1m';
        }
    } else if (task.dueDate) {
        const today = new Date();
        const dueEnd = new Date(task.dueDate);
        dueEnd.setHours(23, 59, 59, 999);
        if (today > dueEnd) isOverdue = true;
        dueString = new Date(task.dueDate).toLocaleDateString(undefined, {month:'short', day:'numeric'});
    } else {
        dueString = new Date(task.assignedDate).toLocaleDateString(undefined, {month:'short', day:'numeric'});
    }

    let statusColor = "bg-slate-100 text-slate-500 border-slate-200";
    let StatusIcon = Clock;
    let progress = 0;

    if (task.status === 'processing') {
        statusColor = "bg-blue-100 text-blue-600 border-blue-200";
        StatusIcon = Loader2;
        progress = 50;
    } else if (task.status === 'completed') {
        statusColor = "bg-emerald-100 text-emerald-600 border-emerald-200";
        StatusIcon = CheckCircle2;
        progress = 100;
    }

    return (
        <Card className={`relative overflow-hidden border-slate-200 bg-white/70 backdrop-blur-md shadow-sm hover:shadow-md transition-all group flex flex-col ${task.status === 'completed' ? 'opacity-90' : ''}`}>
             {isUrgent && <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 z-10 pointer-events-none"></div>}
             {isOverdue && task.status !== 'completed' && !isUrgent && <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 z-10 pointer-events-none"></div>}
             <div className="p-5 flex items-start gap-3 relative z-20">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-inner border transition-colors flex-shrink-0 ${statusColor}`}>
                        <StatusIcon className={`w-5 h-5 ${task.status === 'processing' ? 'animate-spin' : ''}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                             {isUrgent && <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase bg-red-100 text-red-600 border border-red-200">Urgent</span>}
                             {isOverdue && task.status !== 'completed' && <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase bg-amber-100 text-amber-700 border border-amber-200">Overdue</span>}
                        </div>
                        <h3 className={`font-bold text-slate-800 text-base leading-tight truncate pr-2 ${task.status === 'completed' ? 'line-through text-slate-500' : ''}`}>{task.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                             <span className="inline-flex items-center text-xs text-slate-500 font-medium"><User className="w-3 h-3 mr-1" /> {task.assignedToName.split(' ')[0]}</span>
                        </div>
                    </div>
                </div>
             </div>
             <div className="px-5 pb-4 space-y-3 flex-1 relative z-20">
                <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-wrap">{task.description}</p>
                <div className="mt-2">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide"><span>Progress</span><span>{progress}%</span></div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ease-out ${task.status === 'completed' ? 'bg-emerald-500' : task.status === 'processing' ? 'bg-blue-500' : 'bg-slate-300'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
                <div className="pt-2 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider border-t border-slate-50 mt-2">
                    {task.status === 'completed' ? <span className="flex items-center text-emerald-600 mt-2"><Timer className="w-3.5 h-3.5 mr-1.5" /> Duration: {durationString}</span> : <span className={`flex items-center mt-2 ${isOverdue ? 'text-amber-600' : ''}`}><Calendar className="w-3.5 h-3.5 mr-1.5" /> {task.dueDate ? 'Due: ' : 'Assigned: '} {dueString}</span>}
                </div>
             </div>
             <div className="px-5 pb-5 pt-2 mt-auto relative z-20 flex flex-col gap-3">
                 <div>
                     {task.status === 'pending' && <Button onClick={() => onStatusChange(task.id, 'processing')} className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-xl font-bold shadow-sm h-10 text-xs">Start Task</Button>}
                     {task.status === 'processing' && <Button onClick={() => onStatusChange(task.id, 'completed')} className="w-full bg-primary hover:bg-primary/90 text-white border-none rounded-xl font-bold shadow-lg shadow-primary/20 h-10 text-xs">Complete Task</Button>}
                     {task.status === 'completed' && <div className="w-full py-2.5 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-xl border border-slate-100 uppercase tracking-wide">Task Finished</div>}
                 </div>
                 <div className="flex gap-2 pt-2 border-t border-slate-100">
                     <Button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(task); }} className="flex-1 bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 rounded-xl font-bold text-xs h-9">{canManage ? 'Edit / View' : 'View Details'}</Button>
                     {canManage && <Button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(task.id); }} className="w-12 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-xl h-9 flex items-center justify-center transition-colors"><Trash2 className="w-4 h-4" /></Button>}
                 </div>
             </div>
        </Card>
    );
};

interface TaskSectionProps {
    title: string; count: number; tasks: Task[]; icon: any; colorClass: string; emptyMsg: string; currentUser: Employee | null; onDelete: (id: string) => void; onEdit: (task: Task) => void; onStatusChange: (id: string, status: TaskStatus) => void;
}

const TaskSection: React.FC<TaskSectionProps> = ({ title, count, tasks, icon: Icon, colorClass, emptyMsg, currentUser, onDelete, onEdit, onStatusChange }) => (
      <section className="flex flex-col gap-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 px-1">
               <div className={`p-2 rounded-xl shadow-sm ${colorClass}`}><Icon className="w-5 h-5" /></div>
               <h3 className="font-bold text-slate-800 text-xl tracking-tight">{title}</h3>
               <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-md border border-slate-200">{count}</span>
               <div className="h-px bg-slate-200 flex-1 ml-4 opacity-70"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {tasks.length > 0 ? tasks.map((t: Task) => ( <TaskCard key={t.id} task={t} currentUser={currentUser} onDelete={onDelete} onEdit={onEdit} onStatusChange={onStatusChange} /> )) : <div className="col-span-full text-center py-10 text-slate-400 bg-white/40 rounded-3xl border border-dashed border-slate-300/60 backdrop-blur-sm"><p className="text-sm font-medium italic">{emptyMsg}</p></div>}
          </div>
      </section>
);

const Tasks: React.FC = () => {
  const { currentUser } = useStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFilter, setViewFilter] = useState<'all' | 'my'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'normal' | 'urgent'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'due'>('newest');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => { fetchData(); }, [currentUser]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allTasks, allEmployees] = await Promise.all([ getTasks(), getEmployees() ]);
      setTasks(allTasks);
      setEmployees(allEmployees);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleOpenCreate = () => {
      setEditingTask(null); setTitle(''); setDesc(''); setAssignedTo(currentUser?.role === 'Employee' ? currentUser.id : ''); setPriority('normal'); setDueDate(''); setComments([]); setIsModalOpen(true);
  };

  const handleEdit = async (task: Task) => {
      setEditingTask(task); setTitle(task.title); setDesc(task.description); setAssignedTo(task.assignedTo); setPriority(task.priority); setDueDate(task.dueDate || ''); setIsModalOpen(true);
      setLoadingComments(true);
      try { const comms = await getTaskComments(task.id); setComments(comms); } catch(e) { console.error(e); } finally { setLoadingComments(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !assignedTo) return;
    setIsSubmitting(true);
    try {
      const assignee = employees.find(e => e.id === assignedTo);
      if (!assignee) return;
      const commonData = { title, description: desc, assignedTo: assignee.id, assignedToName: assignee.name, priority, dueDate: dueDate || null };
      if (editingTask) { await updateTask(editingTask.id, commonData); } 
      else { await createTask({ ...commonData, assignedBy: currentUser.name, assignedById: currentUser.id }); }
      setIsModalOpen(false); setEditingTask(null); await fetchData();
    } catch (e) { console.error(e); alert("Failed to save task."); } finally { setIsSubmitting(false); }
  };

  const handlePostComment = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!newComment.trim() || !editingTask || !currentUser) return;
      try {
          const comment = { taskId: editingTask.id, userId: currentUser.id, userName: currentUser.name, content: newComment, createdAt: new Date().toISOString() };
          await addTaskComment(comment);
          setComments(prev => [...prev, { ...comment, id: 'temp-'+Date.now() }]);
          setNewComment('');
          const updated = await getTaskComments(editingTask.id); setComments(updated);
      } catch(e) { console.error(e); }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if(!currentUser) return;
    const now = new Date().toISOString();
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, completedAt: newStatus === 'completed' ? now : (t.status === 'completed' ? undefined : t.completedAt) } : t));
    try { await updateTaskStatus(taskId, newStatus, currentUser.id); fetchData(); } catch(e) { console.error(e); fetchData(); }
  };

  const handleDelete = (taskId: string) => { setTaskToDelete(taskId); setIsDeleteModalOpen(true); };

  const confirmDelete = async () => {
      if (!taskToDelete) return;
      const previousTasks = [...tasks];
      setTasks(prev => prev.filter(t => t.id !== taskToDelete));
      setIsDeleteModalOpen(false);
      try { await deleteTask(taskToDelete); } catch(e) { console.error(e); setTasks(previousTasks); } finally { setTaskToDelete(null); }
  };

  const filteredTasks = tasks.filter(t => {
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          if (!t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q) && !t.assignedToName.toLowerCase().includes(q)) return false;
      }
      if (viewFilter === 'my') { if (t.assignedTo !== currentUser?.id && t.assignedById !== currentUser?.id) return false; }
      if (priorityFilter !== 'all') { if (t.priority !== priorityFilter) return false; }
      if (currentUser?.role === 'Employee' && viewFilter === 'all') { if (t.assignedTo !== currentUser.id && t.assignedById !== currentUser.id) return false; }
      return true;
  }).sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime();
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 8640000000000000;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 8640000000000000;
      return dateA - dateB;
  });

  const assignableUsers = employees.filter(e => {
      if (!currentUser) return false;
      if (currentUser.role === 'Admin') return e.role === 'Manager' || e.role === 'Employee';
      if (currentUser.role === 'Manager') return e.role === 'Employee';
      return false; 
  });

  return (
    <div className="flex flex-col max-w-full">
      <div className="flex flex-col gap-6 mb-8 flex-shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div><h2 className="text-3xl font-bold tracking-tight text-slate-900">Task Board</h2><p className="text-slate-500 text-sm">Organize and track team assignments.</p></div>
            {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
                <Button onClick={handleOpenCreate} className="bg-gradient-to-r from-primary to-primary/80 hover:to-primary text-white rounded-xl px-6 py-3 font-bold shadow-lg border-none w-full md:w-auto"><Plus className="w-4 h-4 mr-2" /> Assign Task</Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span><div className="text-2xl font-bold text-slate-800">{filteredTasks.length}</div></div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending</span><div className="text-2xl font-bold text-blue-600">{filteredTasks.filter(t => t.status !== 'completed').length}</div></div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Done</span><div className="text-2xl font-bold text-emerald-600">{filteredTasks.filter(t => t.status === 'completed').length}</div></div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm text-center"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Urgent</span><div className="text-2xl font-bold text-red-500">{filteredTasks.filter(t => t.priority === 'urgent' && t.status !== 'completed').length}</div></div>
          </div>
          <div className="flex flex-col lg:flex-row gap-3 bg-white/50 p-2 rounded-2xl border border-slate-200/50 backdrop-blur-sm">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input type="text" placeholder="Search tasks..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm" /></div>
              <div className="flex gap-2"><div className="relative"><select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as any)} className="h-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none appearance-none cursor-pointer"><option value="all">Priority</option><option value="normal">Normal</option><option value="urgent">Urgent</option></select><AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" /></div><div className="relative"><select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="h-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none appearance-none cursor-pointer"><option value="newest">Newest</option><option value="due">Due Date</option></select><ListFilter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" /></div></div>
          </div>
      </div>

      <div className="space-y-12 pb-20 md:pb-10">
           <TaskSection title="Pending" count={filteredTasks.filter(t => t.status === 'pending').length} tasks={filteredTasks.filter(t => t.status === 'pending')} icon={Clock} colorClass="bg-slate-100 text-slate-600" emptyMsg="No pending tasks." currentUser={currentUser} onDelete={handleDelete} onEdit={handleEdit} onStatusChange={handleStatusChange} />
           <TaskSection title="In Progress" count={filteredTasks.filter(t => t.status === 'processing').length} tasks={filteredTasks.filter(t => t.status === 'processing')} icon={Loader2} colorClass="bg-blue-100 text-blue-600" emptyMsg="No active tasks." currentUser={currentUser} onDelete={handleDelete} onEdit={handleEdit} onStatusChange={handleStatusChange} />
           <TaskSection title="Completed" count={filteredTasks.filter(t => t.status === 'completed').length} tasks={filteredTasks.filter(t => t.status === 'completed')} icon={CheckCircle2} colorClass="bg-emerald-100 text-emerald-600" emptyMsg="No completed tasks." currentUser={currentUser} onDelete={handleDelete} onEdit={handleEdit} onStatusChange={handleStatusChange} />
      </div>

      {/* Viewport Centered Modals */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-sm">
           <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
              <div className="flex flex-col items-center text-center">
                 <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mb-4"><Trash2 className="h-6 w-6 text-red-600" /></div>
                 <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Task?</h3>
                 <p className="text-slate-500 mb-6 text-sm">This action cannot be undone.</p>
                 <div className="flex gap-3 w-full">
                    <Button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-bold">Cancel</Button>
                    <Button onClick={confirmDelete} className="flex-1 bg-red-600 text-white hover:bg-red-700 border-none py-3 rounded-xl font-bold shadow-md shadow-red-100">Delete</Button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col">
             <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
             <h3 className="text-xl font-bold text-slate-900 mb-1">{editingTask ? 'Task Details' : 'New Task'}</h3>
             <p className="text-slate-500 text-sm mb-6">{editingTask ? 'Review or modify work items.' : 'Assign work to your team.'}</p>
             <form onSubmit={handleSubmit} className="space-y-4">
                 <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Title</label><input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-bold text-slate-900" placeholder="Summary" /></div>
                 <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Description</label><textarea required value={desc} onChange={e => setDesc(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm resize-none h-32 font-medium text-slate-900" placeholder="Full task notes..." /></div>
                 <div className="grid grid-cols-2 gap-4">
                     <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Assignee</label><div className="relative"><select required value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-bold text-slate-900 appearance-none bg-white"><option value="">User</option>{assignableUsers.map(u => (<option key={u.id} value={u.id}>{u.name}</option>))}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" /></div></div>
                     <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Priority</label><div className="flex p-1 bg-slate-100 rounded-xl"><button type="button" onClick={() => setPriority('normal')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${priority === 'normal' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}>Low</button><button type="button" onClick={() => setPriority('urgent')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${priority === 'urgent' ? 'bg-red-500 shadow text-white' : 'text-slate-400'}`}>Urgent</button></div></div>
                 </div>
                 <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Due Date</label><div className="relative"><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-3 pl-10 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm font-bold text-slate-900 bg-white" /><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /></div></div>
                 <div className="pt-4 flex gap-3"><Button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 py-3 rounded-xl font-bold">Close</Button><Button type="submit" disabled={isSubmitting} className="flex-[2] bg-primary hover:bg-primary/90 text-white py-3 rounded-xl font-bold shadow-lg border-none">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Save Task'}</Button></div>
             </form>
             {editingTask && (
                 <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
                     <div className="flex items-center gap-2 text-slate-800 font-bold text-sm"><MessageSquare className="w-4 h-4 text-indigo-500" /> Activity Feed</div>
                     <div className="bg-slate-50 rounded-xl p-4 max-h-40 overflow-y-auto custom-scrollbar flex flex-col gap-3">{loadingComments ? <div className="text-center text-xs text-slate-400 py-2">Loading...</div> : comments.length === 0 ? <div className="text-center text-[10px] text-slate-400 italic py-2">No activity recorded.</div> : comments.map(c => (<div key={c.id} className="flex flex-col gap-1"><div className="flex justify-between items-baseline"><span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">{c.userName}</span><span className="text-[8px] text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</span></div><div className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">{c.content}</div></div>))}</div>
                     <form onSubmit={handlePostComment} className="flex gap-2"><input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Type a note..." className="flex-1 p-2 rounded-lg border border-slate-200 text-xs outline-none" /><button type="submit" disabled={!newComment.trim()} className="bg-primary text-white p-2 rounded-lg disabled:opacity-50"><Send className="w-4 h-4" /></button></form>
                 </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
