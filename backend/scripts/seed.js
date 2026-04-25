// Run once after creating the DB: node scripts/seed.js
// Updates placeholder password hashes with real bcrypt hashes of 'Test@123'
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function run() {
  const hash = await bcrypt.hash('Test@123', 10);
  console.log('Generated hash:', hash);
  const [r] = await db.execute('UPDATE users SET password_hash = ?', [hash]);
  console.log(`Updated ${r.affectedRows} users. All passwords set to: Test@123`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
