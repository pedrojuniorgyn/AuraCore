'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Bell, User, LogOut, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MenuItem {
  href?: string;
  icon?: string;
  label?: string;
  divider?: boolean;
}

const menuItems: MenuItem[] = [
  { href: '/strategic/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/strategic/war-room', icon: '📊', label: 'War Room' },
  { href: '/strategic/bsc', icon: '🎯', label: 'Mapa BSC' },
  { href: '/strategic/action-plans', icon: '📋', label: 'Planos de Ação' },
  { href: '/strategic/pdca', icon: '🔄', label: 'Ciclos PDCA' },
  { href: '/strategic/kpis', icon: '📈', label: 'KPIs' },
  { divider: true },
  { href: '/strategic/achievements', icon: '🏆', label: 'Conquistas' },
  { href: '/strategic/audit-log', icon: '📜', label: 'Histórico' },
  { href: '/strategic/reports', icon: '📊', label: 'Relatórios' },
  { href: '/strategic/integrations', icon: '🔗', label: 'Integrações' },
  { href: '/strategic/settings', icon: '⚙️', label: 'Configurações' },
];

interface Props {
  user?: { name: string; email: string; avatar?: string };
  notificationCount?: number;
}

export function MobileHeader({ user, notificationCount = 0 }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 md:hidden">
        <div className="bg-gray-900/90 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center justify-between px-4 h-14">
            {/* Menu Button */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-white/10"
            >
              <Menu className="text-white" size={24} />
            </button>

            {/* Logo */}
            <Link href="/strategic/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 
                flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <span className="text-white font-bold">AuraCore</span>
            </Link>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Link
                href="/strategic/notifications"
                className="relative p-2 rounded-lg hover:bg-white/10"
              >
                <Bell className="text-white" size={22} />
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 rounded-full 
                    bg-red-500 text-white text-xs flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </Link>
              <button className="p-2 rounded-lg hover:bg-white/10">
                <User className="text-white" size={22} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Drawer Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 md:hidden"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-gray-900 z-50 md:hidden 
                overflow-y-auto"
            >
              {/* User Info */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                      flex items-center justify-center text-white font-bold">
                      {user?.avatar || user?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="text-white font-medium">{user?.name || 'Usuário'}</p>
                      <p className="text-white/50 text-sm">{user?.email || ''}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 rounded-lg hover:bg-white/10"
                  >
                    <X className="text-white/50" size={20} />
                  </button>
                </div>
              </div>

              {/* Menu Items */}
              <nav className="p-4">
                {menuItems.map((item, i) => {
                  if (item.divider) {
                    return <div key={i} className="my-4 border-t border-white/10" />;
                  }

                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href || '#'}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all
                        ${isActive 
                          ? 'bg-purple-500/20 text-purple-300' 
                          : 'text-white/70 hover:bg-white/10'
                        }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight size={16} className="text-white/30" />
                    </Link>
                  );
                })}
              </nav>

              {/* Logout */}
              <div className="p-4 border-t border-white/10">
                <button
                  onClick={() => {/* TODO: Logout */}}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl w-full 
                    text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <LogOut size={20} />
                  <span>Sair</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
