export default function SaldoCard({ saldo }: { saldo: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
        Saldo
      </p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        {saldo} M
      </p>
    </div>
  );
}