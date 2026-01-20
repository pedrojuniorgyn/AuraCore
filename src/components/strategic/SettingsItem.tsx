"use client";

/**
 * SettingsItem - Item de configuração individual
 * 
 * @module components/strategic
 */
import { ReactNode } from 'react';
import { SettingsToggle } from './SettingsToggle';

interface Props {
  label: string;
  description?: string;
  children?: ReactNode;
  toggle?: {
    enabled: boolean;
    onChange: (enabled: boolean) => void;
  };
}

export function SettingsItem({ label, description, children, toggle }: Props) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <p className="text-white font-medium">{label}</p>
        {description && (
          <p className="text-white/50 text-sm mt-1">{description}</p>
        )}
        {children && <div className="mt-3">{children}</div>}
      </div>
      {toggle && (
        <SettingsToggle enabled={toggle.enabled} onChange={toggle.onChange} />
      )}
    </div>
  );
}
