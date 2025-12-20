
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import Auth from './pages/Auth';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Breaks from './pages/Breaks';
import Leaves from './pages/Leaves';
import TeamDashboard from './pages/TeamDashboard';
import Employees from './pages/Employees';
import Profile from './pages/Profile';
import Tasks from './pages/Tasks';

// Theme Definitions (HSL Values)
const themes: Record<string, { primary: string; ring: string }> = {
  emerald: { primary: '160 84% 39%', ring: '160 84% 39%' }, // Default Green
  blue: { primary: '221 83% 53%', ring: '221 83% 53%' },    // Bright Blue
  violet: { primary: '262 83% 58%', ring: '262 83% 58%' },  // Royal Purple
  rose: { primary: '346 84% 61%', ring: '346 84% 61%' },    // Hot Pink/Red
  amber: { primary: '45 93% 47%', ring: '45 93% 47%' },     // Golden Orange
  slate: { primary: '222 47% 11%', ring: '222 47% 11%' },   // Dark/Professional
};

const App: React.FC = () => {
  const { themeColor } = useStore();

  // Apply Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    const selectedTheme = themes[themeColor] || themes.emerald;

    // Set CSS Variables dynamically
    root.style.setProperty('--primary', selectedTheme.primary);
    root.style.setProperty('--ring', selectedTheme.ring);
    root.style.setProperty('--primary-foreground', '210 40% 98%');
    
  }, [themeColor]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Main Landing Page (Login/Signup/Forgot) */}
        <Route path="/" element={<Auth />} />
        
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/breaks" element={<Breaks />} />
          <Route path="/leaves" element={<Leaves />} />
          <Route path="/team" element={<TeamDashboard />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
