// Curva de niveles. Mantener igual que xp_para_nivel() / nivel_de_xp() en
// 0086_niveles.sql (los dos números viven en game_config, clave 'nivel_curva').
//
// XP total necesaria para alcanzar el nivel n = K x (n - 1)^EXP, redondeada al
// múltiplo de 5. Nivel 1 = 0 XP, nivel 2 = 5, nivel 6 = 285, nivel 26 = 11.490.
// No hay nivel máximo: tras el último icono se siguen ganando niveles.
const K = 7;
const EXP = 2.3;

export function xpParaNivel(nivel: number): number {
  if (nivel <= 1) return 0;
  return Math.round((K * Math.pow(nivel - 1, EXP)) / 5) * 5;
}

export function nivelDeXp(xp: number): number {
  let nivel = 1;
  while (xpParaNivel(nivel + 1) <= xp) nivel++;
  return nivel;
}

// Fracción (0-1) recorrida dentro del nivel actual, para la barra de XP.
export function progresoNivel(xp: number): number {
  const nivel = nivelDeXp(xp);
  const inicio = xpParaNivel(nivel);
  const fin = xpParaNivel(nivel + 1);
  return fin > inicio ? Math.min(1, Math.max(0, (xp - inicio) / (fin - inicio))) : 0;
}

// XP por fuente. Mantener igual que game_config ('xp_login', 'xp_cofre',
// 'xp_por_punto'); solo se usan para explicar al usuario de dónde sale la XP.
export const XP_LOGIN = 10;
export const XP_COFRE = 100;
export const XP_POR_PUNTO = 3;
