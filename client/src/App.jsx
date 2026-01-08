import React, { useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'; // Added Outlet
import { useAuth } from './context/AuthProvider';
import './App.css';

// Layout & UI
import Sidebar from './components/SideBars';
import Topbar from './components/Topbar';
import Navbar from './components/Navbar';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Users from './pages/Users';
import Categories from './pages/Categories';
import Invoices from './pages/Invoices';
import DeepSearch from './pages/DeepSearch';

/**
 * ProtectedRoute - redirects to /login when not authenticated.
 */
function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

/**
 * PublicLayout - Wraps public pages to include the Navbar
 */
function PublicLayout() {
  return (
    <>
      <Navbar />
      <Outlet /> {/* This renders the child route (Home, Login, etc) */}
    </>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold gradient-text">404</h2>
        <p className="text-muted-foreground text-lg">The page you are looking for does not exist.</p>
      </div>
    </div>
  );
}

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const { token } = useAuth();

  return (
    <Routes>
      {/* --- PUBLIC ROUTES (With Navbar) --- */}
      <Route element={<PublicLayout />}>
        {/* If user is logged in, hitting '/' sends them to dashboard, otherwise Home */}
        <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* --- PROTECTED ROUTES (With Sidebar & Topbar) --- */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <div className="h-screen flex bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
              <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed(c => !c)} />
              <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-6">
                  <Routes>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="transactions" element={<Transactions />} />
                    <Route path="users" element={<Users />} />
                    <Route path="categories" element={<Categories />} />
                    <Route path="invoices" element={<Invoices />} />
                    <Route path="deep-search" element={<DeepSearch />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </div>
            </div>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}