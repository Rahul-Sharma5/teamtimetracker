
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { getEmployees, createEmployee } from '../services/firestore';
import { Employee } from '../types';
import { Loader2, AlertTriangle, ShieldCheck, Search, Lock, X, ChevronRight, Users, UserPlus, Mail, CheckCircle2, Crown, ChevronDown, Palette, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';

// Extracted EmployeeCard to fix type issues with 'key' prop
interface EmployeeCardProps {
  emp: Employee;
  idx: number;
  onClick: (emp: Employee) => void;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ emp, idx, onClick }) => {
  let roleIcon = <Users className="w-3 h-3 mr-1 text-slate-400"/>;
  let roleColor = "text-slate-400";
  let bgGradient = "hover:shadow-[0_8px_30px_rgba(100,116,139,0.15)]"; // Default gray shadow

  if (emp.role === 'Admin') {
    roleIcon = <Crown className="w-3 h-3 mr-1 text-purple-500"/>;
    roleColor = "text-purple-600/70";
    bgGradient = "hover:border-purple-400/50 hover:shadow-[0_8px_30px_rgba(168,85,247,0.15)]";
  } else if (emp.role === 'Manager') {
    roleIcon = <ShieldCheck className="w-3 h-3 mr-1 text-primary"/>;
    roleColor = "text-primary/70";
    bgGradient = "hover:border-primary/50 hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]";
  }

  return (
    <button
        onClick={() => onClick(emp)}
        className={`group relative flex items-center p-4 rounded-2xl transition-all duration-300 ease-out
                    bg-white/80 backdrop-blur-xl border-2 border-white/50 
                    shadow-[0_8px_30px_rgb(0,0,0,0.04)]
                    hover:bg-white hover:-translate-y-1.5 active:scale-95 overflow-hidden w-full text-left
                    ${bgGradient}`}
        style={{ animationDelay: `${idx * 50}ms` }}
    >
        {/* Avatar Container */}
        <div className={`relative z-10 h-14 w-14 rounded-2xl shadow-inner border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform duration-300 
          ${emp.role === 'Admin' ? 'bg-purple-50 text-purple-700' : emp.role === 'Manager' ? 'bg-primary/10 text-primary' : 'bg-slate-50 text-slate-500'}`}>
        {emp.avatarUrl ? (
            <img src={emp.avatarUrl} alt={emp.name} className="h-full w-full object-cover" />
        ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-xl">
                {emp.name.charAt(0)}
            </div>
        )}
        </div>

        {/* Info */}
        <div className="relative z-10 ml-4 flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-lg truncate group-hover:text-slate-700 transition-colors">
                {emp.name}
            </h3>
            
            <p className={`text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center mt-1 ${roleColor}`}>
                {roleIcon}
                <span className="truncate">{emp.designation || emp.role}</span>
            </p>
        </div>

        {/* Arrow Action */}
        <div className="relative z-10 ml-2 h-8 w-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          <Lock className="w-4 h-4" />
        </div>
    </button>
  );
};

