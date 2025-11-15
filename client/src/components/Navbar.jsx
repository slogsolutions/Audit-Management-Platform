import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  LogOut,
  User,
  Bell,
  Home,
  LogIn,
  UserPlus,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3">
            <Link to={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow-md">
                <Home className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">ExpenseFlow</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard">
                  <Button
                    variant={isActive('/dashboard') ? 'default' : 'ghost'}
                    className={isActive('/dashboard') ? 'bg-gradient-primary text-white' : ''}
                  >
                    Dashboard
                  </Button>
                </Link>
                <Link to="/transactions">
                  <Button
                    variant={isActive('/transactions') ? 'default' : 'ghost'}
                    className={isActive('/transactions') ? 'bg-gradient-primary text-white' : ''}
                  >
                    Transactions
                  </Button>
                </Link>
                <Link to="/invoices">
                  <Button
                    variant={isActive('/invoices') ? 'default' : 'ghost'}
                    className={isActive('/invoices') ? 'bg-gradient-primary text-white' : ''}
                  >
                    Invoices
                  </Button>
                </Link>
                <Link to="/categories">
                  <Button
                    variant={isActive('/categories') ? 'default' : 'ghost'}
                    className={isActive('/categories') ? 'bg-gradient-primary text-white' : ''}
                  >
                    Categories
                  </Button>
                </Link>
                <Link to="/users">
                  <Button
                    variant={isActive('/users') ? 'default' : 'ghost'}
                    className={isActive('/users') ? 'bg-gradient-primary text-white' : ''}
                  >
                    Users
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/">
                  <Button variant="ghost">Home</Button>
                </Link>
              </>
            )}
          </div>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
                </Button>
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="hover:bg-destructive hover:text-destructive-foreground"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-gradient-primary text-white">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4 space-y-2">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    Dashboard
                  </Button>
                </Link>
                <Link to="/transactions" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    Transactions
                  </Button>
                </Link>
                <Link to="/invoices" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    Invoices
                  </Button>
                </Link>
                <Link to="/categories" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    Categories
                  </Button>
                </Link>
                <Link to="/users" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    Users
                  </Button>
                </Link>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3 px-3 py-2 mb-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user?.name || 'User'}</p>
                      <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="w-full hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    Home
                  </Button>
                </Link>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <LogIn className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full bg-gradient-primary text-white">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
