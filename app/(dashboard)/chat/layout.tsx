import SubpestanasChat from "@/components/SubpestanasChat";

// Chat · Foros: las subpestañas van encima de las dos listas (el chat de siempre y el
// foro). Dentro de un tema o al crear uno no se ven.
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubpestanasChat />
      {children}
    </>
  );
}
