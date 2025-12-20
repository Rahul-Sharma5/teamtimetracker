
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { getEmployees, createEmployee } from '../services/firestore';
import { Employee } from '../types';
import { Loader2, AlertTriangle, ShieldCheck, Search, Lock, X, ChevronRight, Users, UserPlus, Mail, CheckCircle2, Crown, ChevronDown, Palette, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface EmployeeCardProps {
  emp: Employee; idx: number; onClick: (emp: Employee) => void;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ emp, idx, onClick }) => {
  let roleIcon = <Users className="w-3 h-3 mr-1 text-slate-400"/>;
  let roleColor = "text-slate-400";
  let bgGradient = "hover:shadow-[0_8px_30px_rgba(100,116,139,0.15)]";
  if (emp.role === 'Admin') { roleIcon = <Crown className="w-3 h-3 mr-1 text-purple-500"/>; roleColor = "text-purple-600/70"; bgGradient = "hover:border-purple-400/50 hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)]"; } 
  else if (emp.role === 'Manager') { roleIcon = <ShieldCheck className="w-3 h-3 mr-1 text-primary"/>; roleColor = "text-primary/70"; bgGradient = "hover:border-primary/50 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]"; }

  return (
    <button onClick={() => onClick(emp)} className={`group relative flex items-center p-4 rounded-2xl transition-all duration-300 bg-white/80 backdrop-blur-xl border-2 border-white/50 shadow-sm hover:bg-white hover:-translate-y-1.5 active:scale-95 w-full text-left ${bgGradient}`} style={{ animationDelay: `${idx * 50}ms` }}>
        <div className={`relative z-10 h-14 w-14 rounded-2xl shadow-inner border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 ${emp.role === 'Admin' ? 'bg-purple-50 text-purple-700' : emp.role === 'Manager' ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-500'}`}>{emp.avatarUrl ? <img src={emp.avatarUrl} alt={emp.name} className="h-full w-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-xl">{emp.name.charAt(0)}</div>}</div>
        <div className="relative z-10 ml-4 flex-1 min-w-0"><h3 className="font-bold text-slate-900 text-lg truncate">{emp.name}</h3><p className={`text-[10px] font-bold uppercase tracking-wider flex items-center mt-1 ${roleColor}`}>{roleIcon}<span className="truncate">{emp.designation || emp.role}</span></p></div>
        <div className="relative z-10 ml-2 h-8 w-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all"><Lock className="w-4 h-4" /></div>
    </button>
  );
};

