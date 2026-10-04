import { createHash, randomInt, timingSafeEqual } from "crypto";
import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js";

// Recuperación de cuenta: piezas compartidas por /api/recuperar (pedirla) y
// /api/login (canjear la contraseña temporal). SOLO para código de servidor.

export const MINUTOS_VALIDEZ = 60; // cuánto vale la contraseña temporal
export const MAX_POR_HORA_Y_USUARIO = 3; // peticiones por manager y hora
export const MAX_POR_DIA_TOTAL = 50; // tope global diario: protege la cuota de emails

// 12 caracteres con mayúsculas, minúsculas y números, sin los que se confunden
// al teclearlos (0/O, 1/l/I). ~70 bits de aleatoriedad: con caducidad de 1 hora
// y un solo uso no se puede adivinar.
const MINUSCULAS = "abcdefghijkmnopqrstuvwxyz";
const MAYUSCULAS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const NUMEROS = "23456789";
const LONGITUD = 12;
export const FORMATO_CLAVE = /^[A-Za-z0-9]{12}$/;

function elegir(caracteres: string): string {
  return caracteres[randomInt(caracteres.length)];
}

export function generarClave(): string {
  const todos = MINUSCULAS + MAYUSCULAS + NUMEROS;
  // Al menos una de cada tipo (por si Supabase exige mezcla); el resto al azar.
  const letras = [elegir(MINUSCULAS), elegir(MAYUSCULAS), elegir(NUMEROS)];
  while (letras.length < LONGITUD) letras.push(elegir(todos));
  // Barajar (Fisher-Yates) para que las tres primeras no sean siempre de cada tipo.
  for (let i = letras.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [letras[i], letras[j]] = [letras[j], letras[i]];
  }
  return letras.join("");
}

export function hashClave(clave: string): string {
  return createHash("sha256").update(clave, "utf8").digest("hex");
}

function mismoHash(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && ba.length > 0 && timingSafeEqual(ba, bb);
}

// Cliente con la service role key (se salta RLS). Devuelve null si no está configurada.
export function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createAdminClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const UUID_NULO = "00000000-0000-0000-0000-000000000000";

// ¿Es `password` una contraseña temporal vigente de este email? Si lo es, la
// canjea: la marca como usada, la fija como contraseña real de la cuenta (y da
// el email por confirmado, porque la temporal solo se ha enviado a ese email) y
// devuelve true. El llamador debe iniciar sesión justo después con ella.
//
// Se hace el mismo trabajo exista o no el usuario, para que el tiempo de
// respuesta no delate qué emails están registrados.
export async function canjearClaveTemporal(email: string, password: string): Promise<boolean> {
  const clave = password.trim(); // por si se pega con un espacio al final
  if (!FORMATO_CLAVE.test(clave)) return false;

  const admin = adminClient();
  if (!admin) return false;

  const { data: usuarios } = await admin.rpc("usuario_por_email", { p_email: email });
  const usuario = Array.isArray(usuarios) ? usuarios[0] : null;

  const ahora = new Date().toISOString();
  const { data: pendientes } = await admin
    .from("recuperaciones_cuenta")
    .select("id, clave_hash")
    .eq("user_id", usuario?.id ?? UUID_NULO)
    .is("usada_en", null)
    .gt("caduca_en", ahora);

  if (!usuario) return false;

  const hash = hashClave(clave);
  const valida = (pendientes ?? []).find((fila: { id: string; clave_hash: string }) =>
    mismoHash(fila.clave_hash, hash)
  );
  if (!valida) return false;

  // Reclamarla de forma atómica: si dos peticiones llegan a la vez, solo una gana.
  const { data: reclamada } = await admin
    .from("recuperaciones_cuenta")
    .update({ usada_en: ahora })
    .eq("id", valida.id)
    .is("usada_en", null)
    .select("id");
  if (!reclamada || reclamada.length === 0) return false;

  const { error } = await admin.auth.admin.updateUserById(usuario.id, {
    password: clave,
    email_confirm: true,
  });
  if (error) {
    console.error("Recuperación: no se pudo fijar la contraseña temporal:", error.message);
    return false;
  }

  // Cualquier otra contraseña temporal pendiente de esta cuenta deja de valer.
  await admin
    .from("recuperaciones_cuenta")
    .update({ usada_en: ahora })
    .eq("user_id", usuario.id)
    .is("usada_en", null);

  return true;
}