const SelectEmployee: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Login Modal State
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  // Registration State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDesignation, setRegDesignation] = useState(''); // Only used for bootstrap admin
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regRole, setRegRole] = useState('Employee'); // Default
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Theme Selector State
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  
  // UI Success Message
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { setCurrentUser, themeColor, setThemeColor } = useStore();
  const navigate = useNavigate();
  const passwordRef = useRef<HTMLInputElement>(null);

  const themeOptions = [
    { id: 'emerald', label: 'Emerald', color: 'bg-emerald-600' },
    { id: 'blue', label: 'Blue', color: 'bg-blue-600' },
    { id: 'violet', label: 'Violet', color: 'bg-violet-600' },
    { id: 'rose', label: 'Rose', color: 'bg-rose-600' },
    { id: 'amber', label: 'Amber', color: 'bg-amber-500' },
    { id: 'slate', label: 'Dark', color: 'bg-slate-800' },
  ];

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getEmployees();
        // Filter out inactive employees at fetch level for this view
        setEmployees(data.filter(e => e.status !== 'inactive'));
      } catch (err: any) {
        console.error("Error fetching employees:", err);
        if (err?.code === 'permission-denied') {
          setError('permission-denied');
        } else {
          setError(err.message || "An unexpected error occurred.");
        }
      } finally {
        setLoading(false);
      }
  };

  // Auto-focus password input when modal opens
  useEffect(() => {
      if (selectedEmployee && passwordRef.current) {
          setTimeout(() => passwordRef.current?.focus(), 100);
      }
  }, [selectedEmployee]);

  const handleCardClick = (emp: Employee) => {
      setSelectedEmployee(emp);
      setPasswordInput('');
      setShowLoginPassword(false);
      setLoginError('');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    // Passwords match check (In a real app, compare hashes)
    const correctPassword = selectedEmployee.password || '1234';

    if (passwordInput === correctPassword) {
        setCurrentUser(selectedEmployee);
        navigate('/dashboard');
    } else {
        setLoginError('Incorrect passcode. Please try again.');
        setPasswordInput('');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regPassword) return;
    
    setIsRegistering(true);

    // UNIQUE EMAIL CHECK
    if (employees.some(e => e.email.toLowerCase() === regEmail.toLowerCase())) {
        setError("This email address is already registered. Please login.");
        setIsRegistering(false);
        return;
    }

    try {
        // If DB is empty, force Admin role.
        const isFirstUser = employees.length === 0;
        const roleToAssign = isFirstUser ? 'Admin' : regRole;

        const newEmp = {
            name: regName,
            role: roleToAssign,
            email: regEmail || `${regName.toLowerCase().replace(/\s/g, '')}@teamtime.com`,
            // If it's the first user (Admin), use input. Otherwise, empty string (manager assigns later).
            designation: isFirstUser ? regDesignation : '',
            status: 'active' as const,
            password: regPassword,
            joiningDate: new Date().toISOString().split('T')[0]
        };

        await createEmployee(newEmp);
        
        // Reset inputs
        setRegName('');
        setRegEmail('');
        setRegDesignation('');
        setRegPassword('');
        setRegRole('Employee');
        setShowRegPassword(false);
        
        // Close modal immediately
        setShowRegisterModal(false);
        
        // Re-fetch to show new user or login screen (Wait for it)
        await fetchEmployees();
        
        // Show success message
        setSuccessMessage(isFirstUser 
           ? "Administrator account created! You can now log in." 
           : "Account created successfully! Find your name below to log in."
        );
        
        // Auto-hide success message after 5s
        setTimeout(() => setSuccessMessage(null), 5000);

    } catch (error) {
        console.error("Failed to create account", error);
        setError("Failed to create account. Please check your connection.");
    } finally {
        setIsRegistering(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.designation && emp.designation.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group by Role Hierarchy
  const admins = filteredEmployees.filter(emp => emp.role === 'Admin');
  const managers = filteredEmployees.filter(emp => emp.role === 'Manager');
  const teamMembers = filteredEmployees.filter(emp => emp.role !== 'Manager' && emp.role !== 'Admin');

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="relative z-10 flex flex-col items-center bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white shadow-2xl">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-slate-600 font-bold tracking-wide">Loading TeamTime...</p>
        </div>
      </div>
    );
  }

  // --- EMPTY STATE / FIRST RUN SETUP ---
  if (employees.length === 0) {
      return (
        <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden p-4">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] opacity-70"></div>
            <div className="absolute top-[-10%] left-[-5%] w-[50vw] h-[50vw] bg-primary/20 rounded-full blur-[100px] animate-float mix-blend-multiply" />
            
            <div className="relative z-10 max-w-md w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white p-8 animate-in zoom-in-95 duration-500">
                <div className="text-center mb-8">
                    <div className="h-16 w-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <Crown className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900">Welcome to TeamTime</h1>
                    <p className="text-slate-500 mt-2">No users found. Create the <strong>System Administrator</strong> account to begin.</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Admin Name</label>
                        <input 
                            required
                            type="text" 
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-purple-500 focus:outline-none transition-all font-bold text-slate-900"
                            placeholder="Your Name"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email</label>
                         <input 
                            required
                            type="email" 
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-purple-500 focus:outline-none transition-all font-bold text-slate-900"
                            placeholder="admin@company.com"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                         />
                    </div>
                    <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Designation</label>
                         <input 
                            type="text" 
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-purple-500 focus:outline-none transition-all font-bold text-slate-900"
                            placeholder="System Admin"
                            value={regDesignation}
                            onChange={(e) => setRegDesignation(e.target.value)}
                         />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Create Passcode</label>
                        <div className="relative">
                            <input 
                                required
                                type={showRegPassword ? "text" : "password"}
                                className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-purple-500 focus:outline-none transition-all font-bold text-slate-900"
                                placeholder="••••"
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowRegPassword(!showRegPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                            >
                                {showRegPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    
                    <Button 
                        type="submit" 
                        disabled={isRegistering}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-bold shadow-lg shadow-purple-200 mt-4"
                    >
                        {isRegistering ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : "Create Administrator"}
                    </Button>
                </form>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col relative overflow-hidden font-sans">
      
      {/* 1. Background Pattern & Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] opacity-70"></div>
        <div className="absolute top-[-10%] left-[-5%] w-[50vw] h-[50vw] bg-primary/20 rounded-full blur-[100px] animate-float mix-blend-multiply" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[50vw] h-[50vw] bg-blue-400/20 rounded-full blur-[100px] animate-float mix-blend-multiply" style={{ animationDelay: '2s' }} />
      </div>

      {/* Success Toast */}
      {successMessage && (
         <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-10 fade-in duration-300">
             <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-emerald-500/30 flex items-center gap-3 font-bold">
                 <div className="bg-white/20 p-1 rounded-full"><CheckCircle2 className="w-5 h-5" /></div>
                 {successMessage}
             </div>
         </div>
      )}

      {/* Error Toast */}
      {error && (
         <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-10 fade-in duration-300">
             <div className="bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-red-500/30 flex items-center gap-3 font-bold">
                 <div className="bg-white/20 p-1 rounded-full"><AlertTriangle className="w-5 h-5" /></div>
                 {error}
             </div>
         </div>
      )}

      {/* 2. Header Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center pt-16 pb-10 px-4 sm:px-6 w-full max-w-7xl mx-auto">
        
        <div className="w-full flex justify-between items-start absolute top-6 px-6 max-w-7xl">
            <div className="bg-white/80 backdrop-blur-md px-5 py-2 rounded-full border border-primary/20 shadow-sm flex items-center gap-2 animate-fade-in">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-slate-800 tracking-widest uppercase">Secure Portal</span>
            </div>
            
            <div className="flex gap-2">
                {/* Theme Toggle Widget */}
                <div className="relative">
                    <button
                        onClick={() => setShowThemeSelector(!showThemeSelector)}
                        className="h-10 w-10 bg-white/60 backdrop-blur-md border border-primary/20 rounded-xl flex items-center justify-center text-primary shadow-sm hover:bg-primary/5 transition-all"
                        title="Change Theme"
                    >
                        <Palette className="w-5 h-5" />
                    </button>

                    {showThemeSelector && (
                        <div className="absolute top-12 right-0 bg-white/95 backdrop-blur-xl border border-slate-200 p-3 rounded-2xl shadow-xl animate-in fade-in zoom-in-95 flex flex-col gap-2 z-50 w-32">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-1">Theme</p>
                             <div className="grid grid-cols-3 gap-2">
                                {themeOptions.map((theme) => (
                                    <button
                                        key={theme.id}
                                        onClick={() => setThemeColor(theme.id)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${theme.color} ${
                                            themeColor === theme.id ? 'ring-2 ring-offset-2 ring-slate-400 scale-110 shadow-md' : 'hover:scale-110 opacity-80 hover:opacity-100'
                                        }`}
                                        title={theme.label}
                                    >
                                        {themeColor === theme.id && <Check className="w-3 h-3 text-white" />}
                                    </button>
                                ))}
                             </div>
                        </div>
                    )}
                </div>

                <Button 
                    onClick={() => setShowRegisterModal(true)}
                    variant="outline"
                    className="bg-white/60 backdrop-blur-md border-primary/20 text-primary hover:bg-primary/5 font-bold rounded-xl shadow-sm h-10"
                >
                    <UserPlus className="w-4 h-4 mr-2" /> Create Account
                </Button>
            </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-6 text-center drop-shadow-sm animate-fade-in mt-8">
          Who is <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-teal-500">checking in?</span>
        </h1>
        
        <p className="text-lg text-slate-600 font-medium max-w-2xl text-center mb-12 leading-relaxed animate-fade-in">
          Select your profile to sign in, or create a new account if you are joining the team.
        </p>

        {/* Search Bar */}
        <div className="w-full max-w-md mb-12 animate-fade-in relative group z-20">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
          </div>
          <input 
            type="text"
            className="block w-full pl-12 pr-4 py-4 bg-white/60 backdrop-blur-xl border-2 border-white rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 shadow-lg shadow-primary/5 transition-all"
            placeholder="Search for your name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* 3. Employee Cards Sections */}
        {filteredEmployees.length === 0 ? (
           <div className="text-center py-10 animate-fade-in">
             <p className="text-slate-400 font-medium">No employees found matching "{searchTerm}"</p>
           </div>
        ) : (
          <div className="w-full flex flex-col gap-12 pb-12">
            
            {/* Admins Layer */}
            {admins.length > 0 && (
                <div className="animate-fade-in space-y-4">
                    <div className="flex items-center gap-3 px-1">
                        <div className="p-2 bg-purple-100 rounded-xl shadow-sm">
                            <Crown className="w-5 h-5 text-purple-700" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Administrators</h2>
                        <div className="h-px bg-slate-200 flex-1 ml-4"></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {admins.map((emp, idx) => (
                            <EmployeeCard key={emp.id} emp={emp} idx={idx} onClick={handleCardClick} />
                        ))}
                    </div>
                </div>
            )}

            {/* Managers Layer */}
            {managers.length > 0 && (
                <div className="animate-fade-in space-y-4" style={{ animationDelay: '100ms' }}>
                    <div className="flex items-center gap-3 px-1">
                        <div className="p-2 bg-primary/10 rounded-xl shadow-sm">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Managers</h2>
                        <div className="h-px bg-slate-200 flex-1 ml-4"></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {managers.map((emp, idx) => (
                            <EmployeeCard key={emp.id} emp={emp} idx={idx} onClick={handleCardClick} />
                        ))}
                    </div>
                </div>
            )}

            {/* Team Members Layer */}
            {teamMembers.length > 0 && (
                <div className="animate-fade-in space-y-4" style={{ animationDelay: '200ms' }}>
                    <div className="flex items-center gap-3 px-1">
                        <div className="p-2 bg-blue-100 rounded-xl shadow-sm">
                            <Users className="w-5 h-5 text-blue-700" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Team Members</h2>
                        <div className="h-px bg-slate-200 flex-1 ml-4"></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {teamMembers.map((emp, idx) => (
                            <EmployeeCard key={emp.id} emp={emp} idx={idx} onClick={handleCardClick} />
                        ))}
                    </div>
                </div>
            )}

          </div>
        )}

        <div className="mt-auto pt-6 text-slate-400 text-sm font-medium">
          &copy; {new Date().getFullYear()} TeamTime Tracker &bull; v2.2
        </div>
      </div>

      {/* Login Modal */}
      {selectedEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedEmployee(null)}></div>
              
              <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-8 ring-1 ring-white/20">
                  <button 
                      onClick={() => setSelectedEmployee(null)}
                      className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                  >
                      <X className="w-5 h-5" />
                  </button>

                  <div className="flex flex-col items-center">
                      {/* Selected User Avatar */}
                      <div className={`h-20 w-20 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-2xl font-bold mb-4 ring-4 
                        ${selectedEmployee.role === 'Admin' ? 'bg-purple-50 text-purple-700 ring-purple-50' : selectedEmployee.role === 'Manager' ? 'bg-primary/10 text-primary ring-primary/10' : 'bg-slate-50 text-slate-500 ring-slate-50'}`}>
                          {selectedEmployee.avatarUrl ? 
                              <img src={selectedEmployee.avatarUrl} className="w-full h-full rounded-full object-cover" /> : 
                              selectedEmployee.name.charAt(0)
                          }
                      </div>
                      
                      <h2 className="text-2xl font-bold text-slate-900">Hello, {selectedEmployee.name.split(' ')[0]}!</h2>
                      <p className="text-slate-500 text-sm font-medium mt-1">Please enter your passcode to continue.</p>

                      <form onSubmit={handleLogin} className="w-full mt-8 space-y-4">
                          <div className="space-y-2">
                              <div className="relative">
                                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                  <input 
                                      ref={passwordRef}
                                      type={showLoginPassword ? "text" : "password"}
                                      value={passwordInput}
                                      onChange={(e) => setPasswordInput(e.target.value)}
                                      className={`w-full pl-12 pr-12 py-4 rounded-xl bg-slate-50 border-2 ${loginError ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-transparent focus:border-primary'} text-slate-900 font-bold placeholder-slate-400 focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all outline-none text-lg tracking-widest`}
                                      placeholder="••••"
                                      maxLength={20}
                                  />
                                  <button
                                      type="button"
                                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                  >
                                      {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                  </button>
                              </div>
                              {loginError && (
                                  <p className="text-red-500 text-xs font-bold ml-2 animate-in slide-in-from-left-2 flex items-center">
                                      <AlertTriangle className="w-3 h-3 mr-1" /> {loginError}
                                  </p>
                              )}
                          </div>

                          <Button 
                              type="submit" 
                              disabled={!passwordInput}
                              className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/30 text-lg flex items-center justify-center gap-2"
                          >
                              Unlock Dashboard <ChevronRight className="w-5 h-5" />
                          </Button>
                      </form>
                      
                      <p className="text-xs text-slate-400 mt-6 font-medium">
                         Default passcode is <span className="font-mono bg-slate-100 px-1 rounded">1234</span>
                      </p>
                  </div>
              </div>
          </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowRegisterModal(false)}></div>
          
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-8 ring-1 ring-black/5">
            <button 
              onClick={() => setShowRegisterModal(false)} 
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
            >
              <X className="w-5 h-5"/>
            </button>

            <div className="flex flex-col items-center text-center mb-8">
              <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 shadow-sm ring-4 ring-white">
                <UserPlus className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Create Account</h3>
              <p className="text-slate-500 text-sm mt-1 font-medium">Join the team by setting up your profile.</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Full Name</label>
                <div className="relative group">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input 
                    required
                    type="text" 
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-50 border border-transparent text-slate-900 font-bold placeholder-slate-400 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    placeholder="e.g. John Doe"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input 
                    type="email" 
                    required
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-50 border border-transparent text-slate-900 font-bold placeholder-slate-400 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                    placeholder="john@company.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Designation field removed to enforce hierarchy - Admin/Manager sets it later */}
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Role</label>
                <div className="relative group">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <div className="relative">
                      <select 
                        required
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-50 border border-transparent text-slate-900 font-bold placeholder-slate-400 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none"
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value)}
                      >
                        <option value="Employee">Employee</option>
                        <option value="Manager">Manager</option>
                        <option value="Admin">Admin</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Create Passcode</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input 
                    required
                    type={showRegPassword ? "text" : "password"} 
                    className="w-full pl-10 pr-10 py-3.5 rounded-xl bg-slate-50 border border-transparent text-slate-900 font-bold placeholder-slate-400 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm"
                    placeholder="Pin"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <div className="pt-2">
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/30">
                    {isRegistering ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : "Create Account"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SelectEmployee;
