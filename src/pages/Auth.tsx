
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { getEmployees, createEmployee, updateEmployeePassword, getEmployeeByPhone, getEmployeeByEmail } from '../services/firestore';
import { auth } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Employee } from '../types';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Mail, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Briefcase, 
  Shield, 
  Users,
  ArrowRight,
  Zap,
  LayoutGrid,
  Check,
  RefreshCw,
  ArrowLeft,
  KeyRound,
  Phone,
  Smartphone,
  Palette,
  X
} from 'lucide-react';
import { Button } from '../components/ui/Button';

type AuthMode = 'login' | 'signup' | 'forgot' | 'phoneLogin';
type ForgotStep = 'phone' | 'otp' | 'reset' | 'success';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentUser, themeColor, setThemeColor } = useStore();
  
  // App Navigation State
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [forgotStep, setForgotStep] = useState<ForgotStep>('phone');
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'Employee' | 'Manager' | 'Admin'>('Employee');
  
  // OTP & Firebase Auth State
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Found User Reference
  const [targetUser, setTargetUser] = useState<Employee | null>(null);

  // Check if first user
  const [isFirstUser, setIsFirstUser] = useState(false);

  useEffect(() => {
    const checkUsers = async () => {
      try {
        const users = await getEmployees();
        const first = users.length === 0;
        setIsFirstUser(first);
        if (first) {
          setAuthMode('signup');
          setRole('Admin');
        }
      } catch (e) {
        console.error("User check error:", e);
      }
    };
    checkUsers();
  }, []);

  const themeOptions = [
    { id: 'emerald', color: 'bg-emerald-500' },
    { id: 'blue', color: 'bg-blue-500' },
    { id: 'violet', color: 'bg-violet-500' },
    { id: 'rose', color: 'bg-rose-500' },
    { id: 'amber', color: 'bg-amber-500' },
    { id: 'slate', color: 'bg-slate-800' }
  ];

  // --- Recaptcha Setup ---
  useEffect(() => {
    let recaptchaVerifier: RecaptchaVerifier | null = null;

    if (authMode === 'phoneLogin' || authMode === 'forgot') {
      try {
        // Clear existing verifier if any
        if ((window as any).recaptchaVerifier) {
          try {
            (window as any).recaptchaVerifier.clear();
          } catch (e) {
            console.warn("Failed to clear old recaptcha", e);
          }
        }

        // Initialize new verifier
        recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            console.log('Recaptcha resolved');
          },
          'expired-callback': () => {
            console.warn('Recaptcha expired');
            // Optional: reset UI or re-initialize
          }
        });

        (window as any).recaptchaVerifier = recaptchaVerifier;
      } catch (error) {
        console.error("Recaptcha init error:", error);
      }
    }

    return () => {
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (e) {
          console.warn("Cleanup error", e);
        }
        if ((window as any).recaptchaVerifier === recaptchaVerifier) {
          delete (window as any).recaptchaVerifier;
        }
      }
    };
  }, [authMode]);

  // --- Google Auth ---
  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (!user.email) throw new Error("Google account must have an email.");

      const existingUser = await getEmployeeByEmail(user.email);
      
      if (existingUser) {
        if (existingUser.status === 'inactive') throw new Error("Account inactive. Contact support.");
        setCurrentUser(existingUser);
        navigate('/dashboard'); 
      } else {
        const roleToAssign = isFirstUser ? 'Admin' : 'Employee';
        const newUser: Omit<Employee, 'id'> = {
          name: user.displayName || "New User",
          email: user.email,
          phone: user.phoneNumber || "",
          password: Math.random().toString(36).slice(-8), 
          role: roleToAssign,
          status: 'active',
          joiningDate: new Date().toISOString().split('T')[0],
          designation: roleToAssign === 'Admin' ? 'System Admin' : 'Member',
          avatarUrl: user.photoURL || ""
        };
        const id = await createEmployee(newUser);
        setCurrentUser({ ...newUser, id });
        navigate('/dashboard'); 
      }
    } catch (err: any) {
      setError(err.message || "Google Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formattedPhone = phone.trim();

    if (!formattedPhone) {
      setError("Please enter a phone number.");
      setLoading(false);
      return;
    }

    try {
      const user = await getEmployeeByPhone(formattedPhone);
      if (!user) throw new Error("Phone number not registered to any account.");
      setTargetUser(user);

      if (!(window as any).recaptchaVerifier) {
        throw new Error("Recaptcha not initialized. Please refresh and try again.");
      }

      const appVerifier = (window as any).recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setForgotStep('otp');
    } catch (err: any) {
      console.error("Phone Auth Error:", err);
      if (err.code === 'auth/invalid-phone-number') {
        setError("Invalid phone number format. Use international format (e.g. +1234567890).");
      } else if (err.code === 'auth/billing-not-enabled') {
        setError("Firebase Billing (Blaze Plan) required for real SMS. Use a Test Phone Number (in Firebase Console) for development.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(err.message || "Failed to send verification code.");
      }
      
      // Reset recaptcha on error to allow retry
      if ((window as any).recaptchaVerifier) {
        try {
           // We might need to render it again if it was used
           (window as any).recaptchaVerifier.render();
        } catch(e) { /* ignore */ }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !targetUser) return;
    setLoading(true);
    setError(null);
    try {
      await confirmationResult.confirm(otp.join(''));
      if (authMode === 'phoneLogin') {
        setCurrentUser(targetUser);
        navigate('/dashboard'); 
      } else {
        setForgotStep('reset');
      }
    } catch (err) {
      setError("Invalid security code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser) return;
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 4) { setError("Min. 4 characters required."); return; }
    setLoading(true);
    try {
      await updateEmployeePassword(targetUser.id, password);
      setForgotStep('success');
    } catch (err) { setError("Failed to update passcode."); } finally { setLoading(false); }
  };

  const switchMode = (mode: AuthMode) => {
    setError(null);
    setSuccess(null);
    setAuthMode(mode);
    setForgotStep('phone');
    setOtp(['', '', '', '', '', '']);
    setConfirmationResult(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await getEmployeeByEmail(email);
      if (!user || user.password !== password) throw new Error("Invalid email or password.");
      if (user.status === 'inactive') throw new Error("Account inactive.");
      setCurrentUser(user);
      navigate('/dashboard'); 
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const existing = await getEmployeeByEmail(email);
      if (existing) throw new Error("Email already registered.");
      const roleToAssign = isFirstUser ? 'Admin' : role;
      const newUser: Omit<Employee, 'id'> = {
        name: fullName,
        email: email,
        phone: phone,
        password: password,
        role: roleToAssign,
        status: 'active',
        joiningDate: new Date().toISOString().split('T')[0],
        designation: roleToAssign === 'Admin' ? 'System Admin' : 'Member'
      };
      await createEmployee(newUser);
      setSuccess("Account created! Log in.");
      switchMode('login');
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-slate-50 overflow-hidden font-sans selection:bg-primary/20">
      <div id="recaptcha-container"></div>

      {/* Fully Responsive & Compact Theme Palette */}
      <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-[100] flex items-center justify-end group">
          <div 
            className={`flex items-center gap-2 overflow-hidden bg-white/90 backdrop-blur-xl border border-slate-200/50 rounded-full shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              showThemeSelector 
                ? 'max-w-[320px] opacity-100 pr-3 pl-5 py-2 mr-3 scale-100' 
                : 'max-w-0 opacity-0 px-0 py-2 mr-0 scale-90 pointer-events-none'
            }`}
          >
              <div className="flex items-center gap-1 whitespace-nowrap mr-1">
                <Palette className="w-3 h-3 text-slate-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 hidden sm:inline">Theme</span>
              </div>
              <div className="flex gap-1.5 sm:gap-2">
                  {themeOptions.map((opt, idx) => (
                      <button 
                        key={opt.id}
                        onClick={() => setThemeColor(opt.id)}
                        style={{ transitionDelay: showThemeSelector ? `${idx * 40}ms` : '0ms' }}
                        className={`group relative h-7 w-7 sm:h-8 sm:w-8 rounded-full ${opt.color} transition-all duration-300 flex items-center justify-center shadow-sm active:scale-90 ${
                          themeColor === opt.id 
                            ? 'ring-2 ring-offset-2 ring-primary scale-110' 
                            : 'hover:scale-110 opacity-70 hover:opacity-100'
                        }`}
                        title={opt.id}
                      >
                          {themeColor === opt.id && <Check className="w-3 h-3 text-white animate-in zoom-in duration-300" />}
                      </button>
                  ))}
              </div>
          </div>
          
          <button 
            onClick={() => setShowThemeSelector(!showThemeSelector)}
            className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-white border border-slate-100 shadow-xl flex items-center justify-center text-slate-500 hover:text-primary transition-all duration-500 active:scale-90 relative group overflow-hidden ${
              showThemeSelector ? 'rotate-90 ring-4 ring-primary/5 border-primary/20' : ''
            }`}
          >
              <div className={`absolute inset-0 bg-primary/5 transition-opacity duration-500 ${showThemeSelector ? 'opacity-100' : 'opacity-0'}`}></div>
              {showThemeSelector ? (
                <X className="w-5 h-5 relative z-10 transition-transform duration-500" />
              ) : (
                <Palette className="w-5 h-5 relative z-10 group-hover:rotate-12 transition-transform duration-500" />
              )}
          </button>
      </div>

      {/* Branding Section */}
      <div className="hidden md:flex md:w-[40%] lg:w-[45%] bg-[#0f172a] relative flex-col justify-between p-10 lg:p-12 border-r border-white/5 overflow-hidden transition-colors duration-700">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>
        <div className="relative z-10 flex items-center justify-between">
          <h1 className="text-2xl font-black text-white tracking-tighter">TeamTime<span className="text-primary">.</span></h1>
          <div className="flex gap-2 bg-white/5 p-1 rounded-full border border-white/10">
            {themeOptions.map(opt => (
                <div key={opt.id} className={`h-2 w-2 rounded-full ${opt.color} ${themeColor === opt.id ? 'scale-125 ring-1 ring-white/50' : 'opacity-40'}`} />
            ))}
          </div>
        </div>
        <div className="relative z-10 max-w-sm">
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight tracking-tighter mb-8">
            The workspace <br/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-primary">
              reimagined.
            </span>
          </h2>
          <div className="space-y-4">
            {[
              { icon: Zap, text: "Seamless check-ins & check-outs" }, 
              { icon: ShieldCheck, text: "Advanced manager dashboard" }, 
              { icon: LayoutGrid, text: "Visual task management" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 py-1">
                <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-slate-300 text-sm font-medium tracking-wide">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
          <span>Enterprise Edition</span>
          <span className="h-1 w-1 bg-slate-700 rounded-full"></span>
          <span>v6.0.0</span>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 flex flex-col bg-white relative h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 z-50">
          <h1 className="text-xl font-black text-slate-900 tracking-tighter">TeamTime<span className="text-primary">.</span></h1>
          <button 
            onClick={() => switchMode(authMode === 'login' ? 'signup' : 'login')} 
            className="text-[10px] font-black uppercase tracking-widest text-primary px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
          >
            {authMode === 'login' ? 'Join' : 'Login'}
          </button>
        </div>

        {/* Scrollable Form Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="min-h-full flex flex-col items-center justify-center px-6 py-12 md:py-16 lg:px-20 relative">
            <div className="w-full max-w-md mx-auto">
              
              {authMode !== 'login' && authMode !== 'signup' && (
                <button onClick={() => switchMode('login')} className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-primary transition-colors mb-6 group">
                  <ArrowLeft className="w-3 h-3 mr-1.5 group-hover:-translate-x-1 transition-transform" /> Back to Sign In
                </button>
              )}

              <div className="mb-8 text-center md:text-left">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                  {authMode === 'login' ? "Log In" : authMode === 'signup' ? (isFirstUser ? "Admin Setup" : "Register") : authMode === 'phoneLogin' ? "Phone Login" : "Recovery"}
                </h2>
                <p className="text-slate-600 font-semibold text-sm">
                  {authMode === 'login' ? "Access your team workspace." : 
                   authMode === 'signup' ? "Create your professional profile." : 
                   forgotStep === 'otp' ? "Verify the security code." :
                   "Verify identity via phone."}
                </p>
              </div>

              {(error || success) && (
                <div className="mb-6 animate-in fade-in zoom-in-95">
                  {error && <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2 shadow-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}
                  {success && <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-bold flex items-center gap-2 shadow-sm"><CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}</div>}
                </div>
              )}

              {/* Social Login Area */}
              {(authMode === 'login' || authMode === 'signup') && (
                <div className="space-y-4 mb-8">
                  <button onClick={handleGoogleAuth} disabled={loading} className="w-full h-12 flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all font-bold text-slate-700 text-sm shadow-sm active:scale-[0.98]">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                    Continue with Google
                  </button>
                  <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="flex-1 h-px bg-slate-100"></div>
                    <span>or</span>
                    <div className="flex-1 h-px bg-slate-100"></div>
                  </div>
                </div>
              )}

              <div className="transition-all duration-300">
                {/* --- LOGIN FORM --- */}
                {authMode === 'login' && (
                  <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Work Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none font-bold text-slate-800 text-sm placeholder:text-slate-400 shadow-sm" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Passcode</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none font-bold text-slate-800 tracking-widest text-sm placeholder:text-slate-400 shadow-sm" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 p-1 hover:text-slate-600 transition-colors">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <button type="button" onClick={() => switchMode('phoneLogin')} className="text-[10px] font-bold text-slate-500 hover:text-primary uppercase tracking-widest flex items-center gap-2 transition-colors">
                        <Smartphone className="w-3.5 h-3.5" /> Phone Login
                      </button>
                      <button type="button" onClick={() => switchMode('forgot')} className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest">Forgot?</button>
                    </div>
                    <Button type="submit" disabled={loading} className="w-full py-4 rounded-2xl bg-[#0f172a] hover:bg-slate-800 text-white font-black text-sm shadow-xl shadow-slate-200 h-14 mt-4 transition-all active:scale-[0.98]">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Log In <ArrowRight className="w-4 h-4 ml-1" /></>}</Button>
                    <p className="text-center mt-8 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Don't have an account? <button type="button" onClick={() => switchMode('signup')} className="text-primary hover:underline font-black">Sign up</button></p>
                  </form>
                )}

                {/* --- SIGNUP FORM --- */}
                {authMode === 'signup' && (
                  <form onSubmit={handleSignup} className="space-y-4 animate-in fade-in">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input required type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none font-bold text-slate-800 text-sm placeholder:text-slate-400 shadow-sm" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Work Email</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none font-bold text-slate-800 text-sm placeholder:text-slate-400 shadow-sm" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1234567890" className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none font-bold text-slate-800 text-sm placeholder:text-slate-400 shadow-sm" />
                      </div>
                    </div>
                    {!isFirstUser && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Member Role</label>
                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { id: 'Employee', label: 'User', icon: Users }, 
                            { id: 'Manager', label: 'Lead', icon: Briefcase }, 
                            { id: 'Admin', label: 'Admin', icon: Shield }
                          ].map((item) => (
                            <button key={item.id} type="button" onClick={() => setRole(item.id as any)} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${role === item.id ? 'bg-primary/5 border-primary text-primary shadow-sm scale-[1.02]' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100 hover:border-slate-200'}`}>
                              <item.icon className={`w-4 h-4 mb-1.5 ${role === item.id ? 'text-primary' : 'text-slate-400'}`} />
                              <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Create Passcode</label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input required type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-11 pr-12 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none font-bold text-slate-800 tracking-widest text-sm placeholder:text-slate-400 shadow-sm" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 p-1 hover:text-slate-600 transition-colors">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                      </div>
                    </div>
                    <Button type="submit" disabled={loading} className="w-full py-4 rounded-2xl bg-[#0f172a] hover:bg-slate-800 text-white font-black text-sm shadow-xl shadow-slate-200 h-14 mt-6 transition-all active:scale-[0.98]">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Get Started <ArrowRight className="w-4 h-4 ml-1" /></>}</Button>
                    <p className="text-center mt-8 text-[10px] text-slate-600 font-bold uppercase tracking-widest">Already have an account? <button type="button" onClick={() => switchMode('login')} className="text-primary hover:underline font-black">Log in</button></p>
                  </form>
                )}

                {/* --- FORGOT / PHONE LOGIN --- */}
                {(authMode === 'forgot' || authMode === 'phoneLogin') && (
                  <div className="animate-in fade-in space-y-4">
                    {!confirmationResult ? (
                      <form onSubmit={handlePhoneSubmit} className="space-y-6">
                        <p className="text-xs text-slate-600 font-bold leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">Enter your registered phone number (with country code). We'll send an SMS code to verify identity.</p>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                          <div className="relative group">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none font-bold text-slate-800 text-sm placeholder:text-slate-400 shadow-sm" placeholder="+1234567890" />
                          </div>
                        </div>
                        <Button type="submit" disabled={loading} className="w-full h-14 bg-[#0f172a] hover:bg-slate-800 text-white rounded-2xl font-black shadow-lg shadow-slate-200 transition-all active:scale-[0.98]">
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send SMS Code"}
                        </Button>
                      </form>
                    ) : (
                      forgotStep === 'otp' ? (
                        <form onSubmit={verifyOtp} className="space-y-8">
                          <div className="text-center">
                            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-primary/20 shadow-sm"><KeyRound className="w-8 h-8 text-primary" /></div>
                            <p className="text-xs text-slate-700 font-bold">Security code sent to <span className="text-primary font-black underline decoration-primary/30 decoration-2">{phone}</span></p>
                          </div>
                          <div className="flex justify-between gap-3 max-w-xs mx-auto">
                            {otp.map((digit, idx) => (
                              <input key={idx} ref={(el) => { otpRefs.current[idx] = el; }} type="text" maxLength={1} value={digit} onChange={e => handleOtpChange(e.target.value, idx)} onKeyDown={e => handleOtpKeyDown(e, idx)} className="w-12 h-14 text-center text-xl font-black rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-primary focus:bg-white outline-none transition-all shadow-sm focus:ring-4 focus:ring-primary/5" />
                            ))}
                          </div>
                          <Button type="submit" disabled={loading} className="w-full h-14 bg-[#0f172a] hover:bg-slate-800 text-white rounded-2xl font-black shadow-lg shadow-slate-200 transition-all active:scale-[0.98]">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Continue"}</Button>
                          <div className="flex flex-col items-center gap-3">
                            <button type="button" onClick={handlePhoneSubmit} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Resend SMS</button>
                            <button type="button" onClick={() => setConfirmationResult(null)} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-700 transition-colors">Change Phone</button>
                          </div>
                        </form>
                      ) : forgotStep === 'reset' ? (
                        <form onSubmit={handleForgotReset} className="space-y-5">
                          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3 mb-2 shadow-sm"><ShieldCheck className="w-5 h-5 text-emerald-600" /><span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Identity Verified</span></div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">New Passcode</label>
                            <div className="relative group">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none font-bold text-slate-800 text-sm shadow-sm" placeholder="••••" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm Passcode</label>
                            <div className="relative group">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                              <input required type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none font-bold text-slate-800 text-sm shadow-sm" placeholder="••••" />
                            </div>
                          </div>
                          <Button type="submit" disabled={loading} className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black shadow-lg shadow-primary/20 transition-all active:scale-[0.98]">{loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><RefreshCw className="w-4 h-4 mr-2" /> Reset Now</>}</Button>
                        </form>
                      ) : (
                        <div className="text-center py-8 animate-in zoom-in-95">
                          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm"><CheckCircle2 className="w-10 h-10" /></div>
                          <h3 className="text-2xl font-black text-slate-900 mb-3">Access Restored</h3>
                          <p className="text-sm text-slate-600 font-semibold mb-10 leading-relaxed">Passcode updated. You can now log in with your new credentials.</p>
                          <Button onClick={() => switchMode('login')} className="w-full h-14 bg-[#0f172a] hover:bg-slate-800 text-white rounded-2xl font-black shadow-lg shadow-slate-200 transition-all active:scale-[0.98]">Proceed to Login</Button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="mt-12 text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">&copy; {new Date().getFullYear()} TeamTime Core Management</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
      </div>
    </div>
  );
};

export default Auth;
