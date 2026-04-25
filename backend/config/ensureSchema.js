const db = require('./db');

async function columnExists(tableName, columnName) {
  const [rows] = await db.execute(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function tableExists(tableName) {
  const [rows] = await db.execute(
    `SELECT 1
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     LIMIT 1`,
    [tableName]
  );
  return rows.length > 0;
}

async function ensureSchema() {
  if (!(await columnExists('posts', 'is_hidden'))) {
    await db.execute('ALTER TABLE posts ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT FALSE');
    console.log('  Added missing column: posts.is_hidden');
  }

  if (!(await columnExists('posts', 'image_path'))) {
    await db.execute('ALTER TABLE posts ADD COLUMN image_path VARCHAR(500) NULL AFTER body');
    console.log('  Added missing column: posts.image_path');
  }

  if (!(await columnExists('users', 'is_locked'))) {
    await db.execute('ALTER TABLE users ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT FALSE');
    console.log('  Added missing column: users.is_locked');
  }

  if (!(await columnExists('users', 'is_under_review'))) {
    await db.execute('ALTER TABLE users ADD COLUMN is_under_review BOOLEAN NOT NULL DEFAULT FALSE');
    console.log('  Added missing column: users.is_under_review');
  }

  if (!(await tableExists('reports'))) {
    await db.execute(`
      CREATE TABLE reports (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        reporter_id INT NOT NULL,
        target_type ENUM('post','user','resource') NOT NULL,
        target_id   INT NOT NULL,
        reason      ENUM('Spam','Harassment','Inappropriate','Misinformation') NOT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_report (reporter_id, target_type, target_id),
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_target (target_type, target_id)
      )
    `);
    console.log('  Created missing table: reports');
  }

  await db.query(`
    UPDATE posts
    SET
      title = CASE
        WHEN title LIKE 'Systems Limited summer internship%'
          THEN 'Is the Systems Limited summer internship worth it for an NBS finance major?'
        WHEN title LIKE 'Uploaded: complete MTH-101 past papers pack%'
          THEN 'Uploaded: complete MTH-101 past papers pack (2019-2024)'
        WHEN title LIKE 'IEEE%recruitment%4 tracks%deadline Friday'
          THEN 'IEEE NUST recruitment is open: 4 tracks, 60 spots, deadline Friday'
        ELSE title
      END,
      body = CASE
        WHEN body LIKE 'My panel is tough on methodology%'
          THEN 'My panel is known for asking detailed methodology questions. Any tips from students who already went through it? My topic is federated learning for medical imaging.'
        WHEN body LIKE '14 midterms + 12 finals%'
          THEN '14 midterms and 12 finals, organized by topic. This helped me a lot last semester, so I hope it helps the next batch too.'
        ELSE body
      END
    WHERE title LIKE 'Systems Limited summer internship%'
       OR title LIKE 'Uploaded: complete MTH-101 past papers pack%'
       OR title LIKE 'IEEE%recruitment%4 tracks%deadline Friday'
       OR body LIKE 'My panel is tough on methodology%'
       OR body LIKE '14 midterms + 12 finals%'
  `);

  await db.query(`
    UPDATE replies
    SET text = CASE
      WHEN text = 'Rehearse the "why this, why now" in 90 seconds. Panels drill hardest on scope â€” have a slide showing what you''re explicitly NOT doing.'
        THEN 'Rehearse the "why this, why now" in 90 seconds. Panels usually drill hardest on scope, so keep one slide showing what you are explicitly not doing.'
      WHEN text = 'Did it in 2024. Conversion is real but rotate hard into the data team â€” that''s where the analytics skills compound.'
        THEN 'I did it in 2024. The conversion is real, but try to rotate into the data team because that is where the analytics exposure compounds.'
      ELSE text
    END
    WHERE text IN (
      'Rehearse the "why this, why now" in 90 seconds. Panels drill hardest on scope â€” have a slide showing what you''re explicitly NOT doing.',
      'Did it in 2024. Conversion is real but rotate hard into the data team â€” that''s where the analytics skills compound.'
    )
  `);

  await db.query(`
    UPDATE events
    SET
      title = CASE
        WHEN title = 'FYP Showcase â€” SEECS'
          THEN 'SEECS FYP Showcase'
        WHEN title = 'Alumni Ã— Junior Mixer'
          THEN 'NUST Alumni and Junior Mixer'
        WHEN title = 'Research Colloquium â€” SEECS'
          THEN 'SEECS Research Colloquium'
        ELSE title
      END,
      description = CASE
        WHEN description = 'Connect with NUST alumni working in top companies. Networking event for all years.'
          THEN 'Meet NUST alumni working in leading companies and connect with students from across departments.'
        ELSE description
      END
    WHERE title LIKE '%FYP Showcase%'
       OR title LIKE '%Alumni%'
       OR title LIKE '%Junior Mixer%'
       OR title LIKE '%Research Colloquium%'
       OR description = 'Connect with NUST alumni working in top companies. Networking event for all years.'
  `);

  await db.query(`
    UPDATE resources
    SET
      title = CASE
        WHEN title = 'MTH-101 Past Papers Pack (2019â€“2024)'
          THEN 'MTH-101 Past Papers Pack (2019-2024)'
        WHEN title = 'SMME CAD Exercises â€“ SolidWorks'
          THEN 'SMME CAD Exercises - SolidWorks'
        ELSE title
      END,
      description = CASE
        WHEN description = 'Official template with guidelines for writing a strong FYP proposal.'
          THEN 'Updated SEECS template with guidance for writing a strong FYP proposal.'
        ELSE description
      END
    WHERE title LIKE 'MTH-101 Past Papers Pack%'
       OR title LIKE 'SMME CAD Exercises%'
       OR description = 'Official template with guidelines for writing a strong FYP proposal.'
  `);
}

module.exports = ensureSchema;
