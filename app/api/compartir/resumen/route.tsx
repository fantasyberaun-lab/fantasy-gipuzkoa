import { ImageResponse } from "next/og";

export const runtime = "edge";

// Imagen para compartir el resumen semanal en redes (formato story 1080x1920).
// La genera next/og en el servidor a partir de los datos en la query, así que no
// expone nada privado: solo lo que el manager decide compartir.
//
// Parámetros: equipo, puntos, posicion, variacion (puestos; + sube, - baja).

function limpiar(v: string | null, max: number): string {
  return (v ?? "").slice(0, max);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const equipo = limpiar(searchParams.get("equipo"), 40) || "Mi equipo";
  const puntos = limpiar(searchParams.get("puntos"), 6) || "0";
  const posicion = limpiar(searchParams.get("posicion"), 4);
  const variacion = parseInt(searchParams.get("variacion") ?? "", 10);

  const subtitulo = Number.isFinite(variacion)
    ? variacion > 0
      ? `+${variacion} puestos esta semana`
      : variacion < 0
        ? `${variacion} puestos esta semana`
        : "Mantiene su puesto"
    : "Resumen de la semana";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1920px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #0b3d2e 0%, #145c43 55%, #0b3d2e 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, letterSpacing: 4, color: "#e9c46a" }}>
          BERAUN FANTASY
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 40,
            fontSize: 64,
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {equipo}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 120,
          }}
        >
          <div style={{ display: "flex", fontSize: 320, fontWeight: 800, color: "#e9c46a", lineHeight: 1 }}>
            {puntos}
          </div>
          <div style={{ display: "flex", fontSize: 56, marginTop: 10 }}>puntos esta semana</div>
        </div>

        {posicion ? (
          <div style={{ display: "flex", marginTop: 100, fontSize: 72, fontWeight: 700 }}>
            {`${posicion}º en la liga`}
          </div>
        ) : (
          <div style={{ display: "flex", marginTop: 100 }} />
        )}

        <div style={{ display: "flex", marginTop: 30, fontSize: 48, color: "#cfe8dd" }}>
          {subtitulo}
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  );
}
