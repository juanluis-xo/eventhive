# 🧪 Carpeta de Pruebas — EventHive

Esta carpeta centraliza todos los artefactos de pruebas del proyecto que **no** son código fuente directo del backend.

## 📁 Estructura

```
tests/
├── README.md                    ← este archivo
├── jmeter/                      ← pruebas de estrés con Apache JMeter (500 usuarios)
│   ├── eventhive-stress-test.jmx
│   ├── results.csv              (generado al correr)
│   ├── report/                  (generado al correr)
│   └── README.md
└── coverage-reports/            ← capturas y reportes de cobertura
    └── (generados con `npm run test:coverage`)
```

## 🎯 ¿Dónde están las pruebas unitarias y de integración?

Las pruebas Jest viven junto al código que prueban (convención de Node.js):

```
backend/ticket-service/tests/
├── unit/
│   └── helpers.test.js         ← 6 pruebas unitarias
└── integration/
    └── api.test.js              ← 6 pruebas de integración
```

Ver [`backend/ticket-service/tests/README.md`](../backend/ticket-service/tests/README.md) para el detalle.

## ✅ Cobertura de la rúbrica 1.2 — Pruebas y Calidad (15%)

| Item                                                        | Pts | Cumplido | Dónde                                           |
|-------------------------------------------------------------|-----|----------|-------------------------------------------------|
| 6 pruebas unitarias y 6 de integración                      | 5   | ✅       | `backend/ticket-service/tests/`                 |
| 2 mocks en cada tipo de prueba                              | 2   | ✅       | mocks de `axios` y `Sequelize`                  |
| 4+ matchers + 1 prueba con promesa                          | 3   | ✅       | unit/helpers.test.js                            |
| Reporte de cobertura ≥ 80%                                  | 3   | ⏳       | `tests/coverage-reports/`                       |
| Apache JMeter: 500 usuarios, resultados exportados          | 2   | ⏳       | `tests/jmeter/`                                 |

## 🚀 Cómo correr cada cosa

### Pruebas unitarias e integración + cobertura
```bash
cd backend/ticket-service
npm install
npm test                  # corre todo
npm run test:coverage     # genera coverage/lcov-report/index.html
```

### Pruebas de estrés con JMeter
```bash
cd tests/jmeter
# Ver tests/jmeter/README.md para los pasos completos
```

## 🤖 GitHub Actions

Cada vez que hagas `git push`, GitHub ejecuta automáticamente todas las pruebas en el workflow `.github/workflows/tests.yml`. Verás los resultados en la pestaña **Actions** de tu repo:

> https://github.com/juanluis-xo/eventhive/actions

Si todo pasa, verás un ✅ verde junto a tu commit. Si algo falla, ❌ rojo.
