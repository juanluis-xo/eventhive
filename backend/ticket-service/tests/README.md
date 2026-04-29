# 🧪 Pruebas del ticket-service

Estructura:

```
tests/
├── unit/
│   └── helpers.test.js       ← 6 pruebas unitarias
├── integration/
│   └── api.test.js           ← 6 pruebas de integración (HTTP con supertest)
└── README.md                 ← este archivo
```

## ✅ Cobertura de la rúbrica (1.2 — 15%)

| Requisito                                     | Cumplido |
|-----------------------------------------------|----------|
| 6 pruebas unitarias                           | ✅       |
| 6 pruebas de integración                      | ✅       |
| 2 mocks en cada tipo de prueba (`axios`, `Sequelize`) | ✅       |
| 4+ matchers en pruebas unitarias              | ✅ (`toBe`, `toEqual`, `toBeNull`, `toMatch`, `toHaveBeenCalledWith`, `toHaveProperty`, `toBeInstanceOf`) |
| Una prueba con promesa                        | ✅ (`getEvent` con `.resolves.toEqual`) |

---

## 🚀 Cómo ejecutar las pruebas

### Opción A — Local (sin Docker)

```bash
cd backend/ticket-service
npm install            # instala dependencias + Jest + Supertest
npm test               # corre TODAS las pruebas (unitarias + integración)
npm run test:unit      # solo unitarias
npm run test:integration   # solo integración
npm run test:coverage  # con reporte de cobertura
```

### Opción B — Dentro de Docker

```bash
# Desde la raíz del backend
docker exec -it ticket-service npm install --include=dev
docker exec -it ticket-service npm test
```

> ⚠️ Las pruebas usan **mocks** (`axios` y `Sequelize`), por lo que NO necesitan que MySQL ni los demás servicios estén arriba.

---

## 🎯 Qué prueba cada test

### Pruebas unitarias (`tests/unit/helpers.test.js`)

1. `parseTicketCode` con código válido → devuelve el ID numérico
2. `parseTicketCode` con códigos inválidos → devuelve `null`
3. `getCategoryName` con categoría existente → devuelve el nombre
4. `getCategoryName` sin categoría → devuelve `null`
5. `getEvent` llama a axios con la URL correcta del events-service
6. `getEvent` (con promesa) resuelve con los datos del evento

### Pruebas de integración (`tests/integration/api.test.js`)

1. `GET /verify/:code` con formato inválido → **400**
2. `GET /verify/:code` cuando el ticket no existe → **404**
3. `GET /verify/:code` primera vez → **valid:true** + marca como usado
4. `GET /verify/:code` segunda vez → **alreadyUsed:true** (no se vuelve a marcar)
5. `GET /event-stats/:eventId` → totales agrupados por categoría
6. `POST /` (compra) → crea ticket + dispara notificación
