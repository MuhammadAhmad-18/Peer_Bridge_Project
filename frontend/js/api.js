// Peer Bridge – shared API client
const API_BASE = '/api';

const pb = {
  getToken: () => sessionStorage.getItem('pb_token'),
  getUser:  () => { try { return JSON.parse(sessionStorage.getItem('pb_user')); } catch { return null; } },
  setAuth:  (token, user) => { sessionStorage.setItem('pb_token', token); sessionStorage.setItem('pb_user', JSON.stringify(user)); },
  clearAuth: () => { sessionStorage.removeItem('pb_token'); sessionStorage.removeItem('pb_user'); },

  async req(method, path, body = null, isFormData = false) {
    const headers = { Authorization: `Bearer ${this.getToken()}` };
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    const res = await fetch(API_BASE + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  },

  get:    (path)        => pb.req('GET',    path),
  post:   (path, body)  => pb.req('POST',   path, body),
  put:    (path, body)  => pb.req('PUT',    path, body),
  del:    (path)        => pb.req('DELETE', path),
  upload: (path, form)  => pb.req('POST',   path, form, true),

  requireAuth() {
    if (!this.getToken()) { window.location.href = '/index.html'; throw new Error('Not authenticated'); }
  },
};

// Avatar helpers
const AVA_BGS = [
  ['#fde8f0','#f5b8ce'], ['#c7d9ff','#8ea8e8'], ['#d4f1e3','#7fc9a4'],
  ['#ffe4cc','#e8a76f'], ['#e9d7fb','#b48de0'], ['#fff4b8','#e6c84d'],
];
function strHash(s) {
  let h = 0;
  for (let i = 0; i < (s||'').length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function avatarDiv(name = '?', size = 36) {
  const parts = (name||'?').split(' ');
  const init  = (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
  const [bg, fg] = AVA_BGS[strHash(name) % AVA_BGS.length];
  const d = document.createElement('div');
  d.textContent = init;
  Object.assign(d.style, {
    width: size+'px', height: size+'px', borderRadius: '50%',
    background: `linear-gradient(135deg,${bg},${fg}33)`,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: (size*0.38)+'px', fontWeight: '700', color: fg,
    letterSpacing: '-0.02em', flexShrink: '0',
  });
  return d;
}
function timeAgo(dateStr) {
  const d = new Date(dateStr), now = Date.now();
  const s = Math.floor((now - d) / 1000);
  if (s < 60)   return 'just now';
  if (s < 3600) return Math.floor(s/60)+'m ago';
  if (s < 86400)return Math.floor(s/3600)+'h ago';
  return Math.floor(s/86400)+'d ago';
}
function showToast(msg, ms = 3000) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
function roleLabel(role) {
  const m = { freshman:'Freshman', sophomore:'Sophomore', junior:'Junior', senior:'Senior',
               mentor:'Mentor', lead_mentor:'Lead Mentor', admin:'Admin' };
  return m[role] || role;
}
function tagTone(tag) {
  if (tag === 'Academic Help')        return 'blush';
  if (tag === 'Career & Internships') return 'lav';
  if (tag === 'Resources')            return 'mint';
  if (tag === 'Events & Societies')   return 'peach';
  return 'lav';
}

function sidebarHTML(active) {
  const u = pb.getUser();
  const name = u?.name || 'You';
  const imgUrl = u?.profile_image || '';
  const role = u?.role || 'freshman';
  const initials = name.split(' ').map(p => p[0] || '').join('').slice(0, 2).toUpperCase();

  const avaHtml = imgUrl
    ? `<div style="width:34px;height:34px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid #E4EAF2"><img src="${imgUrl}" style="width:100%;height:100%;object-fit:cover"/></div>`
    : `<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#2563EB,#60A5FA);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:white;flex-shrink:0">${initials}</div>`;

  const navIcon = paths => `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
  const navItem = (href, key, label, icon) =>
    `<a href="${href}" class="snav-item${active === key ? ' active' : ''}">${navIcon(icon)} ${label}</a>`;

  return `<nav class="snav">
    <a href="/feed.html" class="snav-brand">
      <svg width="32" height="22" viewBox="0 0 140 90" fill="none"><defs><linearGradient id="lgnav-sb" x1="0" y1="0" x2="140" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#2563EB"/><stop offset="50%" stop-color="#1A3A8F"/><stop offset="100%" stop-color="#0D1B2A"/></linearGradient></defs><path d="M 14 70 C 14 18, 62 18, 70 44" stroke="url(#lgnav-sb)" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M 70 44 C 78 18, 126 18, 126 70" stroke="url(#lgnav-sb)" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="70" cy="44" r="10" stroke="url(#lgnav-sb)" stroke-width="7" fill="white"/><circle cx="14" cy="70" r="10" fill="#2563EB"/><circle cx="126" cy="70" r="10" fill="#0D1B2A"/></svg>
      <span style="font-size:15px;font-weight:700;color:#0d1b2a;letter-spacing:-.3px">Peer Bridge</span>
    </a>
    <div class="snav-section">Main</div>
    ${navItem('/feed.html', 'home', 'Home', '<path d="M3 12 12 4l9 8"/><path d="M5 10v10h14V10"/>')}
    ${navItem('/mentors.html', 'mentors', 'Mentors', '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>')}
    ${navItem('/resources.html', 'resources', 'Resources', '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z"/>')}
    ${navItem('/events.html', 'events', 'Events', '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>')}
    ${navItem('/messages.html', 'messages', 'Messages', '<path d="M14.5 10a1 1 0 0 1-1 1H4L1 14V3a1 1 0 0 1 1-1h11.5a1 1 0 0 1 1 1v7z"/>')}
    <a href="#" class="snav-item"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h12v18l-6-4-6 4V3Z"/></svg> Saved</a>
    <div class="snav-section" style="margin-top:8px">Account</div>
    ${navItem('/profile.html', 'profile', 'My Profile', '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>')}
    <div class="snav-footer">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        ${avaHtml}
        <div>
          <div style="font-size:13px;font-weight:700;color:#0d1b2a">${name}</div>
          <div style="font-size:11px;color:#4b5c73">${roleLabel(role)}</div>
        </div>
      </div>
      <button onclick="pb.clearAuth();location.href='/index.html'" style="width:100%;padding:8px;border:1.5px solid #CBD5E1;border-radius:8px;background:white;font-family:inherit;font-size:12.5px;font-weight:600;color:#4b5c73;cursor:pointer;transition:border-color .15s,color .15s" onmouseover="this.style.borderColor='#EF4444';this.style.color='#EF4444'" onmouseout="this.style.borderColor='#CBD5E1';this.style.color='#4b5c73'">Sign out</button>
    </div>
  </nav>`;
}
