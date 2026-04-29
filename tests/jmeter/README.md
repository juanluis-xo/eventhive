# 🔥 Pruebas de estrés con Apache JMeter

> **Pendiente de implementar** — el archivo `eventhive-stress-test.jmx` se creará en el siguiente paso.

## ¿Qué es esto?

Plan de pruebas de carga que simula **500 usuarios concurrentes** golpeando los endpoints públicos del backend de EventHive durante un periodo definido, para medir:

- **Throughput** (peticiones/segundo)
- **Latencia** promedio y percentil 95
- **% de errores** bajo carga

## Próximos pasos

Después de implementar coverage ≥80%, el plan es:

1. Crear `eventhive-stress-test.jmx` con 500 usuarios + rampa de 30s
2. Crear `run-stress-test.bat` (Windows) y `run-stress-test.sh` (Linux/Mac)
3. Documentar cómo descargar JMeter, ejecutarlo y ver resultados
