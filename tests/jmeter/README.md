# 🔥 Pruebas de estrés con Apache JMeter

Plan de pruebas de carga que simula **500 usuarios concurrentes** atacando el `ticket-service` de EventHive durante ~30 segundos, para medir:

- **Throughput** (peticiones/segundo)
- **Latencia** promedio, p90, p95, p99
- **% de errores** bajo carga
- **APDEX score** (satisfacción del usuario simulado)

## 📁 Archivos en esta carpeta

```
tests/jmeter/
├── README.md                       ← este archivo
├── eventhive-stress-test.jmx       ← plan de prueba JMeter
├── run-stress-test.bat             ← lanzador Windows
├── run-stress-test.sh              ← lanzador Linux/macOS
├── results.csv                     ← (generado) datos crudos
├── jmeter.log                      ← (generado) log de ejecución
└── report/                         ← (generado) reporte HTML con gráficos
    └── index.html
```

## 🛠️ Requisitos previos

### 1. Java 8 o superior

```bash
java -version
```

Si no tienes Java, instala **Java 17 LTS** desde [adoptium.net](https://adoptium.net/).

### 2. Apache JMeter 5.x

1. Descarga el **binario** desde https://jmeter.apache.org/download_jmeter.cgi
2. Descomprime el `.zip` donde quieras (ej. `C:\apache-jmeter-5.6.3\` en Windows).
3. **Define la variable de entorno `JMETER_HOME`** apuntando a esa carpeta:

   **Windows (CMD permanente):**
   ```cmd
   setx JMETER_HOME "C:\apache-jmeter-5.6.3"
   ```
   Luego cierra y vuelve a abrir la terminal.

   **Linux/macOS (`.bashrc` o `.zshrc`):**
   ```bash
   export JMETER_HOME=/ruta/a/apache-jmeter-5.6.3
   ```

   **Verifica:**
   ```bash
   echo %JMETER_HOME%        # Windows
   echo $JMETER_HOME         # Linux/Mac
   ```

### 3. Backend corriendo en `localhost:5003`

Antes de lanzar JMeter:

```bash
cd backend
docker-compose up -d
```

Espera ~30 segundos a que MySQL inicie y verifica:

```bash
curl http://localhost:5003/event-stats/1
```

Debería responder `200 OK` con un JSON (aunque sea con `total: 0`).

## 🚀 Cómo ejecutar la prueba

### Windows

Doble clic en `run-stress-test.bat` — o desde una terminal:

```cmd
cd tests\jmeter
run-stress-test.bat
```

### Linux / macOS

```bash
cd tests/jmeter
chmod +x run-stress-test.sh
./run-stress-test.sh
```

El script:
1. Verifica que JMeter y el backend estén disponibles.
2. Ejecuta el plan en modo CLI (sin abrir interfaz, mucho más rápido y confiable).
3. Genera `results.csv` con los datos crudos.
4. Genera el reporte visual en `report/index.html`.
5. Abre el reporte automáticamente en el navegador.

Tarda aproximadamente **60-90 segundos** en total (30s de rampa + ejecución de los 2 loops + generación del reporte).

## 📊 Configuración del plan de prueba

El archivo `.jmx` está parametrizado con estas variables (puedes editarlas si lo abres en la GUI de JMeter):

| Variable | Valor | Significado |
|----------|-------|-------------|
| `HOST`   | `localhost` | Host del backend |
| `PORT`   | `5003` | Puerto del ticket-service |
| `USERS`  | `500` | **Hilos concurrentes** |
| `RAMPUP` | `30` | Segundos para alcanzar los 500 usuarios |
| `LOOPS`  | `2` | Veces que cada usuario repite los requests |

→ Total de peticiones esperadas: **500 usuarios × 2 endpoints × 2 loops = 2.000 requests**

### Endpoints golpeados

1. `GET /event-stats/1` — estadísticas de un evento (consulta a la BD)
2. `GET /event-users/1` — IDs únicos de asistentes (consulta a la BD)

Ambos son **idempotentes y seguros** (sólo lectura), así que no rompen datos al ejecutarlos miles de veces.

## 📈 Cómo interpretar los resultados

### Mientras corre — output en consola

```
summary +    560 in 00:00:15 =   37.3/s Avg: 287 Min: 12 Max: 1503 Err: 2 (0.36%)
```

| Campo | Qué significa |
|-------|---------------|
| `560 in 00:00:15` | 560 peticiones en los últimos 15 segundos |
| `37.3/s` | **Throughput** = 37.3 peticiones por segundo |
| `Avg: 287` | Tiempo promedio de respuesta = **287 ms** |
| `Min: 12 / Max: 1503` | Más rápida 12ms, más lenta 1503ms |
| `Err: 2 (0.36%)` | 2 peticiones fallaron (0.36% del total) |

### Reporte HTML (`report/index.html`)

Lo más importante para entregar:

| Sección | Para qué sirve |
|---------|---------------|
| **APDEX (Application Performance Index)** | Score de 0 a 1. > 0.85 = bueno. < 0.5 = malo. |
| **Statistics** | Tabla con total, error %, media, p90, p95, p99, throughput. **Esto es lo que copias en el informe.** |
| **Errors** | Detalle de qué endpoints fallaron y con qué código (500, timeout, etc.) |
| **Response Times Over Time** | Gráfico de líneas: muestra si la latencia explotó al subir la carga |
| **Active Threads Over Time** | Confirma que sí hubo 500 usuarios simultáneos |
| **Response Codes per Second** | Cuántos 200, 4xx, 5xx por segundo |

### ✅ ¿Qué resultado se considera "bueno"?

Para un microservicio Node.js con MySQL y consultas simples como las nuestras:

| Métrica | Aceptable | Bueno | Excelente |
|---------|-----------|-------|-----------|
| Error % | < 5% | < 1% | 0% |
| p95 | < 2000 ms | < 800 ms | < 300 ms |
| Throughput | > 50 req/s | > 100 req/s | > 200 req/s |

> Si te salen errores superiores al 5%, normalmente es porque **MySQL alcanzó el límite de conexiones**. Eso ya es un hallazgo válido para reportar (justamente para eso son las pruebas de carga).

## 📝 Qué entregar para la rúbrica (1.2 — punto 5, 2 pts)

1. ✅ El archivo `eventhive-stress-test.jmx` (versionado en git).
2. ✅ Captura de pantalla de la consola mostrando que se ejecutaron las ~2000 requests.
3. ✅ Captura del reporte HTML mostrando:
   - APDEX score
   - Tabla de Statistics con throughput y error %
   - Gráfico Response Times Over Time
4. ✅ El `results.csv` o el folder `report/` (opcional, pesa más).

## 🐛 Problemas comunes

| Problema | Solución |
|----------|----------|
| `JMETER_HOME no esta definida` | Define la variable de entorno (ver requisito 2) |
| `El ticket-service NO responde` | Ejecuta `docker-compose up -d` en `backend/` |
| Muchísimos errores 500 | MySQL saturado — normal con 500 usuarios. Reduce `USERS` a 200 si quieres ver throughput limpio, o reportalo como hallazgo. |
| Java OutOfMemory | Edita `%JMETER_HOME%\bin\jmeter.bat` y cambia `HEAP=-Xms1g -Xmx1g` a `HEAP=-Xms2g -Xmx4g` |
