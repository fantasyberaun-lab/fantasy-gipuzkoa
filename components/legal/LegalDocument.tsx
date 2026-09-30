import type { Bloque, Seccion } from "@/lib/legal/tipos";

// Convierte **negrita**, correos y la web del club en elementos.
function Texto({ texto }: { texto: string }) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {partes.map((parte, i) => {
        if (parte.startsWith("**") && parte.endsWith("**")) {
          return <strong key={i}>{parte.slice(2, -2)}</strong>;
        }
        const trozos = parte.split(/([\w.+-]+@[\w-]+\.[\w.-]+|www\.[\w.-]+\.[a-z]{2,})/g);
        return trozos.map((t, j) => {
          if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(t)) {
            return (
              <a key={`${i}-${j}`} href={`mailto:${t}`} className="text-accent underline underline-offset-2">
                {t}
              </a>
            );
          }
          if (/^www\.[\w.-]+\.[a-z]{2,}$/.test(t)) {
            return (
              <a
                key={`${i}-${j}`}
                href={`https://${t}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2"
              >
                {t}
              </a>
            );
          }
          return <span key={`${i}-${j}`}>{t}</span>;
        });
      })}
    </>
  );
}

function BloqueVista({ bloque }: { bloque: Bloque }) {
  switch (bloque.tipo) {
    case "p":
      return (
        <p className="text-sm leading-relaxed">
          <Texto texto={bloque.texto} />
        </p>
      );
    case "ul":
      return (
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
          {bloque.items.map((item, i) => (
            <li key={i}>
              <Texto texto={item} />
            </li>
          ))}
        </ul>
      );
    case "lineas":
      return (
        <div className="rounded-lg bg-neutral-50 p-3 text-sm leading-relaxed dark:bg-neutral-900">
          {bloque.lineas.map((l, i) => (
            <p key={i}>
              <Texto texto={l} />
            </p>
          ))}
        </div>
      );
    case "destacado":
      return (
        <p className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm font-medium leading-relaxed">
          <Texto texto={bloque.texto} />
        </p>
      );
  }
}

export default function LegalDocument({
  titulo,
  subtitulo,
  secciones,
  pie,
  children,
}: {
  titulo: string;
  subtitulo: string;
  secciones: Seccion[];
  pie: string;
  children?: React.ReactNode;
}) {
  return (
    <article className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">{titulo}</h1>
        <p className="mt-1 text-sm text-neutral-500">{subtitulo}</p>
      </header>

      {children}

      {secciones.map((s) => (
        <section key={s.titulo} className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">{s.titulo}</h2>
          {s.bloques.map((b, i) => (
            <BloqueVista key={i} bloque={b} />
          ))}
        </section>
      ))}

      <p className="border-t border-neutral-200 pt-4 text-xs text-neutral-500 dark:border-neutral-800">
        {pie}
      </p>
    </article>
  );
}
