import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, List, Users, Layers, Menu, X, FileText, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Sidebar({ collapsed, onCollapse }) {
  const loc = useLocation();
  const items = [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/transactions', label: 'Transactions', icon: List },
    { to: '/deep-search', label: 'Deep Search', icon: Search },
    { to: '/invoices', label: 'Invoices', icon: FileText },
    { to: '/users', label: 'Users', icon: Users },
    { to: '/categories', label: 'Categories', icon: Layers }
  ];

  return (
    <aside className={cn(
      'bg-sidebar text-sidebar-foreground h-full shadow-xl transition-all duration-300 flex flex-col',
      collapsed ? 'w-20' : 'w-64'
    )}>
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-sidebar-border shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
              <Home className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold">ExpenseFlow</span>
          </div>
        )}
        <button
          onClick={onCollapse}
          className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation - Takes remaining space */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto min-h-0">
        {items.map(item => {
          const Icon = item.icon;
          const active = loc.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                active && 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md',
                collapsed && 'justify-center'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer - Fixed at bottom */}
      {!collapsed && (
        <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/60 shrink-0">
          <p>© 2024 ExpenseFlow</p>
        </div>
      )}
    </aside>
  );
}
