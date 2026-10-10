// Tema claro / oscuro. Se guarda en localStorage("theme") como "light" o
// "dark"; si no hay nada guardado se sigue el del dispositivo ("sistema").
// La clase "dark" de <html> es la que activa las variantes dark: de Tailwind.

export type PreferenciaTema = "claro" | "oscuro" | "sistema";

const CLAVE = "theme";

export function leerPreferenciaTema(): PreferenciaTema {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === "dark") return "oscuro";
    if (guardado === "light") return "claro";
  } catch {
    // localStorage puede no estar disponible (modo privado, etc.).
  }
  return "sistema";
}

export function sistemaEsOscuro(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// Devuelve si el tema resultante es oscuro.
export function aplicarTema(preferencia: PreferenciaTema): boolean {
  const oscuro = preferencia === "sistema" ? sistemaEsOscuro() : preferencia === "oscuro";
  document.documentElement.classList.toggle("dark", oscuro);
  return oscuro;
}

export function guardarPreferenciaTema(preferencia: PreferenciaTema): boolean {
  try {
    if (preferencia === "sistema") localStorage.removeItem(CLAVE);
    else localStorage.setItem(CLAVE, preferencia === "oscuro" ? "dark" : "light");
  } catch {
    // No es crítico: el tema se aplica igual en esta visita.
  }
  return aplicarTema(preferencia);
}
