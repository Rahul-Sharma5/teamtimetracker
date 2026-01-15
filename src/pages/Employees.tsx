import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { getEmployees, createEmployee, deleteEmployee, updateEmployeeStatus, updateEmployeeProfile } from '../services/firestore';
import { Employee } from '../types';
import { Plus, Trash2, User, Mail, Briefcase, Search, X, UserPlus, AlertTriangle, Lock, Calendar, Power, Crown, ShieldCheck, ChevronDown, Edit2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const Employees: React.FC = () => {
  const { currentUser, setCurrentUser } = useStore();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

  // Form State
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Employee'); // Default
  const [newEmail, setNewEmail] = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newJoiningDate, setNewJoiningDate] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (error) {
      console.error("Error fetching employees", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const checkEmailUnique = (email: string, excludeId?: string) => {
      const normalized = email.toLowerCase().trim();
      return !employees.some(e => 
          e.email.toLowerCase().trim() === normalized && e.id !== excludeId
      );
  };

  const resetForm = () => {
      setNewName('');
      setNewRole('Employee');
      setNewEmail('');
      setNewDesignation('');
      setNewPassword('');
      setNewJoiningDate('');
      setShowPassword(false);
      setEditingEmployee(null);
  };

  const handleAddClick = () => {
      resetForm();
      setShowAddModal(true);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checkEmailUnique(newEmail)) {
        alert("This email address is already registered. Please use a unique email.");
        return;
    }

    if (newName.trim() === '') {
        alert("Please enter a name.");
        return;
    }

    try {
        await createEmployee({
            name: newName,
            role: newRole,
            email: newEmail,
            designation: newDesignation,
            status: 'active',
            avatarUrl: '', 
            password: newPassword, 
            joiningDate: newJoiningDate
        });
        setShowAddModal(false);
        resetForm();
        await fetchEmployees();
    } catch (err) {
        console.error("Error adding employee", err);
        alert("Failed to add employee. Please try again.");
    }
  };

  const handleEditClick = (emp: Employee) => {
      setEditingEmployee(emp);
      setNewName(emp.name);
      setNewRole(emp.role);
      setNewEmail(emp.email);
      setNewDesignation(emp.designation || '');
      if (currentUser?.id === emp.id) {
          setNewPassword(emp.password || '');
      } else {
          setNewPassword(''); 
      }
      setNewJoiningDate(emp.joiningDate || '');
      setShowPassword(false);
      setShowEditModal(true);
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingEmployee) return;

      if (!checkEmailUnique(newEmail, editingEmployee.id)) {
          alert("This email address is already in use by another user.");
          return;
      }

      try {
          const updates: Partial<Employee> = {
              name: newName,
              role: newRole,
              email: newEmail, 
              designation: newDesignation,
              joiningDate: newJoiningDate
          };
          if (newPassword.trim().length > 0) {
              updates.password = newPassword;
          }
          await updateEmployeeProfile(editingEmployee.id, updates);
          setShowEditModal(false);
          setEditingEmployee(null);
          await fetchEmployees();
          if (currentUser?.id === editingEmployee.id) {
              setCurrentUser({ ...currentUser, ...updates });
          }
      } catch (err) {
          console.error("Error updating employee", err);
          alert("Failed to update employee.");
      }
  };

  const canManage = (targetRole: string, targetId: string) => {
      if (!currentUser) return false;
      if (currentUser.id === targetId) return true;
      if (currentUser.role === 'Admin') return targetRole !== 'Admin';
      if (currentUser.role === 'Manager') return targetRole === 'Employee';
      return false;
  };

  const handleToggleStatus = async (emp: Employee) => {
      if (!canManage(emp.role, emp.id)) {
          alert("You do not have permission to modify this user.");
          return;
      }
      const newStatus = emp.status === 'active' ? 'inactive' : 'active';
      try {
          setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, status: newStatus } : e));
          await updateEmployeeStatus(emp.id, newStatus);
      } catch (err) {
          console.error(err);
          fetchEmployees();
          alert("Failed to update status.");
      }
  };

  const initiateDelete = (id: string, role: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!canManage(role, id)) {
          alert("You do not have permission to delete this user.");
          return;
      }
      setEmployeeToDelete(id);
  };

  const confirmDelete = async () => {
      if (!employeeToDelete) return;
      const id = employeeToDelete;
      if (currentUser && currentUser.id === id) {
          try {
             await deleteEmployee(id);
             setCurrentUser(null);
          } catch(err) {
             console.error("Failed to delete self", err);
             alert("Failed to delete account.");
          }
          return;
      }
      const previousEmployees = [...employees];
      setEmployees(prev => prev.filter(emp => emp.id !== id));
      setEmployeeToDelete(null); 
      try {
          await deleteEmployee(id);
      } catch (err) {
          console.error("Error deleting employee:", err);
          setEmployees(previousEmployees);
          alert("Failed to delete employee from database.");
      }
  };

  const filteredEmployees = employees.filter(emp =>
    (emp.name && emp.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (emp.role && emp.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (emp.designation && emp.designation.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const isAdmin = currentUser?.role === 'Admin';
  const isManager = currentUser?.role === 'Manager';
  const canAddUsers = isAdmin || isManager;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 lg:hidden mb-1">People</h2>
          <p className="text-slate-500">Manage your team members and credentials.</p>
        </div>
        {canAddUsers && (
          <Button onClick={handleAddClick} className="w-full md:w-auto bg-gradient-to-r from-primary to-primary/80 hover:to-primary text-white shadow-lg shadow-primary/30 rounded-xl px-6 py-4 md:py-6 font-bold transition-all hover:scale-105 active:scale-95 flex justify-center border-none">
              <Plus className="w-4 h-4 mr-2" /> Add {isAdmin ? 'User' : 'Employee'}
          </Button>
        )}
      </div>

      <div className="relative max-w-md w-full">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
         <input 
            type="text" 
            placeholder="Search by name, role or designation..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 bg-white/60 backdrop-blur-sm transition-all text-slate-700 shadow-sm"
         />
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 animate-pulse">Loading directory...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {filteredEmployees.map(emp => {
                const isTargetAdmin = emp.role === 'Admin';
                const isTargetManager = emp.role === 'Manager';
                let roleStyle = "bg-slate-100 text-slate-400 border-slate-200";
                if (isTargetAdmin) roleStyle = "bg-purple-100 text-purple-700 border-purple-200";
                else if (isTargetManager) roleStyle = "bg-primary/10 text-primary border-primary/20";
                const showActions = canManage(emp.role, emp.id);

                return (
                <Card key={emp.id} className={`relative overflow-hidden border-slate-200 bg-white/70 backdrop-blur-md shadow-sm hover:shadow-md transition-all group ${emp.status === 'inactive' ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                     <div className="p-5 md:p-6 flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex items-center gap-4 w-full min-w-0">
                            <div className={`h-14 w-14 rounded-xl flex items-center justify-center font-bold text-xl shadow-inner border transition-colors flex-shrink-0 ${roleStyle}`}>
                                {isTargetAdmin ? <Crown className="w-6 h-6"/> : isTargetManager ? <ShieldCheck className="w-6 h-6"/> : (emp.name ? emp.name.charAt(0) : '?')}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-slate-800 text-lg leading-tight truncate">{emp.name || 'No Name Provided'}</h3>
                                {emp.designation && <p className="text-sm font-medium text-primary mb-1 truncate">{emp.designation}</p>}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wide whitespace-nowrap ${isTargetAdmin ? 'bg-purple-50 text-purple-700' : isTargetManager ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'}`}>
                                        {emp.role}
                                    </span>
                                    {emp.status === 'inactive' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-100 text-red-600 text-[10px] font-bold uppercase tracking-wide">
                                            Inactive
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {showActions && (
                            <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 justify-end flex-shrink-0">
                                <button type="button" onClick={() => handleEditClick(emp)} className="flex-1 sm:flex-none p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all flex items-center justify-center bg-slate-50 sm:bg-transparent" title="Edit Details"><Edit2 className="w-4 h-4" /></button>
                                <button type="button" onClick={() => handleToggleStatus(emp)} className={`flex-1 sm:flex-none p-2 rounded-lg transition-all flex items-center justify-center bg-slate-50 sm:bg-transparent ${emp.status === 'active' ? 'text-primary hover:bg-primary/10' : 'text-slate-400 hover:bg-slate-100'}`} title={emp.status === 'active' ? "Deactivate User" : "Activate User"}><Power className="w-4 h-4" /></button>
                                <button type="button" onClick={(e) => initiateDelete(emp.id, emp.role, e)} className="flex-1 sm:flex-none p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex items-center justify-center bg-slate-50 sm:bg-transparent" title="Delete User"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        )}
                     </div>
                     <div className="px-5 pb-5 md:px-6 md:pb-6 space-y-2">
                        <div className="flex items-center text-sm text-slate-500"><Mail className="w-4 h-4 mr-2 text-primary flex-shrink-0" /><span className="truncate">{emp.email || 'No email provided'}</span></div>
                        <div className="flex items-center text-sm text-slate-500"><Lock className="w-4 h-4 mr-2 text-primary flex-shrink-0" /><span className="whitespace-nowrap">Passcode: <span className="ml-1 font-mono text-slate-600 tracking-widest">••••</span></span></div>
                        {emp.joiningDate && <div className="flex items-center text-sm text-slate-500"><Calendar className="w-4 h-4 mr-2 text-primary flex-shrink-0" /><span className="truncate">Joined: {new Date(emp.joiningDate).toLocaleDateString()}</span></div>}
                     </div>
                </Card>
            )})}
        </div>
      )}

      {/* MODALS SECTION - Fixed with createPortal to render above everything */}
      {(showAddModal || showEditModal) && canAddUsers && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-hidden">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
            <button 
              onClick={() => { setShowAddModal(false); setShowEditModal(false); }} 
              className="absolute top-5 right-5 z-20 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
            >
              <X className="w-5 h-5"/>
            </button>
            
            <div className="overflow-y-auto custom-scrollbar p-8">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 shadow-sm ring-4 ring-white">
                    <UserPlus className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{showEditModal ? 'Edit Profile' : 'New User'}</h3>
                  <p className="text-slate-500 text-sm mt-1 font-medium">{showEditModal ? 'Update employee details.' : 'Enter details to create a new profile.'}</p>
                </div>

                <form onSubmit={showEditModal ? handleUpdateEmployee : handleAddEmployee} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Full Name</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input required type="text" className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-50 border border-transparent text-slate-900 font-bold placeholder:text-slate-400 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none" placeholder="e.g. Jane Doe" value={newName} onChange={(e) => setNewName(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input required type="email" className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-50 border border-transparent text-slate-900 font-bold placeholder:text-slate-400 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none" placeholder="jane@company.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Designation</label>
                    <div className="relative group">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input type="text" className={`w-full pl-12 pr-4 py-3.5 rounded-xl border border-transparent font-bold placeholder:text-slate-400 focus:ring-4 focus:ring-primary/10 transition-all outline-none ${(currentUser?.role === 'Admin' || (currentUser?.role === 'Manager' && editingEmployee?.role === 'Employee') || (!editingEmployee && isManager)) ? 'bg-slate-50 text-slate-900 focus:bg-white focus:border-primary' : 'bg-slate-100 text-slate-400 cursor-not-allowed' }`} placeholder="e.g. Designer" value={newDesignation} onChange={(e) => setNewDesignation(e.target.value)} disabled={!((currentUser?.role === 'Admin') || (currentUser?.role === 'Manager' && (editingEmployee?.role === 'Employee' || (!editingEmployee && true))))} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Role</label>
                    <div className="relative group">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <div className="relative">
                          <select required className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-slate-50 border border-transparent text-slate-900 font-bold focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none" value={newRole} onChange={(e) => setNewRole(e.target.value)} disabled={!isAdmin} >
                            <option value="Employee">Employee</option>
                            {isAdmin && <option value="Manager">Manager</option>}
                            {isAdmin && <option value="Admin">Admin</option>}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Passcode</label>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                          <input required={!showEditModal} type={showPassword ? "text" : "password"} className="w-full pl-10 pr-10 py-3.5 rounded-xl bg-slate-50 border border-transparent text-slate-900 font-bold focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm" placeholder={editingEmployee && currentUser?.id !== editingEmployee.id ? "Enter to reset..." : "Pin"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Joined On</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10"><Calendar className="w-4 h-4 text-slate-400" /></div>
                          <input type="date" className="w-full pl-9 pr-2 py-3.5 rounded-xl bg-slate-50 border border-transparent text-slate-900 font-bold focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm appearance-none cursor-pointer" value={newJoiningDate} onChange={(e) => setNewJoiningDate(e.target.value)} />
                        </div>
                      </div>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <Button type="button" variant="ghost" onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="flex-1 py-3.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Cancel</Button>
                    <Button type="submit" className="flex-[2] bg-gradient-to-r from-primary to-primary/80 hover:to-primary text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary/30 transition-all border-none">
                        {showEditModal ? 'Update Profile' : 'Create Profile'}
                    </Button>
                  </div>
                </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {employeeToDelete && canAddUsers && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-hidden">
           <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
              <div className="flex flex-col items-center text-center">
                 <div className="h-14 w-14 bg-red-100 rounded-2xl flex items-center justify-center mb-4 ring-4 ring-white shadow-sm"><AlertTriangle className="h-7 w-7 text-red-600" /></div>
                 <h3 className="text-xl font-bold text-slate-900 mb-2">Delete User?</h3>
                 <p className="text-slate-500 mb-6 text-sm font-medium">{currentUser?.id === employeeToDelete ? "Warning: You are deleting your own account. This session will end." : "Are you sure you want to remove this user from the directory?"}</p>
                 <div className="flex gap-3 w-full">
                    <Button onClick={() => setEmployeeToDelete(null)} variant="ghost" className="flex-1 text-slate-500 hover:bg-slate-100 py-3 rounded-xl font-bold">Cancel</Button>
                    <Button onClick={confirmDelete} className="flex-1 bg-red-600 text-white hover:bg-red-700 border-none py-3 rounded-xl font-bold shadow-lg shadow-red-100">Confirm</Button>
                 </div>
              </div>
           </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Employees;