-- ================================================
-- Peer Bridge - NUST Peer Mentorship Platform
-- Database Schema + Seed Data
-- ================================================

CREATE DATABASE IF NOT EXISTS peer_bridge
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE peer_bridge;

-- ------------------------------------------------
-- TABLES
-- ------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(100) NOT NULL,
  email             VARCHAR(255) UNIQUE NOT NULL,
  password_hash     VARCHAR(255),
  role              ENUM('freshman','sophomore','junior','senior','mentor','lead_mentor','admin') DEFAULT 'freshman',
  department        VARCHAR(100),
  graduation_year   INT,
  bio               TEXT,
  profile_image     VARCHAR(500),
  is_verified       BOOLEAN DEFAULT FALSE,
  otp_code          VARCHAR(6),
  otp_expires       DATETIME,
  rating            DECIMAL(3,2) DEFAULT 0.00,
  rating_count      INT DEFAULT 0,
  sessions_count    INT DEFAULT 0,
  is_online         BOOLEAN DEFAULT FALSE,
  is_locked         BOOLEAN NOT NULL DEFAULT FALSE,
  is_under_review   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_email_domain CHECK (email REGEXP '^[a-zA-Z0-9._-]+@(student\\.)?nust\\.edu\\.pk$'),
  INDEX idx_email   (email),
  INDEX idx_role    (role)
);

