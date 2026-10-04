import { RESPONSABLE } from "@/lib/legal/config";

// Correo de "He olvidado la contraseña": nombre de usuario + contraseña temporal.
// Se envía con la API de Resend (sin dependencias nuevas). Variables de entorno:
//   RESEND_API_KEY  clave de API de Resend (la misma que usa Supabase como SMTP)
//   EMAIL_FROM      remitente, p. ej. "Fantasy Beraun Bera <no-reply@fantasy.beraunbera.com>"
//                   (el dominio tiene que estar verificado en Resend)

function esc(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function duracion(minutos: number): string {
  if (minutos === 60) return "1 hora";
  return minutos % 60 === 0 ? `${minutos / 60} horas` : `${minutos} minutos`;
}

export function construirCorreo(datos: {
  nombre: string;
  clave: string;
  urlLogin: string;
  minutos: number;
}) {
  const app = RESPONSABLE.aplicacion;
  const validez = duracion(datos.minutos);
  const asunto = `Recupera tu cuenta de ${app}`;

  const texto = [
    `Hola ${datos.nombre},`,
    ``,
    `Has pedido recuperar tu cuenta de ${app}. Estos son tus datos para entrar:`,
    ``,
    `Nombre de usuario: ${datos.nombre}`,
    `Contraseña temporal: ${datos.clave}`,
    ``,
    `Entra en ${datos.urlLogin} con tu nombre de usuario (o tu email) y esa contraseña. Vale durante ${validez} y solo se puede usar una vez.`,
    ``,
    `Cuando estés dentro, cámbiala por otra desde Mi perfil.`,
    ``,
    `Si no has sido tú, ignora este correo: tu contraseña de siempre sigue funcionando.`,
  ].join("\n");

  const html = `<div style="font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.5">
  <h2 style="margin:0 0 12px;font-size:20px">Recupera tu cuenta</h2>
  <p style="margin:0 0 16px">Has pedido recuperar tu cuenta de ${esc(app)}. Estos son tus datos para entrar:</p>
  <table style="border-collapse:collapse;margin:0 0 16px;width:100%">
    <tr>
      <td style="padding:8px 12px;border:1px solid #e5e5e5;color:#666;font-size:13px">Nombre de usuario</td>
      <td style="padding:8px 12px;border:1px solid #e5e5e5;font-weight:600">${esc(datos.nombre)}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;border:1px solid #e5e5e5;color:#666;font-size:13px">Contraseña temporal</td>
      <td style="padding:8px 12px;border:1px solid #e5e5e5;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:16px;font-weight:600;letter-spacing:1px">${esc(datos.clave)}</td>
    </tr>
  </table>
  <p style="margin:0 0 16px">Entra en <a href="${esc(datos.urlLogin)}">${esc(datos.urlLogin)}</a> con tu nombre de usuario (o tu email) y esa contraseña. Vale durante ${validez} y solo se puede usar una vez.</p>
  <p style="margin:0 0 16px">Cuando estés dentro, cámbiala por otra desde <strong>Mi perfil</strong>.</p>
  <p style="margin:0;color:#666;font-size:13px">Si no has sido tú, ignora este correo: tu contraseña de siempre sigue funcionando.</p>
</div>`;

  return { asunto, texto, html };
}

export async function enviarCorreo(datos: {
  a: string;
  asunto: string;
  texto: string;
  html: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return false;

  try {
    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [datos.a],
        subject: datos.asunto,
        text: datos.texto,
        html: datos.html,
      }),
    });
    if (!respuesta.ok) {
      // Se registra el motivo de Resend (p. ej. dominio sin verificar), nunca la clave.
      console.error("Resend rechazó el correo:", respuesta.status, await respuesta.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("No se pudo contactar con Resend:", e);
    return false;
  }
}
