const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const db     = require('../config/db');
const auth   = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`),
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } }); // 100 MB

// GET /api/resources?category=&search=&course=
router.get('/', auth, async (req, res) => {
  try {
    const { category, search, course } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (category) { where += ' AND r.category = ?'; params.push(category); }
    if (course)   { where += ' AND r.course_code = ?'; params.push(course); }
    if (search)   { where += ' AND (r.title LIKE ? OR r.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

    const [rows] = await db.execute(`
      SELECT r.*, u.name AS uploader_name, u.role AS uploader_role
      FROM resources r JOIN users u ON r.uploader_id = u.id
      ${where}
      ORDER BY r.created_at DESC LIMIT 50
    `, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// POST /api/resources  (multipart/form-data)
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    const { title, description, category, course_code } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const file = req.file;
    const [result] = await db.execute(
      `INSERT INTO resources (uploader_id, title, description, file_path, file_name, file_type, file_size, category, course_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, title, description || null,
        file ? file.path       : null,
        file ? file.originalname : null,
        file ? path.extname(file.originalname).slice(1).toUpperCase() : null,
        file ? file.size       : null,
        category || 'Other',
        course_code || null,
      ]
    );
    const [[resource]] = await db.execute('SELECT r.*, u.name AS uploader_name FROM resources r JOIN users u ON r.uploader_id=u.id WHERE r.id=?', [result.insertId]);
    res.status(201).json(resource);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload resource' });
  }
});

// GET /api/resources/:id/download
router.get('/:id/download', auth, async (req, res) => {
  try {
    const [[resource]] = await db.execute('SELECT * FROM resources WHERE id=?', [req.params.id]);
    if (!resource) return res.status(404).json({ error: 'Not found' });
    await db.execute('UPDATE resources SET downloads_count = downloads_count + 1 WHERE id=?', [req.params.id]);
    if (resource.file_path) return res.download(resource.file_path, resource.file_name);
    res.status(404).json({ error: 'File not available' });
  } catch (err) {
    res.status(500).json({ error: 'Download failed' });
  }
});

// DELETE /api/resources/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const [[r]] = await db.execute('SELECT uploader_id FROM resources WHERE id=?', [req.params.id]);
    if (!r) return res.status(404).json({ error: 'Not found' });
    if (r.uploader_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    await db.execute('DELETE FROM resources WHERE id=?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

module.exports = router;
