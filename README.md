# 🎟️ EventHive

Plataforma de gestión de eventos construida con arquitectura de microservicios.

- **Backend**: Node.js + Express + Sequelize (MySQL), orquestado con Docker Compose
- **Frontend**: Next.js 14 + TailwindCSS
- **Gateway**: API Gateway que unifica todos los microservicios en un único endpoint

---

## 📋 Requisitos previos

Asegúrate de tener instalado en tu máquina:

| Herramienta       | Versión mínima | Enlace                                                                 |
|-------------------|----------------|------------------------------------------------------------------------|
| **Docker Desktop**| 4.x            | <https://www.docker.com/products/docker-desktop/>                      |
| **Docker Compose**| v2 (incluido)  | Viene con Docker Desktop                                               |
| **Node.js**       | 18 o superior  | <https://nodejs.org/>                                                  |
| **npm**           | 9 o superior   | Viene con Node.js                                                      |
| **Git**           | cualquiera     | <https://git-scm.com/>                                                 |

> 💡 **Windows:** asegúrate de que Docker Desktop esté **corriendo** antes de ejecutar los comandos.

---

## 🚀 Puesta en marcha (local)

### 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd Eventhivee-master
```

### 2. Levantar el backend (microservicios + bases de datos)

```bash
cd backend
docker-compose up -d --build
```

Esto descarga las imágenes necesarias, compila los microservicios y arranca:

- 8 microservicios (users, events, tickets, reviews, payments, analytics, notifications, mobile-bff)
- 8 bases de datos MySQL (una por microservicio)
- 1 API Gateway
- 1 Adminer (visor web de las BDs)

La primera vez puede tardar varios minutos. Cuando termine, verifica que todos los contenedores estén `Up`:

```bash
docker-compose ps
```

> ✅ **El usuario administrador se crea automáticamente** la primera vez que arranca el `user-service`. No necesitas ejecutar ningún script adicional.

### 3. Levantar el frontend

Abre una **segunda terminal** y ejecuta:

```bash
cd frontend
npm install
npm run dev
```

El frontend arrancará en <http://localhost:3000>.

---

## 🔑 Credenciales por defecto

Tras levantar el backend por primera vez, ya existe un usuario administrador listo para entrar:

| Campo         | Valor                          |
|---------------|--------------------------------|
| **Email**     | `  |
| **Contraseña**| `                    |
| **Rol**       | `admin`                        |

Inicia sesión en <http://localhost:3000/login> con estos datos.

> ⚠️ **Producción:** cambia estos valores antes de desplegar. Puedes sobreescribirlos exportando las variables `ADMIN_USERNAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` antes del `docker-compose up`, o editando `backend/docker-compose.yml`.

Los usuarios nuevos (organizadores y asistentes) se registran desde <http://localhost:3000/register>.

---

## 🌐 URLs de acceso

| Servicio         | URL                             | Para qué sirve                              |
|------------------|---------------------------------|---------------------------------------------|
| **Frontend**     | <http://localhost:3000>         | La aplicación web                           |
| **API Gateway**  | <http://localhost:8080>         | Único punto de entrada a todos los servicios|
| **Adminer**      | <http://localhost:8081>         | Ver/editar las bases de datos desde el navegador |

### Datos para conectarse a las BDs desde Adminer

- **Sistema:** MySQL
- **Servidor:** `user-db` · `events-db` · `tickets-db` · `reviews-db` · `payment-db` · `analytics-db` · `notifications-db` · `mobile-bff-db` (según la BD que quieras ver)
- **Usuario:** `root`
- **Contraseña:** `root`
- **Base de datos:** `user_db`, `events_db`, `tickets_db`, etc.

---

## 🗺️ Mapa de puertos

| Puerto host | Servicio                  |
|-------------|---------------------------|
| 3000        | Frontend (Next.js)        |
| 8080        | API Gateway               |
| 8081        | Adminer                   |
| 5001        | user-service              |
| 5002        | events-service            |
| 5003        | ticket-service            |
| 5004        | review-service            |
| 5005        | payment-service           |
| 5006        | analytics-service         |
| 5007        | notification-service      |
| 5008        | mobile-bff                |
| 3307–3315   | Bases de datos MySQL      |

---

## 🛠️ Comandos útiles

### Ver logs en vivo

```bash
# Todos los servicios
docker-compose logs -f

# Uno en particular
docker-compose logs -f user-service
docker-compose logs -f ticket-service
```

### Reiniciar un servicio (tras cambiar código)

```bash
docker-compose up -d --build <nombre-del-servicio>
# Ej:
docker-compose up -d --build ticket-service
```

### Parar todo

```bash
docker-compose down
```

### Parar **y borrar** las bases de datos (reset total)

```bash
docker-compose down -v
```

> ⚠️ Esto elimina todos los eventos, tickets y usuarios registrados. El admin se volverá a crear solo la próxima vez que arranques.

---

## 🧩 Estructura del proyecto

```
Eventhivee-master/
├── backend/
│   ├── docker-compose.yml       ← Orquestador de todos los servicios
│   ├── api-gateway/             ← Gateway unificado
│   ├── user-service/            ← Registro, login, admin auto-seed
│   ├── events-service/          ← CRUD de eventos y categorías
│   ├── ticket-service/          ← Compra/validación de tickets
│   ├── review-service/          ← Reseñas
│   ├── payment-service/         ← Procesamiento de pagos
│   ├── analytics-service/       ← Métricas y reportes
│   ├── notification-service/    ← Emails (Resend) y push
│   └── mobile-bff/              ← Backend for Frontend para móvil
├── frontend/
│   ├── pages/                   ← Páginas de Next.js
│   ├── components/              ← Componentes reutilizables
│   └── .env.local               ← NEXT_PUBLIC_API_URL=http://localhost:8080
└── README.md
```

---

## ❓ Solución de problemas

### "Cannot connect to the Docker daemon"
Docker Desktop no está corriendo. Ábrelo y espera a que el ícono de la ballena deje de parpadear.

### "Port is already allocated" / "bind: address already in use"
Ya tienes algo usando ese puerto (3000, 8080, 3307, etc.). Párato o cambia el puerto en `docker-compose.yml`.

### El frontend carga pero no ve los eventos
Comprueba que el backend esté arriba:

```bash
docker-compose ps
curl http://localhost:8080/events
```

Y revisa que `frontend/.env.local` tenga `NEXT_PUBLIC_API_URL=http://localhost:8080`.

### Cambié código del backend y no veo los cambios
Los microservicios se construyen dentro de la imagen de Docker (no hay volumen de código). Tras editar, reconstruye:

```bash
docker-compose up -d --build <servicio>
```

### Quiero empezar de cero (borrar BDs y contenedores)

```bash
cd backend
docker-compose down -v
docker-compose up -d --build
```

### "notNull Violation" u otros errores de base de datos tras actualizar el esquema
Los modelos cambiaron pero la tabla existente no. Solución más limpia:

```bash
docker-compose down -v   # ⚠️ borra las BDs
docker-compose up -d --build
```

---

## 📝 Notas adicionales

- El admin se crea **solo una vez**. Si ya existe un usuario con rol `admin`, el seed automático no hace nada (es idempotente).
- Para crear admins adicionales, puedes registrarte como usuario normal y luego cambiar su rol desde Adminer (`Users` → editar → `role` = `admin`).
- El servicio de correos usa [Resend](https://resend.com/). La API key de prueba ya viene configurada en `docker-compose.yml` — cámbiala por la tuya en producción.
