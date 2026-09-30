import { redondear2 } from "@/lib/saldo";

// "125 M (-57)": el saldo y, en rojo y con letra más fina, lo que ya tienes
// comprometido en pujas abiertas. Es un dato secundario: el saldo real no
// cambia hasta que se resuelve la tanda.
export default function SaldoConPujas({
  saldo,
  comprometido,
}: {
  saldo: number;
  comprometido: number;
}) {
  return (
    <>
      {redondear2(saldo)} M
      {comprometido > 0 && (
        <span
          title="Comprometido en tus pujas abiertas"
          className="ml-1.5 align-baseline text-[0.75em] font-light text-negative dark:text-red-400"
        >
          (-{redondear2(comprometido)})
        </span>
      )}
    </>
  );
}
