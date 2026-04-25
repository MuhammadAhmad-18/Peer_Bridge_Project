const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');

async function sendEmail(to, subject, text) {
  console.log(`\n[DEV] Email to ${to}: ${subject}\n`);
  if (process.env.NODE_ENV !== 'production') return;
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  await transporter.sendMail({
    from: `"Peer Bridge" <${process.env.EMAIL_USER}>`,
    to, subject, text,
  });
}

// GET /api/users/mentors?search=&dept=
router.get('/mentors', auth, async (req, res) => {
  try {
    const { search, dept } = req.query;
    let where = "WHERE u.role IN ('mentor','lead_mentor') AND u.is_under_review = FALSE";
    const params = [];
    if (search) {
      where += ' AND (u.name LIKE ? OR u.department LIKE ? OR u.bio LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (dept) { where += ' AND u.department = ?'; params.push(dept); }

    const [mentors] = await db.execute(`
      SELECT id, name, role, department, graduation_year, bio, profile_image, rating, rating_count, sessions_count, is_online, created_at
      FROM users u ${where}
      ORDER BY u.role = 'lead_mentor' DESC, u.rating DESC
    `, params);
    res.json(mentors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch mentors' });
  }
});

// GET /api/users/my-requests  — IDs of mentors already requested by current user
router.get('/my-requests', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT mentor_id FROM mentorship_requests WHERE requester_id = ?',
      [req.user.id]
    );
    res.json(rows.map(r => r.mentor_id));
  } catch(err) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// GET /api/users/incoming-requests  — pending requests for the logged-in mentor
router.get('/incoming-requests', auth, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT mr.id, mr.message, mr.status, mr.created_at,
             u.id AS requester_id, u.name AS requester_name,
             u.department, u.role, u.profile_image
      FROM mentorship_requests mr
      JOIN users u ON u.id = mr.requester_id
      WHERE mr.mentor_id = ? AND mr.status = 'pending'
      ORDER BY mr.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch(err) {
    res.status(500).json({ error: 'Failed to fetch incoming requests' });
  }
});

// PATCH /api/users/mentorship-requests/:id  — accept or decline
router.patch('/mentorship-requests/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'declined'].includes(status))
      return res.status(400).json({ error: 'Status must be accepted or declined' });
    await db.execute(
      'UPDATE mentorship_requests SET status = ? WHERE id = ? AND mentor_id = ?',
      [status, req.params.id, req.user.id]
    );
    res.json({ message: `Request ${status}` });
  } catch(err) {
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// GET /api/users/me
router.get('/me', auth, async (req, res) => {
  const [[user]] = await db.execute(
    'SELECT id,name,email,role,department,graduation_year,bio,profile_image,rating,rating_count,sessions_count,is_online,created_at FROM users WHERE id=?',
    [req.user.id]
  );
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

// PUT /api/users/me
router.put('/me', auth, async (req, res) => {
  try {
    const { name, department, graduation_year, bio, role } = req.body;
    const allowed = ['freshman','sophomore','junior','senior','mentor'];
    const safeRole = allowed.includes(role) ? role : undefined;

    await db.execute(
      `UPDATE users SET
         name = COALESCE(?, name),
         department = COALESCE(?, department),
         graduation_year = COALESCE(?, graduation_year),
         bio = COALESCE(?, bio),
         role = COALESCE(?, role)
       WHERE id = ?`,
      [name||null, department||null, graduation_year||null, bio||null, safeRole||null, req.user.id]
    );
    const [[user]] = await db.execute(
      'SELECT id,name,email,role,department,graduation_year,bio,profile_image,rating,rating_count,sessions_count,is_online FROM users WHERE id=?',
      [req.user.id]
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// DELETE /api/users/me
router.delete('/me', auth, async (req, res) => {
  try {
    await db.execute('DELETE FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// GET /api/users/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const [[user]] = await db.execute(
      'SELECT id,name,email,role,department,graduation_year,bio,profile_image,rating,rating_count,sessions_count,is_online,is_locked,is_under_review,created_at FROM users WHERE id=?',
      [req.params.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const [posts] = await db.execute(
      'SELECT id,tag,title,body,likes_count,comments_count,bookmarks_count,is_hidden,created_at FROM posts WHERE author_id=? ORDER BY created_at DESC LIMIT 10',
      [req.params.id]
    );
    res.json({ ...user, posts });
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({ error: 'Database schema is outdated. Restart the backend to auto-apply missing columns.' });
    }
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users/:id/rate
router.post('/:id/rate', auth, async (req, res) => {
  try {
    const { score, comment } = req.body;
    if (!score || score < 1 || score > 5) return res.status(400).json({ error: 'Score must be 1–5' });
    if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot rate yourself' });

    await db.execute(
      'INSERT INTO ratings (rater_id, mentor_id, score, comment) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE score=VALUES(score), comment=VALUES(comment)',
      [req.user.id, req.params.id, score, comment || null]
    );

    // Recalculate average rating
    const [[stats]] = await db.execute('SELECT AVG(score) AS avg, COUNT(*) AS cnt FROM ratings WHERE mentor_id=?', [req.params.id]);
    await db.execute('UPDATE users SET rating=?, rating_count=? WHERE id=?', [stats.avg, stats.cnt, req.params.id]);

    // Auto under-review: rating < 2.0 AND >= 5 reviews → flag; improves → unflag
    const avg = Number(stats.avg), cnt = Number(stats.cnt);
    if (avg < 2.0 && cnt >= 5) {
      const [[mentor]] = await db.execute('SELECT email, is_under_review FROM users WHERE id=?', [req.params.id]);
      if (mentor && !mentor.is_under_review) {
        await db.execute('UPDATE users SET is_under_review = TRUE WHERE id = ?', [req.params.id]);
        await sendEmail(
          mentor.email,
          'Your Peer Bridge mentor profile is under review',
          'Your mentor profile is under review due to low ratings. It will be restored once your rating improves.'
        );
      }
    } else if (avg >= 2.0) {
      await db.execute('UPDATE users SET is_under_review = FALSE WHERE id = ?', [req.params.id]);
    }

    res.json({ message: 'Rating saved', rating: avg.toFixed(2) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

// POST /api/users/:id/request-mentorship
router.post('/:id/request-mentorship', auth, async (req, res) => {
  try {
    const { message } = req.body;
    await db.execute(
      'INSERT INTO mentorship_requests (requester_id, mentor_id, message) VALUES (?, ?, ?)',
      [req.user.id, req.params.id, message || null]
    );
    res.json({ message: 'Request sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send request' });
  }
});

module.exports = router;
