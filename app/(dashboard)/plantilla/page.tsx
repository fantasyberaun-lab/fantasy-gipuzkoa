import PlayerCard from "@/components/PlayerCard";
import { mockPlantilla } from "@/lib/mockData";

export default function PlantillaPage() {
  // TODO: sustituir mockPlantilla por la consulta real a Supabase
  // (tabla squad_slots + players + results de la jornada actual).
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {mockPlantilla.map((slot) => (
        <PlayerCard key={slot.jugador.id} {...slot} />
      ))}
    </div>
  );
}
