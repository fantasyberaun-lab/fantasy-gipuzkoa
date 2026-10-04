#!/bin/bash

echo "=== Actualización Mensual de Elo FIDE ==="

# 1. Configurar URL y pedir clave secreta
export SUPABASE_URL="https://uavurvrvxjewtskvdpfr.supabase.co"
read -rsp "Pega tu clave secret de Supabase (sb_secret_...) y pulsa Enter: " SUPABASE_SERVICE_ROLE_KEY
echo ""
export SUPABASE_SERVICE_ROLE_KEY

# 2. Pedir el periodo
read -p "Introduce el periodo a actualizar (ej. 2026-11-01): " PERIODO

# 3. Comprobar el archivo ZIP
ZIP_PATH=~/Descargas/standard_rating_list_xml.zip
if [ ! -f "$ZIP_PATH" ]; then
  read -p "No se encuentra el archivo en $ZIP_PATH. Introduce la ruta correcta: " ZIP_PATH
fi

echo ""
echo "Analizando el archivo y generando VISTA PREVIA..."
echo "-------------------------------------------------"

# 4. Lanzar vista previa
unzip -p "$ZIP_PATH" | APLICAR=false PERIODO="$PERIODO" node scripts/fide-elo.mjs

echo "-------------------------------------------------"
# 5. Confirmación para aplicar
read -p "¿Todo cuadra? ¿Deseas APLICAR los cambios definitivamente en tu juego? (s/n): " CONFIRMAR

if [[ "$CONFIRMAR" == "s" || "$CONFIRMAR" == "S" ]]; then
  echo "Aplicando cambios..."
  unzip -p "$ZIP_PATH" | APLICAR=true PERIODO="$PERIODO" node scripts/fide-elo.mjs
  echo "¡Proceso terminado! Jugadores actualizados."
else
  echo "Operación cancelada. No se ha tocado la base de datos."
fi