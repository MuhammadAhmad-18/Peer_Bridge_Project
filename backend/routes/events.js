const router = require('express').Router();
const db     = require('../config/db');
const auth   = require('../middleware/auth');

// GET /api/events?upcoming=true&category=
router.get('/', auth, async (req, res) => {
  try {
    const { upcoming, category } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (upcoming === 'true') { where += ' AND e.event_date >= CURDATE()'; }
    if (category) { where += ' AND e.category = ?'; params.push(category); }

    const [events] = await db.execute(`
      SELECT e.*, u.name AS organizer_name, u.role AS organizer_role
      FROM events e JOIN users u ON e.organizer_id = u.id
      ${where}
      ORDER BY e.event_date ASC
      LIMIT 50
    `, params);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST /api/events
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, venue, event_date, event_time, category } = req.body;
    if (!title || !event_date) return res.status(400).json({ error: 'Title and date are required' });

    const [result] = await db.execute(
      'INSERT INTO events (organizer_id, title, description, venue, event_date, event_time, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description||null, venue||null, event_date, event_time||null, category||'Other']
    );
    const [[event]] = await db.execute(
      'SELECT e.*, u.name AS organizer_name FROM events e JOIN users u ON e.organizer_id=u.id WHERE e.id=?',
      [result.insertId]
    );
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// DELETE /api/events/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const [[e]] = await db.execute('SELECT organizer_id FROM events WHERE id=?', [req.params.id]);
    if (!e) return res.status(404).json({ error: 'Not found' });
    if (e.organizer_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    await db.execute('DELETE FROM events WHERE id=?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
