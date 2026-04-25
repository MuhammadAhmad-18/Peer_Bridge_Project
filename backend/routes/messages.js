const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');

// GET /api/messages  – list conversations (most recent message per contact)
router.get('/', auth, async (req, res) => {
  try {
    const uid = req.user.id;
    const [convos] = await db.execute(`
      SELECT
        u.id, u.name, u.role, u.department, u.is_online,
        latest.text AS last_message,
        latest.created_at AS last_at,
        (SELECT COUNT(*) FROM messages WHERE receiver_id=? AND sender_id=u.id AND is_read=FALSE) AS unread
      FROM (
        SELECT
          CASE WHEN sender_id=? THEN receiver_id ELSE sender_id END AS other_id,
          text, created_at,
          ROW_NUMBER() OVER (
            PARTITION BY LEAST(sender_id,receiver_id), GREATEST(sender_id,receiver_id)
            ORDER BY created_at DESC
          ) AS rn
        FROM messages
        WHERE sender_id=? OR receiver_id=?
      ) latest
      JOIN users u ON u.id = latest.other_id
      WHERE latest.rn = 1
      ORDER BY latest.created_at DESC
    `, [uid, uid, uid, uid]);
    res.json(convos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/messages/:userId  – get all messages with a specific user
router.get('/:userId', auth, async (req, res) => {
  try {
    const uid  = req.user.id;
    const other = Number(req.params.userId);
    const [msgs] = await db.execute(`
      SELECT m.*, u.name AS sender_name, u.role AS sender_role
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE (m.sender_id=? AND m.receiver_id=?)
         OR (m.sender_id=? AND m.receiver_id=?)
      ORDER BY m.created_at ASC
    `, [uid, other, other, uid]);

    // Mark received messages as read
    await db.execute('UPDATE messages SET is_read=TRUE WHERE receiver_id=? AND sender_id=?', [uid, other]);

    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages/:userId  – send a message
router.post('/:userId', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Message text is required' });

    const [result] = await db.execute(
      'INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)',
      [req.user.id, req.params.userId, text]
    );
    const [[msg]] = await db.execute(
      'SELECT m.*, u.name AS sender_name FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=?',
      [result.insertId]
    );
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
