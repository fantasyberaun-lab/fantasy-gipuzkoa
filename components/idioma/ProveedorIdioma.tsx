"use client";

import dynamic from "next/dynamic";
import type { Idioma } from "@/lib/i18n/config";

// Cada idioma es un trozo de JS aparte que solo se descarga si el jugador lo usa
// (carga diferida con import()). Con imports normales los tres idiomas viajarían
// juntos en el layout, que es lo que había antes (~80 KB comprimidos).
// next/dynamic renderiza en servidor y precarga el trozo del idioma activo en el HTML.
const PROVEEDORES = {
  es: dynamic(() => import("./ProveedorEs")),
  eu: dynamic(() => import("./ProveedorEu")),
  en: dynamic(() => import("./ProveedorEn")),
} as const;

export default function ProveedorIdioma({
  idioma,
  children,
}: {
  idioma: Idioma;
  children: React.ReactNode;
}) {
  const Proveedor = PROVEEDORES[idioma];
  return <Proveedor>{children}</Proveedor>;
}
