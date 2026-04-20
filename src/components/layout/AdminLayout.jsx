import { NavLink, Outlet } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Package, ShoppingCart, LayoutDashboard, Settings, Users, BarChart3 } from 'lucide-react';

const SIDEBAR_ITEMS = [
  { to: '/admin', end: true, label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/products', end: false, label: 'Products', icon: Package },
  { to: '/admin/orders', end: true, label: 'Orders', icon: ShoppingCart },
  // Placeholder items for future features to flesh out the sidebar
  { to: '/admin/customers', end: true, label: 'Customers', icon: Users, disabled: true },
  { to: '/admin/analytics', end: true, label: 'Analytics', icon: BarChart3, disabled: true },
  { to: '/admin/settings', end: true, label: 'Settings', icon: Settings, disabled: true },
];

export default function AdminLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      <Header />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Sidebar - does not scroll; only main content scrolls */}
        <aside className="z-30 flex w-full shrink-0 flex-col border-b border-gray-200 bg-white lg:flex lg:h-full lg:w-64 lg:flex-col lg:border-b-0 lg:border-r">
          <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden lg:p-6">
            {/* Desktop Header - Hidden on mobile */}
            <div className="hidden px-2 mb-8 lg:block">
              <h2 className="font-brand text-xl text-primary">Dashboard</h2>
              <p className="mt-1 text-xs text-secondary/60">Manage your store</p>
            </div>

            <nav className="overflow-x-auto scrollbar-hide">
              <ul className="flex min-w-full gap-2 p-4 lg:flex-col lg:gap-1 lg:p-0">
                {SIDEBAR_ITEMS.map(({ to, end, label, icon: Icon, disabled }) => (
                  <li key={to} className="shrink-0 lg:w-full">
                    {disabled ? (
                      <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-tertiary/50 cursor-not-allowed lg:gap-3 lg:px-4 lg:py-2.5">
                        <Icon className="h-4 w-4 lg:h-5 lg:w-5" strokeWidth={1.5} />
                        <span>{label}</span>
                      </div>
                    ) : (
                      <NavLink
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                          `group flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 lg:gap-3 lg:px-4 lg:py-2.5 ${
                            isActive
                              ? 'bg-primary text-white shadow-md shadow-primary/20'
                              : 'text-secondary hover:bg-gray-50 hover:text-primary'
                          }`
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0 lg:h-5 lg:w-5" strokeWidth={1.5} />
                        <span className="whitespace-nowrap">{label}</span>
                      </NavLink>
                    )}
                  </li>
                ))}
              </ul>
            </nav>

            {/* Desktop Tips - Hidden on mobile */}
            <div className="mt-10 hidden rounded-xl bg-gray-50 p-4 lg:block">
              <h3 className="font-brand text-sm text-primary">Quick Tips</h3>
              <p className="mt-2 text-xs text-secondary/70 leading-relaxed">
                Check the orders page daily for new shipments. Keep product inventory up to date.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content - only this area scrolls */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
