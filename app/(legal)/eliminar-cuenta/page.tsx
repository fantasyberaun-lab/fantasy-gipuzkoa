import type { Metadata } from "next";
import Link from "next/link";
import { RESPONSABLE } from "@/lib/legal/config";

export const metadata: Metadata = {
  title: "Eliminar cuenta · Beraun Fantasy",
};

// Página pública con las instrucciones para borrar la cuenta. Google Play exige
// una URL web (sin sesión) donde se explique cómo pedirlo.
export default function EliminarCuentaPage() {
  return (
    <article className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">
          Eliminar tu cuenta de Beraun Fantasy
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {RESPONSABLE.aplicacion} · {RESPONSABLE.nombreComercial}
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Desde la aplicación</h2>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>
            <Link href="/login" className="underline underline-offset-2">
              Inicia sesión
            </Link>{" "}
            en Beraun Fantasy.
          </li>
          <li>Abre el menú de ajustes.</li>
          <li>Pulsa «Eliminar cuenta».</li>
          <li>Escribe la palabra de confirmación y pulsa «Eliminar cuenta».</li>
        </ol>
        <p className="text-sm">
          El borrado es inmediato y no se puede deshacer.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Qué se borra</h2>
        <p className="text-sm">
          Se eliminan tu cuenta (alias, correo y contraseña), tu perfil, tu equipo, tu
          saldo, tu plantilla, tus pujas y ofertas, tus mensajes del chat y los foros,
          y tu registro de actividad. Tus jugadores vuelven al mercado.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Qué se conserva y durante cuánto tiempo</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>
            La constancia de las aceptaciones de las condiciones y la política de
            privacidad se conserva durante el plazo de prescripción de las posibles
            responsabilidades legales.
          </li>
          <li>
            Las denuncias de chat y las medidas de moderación se conservan 12 meses.
          </li>
          <li>
            Las copias de seguridad del proveedor pueden conservar datos ya borrados
            durante su ciclo de rotación, sin que se restauren salvo catástrofe.
          </li>
        </ul>
        <p className="text-sm">
          Más información en la{" "}
          <Link href="/privacidad" className="underline underline-offset-2">
            política de privacidad
          </Link>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">¿No puedes entrar en tu cuenta?</h2>
        <p className="text-sm">
          Escríbenos a{" "}
          <a href={`mailto:${RESPONSABLE.email}`} className="underline underline-offset-2">
            {RESPONSABLE.email}
          </a>{" "}
          desde el correo con el que te registraste, indicando tu nombre de usuario, y
          borraremos tu cuenta.
        </p>
      </section>
    </article>
  );
}
