"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  subtitle?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  borderColor?: string;
  focusColor?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  emptyText = "Nenhum resultado encontrado",
  className,
  disabled = false,
  required = false,
  borderColor = "border-purple-500/30",
  focusColor = "ring-purple-500",
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(searchLower) ||
        option.subtitle?.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "w-full px-4 py-3 bg-gray-900/50 border rounded-lg",
          "text-left text-white transition-all",
          "flex items-center justify-between",
          "hover:border-opacity-50",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          borderColor,
          open && `ring-2 ${focusColor} border-transparent`
        )}
      >
        <span className={cn(!value && "text-slate-500")}>
          {selectedOption ? (
            <span className="flex flex-col">
              <span>{selectedOption.label}</span>
              {selectedOption.subtitle && (
                <span className="text-xs text-slate-400">
                  {selectedOption.subtitle}
                </span>
              )}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute z-50 w-full mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-64 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">
                  {emptyText}
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={cn(
                      "w-full px-4 py-3 text-left transition-colors",
                      "hover:bg-gray-800 flex items-center justify-between",
                      value === option.value && "bg-gray-800/50"
                    )}
                  >
                    <span className="flex flex-col flex-1">
                      <span className="text-white text-sm">{option.label}</span>
                      {option.subtitle && (
                        <span className="text-xs text-slate-400 mt-0.5">
                          {option.subtitle}
                        </span>
                      )}
                    </span>
                    {value === option.value && (
                      <Check className="h-4 w-4 text-purple-400 shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}












