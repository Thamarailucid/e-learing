const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envProd = path.resolve(__dirname, '.env.production');
const envDefault = path.resolve(__dirname, '.env');
const envDev = path.resolve(__dirname, '.env.development');

if (fs.existsSync(envProd)) {
  dotenv.config({ path: envProd });
} else if (fs.existsSync(envDefault)) {
  dotenv.config({ path: envDefault });
} else if (fs.existsSync(envDev)) {
  dotenv.config({ path: envDev });
}

const email = (process.argv[2] || process.env.SUPER_ADMIN_EMAIL || 'superadmin@novacodex.in').toLowerCase().trim();
const password = process.argv[3] || process.env.SUPER_ADMIN_PASSWORD || 'Admin@123';

async function reset() {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DATABASE || 'novacodex_production',
    user: process.env.POSTGRES_USER || 'novacodex_admin',
    password: process.env.POSTGRES_PASSWORD || 'Novacodex123',
  });

  try {
    await client.connect();
    const schema = process.env.POSTGRES_SCHEMA || 'novacodex';
    const hash = await bcrypt.hash(password, 12);

    const check = await client.query(`SELECT id FROM ${schema}.users WHERE email = $1`, [email]);
    if (check.rowCount > 0) {
      await client.query(
        `UPDATE ${schema}.users 
         SET password_hash = $1, is_super_admin = TRUE, is_active = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [hash, check.rows[0].id]
      );
      console.log(`✅ Success: Super Admin (${email}) password updated to '${password}'!`);
    } else {
      await client.query(
        `INSERT INTO ${schema}.users (email, password_hash, first_name, last_name, is_super_admin, is_active, email_verified)
         VALUES ($1, $2, 'Super', 'Administrator', TRUE, TRUE, TRUE)`,
        [email, hash]
      );
      console.log(`✅ Success: New Super Admin (${email}) created with password '${password}'!`);
    }
  } catch (err) {
    console.error('❌ Error updating super admin:', err.message);
  } finally {
    await client.end();
  }
}

reset();
