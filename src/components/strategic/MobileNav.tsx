'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, Activity, Target, ClipboardList, Settings 
} from 'lucide-react';

const navItems = [
  { href: '/strategic/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/strategic/war-room', icon: Activity, label: 'War Room' },
  { href: '/strategic/action-plans', icon: ClipboardList, label: 'Ações' },
  { href: '/strategic/kpis', icon: Target, label: 'KPIs' },
  { href: '/strategic/settings', icon: Settings, label: 'Config' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" data-tour="sidebar">
      {/* Blur background */}
      <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-xl border-t border-white/10" />
      
      {/* Safe area for iOS */}
      <div className="relative flex items-center justify-around px-2 pt-2 pb-safe">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center py-2 px-4"
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute -top-1 w-12 h-1 rounded-full bg-purple-500"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <Icon 
                size={24} 
                className={isActive ? 'text-purple-400' : 'text-white/50'} 
              />
              <span className={`text-xs mt-1 ${isActive ? 'text-purple-400' : 'text-white/50'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
