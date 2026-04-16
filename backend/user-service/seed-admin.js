const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

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

const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('organizer', 'attendee', 'admin'), defaultValue: 'attendee' }
});

async function seedAdmin() {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminEmail || !adminPassword) {
    console.error('❌ Error: Las variables ADMIN_USERNAME, ADMIN_EMAIL y ADMIN_PASSWORD son requeridas.');
    process.exit(1);
  }

  await sequelize.sync();

  // Actualizar el ENUM para incluir 'admin' si la tabla ya existía
  await sequelize.query("ALTER TABLE Users MODIFY COLUMN role ENUM('organizer','attendee','admin') DEFAULT 'attendee'");

  const existing = await User.findOne({ where: { role: 'admin' } });
  if (existing) {
    console.log('⚠️  Ya existe un administrador. No se creó ninguno nuevo.');
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await User.create({
    username: adminUsername,
    email: adminEmail,
    password: hashedPassword,
    role: 'admin'
  });

  console.log(`✅ Admin creado correctamente: ${adminUsername} (${adminEmail})`);
  process.exit(0);
}

seedAdmin().catch(err => {
  console.error('❌ Error al crear el admin:', err.message);
  process.exit(1);
});
