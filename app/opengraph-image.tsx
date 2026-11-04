import { ImageResponse } from "next/og";

export const alt = "Beraun Fantasy · Fantasy de ajedrez de los Campeonatos de Gipuzkoa";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1E0D55 0%, #050B1C 100%)",
          color: "white",
        }}
      >
        <div style={{ fontSize: 40, opacity: 0.7, marginBottom: 16 }}>♞</div>
        <div style={{ fontSize: 96, fontWeight: 700 }}>Beraun Fantasy</div>
        <div style={{ fontSize: 38, opacity: 0.8, marginTop: 16 }}>
          Fantasy de ajedrez · Campeonatos de Gipuzkoa
        </div>
      </div>
    ),
    size
  );
}
