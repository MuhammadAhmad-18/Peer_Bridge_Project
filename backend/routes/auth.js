const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const path     = require('path');
const multer   = require('multer');
const db       = require('../config/db');
const authMw   = require('../middleware/auth');

const avatarStorage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `avatar-${Date.now()}${ext}`);
  },
});
const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(email, otp) {
  // Dev mode: just log the OTP
  console.log(`\n[DEV] OTP for ${email}: ${otp}\n`);

  if (process.env.NODE_ENV !== 'production') return; // skip real email in dev

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  await transporter.sendMail({
    from: `"Peer Bridge" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Peer Bridge verification code',
    text: `Your 6-digit code is: ${otp}\nExpires in 10 minutes.`,
    html: `<p>Your Peer Bridge verification code is:</p><h2>${otp}</h2><p>Expires in 10 minutes.</p>`,
  });
}

// POST /api/auth/send-otp
// Body: { email }
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const clean = email.trim().toLowerCase();
    if (!/^[a-z0-9._-]+@(student\.)?nust\.edu\.pk$/i.test(clean)) {
      return res.status(400).json({ error: 'Only NUST email addresses are allowed.' });
    }

    const otp     = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    const [[existing]] = await db.execute('SELECT id FROM users WHERE email = ?', [clean]);
    if (existing) {
      await db.execute('UPDATE users SET otp_code = ?, otp_expires = ? WHERE email = ?', [otp, expires, clean]);
    } else {
      // Extract name from email (e.g., "hassan.ali" from "hassan.ali@nust.edu.pk")
      const nameFromEmail = clean.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      await db.execute(
        'INSERT INTO users (name, email, otp_code, otp_expires, is_verified) VALUES (?, ?, ?, ?, FALSE)',
        [nameFromEmail, clean, otp, expires]
      );
    }

    await sendOTPEmail(clean, otp);

    const resp = { message: 'OTP sent to your NUST email' };
    if (process.env.NODE_ENV !== 'production') resp.dev_otp = otp; // remove in prod
    res.json(resp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-otp
// Body: { email, otp }
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const clean = email.trim().toLowerCase();
    const [[user]] = await db.execute('SELECT * FROM users WHERE email = ?', [clean]);
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (user.otp_code !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (new Date() > new Date(user.otp_expires)) return res.status(400).json({ error: 'OTP expired' });

    const isNew = !user.department; // department is only set after profile setup completes

    if (isNew) {
      // New user: clear OTP but do NOT verify yet — verification happens in setup-profile
      await db.execute('UPDATE users SET otp_code = NULL, otp_expires = NULL WHERE id = ?', [user.id]);
    } else {
      // Returning user: fully verify and log in
      await db.execute('UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expires = NULL WHERE id = ?', [user.id]);
    }

    const [[fresh]] = await db.execute('SELECT * FROM users WHERE id = ?', [user.id]);
    res.json({ token: makeToken(fresh), user: safeUser(fresh), is_new_user: isNew });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// POST /api/auth/setup-profile  (for new users after OTP)
// Body (multipart/form-data): { name, department, graduation_year, role, bio, password, profile_image? }
router.post('/setup-profile', authMw, avatarUpload.single('profile_image'), async (req, res) => {
  try {
    const { name, department, graduation_year, role, bio, password } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const allowed = ['freshman','sophomore','junior','senior','mentor'];
    const safeRole = allowed.includes(role) ? role : 'freshman';

    let pw_hash = null;
    if (password) pw_hash = await bcrypt.hash(password, 10);

    const profile_image = req.file ? `/uploads/${req.file.filename}` : null;

    await db.execute(
      `UPDATE users SET name=?, department=?, graduation_year=?, role=?, bio=?, password_hash=COALESCE(?,password_hash), profile_image=COALESCE(?,profile_image), is_verified=TRUE WHERE id=?`,
      [name, department || null, graduation_year || null, safeRole, bio || null, pw_hash, profile_image, req.user.id]
    );

    const [[user]] = await db.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json({ token: makeToken(user), user: safeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Profile setup failed' });
  }
});

// POST /api/auth/login  (email + password for returning users)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const [[user]] = await db.execute('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.is_verified) return res.status(401).json({ error: 'Account not verified' });
    if (user.is_locked) return res.status(403).json({ error: 'Your account has been suspended due to community reports.' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ token: makeToken(user), user: safeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authMw, async (req, res) => {
  const [[user]] = await db.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(safeUser(user));
});

function safeUser(u) {
  const { password_hash, otp_code, otp_expires, ...rest } = u;
  return rest;
}

module.exports = router;
