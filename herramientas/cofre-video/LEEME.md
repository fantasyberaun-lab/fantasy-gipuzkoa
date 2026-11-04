# Exportar la animación del cofre a vídeo

Necesitas: Node 18+, ffmpeg (`sudo apt install ffmpeg`).

    cd herramientas/cofre-video
    npm install
    npx playwright install chromium
    node grabar.mjs          # 30 fps, 960x1040
    node grabar.mjs 60 2     # 60 fps, doble resolución

Resultado en `salida/`: por cada fase (cerrado, abriendo, abierto/recompensa)
un `.webm` transparente, un `.mp4` con fondo verde croma y otro con fondo
oscuro, más la secuencia PNG con transparencia en `salida/png/` (lo mejor para
animar) y `4-cofre-vacio.png`. `cofre.html?estado=abierto` se puede abrir en el
navegador para verlo en vivo (estados: cerrado, abriendo, abierto, vacio).
