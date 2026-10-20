import { Suspense } from "react";
import MinijuegosApp from "@/components/minijuegos/MinijuegosApp";

export default function MinijuegosPage() {
  // useSearchParams (pestaña activa) necesita un Suspense para poder compilar la página.
  return (
    <Suspense fallback={null}>
      <MinijuegosApp />
    </Suspense>
  );
}
