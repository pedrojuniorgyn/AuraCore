/**
 * 🚗 License Plate Component
 * Renderiza placa de veículo com estilo realista (Antiga ou Mercosul)
 */

import React from "react";
import { isMercosulPlate, formatPlate } from "@/lib/validators/fleet-validators";

interface LicensePlateProps {
  plate: string;
  size?: "sm" | "md" | "lg";
}

export function LicensePlate({ plate, size = "md" }: LicensePlateProps) {
  const isMercosul = isMercosulPlate(plate);
  const formatted = formatPlate(plate);

  // Tamanhos
  const sizeClasses = {
    sm: "text-xs px-2 py-1 w-24",
    md: "text-sm px-3 py-1.5 w-32",
    lg: "text-base px-4 py-2 w-40",
  };

  return (
    <div className={`inline-flex flex-col ${sizeClasses[size]}`}>
      {/* Tarja Superior "BRASIL" */}
      <div
        className={`${
          isMercosul ? "bg-white" : "bg-blue-600"
        } text-center font-bold text-[10px] leading-tight ${
          isMercosul ? "text-blue-600" : "text-white"
        }`}
      >
        {isMercosul ? "BRASIL" : "BRASIL"}
      </div>

      {/* Placa */}
      <div
        className={`${
          isMercosul ? "bg-white border-2 border-blue-600" : "bg-white border-2 border-gray-700"
        } flex items-center justify-center font-mono font-black text-gray-900 tracking-widest rounded-sm shadow-md`}
      >
        {formatted}
      </div>

      {/* Borda Inferior (Mercosul tem flag azul) */}
      {isMercosul && (
        <div className="bg-blue-600 h-1 w-full"></div>
      )}
    </div>
  );
}

















