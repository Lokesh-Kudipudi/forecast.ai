import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { NAV_ITEMS } from '../../router/routes';

export function Navbar() {
  const env = import.meta.env.VITE_APP_ENV || 'staging';

  return (
    <nav className="sticky top-0 z-50 h-[60px] border-b border-border bg-surface shadow-card">
      <div className="mx-auto flex h-full max-w-[1240px] items-center justify-between px-6">
        {/* Left Side: Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-gradient-to-br from-[#38BDF8] to-[#0D9488] font-sans text-base font-bold text-white shadow-sm">
            F
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-sans text-[15px] font-bold text-text">forecast.ai</span>
            <span className="font-sans text-[10px] font-medium text-text-subtle">MLOps Ops Console</span>
          </div>
        </div>

        {/* Center Side: Nav Links */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-sm px-3 py-2 font-sans text-[13px] font-medium transition-colors',
                  isActive
                    ? 'bg-primary-soft font-semibold text-primary-hover'
                    : 'text-text-muted hover:bg-surface-muted hover:text-text'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Right Side: Env Pill & Avatar */}
        <div className="flex items-center gap-3">
          <span className="rounded-pill bg-accent-soft px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-wider text-accent shadow-sm">
            {env}
          </span>
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-surface-sky font-sans text-[13px] font-bold text-primary-hover shadow-sm">
            OP
          </div>
        </div>
      </div>
    </nav>
  );
}