CREATE TABLE IF NOT EXISTS posts (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  author_id        INT NOT NULL,
  tag              ENUM('Academic Help','Career & Internships','Resources','Events & Societies') NOT NULL,
  title            VARCHAR(500) NOT NULL,
  body             TEXT,
  image_path       VARCHAR(500),
  likes_count      INT DEFAULT 0,
  comments_count   INT DEFAULT 0,
  bookmarks_count  INT DEFAULT 0,
  is_hidden        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_tag     (tag),
  INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS post_likes (
  user_id  INT NOT NULL,
  post_id  INT NOT NULL,
  PRIMARY KEY (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post_bookmarks (
  user_id  INT NOT NULL,
  post_id  INT NOT NULL,
  PRIMARY KEY (user_id, post_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS replies (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  post_id     INT NOT NULL,
  author_id   INT NOT NULL,
  text        TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id)   REFERENCES posts(id)  ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id)  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  sender_id   INT NOT NULL,
  receiver_id INT NOT NULL,
  text        TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_convo   (sender_id, receiver_id),
  INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS resources (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  uploader_id     INT NOT NULL,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  file_path       VARCHAR(500),
  file_name       VARCHAR(255),
  file_type       VARCHAR(50),
  file_size       BIGINT,
  category        VARCHAR(100),
  course_code     VARCHAR(20),
  downloads_count INT DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_category (category)
);

CREATE TABLE IF NOT EXISTS events (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  organizer_id  INT NOT NULL,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  venue         VARCHAR(255),
  event_date    DATE NOT NULL,
  event_time    TIME,
  category      VARCHAR(100),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_date (event_date)
);

CREATE TABLE IF NOT EXISTS ratings (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  rater_id   INT NOT NULL,
  mentor_id  INT NOT NULL,
  score      INT NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_rating (rater_id, mentor_id),
  FOREIGN KEY (rater_id)  REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mentorship_requests (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  requester_id INT NOT NULL,
  mentor_id    INT NOT NULL,
  message      TEXT,
  status       ENUM('pending','accepted','declined') DEFAULT 'pending',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mentor_id)    REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reports (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id INT NOT NULL,
  target_type ENUM('post','user','resource') NOT NULL,
  target_id   INT NOT NULL,
  reason      ENUM('Spam','Harassment','Inappropriate','Misinformation') NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY  unique_report (reporter_id, target_type, target_id),
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_target (target_type, target_id)
);

-- ------------------------------------------------
-- CLEAR ALL EXISTING DATA
-- ------------------------------------------------

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE reports;
TRUNCATE TABLE mentorship_requests;
TRUNCATE TABLE ratings;
TRUNCATE TABLE events;
TRUNCATE TABLE resources;
TRUNCATE TABLE messages;
TRUNCATE TABLE replies;
TRUNCATE TABLE post_bookmarks;
TRUNCATE TABLE post_likes;
TRUNCATE TABLE posts;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------
-- SEED DATA  (passwords are bcrypt of 'Test@123')
-- Note: hash below is a placeholder. Use OTP login
-- in the app for seed accounts during development.
-- ------------------------------------------------

SET @pw = '$2b$10$YourHashHere';

-- ── Users ──────────────────────────────────────────────────────────────
-- IDs 1-3: lead mentors  |  4-8: mentors  |  9-15: students

INSERT INTO users (name, email, password_hash, role, department, graduation_year, bio, is_verified, rating, rating_count, sessions_count) VALUES
('Syed Hassan Raza',   'syed.hassan@nust.edu.pk',               @pw, 'lead_mentor', 'SEECS', 2023, 'CS grad now at Google Singapore. Distributed systems and ML. Helped 60+ students with FYPs, FAANG prep, and research. Available for anything CS-related.', TRUE, 4.95, 61, 68),
('Aiman Batool',       'aiman.batool@nust.edu.pk',              @pw, 'lead_mentor', 'NBS',   2022, 'NBS grad, MBA from LUMS, currently at McKinsey Karachi. I mentor on case interviews, MBA applications, and corporate finance. 70+ students placed in Big 4 and MNCs.', TRUE, 4.90, 74, 82),
('Areeba Noor',        'areeba.noor@nust.edu.pk',               @pw, 'lead_mentor', 'SEECS', 2022, 'MS at LUMS, IEEE-published researcher in NLP and HCI. If you are targeting top grad programs or research positions, I can help you build a strong profile.', TRUE, 4.88, 55, 60),
('Muhammad Usman',     'm.usman@nust.edu.pk',                   @pw, 'mentor',      'SEECS', 2024, 'Backend engineer at Systems Limited. Competitive programming and open source background. Available for DSA prep, internship referrals, and tech interview coaching.', TRUE, 4.75, 33, 38),
('Hira Baig',          'hira.baig@nust.edu.pk',                 @pw, 'mentor',      'S3H',   2024, 'English Lit grad, now HR at Unilever Pakistan. I help with CVs, LinkedIn, and soft skills for non-technical corporate career paths.', TRUE, 4.70, 22, 27),
('Talha Iqbal',        'talha.iqbal@nust.edu.pk',               @pw, 'mentor',      'SMME',  2023, 'Mechanical engineer at NESCOM working on aerospace systems. I guide SMME students on FYPs, SolidWorks CAD, and defence sector paths. Formula Student alumnus.', TRUE, 4.65, 18, 22),
('Sana Mirza',         'sana.mirza@nust.edu.pk',                @pw, 'mentor',      'SEECS', 2025, 'Currently doing MS at FAST-NUCES. Undergrad research in computer vision. Coaching students on SEECS FYP proposals and research paper writing. Available evenings.', TRUE, 4.60, 14, 16),
('Omar Farooq',        'omar.farooq@nust.edu.pk',               @pw, 'mentor',      'CEME',  2024, 'Electrical engineer at PTCL. Interned at Telenor and Jazz. Good for CEME and SEECS students targeting telecom and power sector careers.', TRUE, 4.55, 11, 13),
('Zainab Fatima',      'zainab.fatima@student.nust.edu.pk',     @pw, 'senior',      'SEECS', 2026, 'Final-year CS student. FYP in deep learning for medical imaging. President, IEEE NUST WIE chapter 2025-26.', TRUE, 0.00, 0, 0),
('Abdullah Malik',     'abdullah.malik@student.nust.edu.pk',    @pw, 'junior',      'NBS',   NULL,  'Third-year finance student on the NUST Job Fair 2026 organizing team. Interested in investment banking and equity research.', TRUE, 0.00, 0, 0),
('Mahnoor Qureshi',    'mahnoor.qureshi@student.nust.edu.pk',   @pw, 'sophomore',   'SEECS', NULL,  'Second-year BS CS. Top 10 at NASCON 2026 speed programming. Looking for summer research internships in AI/ML.', TRUE, 0.00, 0, 0),
('Hamza Sheikh',       'hamza.sheikh@student.nust.edu.pk',      @pw, 'sophomore',   'SMME',  NULL,  'ME sophomore on the NUST Formula Student aerodynamics sub-team. Passionate about automotive design and electric vehicles.', TRUE, 0.00, 0, 0),
('Rimsha Asif',        'rimsha.asif@student.nust.edu.pk',       @pw, 'freshman',    'SEECS', NULL,  'First-semester CS at SEECS. Navigating MTH-101 and CS-101 at the same time. Long-term interest in cybersecurity.', TRUE, 0.00, 0, 0),
('Owais Ahmed',        'owais.ahmed@student.nust.edu.pk',       @pw, 'freshman',    'NBS',   NULL,  'First semester at NBS. Looking for the right societies and study groups. Open to all mentorship.', TRUE, 0.00, 0, 0),
('Mariam Iftikhar',    'mariam.iftikhar@student.nust.edu.pk',   @pw, 'junior',      'SCME',  NULL,  'Chemical engineering junior, research project on water purification. Member of NUST Literary Society.', TRUE, 0.00, 0, 0);

-- ── Posts ──────────────────────────────────────────────────────────────

INSERT INTO posts (author_id, tag, title, body, likes_count, comments_count, bookmarks_count) VALUES
(13, 'Academic Help',        'Drowning in MTH-101 and CS-101 simultaneously — any survival tips for SEECS freshmen?',                                    'Week 3 of SEECS and I genuinely feel like I am drowning. MTH-101 moves so fast and CS-101 lab feels like a completely different subject from the lectures. Is this normal? How did you seniors manage both? Any particular resources that saved you?', 47, 2, 12),
(11, 'Resources',            'Complete CS-201 Data Structures notes — midterm and final content, all in one PDF',                                         'Compiled from lectures, Cormen, and Geeks for Geeks summaries aligned to the SEECS syllabus. Covers arrays, linked lists, stacks, queues, trees (BST, AVL, Heap), graphs (BFS, DFS, Dijkstra), hashing, and DP basics. Resource uploaded above.', 183, 1, 142),
(9,  'Academic Help',        'FYP pro tip: finish your literature review in the first two weeks of semester 7, not the last two',                         'I see the same mistake every year. Students spend weeks 1-6 "planning" then panic-read 30 papers in week 11. A literature review done properly takes three full weeks. Start on day one. Define your gap by week 2. Your supervisor will respect you for it and your proposal will be incomparably stronger.', 211, 2, 98),
(10, 'Career & Internships', 'My McKinsey Pakistan OA experience: what to expect and how I actually prepared',                                            'Just cleared the McKinsey Online Assessment. The Solve game now runs 50 minutes, not 35 like older guides say. Three mini-games test systems thinking, data interpretation, and pattern recognition. I used the free McKinsey practice portal every day for two weeks. The written case that follows is harder — message me for resources.', 94, 2, 67),
(11, 'Events & Societies',   'NASCON 2026 recap — SEECS students dominate the speed programming leaderboard again',                                      'NASCON wrapped up last month and it was the best edition yet. The competitive programming track had 340 registered teams. Top 10 was dominated by SEECS second and third years. The hackathon track was new this year — our team built an Urdu NLP tool and won runner-up. Full results on the NASCON website. See you at NASCON 2027!', 78, 1, 5),
(12, 'Events & Societies',   'NUST Formula Student 2026 car reveal — Friday at SMME courtyard, 11am',                                                   'Three years of work. The FS26 is fully electric, has a new composite monocoque, and the aero package is the most refined we have ever built. Come support the team this Friday at 11am at the SMME courtyard. Free entry, open to everyone. Bring your questions for the engineering team.', 113, 2, 8),
(14, 'Academic Help',        'Which NBS societies are actually worth joining in first year?',                                                              'I keep hearing "join everything in first year" but also "over-committing kills your GPA in semester 1." How did NBS seniors actually balance this? Which one or two societies gave the most return in terms of skills, network, and career visibility?', 52, 2, 19),
(1,  'Career & Internships', 'From SEECS to Google Singapore: what I wish I had known in second year',                                                   'A lot of students ask how I got to Google. The honest answer: I stopped doing competitive programming to score marks and started building real projects people could use. Open source contributions got me my first international internship. Your GitHub is your real CV. Build something, put it online, talk about it. I will write a detailed post later but start there.', 267, 2, 189),
(15, 'Resources',            'SCME CHE-201 Thermodynamics — full semester notes and past papers (2022–2025)',                                             'Compiled from lecture slides and Cengel & Boles, with three years of past papers and worked solutions for all numericals. Covers laws of thermodynamics, entropy, heat engines, refrigeration cycles, and power plant analysis. Good luck everyone.', 144, 1, 118),
(10, 'Events & Societies',   'NUST Job Fair 2026: 120+ companies confirmed — full list and preparation tips inside',                                     'May 6-7 at CIE Sports Complex. 120+ companies this year: Engro, P&G, Google, Systems Limited, HBL, Meezan Bank, PTCL, Jazz, Arbisoft, 10Pearls, Oracle Pakistan, and more. Formal dress is mandatory. Bring at least 15 printed CVs. Company-by-company prep guide posted on the NBS Consulting Cell portal. Tag your friends.', 156, 3, 201),
(13, 'Academic Help',        'PHY-101 lab report format — what does a full-marks error analysis actually look like?',                                    'My TA said my error analysis lacks depth but I do not know what depth means here. I wrote the percentage error formula and plugged in numbers. What else is expected? Is there a standard format NUST TAs look for?', 31, 1, 44),
(5,  'Career & Internships', 'CV mistakes that got NUST graduates rejected by Unilever and P&G — a recruiter\'s perspective', 'I screened over 400 NUST graduate CVs in the past year. Top five mistakes causing instant rejection: (1) Generic objective statement. (2) Listing societies without saying what you did. (3) No quantified achievements — "managed social media" is not a bullet, "grew Instagram followers 3x in 4 months" is. (4) GPA below 3.2 with nothing to offset it. (5) Two-page CVs with nothing worth a second page. Fix these first.', 198, 2, 87);

-- ── Replies ────────────────────────────────────────────────────────────

INSERT INTO replies (post_id, author_id, text, likes_count) VALUES
-- Post 1: MTH-101 + CS-101 survival
(1,  7,  'Make a timetable and treat CS-101 lab and MTH-101 as completely separate study blocks. The first three weeks are the hardest before you find your rhythm. Form a study group of 3-4 people in week 1 — do not wait until you are falling behind. The SEECS senior batch shares notes through a departmental group, ask someone to add you.', 31),
(1,  1,  'Use MIT 6.001 on YouTube for CS-101 fundamentals — far better than reading the textbook alone. For MTH-101, Stewart Calculus Chapters 1-3 covers the entire first midterm. Study limits visually on Khan Academy first, then solve NUST past papers for exam technique. Past papers are more useful than any notes.', 44),
-- Post 2: CS-201 notes
(2,  4,  'Quality notes. One addition: for dynamic programming, lecture content barely scratches what finals can ask. Use CLRS Chapter 15 alongside this. Classic problems like LCS, Knapsack, and Matrix Chain Multiplication have appeared in NUST CS-201 finals every year for the last four years.', 27),
-- Post 3: FYP literature review
(3,  3,  'This deserves to be pinned. I would add: use Zotero from day one to manage your references. Students who build their reference library early save 10-15 hours during final submission. Also define your gap statement in one sentence before week 3 — if you cannot state the gap in one sentence, your literature review is not done yet.', 56),
(3,  7,  'Also: talk to your supervisor every single week even when you have nothing to show. Build the relationship before you have a problem, not during one. Supervisors are far more forgiving of setbacks when they trust your consistency.', 38),
-- Post 4: McKinsey OA
(4,  2,  'Good write-up. The Imbellus Solve game changed format in late 2025 — now 50 minutes with a clearer scoring breakdown. Mental math still matters a lot. Key tip: do not rush the ecosystem game. Students who click fast score worse than those who observe patterns first. Message me if you want the practice link I used.', 41),
(4,  15, 'Did you prepare alone or in a study group? I am attempting this cycle and would love a structured prep partner.', 8),
-- Post 5: NASCON recap
(5,  4,  'The hackathon judging was noticeably more structured this year — actual rubrics instead of subjective evaluation. The SEECS CP team has been strong for years now. NASCON 2027 should seriously consider adding a CTF cybersecurity track, the demand is clearly there.', 19),
-- Post 6: Formula Student reveal
(6,  6,  'The team went through three complete design revisions this year. Switching from combustion to full electric was the highest-risk call since 2021 and the students delivered. Come support them on Friday — they have earned it.', 48),
(6,  3,  'Will the powertrain architecture documentation be made publicly available after the reveal? Interested in the motor control logic for a potential embedded systems collaboration with SEECS.', 12),
-- Post 7: NBS societies
(7,  5,  'From an HR perspective: join one or two societies you will actually show up for, not five for the certificates. Recruiters can tell the difference in 30 seconds of an interview. At NBS specifically, the Finance Club and the Consulting Cell have the best alumni networks. Choose based on where you want to be in year four.', 34),
(7,  2,  'NBS Consulting Cell and Model UN were genuinely transformative for me. Both have senior members who actively push your growth. My rule: do not over-join in semester 1. Lock in your academic rhythm first. You can always join more in semester 2 once you know your capacity.', 29),
-- Post 8: SEECS to Google
(8,  11, 'Saving this forever. The open source point is something nobody says out loud in second year — everyone just talks about competitive programming ratings. Changing my approach this semester.', 72),
(8,  13, 'This is exactly what I needed as a freshman. Thank you. Already following you on LinkedIn. Is there a beginner open source project you would recommend starting with?', 38),
-- Post 9: SCME CHE-201 notes
(9,  12, 'Any chance you have ME-201 Engineering Mechanics notes as well? Finals are in three weeks and the Hibbeler textbook is very dense to follow under exam pressure.', 11),
-- Post 10: Job Fair
(10, 9,  'IEEE NUST will have a booth this year with live project demonstrations. Come visit — we are also quietly recruiting for the 2026-27 committee. Look for the blue banner near the CIE main entrance.', 27),
(10, 7,  'Practical tip from last year: bring at least 15 printed CVs. Serious MNC booths go through stacks fast. By 11am last year some students had run out. Also wear formal — the big company booths absolutely notice and it affects first impressions more than people expect.', 53),
(10, 14, 'Is this open for freshmen? I do not have an internship-ready CV yet. Is it worth attending just to explore companies and talk to people?', 6),
-- Post 11: PHY-101 lab error analysis
(11, 7,  'NUST PHY-101 lab reports follow this structure: Objective, Theory, Apparatus, Procedure, Observations Table, Sample Calculations, Graph, Results, Error Analysis, Conclusion. For error analysis: calculate percentage error as |(experimental − theoretical) / theoretical| × 100, then write two sentences on likely sources of error (instrument precision, reaction time, environmental factors). That is what "depth" means to your TA.', 49),
-- Post 12: CV mistakes
(12, 9,  'The generic objective point is so real. Every CV I review from freshmen opens with "to obtain a challenging position that leverages my skills." Remove it and replace it with a two-line targeted summary tied to the specific role. Hiring managers read CVs in 6-8 seconds on first pass — your first two lines decide if they continue.', 67),
(12, 10, 'Sharing with my whole batch. I genuinely did not know the GPA threshold was 3.2 for most MNCs. Always assumed 3.0 was fine.', 15);

-- ── Events ─────────────────────────────────────────────────────────────
-- Past events (before 2026-04-25) then upcoming

INSERT INTO events (organizer_id, title, description, venue, event_date, event_time, category) VALUES
(11, 'NASCON 2026 — NUST Annual Student Competition',          'Pakistan''s largest student computing competition. 340+ teams across speed programming, hackathon, robotics, gaming, and project showcase tracks. Organized by SEECS student body under the CS department.',                                                                                                                             'SEECS Building, H-12 Campus',      '2026-03-14', '09:00:00', 'Competition'),
(9,  'NUST Sports Gala 2026',                                  'Annual inter-school sports competition covering cricket, football, basketball, badminton, tennis, swimming, and athletics. Open to all NUST schools and colleges. Registration through school sports representatives.',                                                                                                                    'CIE Sports Complex, H-12',         '2026-03-06', '08:00:00', 'Sports'),
(1,  'SEECS Open Source Day 2026',                             'Full-day event where SEECS students present open source projects and run workshops on Git, GitHub, and contributing to major open source repositories. Industry engineers from Systems Limited and Arbisoft attending. First-year students especially encouraged.',                                                                        'SEECS Auditorium, H-12',           '2026-04-05', '10:00:00', 'Technical'),
(9,  'IEEE NUST Annual General Body Meeting 2026',             'IEEE NUST Student Branch AGM and committee elections for the 2026-27 academic year. Open to all IEEE NUST members. New membership registrations accepted on the day. Presentations from outgoing committee on year achievements.',                                                                                                     'SEECS Conference Room, 3rd Floor', '2026-04-12', '15:00:00', 'Society'),
(9,  'NUST Blood Drive 2026',                                  'Annual blood donation campaign organized by IEEE NUST WIE in collaboration with PIMS Hospital Islamabad. All blood groups urgently needed. Free health screening for all donors. No registration required — walk in during event hours.',                                                                                              'CIE Sports Complex, H-12',         '2026-04-30', '09:00:00', 'Community'),
(10, 'NUST Job Fair 2026',                                     'One of Pakistan''s largest campus recruitment events. 120+ companies across technology, finance, energy, FMCG, telecom, and consulting. Confirmed companies include Engro, P&G, Google, Systems Limited, HBL, Meezan Bank, PTCL, Jazz, Arbisoft, 10Pearls, and Oracle Pakistan. Formal dress mandatory. Open to all NUST students and recent graduates (2024-2026 batch).', 'CIE Sports Complex, H-12',         '2026-05-06', '09:00:00', 'Career'),
(7,  'Scintilla 2026 — SEECS Annual Technical Symposium',     'SEECS flagship technical event. Two days of project exhibitions, industry talks, hands-on workshops, and networking with technology professionals. Participation open to all NUST departments. Industry partners include Microsoft, Google, and Systems Limited.',                                                                      'SEECS Building, H-12',             '2026-05-13', '09:00:00', 'Technical'),
(6,  'NUST Formula Student 2026 — Public Demo Day',           'Public demonstration of the FS26 electric race car built by the NUST Formula Student team over three years. Watch the car complete timed laps on the campus test circuit. Full Q&A session with the engineering team after the demo run. Open to all — no registration required.',                                                    'SMME Courtyard, H-12 Campus',      '2026-05-17', '11:00:00', 'Technical'),
(3,  'SEECS FYP Showcase 2026',                               'Annual showcase of BS and MS Final Year Projects from SEECS. 80+ projects across AI, cybersecurity, embedded systems, HCI, and networks. Open to industry visitors, media, and all NUST students. Best project awards presented by SEECS Dean.',                                                                                    'SEECS Seminar Hall, H-12',         '2026-05-21', '09:00:00', 'Academic'),
(15, 'NLS Annual Mushaira 2026',                               'NUST Literary Society''s annual Urdu poetry night. Open mic for students, faculty readings, and guest poet performances. One of the most attended cultural evenings on campus. Tea and refreshments provided by NLS.',                                                                                                               'CIE Main Lawn, H-12',              '2026-05-24', '18:00:00', 'Cultural'),
(2,  'NBS Business Case Competition 2026',                     'NBS annual case competition open to all business and management students. Teams of three present business solutions to a panel of industry judges from McKinsey, Engro, and Unilever. Total prize pool PKR 200,000. Registrations open — submit team on NBS portal before May 20.',                                                   'NBS Auditorium, H-12',             '2026-05-28', '10:00:00', 'Competition'),
(15, 'NUMUN 2026 — NUST Model United Nations',                'Three-day Model UN conference hosted by NUST. Fifteen committees covering international security, climate policy, economic development, and human rights. Delegates from 20+ universities across Pakistan. Registration and committee selection at numun.nust.edu.pk.',                                                               'Margalla Hall, H-12 Campus',       '2026-06-06', '08:00:00', 'Society'),
(3,  'NUST Research Day 2026',                                'Annual showcase of ongoing faculty and graduate research across all NUST schools. Poster presentations, keynote lectures from international researchers, and award ceremony for best student publications of the year. Open to all NUST students.',                                                                                   'NUST Main Lawn and Auditorium',    '2026-06-12', '10:00:00', 'Academic'),
(1,  'E3 Summit 2026 — Entrepreneurship, Energy & Engineering','NUST annual entrepreneurship summit connecting student startups, venture capitalists, and industry leaders. Pitch competition with PKR 500,000 in funding prizes. Keynote speakers from Careem, Airlift, and LUMS Centre for Entrepreneurship. Open registration for all NUST students.',                                          'CIE Auditorium, H-12',             '2026-06-19', '10:00:00', 'Career');

-- ── Resources ──────────────────────────────────────────────────────────

INSERT INTO resources (uploader_id, title, description, file_name, file_type, file_size, category, course_code, downloads_count) VALUES
(11, 'CS-201 Data Structures & Algorithms — Complete Notes',      'Full semester notes covering arrays, linked lists, stacks, queues, trees (BST, AVL, Heap), graphs (BFS/DFS/Dijkstra), hashing, and dynamic programming. Aligned to SEECS syllabus with Cormen cross-references.',                               'cs201_dsa_notes.pdf',        'PDF',  4718592,  'Course Notes',  'CS-201',  312),
(13, 'MTH-101 Calculus — Past Papers Bundle (2020–2025)',          '5 years of MTH-101 midterm and final exams with fully worked solutions. Organized by topic: limits, derivatives, applications of differentiation, integration, and series.',                                                                        'mth101_papers_2020_25.zip',  'ZIP',  18874368, 'Past Papers',   'MTH-101', 589),
(7,  'PHY-101 — Solved Problem Sets and Lab Report Guide',         'Solved numericals from Halliday/Resnick aligned to the NUST PHY-101 syllabus. Includes a lab report writing guide with sample error analysis sections for all 10 scheduled lab experiments.',                                                      'phy101_problems_labs.pdf',   'PDF',  6291456,  'Course Notes',  'PHY-101', 417),
(1,  'SEECS FYP Proposal Template 2026',                          'Updated SEECS FYP proposal template with sections for problem statement, literature review matrix, methodology, timeline, and expected contributions. Includes annotated examples from approved proposals.',                                          'seecs_fyp_template_2026.docx','DOCX',1048576,  'FYP Resources', NULL,      278),
(6,  'SMME ME-201 Engineering Mechanics — Formula Sheet & Notes', 'One-page formula sheet and chapter-by-chapter notes covering statics (equilibrium, trusses, friction) and dynamics (kinematics, Newton laws, energy methods). Optimized for finals week revision.',                                                'me201_mechanics_notes.pdf',  'PDF',  3145728,  'Course Notes',  'ME-201',  203),
(2,  'NBS Case Interview Preparation Pack',                       'Comprehensive case prep guide for McKinsey, BCG, Bain, and local consulting firms. Covers frameworks, mental math drills, 12 fully solved practice cases, and evaluator rubrics. Based on 2023-2026 NBS placement cycles.',                        'nbs_case_prep_pack.pdf',     'PDF',  8388608,  'Career Guide',  NULL,      445),
(5,  'CV and LinkedIn Guide for NUST Students (2026 Edition)',    'Step-by-step CV writing guide for NUST students targeting MNCs, Big 4, and tech companies. Includes before/after CV examples, LinkedIn optimization checklist, and cover letter templates for five industries.',                                   'cv_linkedin_guide_2026.pdf', 'PDF',  2097152,  'Career Guide',  NULL,      521),
(15, 'SCME CHE-201 Thermodynamics — Notes and Past Papers',       'Full semester notes from Cengel & Boles with three years of past papers and worked numerical solutions. Covers thermodynamic laws, entropy, heat engines, refrigeration cycles, and power plant analysis.',                                          'che201_thermo_notes.zip',    'ZIP',  22020096, 'Course Notes',  'CHE-201', 134),
(4,  'HU-101 Technical Report Writing — Complete Guide',          'Covers report structure, IEEE and APA citation formats, paragraph construction, and common grammatical errors in engineering writing. Includes graded sample reports with instructor comments.',                                                       'hu101_writing_guide.pdf',    'PDF',  1572864,  'Course Notes',  'HU-101',  267),
(3,  'NUST Graduate School Application Guide (MS/PhD 2026)',       'Covers NUST MS and PhD application process, SOP writing with annotated examples, referee selection strategy, CGPA benchmarks by department, and timeline planning. Includes SEECS faculty research group contact list.', 'nust_grad_guide_2026.pdf',   'PDF',  3670016,  'FYP Resources', NULL,      189);

-- ── Ratings ────────────────────────────────────────────────────────────

INSERT INTO ratings (rater_id, mentor_id, score, comment) VALUES
(9,  1, 5, 'Syed bhai spent two hours on a call walking me through my FYP architecture. Genuinely changed the direction of my project for the better. Best mentor I have had.'),
(10, 2, 5, 'Aiman''s case prep sessions are the real deal. She knows exactly what McKinsey Pakistan looks for. Got through to the final round because of her.'),
(11, 3, 5, 'Areeba reviewed my research proposal and gave comments sharper than any professor feedback I have received. Essential for anyone going into research.'),
(11, 4, 4, 'Very accessible and gives practical advice. His Systems Limited referral got me the interview. Would love more structured sessions but the quality is high.'),
(13, 4, 5, 'Muhammad bhai made CS-101 click in one session. Patient, clear, and gives the kind of real examples that textbooks skip.'),
(14, 5, 4, 'Hira helped me completely rewrite my CV and it is now actually good. She is direct about what needs to change which I really appreciated.'),
(10, 5, 5, 'Best career mentor at NUST for non-technical paths. Knows the MNC recruitment pipeline inside out.'),
(12, 6, 5, 'Talha bhai is the reason I joined Formula Student. Took time to explain the full design process and shared documentation I could not find anywhere else.'),
(9,  7, 4, 'Sana is knowledgeable about the research process and helped me write my first abstract. Responsive and genuinely helpful.'),
(15, 3, 5, 'Areeba ma''am''s guidance on my SOP was invaluable. The before and after were completely different documents.');

-- ── Mentorship Requests ────────────────────────────────────────────────

INSERT INTO mentorship_requests (requester_id, mentor_id, message, status) VALUES
(13, 1, 'Assalamu alaikum. I am a SEECS freshman interested in cybersecurity long-term and struggling with CS-101 right now. Could you point me in the right direction for first year?', 'accepted'),
(14, 2, 'I am a first-year NBS student interested in consulting. I would love guidance on what to focus on in the first two years to be competitive for firms like McKinsey later.', 'pending'),
(11, 3, 'I want to apply for MS programs next year. My CGPA is 3.7 and I have one conference paper accepted. Would you be willing to review my research statement?', 'accepted'),
(12, 6, 'I just joined the Formula Student aerodynamics sub-team as a freshman. Any advice on the design review presentation and where to start with CFD?', 'accepted'),
(15, 7, 'I am a junior working on a water purification research project. Looking for guidance on structuring my methodology and potentially writing it up for publication.', 'pending'),
(14, 5, 'I am applying for MNC internships next cycle and my CV needs serious work. Would you be available for a CV review session?', 'pending');

-- ── Messages ──────────────────────────────────────────────────────────

INSERT INTO messages (sender_id, receiver_id, text, is_read) VALUES
(13, 1,  'Assalamu alaikum sir! Just sent a mentorship request. I am struggling a lot with CS-101 this semester and would really value some guidance on where to start.', TRUE),
(1,  13, 'Wa alaikum salam Rimsha! Accepted your request. CS-101 is genuinely hard in week 1 — it gets easier. Start with Python Tutor (pythontutor.com) to visualize every loop and recursion. I will send you a full resource list this evening.', TRUE),
(13, 1,  'Thank you so much! I just made an account on Python Tutor and it is already helping a lot with understanding how loops work.', TRUE),
(12, 6,  'Sir, I just joined the Formula Student aero sub-team. Any tips for the design review presentation? I have basically no CFD experience yet.', TRUE),
(6,  12, 'Great choice Hamza! For design review: know your drag coefficient calculation inside out and be ready to justify every single geometry decision. Use ANSYS Fluent for CFD — the SMME lab has licensed copies. I am sharing our 2023 design report with you right now.', TRUE),
(11, 3,  'Ma''am, I wanted to ask about MS applications. My CGPA is 3.7 and I have a paper accepted at a regional IEEE conference. Am I competitive for LUMS CS or SEECS MS programs?', TRUE),
(3,  11, '3.7 CGPA with an accepted IEEE paper is a solid profile for both. The differentiator now is your SOP — it needs to tell a research story, not a CV in paragraph form. Email two or three professors in your target department before submitting the application. I can review your SOP draft when you have a version ready.', TRUE),
(11, 3,  'This is incredibly helpful, thank you! I will draft the SOP this week and send it over.', FALSE);
