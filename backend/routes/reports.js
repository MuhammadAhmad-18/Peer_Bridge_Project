const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');

const VALID_TYPES   = ['post', 'user', 'resource'];
const VALID_REASONS = ['Spam', 'Harassment', 'Inappropriate', 'Misinformation'];

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

// POST /api/reports
router.post('/', auth, async (req, res) => {
  try {
    const { target_type, target_id, reason } = req.body;

    if (!VALID_TYPES.includes(target_type))   return res.status(400).json({ error: 'Invalid target type' });
    if (!VALID_REASONS.includes(reason))      return res.status(400).json({ error: 'Invalid reason' });
    if (!target_id)                           return res.status(400).json({ error: 'target_id is required' });

    const [[existing]] = await db.execute(
      'SELECT id FROM reports WHERE reporter_id = ? AND target_type = ? AND target_id = ?',
      [req.user.id, target_type, target_id]
    );
    if (existing) return res.status(409).json({ error: 'You have already reported this' });

    await db.execute(
      'INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES (?, ?, ?, ?)',
      [req.user.id, target_type, target_id, reason]
    );

    // Auto-hide post after 5 unique reports
    if (target_type === 'post') {
      const [[{ cnt }]] = await db.execute(
        'SELECT COUNT(*) AS cnt FROM reports WHERE target_type = ? AND target_id = ?',
        ['post', target_id]
      );
      if (cnt >= 5) {
        await db.execute('UPDATE posts SET is_hidden = TRUE WHERE id = ?', [target_id]);
      }
    }

    // Auto-lock user after 10 unique reports
    if (target_type === 'user') {
      const [[{ cnt }]] = await db.execute(
        'SELECT COUNT(*) AS cnt FROM reports WHERE target_type = ? AND target_id = ?',
        ['user', target_id]
      );
      if (cnt >= 10) {
        const [[reported]] = await db.execute(
          'SELECT email, is_locked FROM users WHERE id = ?', [target_id]
        );
        if (reported && !reported.is_locked) {
          await db.execute('UPDATE users SET is_locked = TRUE WHERE id = ?', [target_id]);
          await sendEmail(
            reported.email,
            'Your Peer Bridge account has been temporarily locked',
            'Your account has been temporarily locked due to multiple community reports.\n\nIf you believe this is a mistake, please contact support.'
          );
        }
      }
    }

    res.status(201).json({ message: 'Report submitted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

module.exports = router;
