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
        <h1 className="font-display text-2xl font-semibold">Eliminar tu cuenta</h1>
        <p className="mt-1 text-sm text-neutral-500">{RESPONSABLE.aplicacion}</p>
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
          Se eliminan tu cuenta, tu perfil, tu equipo, tu saldo, tu plantilla, tus
          pujas y ofertas. Tus jugadores vuelven al mercado.
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
