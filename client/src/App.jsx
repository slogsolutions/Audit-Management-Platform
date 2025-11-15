import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthProvider';
import './App.css';

// Layout & UI
import Sidebar from './components/SideBars';
import Topbar from './components/Topbar';

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
 * ProtectedRoute - inline component that redirects to /login when not authenticated.
 */
function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

/**
 * NotFound simple fallback
 */
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

/**
 * App - main app that contains routes and layout.
 * Sidebar/Topbar are rendered here so they appear across protected routes.
 */
export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const { token } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected routes with layout */}
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
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/categories" element={<Categories />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/deep-search" element={<DeepSearch />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </main>
              </div>
            </div>
          </ProtectedRoute>
        }
      />

      {/* Root redirect */}
      <Route path="/" element={<Navigate to={token ? "/dashboard" : "/home"} replace />} />
    </Routes>
  );
}
