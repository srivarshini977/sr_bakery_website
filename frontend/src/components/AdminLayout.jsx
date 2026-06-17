import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Boxes, FileText, Home, Inbox, LayoutDashboard, Package, Receipt, Settings, ShoppingBag, SlidersHorizontal, Users } from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'master', label: 'Master Management', icon: SlidersHorizontal },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'messages', label: 'Messages', icon: Inbox },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings }
];

const AdminLayout = ({ children, activeSection = 'dashboard', onSectionChange }) => {
  return (
    <div className="flex h-screen min-h-0 w-full overflow-hidden bg-bakery-darkGray">
      <aside className="hidden w-64 shrink-0 overflow-y-auto bg-bakery-black/60 p-4 md:block xl:w-72">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="text-bakery-gold font-bold text-lg">Admin</div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded bg-zinc-900 px-3 py-2 text-sm font-bold text-gray-200 transition hover:bg-zinc-800 hover:text-white"
          >
            <Home size={16} />
            Home
          </Link>
        </div>
        <nav className="flex flex-col gap-2 text-gray-300">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSectionChange?.(item.id)}
                className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left transition ${
                  active ? 'bg-bakery-red text-white shadow-neon-red' : 'hover:bg-white/5'
                }`}
              >
                <Icon className="shrink-0" size={17} />
                <span className="min-w-0 truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-red-950/60 bg-bakery-black/70 px-3 py-3 md:hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-bakery-gold font-bold">Admin</div>
            <Link
              to="/"
              className="inline-flex shrink-0 items-center gap-2 rounded bg-zinc-900 px-3 py-2 text-sm font-bold text-gray-200 transition hover:bg-zinc-800 hover:text-white"
            >
              <Home size={16} />
              Home
            </Link>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1 text-gray-300">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSectionChange?.(item.id)}
                  className={`flex shrink-0 items-center gap-2 rounded px-3 py-2 text-sm transition ${
                    active ? 'bg-bakery-red text-white shadow-neon-red' : 'bg-zinc-900 hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-5">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
