@echo off
REM ============================================================================
REM EventHive — Stress Test runner (Windows)
REM ============================================================================
REM Lanza JMeter en modo CLI (sin abrir interfaz grafica) contra el ticket-service
REM con 500 usuarios concurrentes. Genera:
REM   - results.csv         (una fila por peticion)
REM   - report\index.html   (reporte HTML con graficos)
REM ============================================================================

setlocal

REM ── Configura aqui la ruta de tu JMeter ─────────────────────────────────────
REM Ejemplo: C:\apache-jmeter-5.6.3
if "%JMETER_HOME%"=="" (
    echo [WARN] La variable JMETER_HOME no esta definida.
    echo        Editar este archivo y descomentar la linea de abajo con tu ruta:
    echo        set JMETER_HOME=C:\apache-jmeter-5.6.3
    echo.
    REM Descomenta la siguiente linea y ajusta a tu ruta real:
    REM set JMETER_HOME=C:\apache-jmeter-5.6.3
)

if "%JMETER_HOME%"=="" (
    echo [ERROR] No se puede continuar sin JMETER_HOME. Aborta.
    exit /b 1
)

set JMETER_EXE=%JMETER_HOME%\bin\jmeter.bat
if not exist "%JMETER_EXE%" (
    echo [ERROR] No se encontro %JMETER_EXE%
    echo        Verifica que JMETER_HOME apunta a la carpeta correcta.
    exit /b 1
)

REM ── Cambiar al directorio del script ────────────────────────────────────────
cd /d "%~dp0"

REM ── Limpiar resultados anteriores ───────────────────────────────────────────
if exist results.csv del /q results.csv
if exist report (
    echo Eliminando reporte anterior...
    rmdir /s /q report
)
if exist jmeter.log del /q jmeter.log

REM ── Verificar que el backend este arriba ────────────────────────────────────
echo [1/3] Verificando que el ticket-service responde en localhost:5003...
powershell -Command "try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 'http://localhost:5003/event-stats/1'; Write-Host '      OK -> HTTP' $r.StatusCode } catch { Write-Host '[ERROR] El ticket-service NO responde. Levanta docker-compose primero.'; exit 1 }"
if errorlevel 1 exit /b 1

REM ── Ejecutar JMeter en modo CLI ─────────────────────────────────────────────
echo.
echo [2/3] Lanzando JMeter — 500 usuarios, rampa 30s, 2 loops...
echo       (esto puede tomar 1-2 minutos)
echo.

call "%JMETER_EXE%" -n -t eventhive-stress-test.jmx -l results.csv -e -o report -j jmeter.log

if errorlevel 1 (
    echo.
    echo [ERROR] JMeter termino con error. Revisa jmeter.log
    exit /b 1
)

REM ── Resumen final ───────────────────────────────────────────────────────────
echo.
echo [3/3] Listo!
echo.
echo   Resultados crudos:  %CD%\results.csv
echo   Reporte HTML:       %CD%\report\index.html
echo.
echo   Abre el reporte HTML en el navegador para ver graficos.
echo.

REM Abrir el reporte automaticamente
start "" "%CD%\report\index.html"

endlocal
