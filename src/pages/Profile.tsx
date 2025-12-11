import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { updateEmployeePassword, updateEmployeeProfile } from '../services/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { User, Lock, Mail, Briefcase, Calendar, ShieldCheck, Save, Loader2, CheckCircle2, Phone, FileText, UserCircle, Smile, Palette, Check } from 'lucide-react';

const Profile: React.FC = () => {
  const { currentUser, setCurrentUser, themeColor, setThemeColor } = useStore();
  
  // Security State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPass, setLoadingPass] = useState(false);
  const [successPass, setSuccessPass] = useState(false);
  const [errorPass, setErrorPass] = useState('');

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editDesignation, setEditDesignation] = useState(currentUser?.designation || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
  const [editBio, setEditBio] = useState(currentUser?.bio || '');
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Status State
  const [currentStatus, setCurrentStatus] = useState(currentUser?.currentStatus || '');
  const [currentEmoji, setCurrentEmoji] = useState(currentUser?.currentStatusEmoji || '👋');
  const [statusLoading, setStatusLoading] = useState(false);

  if (!currentUser) return null;

  const handleUpdatePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorPass('');
      setSuccessPass(false);

      if (password.length < 4) {
          setErrorPass('Password must be at least 4 characters');
          return;
      }

      if (password !== confirmPassword) {
          setErrorPass('Passwords do not match');
          return;
      }

      setLoadingPass(true);
      try {
          await updateEmployeePassword(currentUser.id, password);
          // Update local state
          setCurrentUser({ ...currentUser, password: password });
          setSuccessPass(true);
          setPassword('');
          setConfirmPassword('');
      } catch (err) {
          setErrorPass('Failed to update password');
          console.error(err);
      } finally {
          setLoadingPass(false);
      }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoadingProfile(true);
      try {
          const updates = {
              name: editName,
              designation: editDesignation,
              phone: editPhone,
              bio: editBio
          };
          await updateEmployeeProfile(currentUser.id, updates);
          
          // Update local store
          setCurrentUser({ ...currentUser, ...updates });
          setIsEditing(false);
      } catch (error) {
          console.error("Failed to update profile", error);
      } finally {
          setLoadingProfile(false);
      }
  };

  const handleStatusUpdate = async () => {
      setStatusLoading(true);
      try {
          const updates = {
              currentStatus,
              currentStatusEmoji: currentEmoji
          };
          await updateEmployeeProfile(currentUser.id, updates);
          setCurrentUser({ ...currentUser, ...updates });
      } catch(e) {
          console.error(e);
      } finally {
          setStatusLoading(false);
      }
  };

  const statusOptions = [
      { emoji: '🧠', text: 'Deep Focus' },
      { emoji: '📅', text: 'In Meeting' },
      { emoji: '🍔', text: 'Lunch Break' },
      { emoji: '🤒', text: 'Sick Leave' },
      { emoji: '🚗', text: 'Commuting' },
      { emoji: '🏡', text: 'WFH' },
      { emoji: '👋', text: 'Available' },
  ];

  const themeOptions = [
    { id: 'emerald', label: 'Emerald', color: 'bg-emerald-600' },
    { id: 'blue', label: 'Blue', color: 'bg-blue-600' },
    { id: 'violet', label: 'Violet', color: 'bg-violet-600' },
    { id: 'rose', label: 'Rose', color: 'bg-rose-600' },
    { id: 'amber', label: 'Amber', color: 'bg-amber-500' },
    { id: 'slate', label: 'Dark', color: 'bg-slate-800' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
         <h2 className="text-3xl font-bold tracking-tight text-slate-900">My Profile</h2>
         <p className="text-slate-500 mt-1">Manage your account settings, personal details, and credentials.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Identity Card */}
          <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-primary to-primary/80 z-0"></div>
                  
                  <div className="relative z-10 h-32 w-32 bg-white rounded-full p-2 shadow-xl mb-4 mt-8 transition-transform group-hover:scale-105 duration-300">
                     <div className="h-full w-full rounded-full bg-primary/5 flex items-center justify-center text-5xl font-bold text-primary border-2 border-primary/20 overflow-hidden">
                         {currentUser.avatarUrl ? <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover"/> : currentUser.name.charAt(0)}
                     </div>
                  </div>

                  <div className="relative z-10 w-full">
                      <h3 className="text-2xl font-bold text-slate-800 break-words">{currentUser.name}</h3>
                      <p className="text-primary font-bold text-sm uppercase tracking-wider mt-1 mb-4">{currentUser.designation || currentUser.role}</p>
                      
                      <div className="flex flex-wrap gap-2 justify-center mb-6">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${currentUser.status === 'active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                              {currentUser.status}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                              {currentUser.role}
                          </span>
                      </div>

                      <div className="w-full border-t border-slate-100 pt-6 grid grid-cols-2 gap-4 text-left">
                           <div>
                               <p className="text-xs text-slate-400 font-bold uppercase">Joined</p>
                               <p className="text-sm font-semibold text-slate-700">{currentUser.joiningDate ? new Date(currentUser.joiningDate).toLocaleDateString() : 'N/A'}</p>
                           </div>
                           <div>
                               <p className="text-xs text-slate-400 font-bold uppercase">Emp ID</p>
                               <p className="text-sm font-mono text-slate-500 truncate" title={currentUser.id}>#{currentUser.id.slice(0,6)}</p>
                           </div>
                      </div>
                  </div>
              </div>

              {/* Status Update Card */}
              <Card className="border-none shadow-lg bg-white/90 backdrop-blur-md overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full -mr-4 -mt-4 opacity-50 z-0"></div>
                  <CardHeader className="pb-2 relative z-10">
                      <CardTitle className="text-slate-800 flex items-center gap-2 text-base">
                          <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Smile className="w-4 h-4 text-primary" /> 
                          </div>
                          Update Status
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10">
                      <div className="space-y-5">
                          <div className="flex gap-3">
                              <div className="relative w-14 flex-shrink-0">
                                  <div className="absolute -top-2 -left-1 text-[10px] font-bold text-slate-400 bg-white/50 px-1 rounded z-20">Emoji</div>
                                  <input 
                                      type="text" 
                                      value={currentEmoji}
                                      onChange={(e) => setCurrentEmoji(e.target.value)}
                                      className="w-full h-12 text-center rounded-xl border-2 border-slate-100 bg-white text-2xl focus:border-primary focus:ring-0 outline-none transition-colors text-slate-800"
                                      maxLength={2}
                                  />
                              </div>
                              <div className="relative flex-1">
                                  <div className="absolute -top-2 left-1 text-[10px] font-bold text-slate-400 bg-white/50 px-1 rounded z-20">Message</div>
                                  <input 
                                      type="text"
                                      value={currentStatus}
                                      onChange={(e) => setCurrentStatus(e.target.value)}
                                      className="w-full h-12 px-4 rounded-xl border-2 border-slate-100 bg-white text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:border-primary focus:ring-0 outline-none transition-colors"
                                      placeholder="What are you doing?"
                                  />
                              </div>
                          </div>

                          <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Select</p>
                              <div className="flex flex-wrap gap-2">
                                  {statusOptions.map((opt) => (
                                      <button
                                          key={opt.text}
                                          onClick={() => {
                                              setCurrentEmoji(opt.emoji);
                                              setCurrentStatus(opt.text);
                                          }}
                                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-2 ${
                                              currentStatus === opt.text 
                                              ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/30 scale-105' 
                                              : 'bg-white border-slate-200 text-slate-600 hover:border-primary/50 hover:bg-primary/5'
                                          }`}
                                      >
                                          <span>{opt.emoji}</span>
                                          <span>{opt.text}</span>
                                      </button>
                                  ))}
                              </div>
                          </div>
                          
                          <Button onClick={handleStatusUpdate} disabled={statusLoading} className="w-full bg-slate-900 hover:bg-primary text-white font-bold py-5 rounded-xl shadow-lg transition-all">
                              {statusLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Save Status'}
                          </Button>
                      </div>
                  </CardContent>
              </Card>

              {/* Theme Selector - NEW */}
              <Card className="border-none shadow-md bg-white/80 backdrop-blur-sm overflow-hidden">
                  <div className="h-1.5 w-full bg-slate-200"></div>
                  <CardHeader>
                      <CardTitle className="text-slate-800 flex items-center gap-2 text-base">
                          <Palette className="w-4 h-4 text-primary" /> App Theme
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <div className="grid grid-cols-6 gap-2">
                        {themeOptions.map((theme) => (
                          <button
                            key={theme.id}
                            onClick={() => setThemeColor(theme.id)}
                            className={`w-full aspect-square rounded-full flex items-center justify-center transition-all ${theme.color} ${
                                themeColor === theme.id ? 'ring-2 ring-offset-2 ring-slate-400 scale-110 shadow-md' : 'hover:scale-105 opacity-80 hover:opacity-100'
                            }`}
                            title={theme.label}
                          >
                            {themeColor === theme.id && <Check className="w-4 h-4 text-white" />}
                          </button>
                        ))}
                      </div>
                      <p className="text-center text-[10px] text-slate-400 mt-4">Select a color to customize the look and feel.</p>
                  </CardContent>
              </Card>

              {/* Security Card */}
              <Card className="border-none shadow-md bg-white/80 backdrop-blur-sm overflow-hidden">
                  <div className="h-1.5 w-full bg-slate-200"></div>
                  <CardHeader>
                      <CardTitle className="text-slate-800 flex items-center gap-2 text-base">
                          <Lock className="w-4 h-4 text-primary" /> Security Settings
                      </CardTitle>
                  </CardHeader>
                  <CardContent>
                      <form onSubmit={handleUpdatePassword} className="space-y-4">
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Passcode</label>
                              <input 
                                  type="password"
                                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-slate-800"
                                  placeholder="Enter new pin..."
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Confirm Passcode</label>
                              <input 
                                  type="password"
                                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-slate-800"
                                  placeholder="Confirm new pin..."
                                  value={confirmPassword}
                                  onChange={(e) => setConfirmPassword(e.target.value)}
                              />
                          </div>
                          
                          {errorPass && <p className="text-red-500 text-xs font-bold">{errorPass}</p>}
                          {successPass && (
                              <div className="p-3 bg-green-50 text-green-700 rounded-xl flex items-center gap-2 text-xs font-bold">
                                  <CheckCircle2 className="w-4 h-4" /> Updated successfully!
                              </div>
                          )}

                          <Button type="submit" disabled={loadingPass || !password} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-xl text-sm">
                              {loadingPass ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Passcode'}
                          </Button>
                      </form>
                  </CardContent>
              </Card>
          </div>

          {/* Right Column: Details & Edit Form */}
          <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-md bg-white/90 backdrop-blur-sm min-h-[500px] flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 mb-4">
                      <CardTitle className="text-slate-800 flex items-center gap-2">
                          <UserCircle className="w-5 h-5 text-primary" /> Personal Information
                      </CardTitle>
                      {!isEditing && (
                          <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="text-primary hover:bg-primary/10 font-bold">
                              Edit Details
                          </Button>
                      )}
                  </CardHeader>
                  <CardContent className="flex-1">
                      {isEditing ? (
                          <form onSubmit={handleUpdateProfile} className="space-y-5 animate-in fade-in slide-in-from-right-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  <div className="space-y-1.5">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                                      <input 
                                          required
                                          type="text"
                                          value={editName}
                                          onChange={(e) => setEditName(e.target.value)}
                                          className="w-full p-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-slate-800"
                                      />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Designation / Job Title</label>
                                      <input 
                                          type="text"
                                          value={editDesignation}
                                          onChange={(e) => setEditDesignation(e.target.value)}
                                          disabled={currentUser.role !== 'Admin'} 
                                          placeholder={currentUser.role !== 'Admin' ? "Contact manager to update" : "e.g. Senior Product Designer"}
                                          className={`w-full p-3 rounded-xl border border-slate-200 outline-none transition-all font-medium ${currentUser.role !== 'Admin' ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'focus:border-primary focus:ring-4 focus:ring-primary/10 text-slate-800'}`}
                                      />
                                      {currentUser.role !== 'Admin' && <p className="text-[10px] text-slate-400">Only administrators can update job titles.</p>}
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                                      <input 
                                          disabled
                                          type="email"
                                          value={currentUser.email}
                                          className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 cursor-not-allowed font-medium"
                                      />
                                      <p className="text-[10px] text-slate-400">Email cannot be changed directly.</p>
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                                      <input 
                                          type="tel"
                                          value={editPhone}
                                          onChange={(e) => setEditPhone(e.target.value)}
                                          placeholder="+1 (555) 000-0000"
                                          className="w-full p-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium text-slate-800"
                                      />
                                  </div>
                              </div>
                              
                              <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bio / About Me</label>
                                  <textarea 
                                      value={editBio}
                                      onChange={(e) => setEditBio(e.target.value)}
                                      placeholder="Tell us a little about yourself..."
                                      className="w-full p-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium min-h-[120px] resize-none text-slate-800"
                                  />
                              </div>

                              <div className="flex gap-3 pt-4">
                                  <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl py-3">Cancel</Button>
                                  <Button type="submit" disabled={loadingProfile} className="flex-[2] bg-primary hover:bg-primary/90 text-white font-bold rounded-xl py-3 shadow-lg shadow-primary/30">
                                      {loadingProfile ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                                  </Button>
                              </div>
                          </form>
                      ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-6 animate-in fade-in">
                              <div className="space-y-1">
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                                  <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
                                      {currentUser.name}
                                  </div>
                              </div>
                              <div className="space-y-1">
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Designation</label>
                                  <div className="flex items-center gap-2 text-slate-800 font-medium">
                                      <Briefcase className="w-4 h-4 text-primary" /> {currentUser.designation || 'Not set'}
                                  </div>
                              </div>
                              <div className="space-y-1">
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email</label>
                                  <div className="flex items-center gap-2 text-slate-800 font-medium break-all">
                                      <Mail className="w-4 h-4 text-primary flex-shrink-0" /> {currentUser.email}
                                  </div>
                              </div>
                              <div className="space-y-1">
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone</label>
                                  <div className="flex items-center gap-2 text-slate-800 font-medium">
                                      <Phone className="w-4 h-4 text-primary" /> {currentUser.phone || 'Not set'}
                                  </div>
                              </div>
                              <div className="col-span-1 md:col-span-2 space-y-2">
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">About Me</label>
                                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 leading-relaxed text-sm">
                                      {currentUser.bio ? currentUser.bio : <span className="text-slate-400 italic">No bio added yet. Click edit to add details.</span>}
                                  </div>
                              </div>
                          </div>
                      )}
                  </CardContent>
              </Card>
          </div>
      </div>
    </div>
  );
};

export default Profile;