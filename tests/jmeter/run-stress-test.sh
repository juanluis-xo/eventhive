#!/usr/bin/env bash
# =============================================================================
# EventHive — Stress Test runner (Linux / macOS)
# =============================================================================
# Lanza JMeter en modo CLI contra el ticket-service con 500 usuarios.
# Genera:
#   - results.csv        (una fila por peticion)
#   - report/index.html  (reporte HTML con graficos)
# =============================================================================

set -e

# Cambiar al directorio del script
cd "$(dirname "$0")"

# ── Verificar JMETER_HOME ────────────────────────────────────────────────────
if [ -z "${JMETER_HOME:-}" ]; then
    echo "[WARN] La variable JMETER_HOME no esta definida."
    echo "       Defínela apuntando a la carpeta donde descomprimiste JMeter:"
    echo "       export JMETER_HOME=/ruta/a/apache-jmeter-5.6.3"
    exit 1
fi

JMETER_EXE="$JMETER_HOME/bin/jmeter"
if [ ! -x "$JMETER_EXE" ]; then
    echo "[ERROR] No se encontro $JMETER_EXE"
    exit 1
fi

# ── Limpiar resultados anteriores ────────────────────────────────────────────
rm -f results.csv jmeter.log
rm -rf report

# ── Verificar que el backend este arriba ─────────────────────────────────────
echo "[1/3] Verificando que el ticket-service responde en localhost:5003..."
if ! curl -fsS --max-time 5 http://localhost:5003/event-stats/1 > /dev/null; then
    echo "[ERROR] El ticket-service NO responde. Levanta docker-compose primero."
    exit 1
fi
echo "      OK"

# ── Ejecutar JMeter en modo CLI ──────────────────────────────────────────────
echo ""
echo "[2/3] Lanzando JMeter — 500 usuarios, rampa 30s, 2 loops..."
echo "      (esto puede tomar 1-2 minutos)"
echo ""

"$JMETER_EXE" -n -t eventhive-stress-test.jmx -l results.csv -e -o report -j jmeter.log

# ── Resumen final ────────────────────────────────────────────────────────────
echo ""
echo "[3/3] Listo!"
echo ""
echo "  Resultados crudos:  $(pwd)/results.csv"
echo "  Reporte HTML:       $(pwd)/report/index.html"
echo ""
echo "  Abre el reporte HTML en el navegador para ver graficos."

# Abrir reporte automaticamente segun el SO
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$(pwd)/report/index.html" 2>/dev/null || true
elif command -v open >/dev/null 2>&1; then
    open "$(pwd)/report/index.html" 2>/dev/null || true
fi
