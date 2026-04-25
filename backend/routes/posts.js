const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const db     = require('../config/db');
const auth   = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeBase = path.basename(file.originalname || 'image', ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `post-${Date.now()}-${safeBase}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  },
});

// GET /api/posts?tag=&search=&limit=&offset=
router.get('/', auth, async (req, res) => {
  try {
    const { tag, search, limit = 30, offset = 0 } = req.query;
    const uid = req.user.id;
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
    const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

    let where = 'WHERE p.is_hidden = FALSE';
    const params = [uid, uid];

    if (tag && tag !== 'For you') {
      where += ' AND p.tag LIKE ?';
      params.push(`%${tag}%`);
    }
    if (search) {
      where += ' AND (p.title LIKE ? OR p.body LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [posts] = await db.query(`
      SELECT p.*,
             u.name        AS author_name,
             u.role        AS author_role,
             u.department,
             u.graduation_year,
             (SELECT COUNT(*) FROM post_likes     WHERE post_id = p.id AND user_id = ?) AS liked,
             (SELECT COUNT(*) FROM post_bookmarks WHERE post_id = p.id AND user_id = ?) AS bookmarked
      FROM posts p
      JOIN users u ON p.author_id = u.id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT ${safeLimit} OFFSET ${safeOffset}
    `, params);

    res.json(posts.map(p => ({ ...p, liked: !!p.liked, bookmarked: !!p.bookmarked })));
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({ error: 'Database schema is outdated. Restart the backend to auto-apply missing columns.' });
    }
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// POST /api/posts
router.post('/', auth, (req, res) => {
  upload.single('image')(req, res, async (uploadErr) => {
    if (uploadErr) {
      const message = uploadErr.message === 'Only image uploads are allowed'
        ? 'Please upload a valid image file'
        : uploadErr.code === 'LIMIT_FILE_SIZE'
          ? 'Image must be smaller than 8 MB'
          : 'Failed to upload image';
      return res.status(400).json({ error: message });
    }

    try {
      const { tag, title, body } = req.body;
      if (!tag || !title) return res.status(400).json({ error: 'Tag and title are required' });

      const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

      const [result] = await db.execute(
        'INSERT INTO posts (author_id, tag, title, body, image_path) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, tag, title, body || null, imagePath]
      );
      const [[post]] = await db.execute(
        `SELECT p.*, u.name AS author_name, u.role AS author_role, u.department, u.graduation_year
         FROM posts p JOIN users u ON p.author_id = u.id WHERE p.id = ?`,
        [result.insertId]
      );
      res.status(201).json({ ...post, liked: false, bookmarked: false });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create post' });
    }
  });
});

// DELETE /api/posts/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const [[post]] = await db.execute('SELECT author_id FROM posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await db.execute('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// POST /api/posts/:id/like  (toggle)
router.post('/:id/like', auth, async (req, res) => {
  try {
    const uid = req.user.id, pid = req.params.id;
    const [[existing]] = await db.execute('SELECT 1 FROM post_likes WHERE user_id=? AND post_id=?', [uid, pid]);
    if (existing) {
      await db.execute('DELETE FROM post_likes WHERE user_id=? AND post_id=?', [uid, pid]);
      await db.execute('UPDATE posts SET likes_count = likes_count - 1 WHERE id=? AND likes_count > 0', [pid]);
      return res.json({ liked: false });
    }
    await db.execute('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)', [uid, pid]);
    await db.execute('UPDATE posts SET likes_count = likes_count + 1 WHERE id=?', [pid]);
    res.json({ liked: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// POST /api/posts/:id/bookmark  (toggle)
router.post('/:id/bookmark', auth, async (req, res) => {
  try {
    const uid = req.user.id, pid = req.params.id;
    const [[existing]] = await db.execute('SELECT 1 FROM post_bookmarks WHERE user_id=? AND post_id=?', [uid, pid]);
    if (existing) {
      await db.execute('DELETE FROM post_bookmarks WHERE user_id=? AND post_id=?', [uid, pid]);
      await db.execute('UPDATE posts SET bookmarks_count = bookmarks_count - 1 WHERE id=? AND bookmarks_count > 0', [pid]);
      return res.json({ bookmarked: false });
    }
    await db.execute('INSERT INTO post_bookmarks (user_id, post_id) VALUES (?, ?)', [uid, pid]);
    await db.execute('UPDATE posts SET bookmarks_count = bookmarks_count + 1 WHERE id=?', [pid]);
    res.json({ bookmarked: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
});

// GET /api/posts/:id/replies
router.get('/:id/replies', auth, async (req, res) => {
  try {
    const [replies] = await db.execute(`
      SELECT r.*, u.name AS author_name, u.role AS author_role
      FROM replies r
      JOIN users u ON r.author_id = u.id
      WHERE r.post_id = ?
      ORDER BY r.created_at ASC
    `, [req.params.id]);
    res.json(replies);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// POST /api/posts/:id/replies
router.post('/:id/replies', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Reply text is required' });

    const [result] = await db.execute(
      'INSERT INTO replies (post_id, author_id, text) VALUES (?, ?, ?)',
      [req.params.id, req.user.id, text]
    );
    await db.execute('UPDATE posts SET comments_count = comments_count + 1 WHERE id=?', [req.params.id]);

    const [[reply]] = await db.execute(
      'SELECT r.*, u.name AS author_name, u.role AS author_role FROM replies r JOIN users u ON r.author_id = u.id WHERE r.id = ?',
      [result.insertId]
    );
    res.status(201).json(reply);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

module.exports = router;
