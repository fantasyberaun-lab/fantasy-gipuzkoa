"use client";

import { redondear2 } from "@/lib/saldo";
import { useT } from "@/components/IdiomaProvider";

// "125 M (-57)": el saldo y, en rojo y con letra más fina, lo que ya tienes
// comprometido en pujas abiertas. Es un dato secundario: el saldo real no
// cambia hasta que se resuelve la tanda.
// Con `debajo`, lo comprometido va en su propia línea bajo el saldo (cabecera,
// donde un saldo de 3 cifras junto a "(-213.47)" no cabe en una sola línea).
export default function SaldoConPujas({
  saldo,
  comprometido,
  debajo = false,
}: {
  saldo: number;
  comprometido: number;
  debajo?: boolean;
}) {
  const t = useT();
  return (
    <>
      {redondear2(saldo)} M
      {comprometido > 0 && (
        <span
          title={t.saldo.comprometido}
          className={
            debajo
              ? "block text-xs font-light leading-tight text-negative dark:text-red-400"
              : "ml-1.5 align-baseline text-[0.75em] font-light text-negative dark:text-red-400"
          }
        >
          (-{redondear2(comprometido)})
        </span>
      )}
    </>
  );
}
