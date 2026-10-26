"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useChat } from "@/components/ChatProvider";
import { useIdioma } from "@/components/IdiomaProvider";

// Chat · Foros. Se ve en las dos listas; dentro de un tema o al crear uno, no.
export default function SubpestanasChat() {
  const pathname = usePathname() ?? "";
  const tf = useIdioma().t.foros;
  const { globoChat, globoForos } = useChat();

  const enForos = pathname === "/chat/foros";
  const enChat = pathname === "/chat";
  if (!enForos && !enChat) return null;

  const items = [
    { href: "/chat", texto: tf.chat, activa: enChat, globo: enChat ? 0 : globoChat },
    { href: "/chat/foros", texto: tf.foros, activa: enForos, globo: enForos ? 0 : globoForos },
  ];

  return (
    <nav
      aria-label={tf.subpestanas}
      className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900"
    >
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={it.activa ? "page" : undefined}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
            it.activa
              ? "bg-accent text-white shadow-sm"
              : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
          }`}
        >
          {it.texto}
          {it.globo > 0 && (
            <span className="rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold leading-none text-brand-950">
              {it.globo > 9 ? "9+" : it.globo}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
