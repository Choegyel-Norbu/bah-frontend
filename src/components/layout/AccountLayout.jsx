import { NavLink, Outlet } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/context/AuthContext';
import { User, Settings, Shield, Package, Heart, ChevronRight } from 'lucide-react';

function isAdmin(user) {
  return user?.role === 'ADMIN' || user?.role === 'ROLE_ADMIN';
}

export default function AccountLayout() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-quaternary">
        <div className="mx-auto max-w-7xl px-4 pt-4 pb-8 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
            {/* Left sidebar navigation */}
            <aside
              className="w-full shrink-0 border-b border-border bg-white/95 backdrop-blur sm:rounded-2xl sm:border sm:bg-white sm:px-2 sm:py-2 sm:shadow lg:w-56 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none lg:sticky lg:top-[7rem] lg:self-start"
              aria-label="Account navigation"
            >
              <nav className="w-full overflow-x-auto scrollbar-hide px-2 py-3 sm:px-3 sm:py-2 lg:overflow-visible lg:px-0 lg:py-0">
                <ul className="flex flex-row items-center gap-2 lg:flex-col lg:items-stretch lg:gap-0 lg:space-y-0.5">
                  <li>
                    <NavLink
                      to="/profile"
                      end
                      className={({ isActive }) =>
                        `flex flex-none items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors lg:flex-auto lg:rounded-2xl lg:px-3 lg:py-2.5 ${
                          isActive ? 'bg-primary text-quaternary' : 'text-primary hover:bg-tertiary/20'
                        }`
                      }
                    >
                      <User className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="whitespace-nowrap">Profile</span>
                      <ChevronRight className="hidden h-4 w-4 shrink-0 opacity-70 lg:block" aria-hidden />
                    </NavLink>
                  </li>
                  {!isAdmin(user) && user && (
                    <li>
                      <NavLink
                        to="/account/orders"
                        end={false}
                        className={({ isActive }) =>
                          `flex flex-none items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors lg:flex-auto lg:rounded-2xl lg:px-3 lg:py-2.5 ${
                            isActive ? 'bg-primary text-quaternary' : 'text-primary hover:bg-tertiary/20'
                          }`
                        }
                      >
                        <Package className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="whitespace-nowrap">Orders</span>
                        <ChevronRight className="hidden h-4 w-4 shrink-0 opacity-70 lg:block" aria-hidden />
                      </NavLink>
                    </li>
                  )}
                  {!isAdmin(user) && user && (
                    <li>
                      <NavLink
                        to="/account/wishlist"
                        className={({ isActive }) =>
                          `flex flex-none items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors lg:flex-auto lg:rounded-2xl lg:px-3 lg:py-2.5 ${
                            isActive ? 'bg-primary text-quaternary' : 'text-primary hover:bg-tertiary/20'
                          }`
                        }
                      >
                        <Heart className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="whitespace-nowrap">Wishlist</span>
                        <ChevronRight className="hidden h-4 w-4 shrink-0 opacity-70 lg:block" aria-hidden />
                      </NavLink>
                    </li>
                  )}
                  <li>
                    <NavLink
                      to="/account/settings"
                      className={({ isActive }) =>
                        `flex flex-none items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors lg:flex-auto lg:rounded-2xl lg:px-3 lg:py-2.5 ${
                          isActive ? 'bg-primary text-quaternary' : 'text-primary hover:bg-tertiary/20'
                        }`
                      }
                    >
                      <Settings className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="whitespace-nowrap">Settings</span>
                      <ChevronRight className="hidden h-4 w-4 shrink-0 opacity-70 lg:block" aria-hidden />
                    </NavLink>
                  </li>
                  {isAdmin(user) && (
                    <li>
                      <div className="my-2 hidden border-t border-border lg:block" />
                      <NavLink
                        to="/admin/products"
                        className={({ isActive }) =>
                          `flex flex-none items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors lg:flex-auto lg:rounded-2xl lg:px-3 lg:py-2.5 ${
                            isActive ? 'bg-primary text-quaternary' : 'text-primary hover:bg-tertiary/20'
                          }`
                        }
                      >
                        <Shield className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="whitespace-nowrap">Admin</span>
                        <ChevronRight className="hidden h-4 w-4 shrink-0 opacity-70 lg:block" aria-hidden />
                      </NavLink>
                    </li>
                  )}
                </ul>
              </nav>
            </aside>

            {/* Page content */}
            <div className="min-w-0 flex-1">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