const SelectEmployee: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDesignation, setRegDesignation] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regRole, setRegRole] = useState('Employee');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { setCurrentUser, themeColor, setThemeColor } = useStore();
  const navigate = useNavigate();
  const passwordRef = useRef<HTMLInputElement>(null);

  const themeOptions = [ { id: 'emerald', color: 'bg-emerald-600' }, { id: 'blue', color: 'bg-blue-600' }, { id: 'violet', color: 'bg-violet-600' }, { id: 'rose', color: 'bg-rose-600' }, { id: 'amber', color: 'bg-amber-500' }, { id: 'slate', color: 'bg-slate-800' } ];

  useEffect(() => { fetchEmployees(); }, []);
  const fetchEmployees = async () => { setLoading(true); try { const data = await getEmployees(); setEmployees(data.filter(e => e.status !== 'inactive')); } catch (err: any) { setError(err.message || "Error"); } finally { setLoading(false); } };
  useEffect(() => { if (selectedEmployee && passwordRef.current) setTimeout(() => passwordRef.current?.focus(), 100); }, [selectedEmployee]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedEmployee) return;
    if (passwordInput === (selectedEmployee.password || '1234')) { setCurrentUser(selectedEmployee); navigate('/dashboard'); } 
    else { setLoginError('Incorrect passcode.'); setPasswordInput(''); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); if (!regName || !regPassword) return;
    setIsRegistering(true);
    if (employees.some(e => e.email.toLowerCase() === regEmail.toLowerCase())) { setError("Email registered."); setIsRegistering(false); return; }
    try {
        const isFirst = employees.length === 0; const role = isFirst ? 'Admin' : regRole;
        await createEmployee({ name: regName, role, email: regEmail || `${regName.toLowerCase().replace(/\s/g, '')}@teamtime.com`, designation: isFirst ? regDesignation : '', status: 'active', password: regPassword, joiningDate: new Date().toISOString().split('T')[0] });
        setShowRegisterModal(false); resetRegFields(); await fetchEmployees(); setSuccessMessage("Account created!"); setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error: any) { setError("Error"); } finally { setIsRegistering(false); }
  };

  const resetRegFields = () => { setRegName(''); setRegEmail(''); setRegDesignation(''); setRegPassword(''); setRegRole('Employee'); setShowRegPassword(false); };

  const filteredEmployees = employees.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const admins = filteredEmployees.filter(emp => emp.role === 'Admin');
  const managers = filteredEmployees.filter(emp => emp.role === 'Manager');
  const teamMembers = filteredEmployees.filter(emp => emp.role !== 'Manager' && emp.role !== 'Admin');

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none"><div className="absolute inset-0 bg-[radial-gradient(#80808012_1px,transparent_1px)] bg-[size:40px_40px]"></div></div>
      {successMessage && <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-xl font-bold">{successMessage}</div>}
      
      <div className="relative z-10 flex-1 flex flex-col items-center pt-16 pb-10 px-4 w-full max-w-7xl mx-auto">
        <div className="w-full flex justify-between absolute top-6 px-6"><div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-primary/20 shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-800">Secure Access</div><div className="flex gap-2"><Button onClick={() => setShowRegisterModal(true)} variant="outline" className="bg-white/60 font-bold rounded-xl h-10 border-primary/20 text-primary">Join Team</Button></div></div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 mb-6 text-center mt-8">Identify <span className="text-primary">Yourself</span></h1>
        <div className="w-full max-w-md mb-12 relative"><input type="text" className="block w-full pl-6 pr-4 py-4 bg-white/60 backdrop-blur-xl border-2 border-white rounded-2xl text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:border-primary/50 shadow-lg transition-all" placeholder="Find your profile..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        <div className="w-full flex flex-col gap-12 pb-12">
            {admins.length > 0 && <div className="space-y-4"><h2 className="text-sm font-black uppercase tracking-widest text-slate-400 ml-1">Admins</h2><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{admins.map((emp, idx) => (<EmployeeCard key={emp.id} emp={emp} idx={idx} onClick={setSelectedEmployee} />))}</div></div>}
            {managers.length > 0 && <div className="space-y-4"><h2 className="text-sm font-black uppercase tracking-widest text-slate-400 ml-1">Managers</h2><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{managers.map((emp, idx) => (<EmployeeCard key={emp.id} emp={emp} idx={idx} onClick={setSelectedEmployee} />))}</div></div>}
            {teamMembers.length > 0 && <div className="space-y-4"><h2 className="text-sm font-black uppercase tracking-widest text-slate-400 ml-1">People</h2><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{teamMembers.map((emp, idx) => (<EmployeeCard key={emp.id} emp={emp} idx={idx} onClick={setSelectedEmployee} />))}</div></div>}
        </div>
      </div>

      {/* Standardized Viewport Centered Modals */}
      {selectedEmployee && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-sm">
              <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 ring-1 ring-white/20 animate-in zoom-in-95">
                  <button onClick={() => setSelectedEmployee(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                  <div className="flex flex-col items-center">
                      <div className={`h-20 w-20 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold mb-4 ${selectedEmployee.role === 'Admin' ? 'bg-purple-50 text-purple-700' : 'bg-primary/10 text-primary'}`}>{selectedEmployee.avatarUrl ? <img src={selectedEmployee.avatarUrl} className="w-full h-full rounded-full object-cover" /> : selectedEmployee.name.charAt(0)}</div>
                      <h2 className="text-2xl font-bold text-slate-900">Hi, {selectedEmployee.name.split(' ')[0]}!</h2>
                      <form onSubmit={handleLogin} className="w-full mt-8 space-y-4"><input ref={passwordRef} type={showLoginPassword ? "text" : "password"} value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full px-6 py-4 rounded-xl bg-slate-50 border-2 border-transparent focus:border-primary text-slate-900 font-bold outline-none text-center tracking-widest text-xl" placeholder="••••" maxLength={10} />{loginError && <p className="text-red-500 text-xs font-bold text-center">{loginError}</p>}<Button type="submit" disabled={!passwordInput} className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-bold border-none text-lg">Unlock Workspace</Button></form>
                  </div>
              </div>
          </div>
      )}

      {showRegisterModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0f172a]/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 ring-1 ring-black/5 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowRegisterModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            <h3 className="text-2xl font-bold text-slate-900 text-center mb-8">Join the Workspace</h3>
            <form onSubmit={handleRegister} className="space-y-4">
              <input required type="text" className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-transparent text-slate-900 font-bold focus:bg-white focus:border-primary outline-none" placeholder="Full Name" value={regName} onChange={(e) => setRegName(e.target.value)} />
              <input type="email" required className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-transparent text-slate-900 font-bold focus:bg-white focus:border-primary outline-none" placeholder="Email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
              <div className="relative"><select required className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-transparent text-slate-900 font-bold focus:bg-white focus:border-primary outline-none appearance-none" value={regRole} onChange={(e) => setRegRole(e.target.value)}><option value="Employee">Employee</option><option value="Manager">Manager</option><option value="Admin">Admin</option></select><ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /></div>
              <div className="relative"><input required type={showRegPassword ? "text" : "password"} className="w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-transparent text-slate-900 font-bold focus:bg-white focus:border-primary outline-none" placeholder="Pin" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} /><button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
              <Button type="submit" disabled={isRegistering} className="w-full bg-primary text-white py-4 rounded-xl font-bold border-none">{isRegistering ? '...' : 'Create Account'}</Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectEmployee;
