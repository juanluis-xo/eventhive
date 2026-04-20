const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

app.use(cors());
app.use(express.json());

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'user_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || 'root',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  }
);

// User Model
const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('organizer', 'attendee', 'admin'), defaultValue: 'attendee' }
});

// Routes
app.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashedPassword, role });
    res.status(201).json({ message: 'User created successfully', user: { id: user.id, username, email, role } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      res.json({ 
        message: 'Login successful', 
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role } 
      });
    } else {
      res.status(401).json({ error: 'Credenciales inválidas' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Perfil público de un usuario por ID (usado internamente por otros microservicios)
app.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'email', 'role']   // nunca devolvemos password
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Auto-seed del administrador ───────────────────────────────────────────
// Crea un usuario admin automáticamente al arrancar el servicio si aún no existe.
// Lee las credenciales desde las variables de entorno definidas en docker-compose.yml:
//   ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD
// Es idempotente: si ya hay un admin en la base de datos, no hace nada.
async function seedAdminIfNeeded() {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminEmail    = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminEmail || !adminPassword) {
    console.log('[UserService] ℹ️  ADMIN_USERNAME/ADMIN_EMAIL/ADMIN_PASSWORD no definidos — se omite el seed del admin.');
    return;
  }

  try {
    // Asegurar que el ENUM de roles incluye 'admin' (por si la tabla ya existía con un ENUM viejo)
    await sequelize.query(
      "ALTER TABLE Users MODIFY COLUMN role ENUM('organizer','attendee','admin') DEFAULT 'attendee'"
    ).catch(() => { /* si la tabla no existe todavía o ya está bien, ignorar */ });

    const existing = await User.findOne({ where: { role: 'admin' } });
    if (existing) {
      console.log(`[UserService] ✅ Admin ya existe: ${existing.username} (${existing.email}) — no se crea otro.`);
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await User.create({
      username: adminUsername,
      email:    adminEmail,
      password: hashedPassword,
      role:     'admin'
    });
    console.log(`[UserService] ✅ Admin creado automáticamente: ${adminUsername} (${adminEmail})`);
  } catch (err) {
    console.error('[UserService] ❌ Error al crear el admin automáticamente:', err.message);
  }
}

sequelize.sync().then(async () => {
  await seedAdminIfNeeded();
  app.listen(PORT, () => console.log(`User Service running on port ${PORT}`));
}).catch(err => console.error('Database connection failed:', err));
