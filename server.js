const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || '127.0.0.1';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'registrations.json');
const sessions = new Map();
const loginAttempts = new Map();

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ students: [], scribes: [], examRequests: [] }, null, 2));

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const send = (res, status, body, contentType = 'application/json; charset=utf-8', headers = {}) => {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    ...headers
  });
  res.end(contentType.includes('json') ? JSON.stringify(body) : body);
};
const readBody = req => new Promise((resolve, reject) => {
  let raw = '';
  req.on('data', chunk => {
    raw += chunk;
    if (raw.length > 100_000) reject(new Error('Request too large'));
  });
  req.on('end', () => {
    try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('Invalid JSON')); }
  });
});
const readData = () => {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  data.students ||= [];
  data.scribes ||= [];
  data.examRequests ||= [];
  return data;
};
const writeData = data => {
  data.students ||= [];
  data.scribes ||= [];
  data.examRequests ||= [];
  const temp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2));
  fs.renameSync(temp, DATA_FILE);
};
const clean = (value, max = 120) => String(value ?? '').trim().slice(0, max);
const cleanList = (value, max = 30) => Array.isArray(value) ? value.map(item => clean(item, max)).filter(Boolean).slice(0, 10) : [];
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(item => item.trim().split('=').map(decodeURIComponent)));
const isAdmin = req => {
  const token = cookies(req).sahaya_admin;
  const session = token && sessions.get(token);
  if (!session || session.expires < Date.now()) return false;
  session.expires = Date.now() + 8 * 60 * 60 * 1000;
  return true;
};

function qualificationLevel(value) {
  const text = clean(value, 80).toLowerCase();
  if (/graduate|degree|bcom|bsc|ba|b\.com|b\.sc|engineering|btech|b\.tech|arts/.test(text)) return 3;
  if (/12|puc|pre university|higher secondary/.test(text)) return 2;
  if (/10|sslc|secondary/.test(text)) return 1;
  return 0;
}

function isEligible(request, scribe) {
  if (request.status !== 'open') return false;
  const blocked = (request.blockedBackgrounds || []).map(item => item.toLowerCase());
  if (blocked.length && !scribe.background) return false;
  if (scribe.background && blocked.includes(String(scribe.background).toLowerCase())) return false;
  const mediums = (scribe.writingMedium || []).map(item => item.toLowerCase());
  if (request.questionMedium && mediums.length && !mediums.includes(String(request.questionMedium).toLowerCase())) return false;
  if (qualificationLevel(scribe.qualification) < qualificationLevel(request.preferredQualification)) return false;
  return true;
}

async function handleRegistration(req, res, pathname) {
  const kind = pathname.endsWith('/student') ? 'students' : pathname.endsWith('/scribe') ? 'scribes' : null;
  if (!kind) return send(res, 404, { error: 'Not found' });
  const body = await readBody(req);
  const mobile = clean(body.mobile, 10);
  if (!/^\d{10}$/.test(mobile) || !clean(body.fullName)) return send(res, 400, { error: 'Name and a valid 10-digit mobile number are required.' });
  const data = readData();
  if (data[kind].some(item => item.mobile === mobile)) return send(res, 409, { error: 'This mobile number is already registered.' });
  const common = { id: crypto.randomUUID(), fullName: clean(body.fullName), mobile, registeredAt: new Date().toISOString() };
  const record = kind === 'students'
    ? { ...common, institution: clean(body.institution), semesterYear: clean(body.semesterYear), medium: clean(body.medium) }
    : { ...common, age: clean(body.age, 3), city: clean(body.city), role: clean(body.role), qualification: clean(body.qualification), background: clean(body.background), writingMedium: cleanList(body.writingMedium) };
  data[kind].push(record);
  writeData(data);
  return send(res, 201, { ok: true, id: record.id, record });
}

async function createRequest(req, res) {
  const body = await readBody(req);
  const required = ['examDate', 'startTime', 'endTime', 'centreName', 'centreAddress', 'subject', 'questionMedium', 'preferredQualification'];
  if (required.some(field => !clean(body[field]))) return send(res, 400, { error: 'Please fill all required exam request fields.' });
  const data = readData();
  const student = data.students.find(item => item.id === body.studentId || item.mobile === clean(body.studentMobile, 10));
  const request = {
    id: crypto.randomUUID(),
    status: 'open',
    studentId: student?.id || clean(body.studentId),
    studentName: clean(student?.fullName || body.studentName || 'Student'),
    studentMobile: clean(student?.mobile || body.studentMobile, 10),
    institution: clean(student?.institution || body.institution),
    examDate: clean(body.examDate, 20),
    startTime: clean(body.startTime, 10),
    endTime: clean(body.endTime, 10),
    centreName: clean(body.centreName),
    centreAddress: clean(body.centreAddress, 220),
    subject: clean(body.subject),
    questionMedium: clean(body.questionMedium, 30),
    preferredQualification: clean(body.preferredQualification, 40),
    blockedBackgrounds: cleanList(body.blockedBackgrounds),
    notes: clean(body.notes, 500),
    createdAt: new Date().toISOString()
  };
  data.examRequests.push(request);
  writeData(data);
  return send(res, 201, { ok: true, id: request.id, request });
}

function getEligibleRequests(req, res, url) {
  const data = readData();
  const scribeId = clean(url.searchParams.get('scribeId'));
  const scribe = data.scribes.find(item => item.id === scribeId);
  if (!scribe) return send(res, 404, { error: 'Please register as a scribe before viewing exam requests.' });
  const requests = data.examRequests.filter(request => isEligible(request, scribe));
  return send(res, 200, { ok: true, requests });
}

async function acceptRequest(req, res, pathname) {
  const id = pathname.split('/')[3];
  const body = await readBody(req);
  const data = readData();
  const request = data.examRequests.find(item => item.id === id);
  const scribe = data.scribes.find(item => item.id === clean(body.scribeId));
  if (!request) return send(res, 404, { error: 'This exam request was not found.' });
  if (!scribe) return send(res, 404, { error: 'Please register as a scribe before accepting a request.' });
  if (!isEligible(request, scribe)) return send(res, 403, { error: 'This request is not eligible for your profile.' });
  request.status = 'accepted';
  request.acceptedAt = new Date().toISOString();
  request.scribeId = scribe.id;
  request.scribeName = scribe.fullName;
  request.scribeMobile = scribe.mobile;
  request.scribeQualification = scribe.qualification;
  writeData(data);
  return send(res, 200, { ok: true, request });
}

async function handleApi(req, res, pathname, url) {
  try {
    if (req.method === 'POST' && pathname.startsWith('/api/register/')) return handleRegistration(req, res, pathname);
    if (req.method === 'POST' && pathname === '/api/requests') return createRequest(req, res);
    if (req.method === 'GET' && pathname === '/api/requests/eligible') return getEligibleRequests(req, res, url);
    if (req.method === 'POST' && /^\/api\/requests\/[^/]+\/accept$/.test(pathname)) return acceptRequest(req, res, pathname);
  } catch (error) {
    return send(res, 400, { error: error.message });
  }

  if (req.method === 'POST' && pathname === '/api/admin/login') {
    const ip = req.socket.remoteAddress || 'local';
    const attempt = loginAttempts.get(ip) || { count: 0, reset: Date.now() + 15 * 60 * 1000 };
    if (Date.now() > attempt.reset) Object.assign(attempt, { count: 0, reset: Date.now() + 15 * 60 * 1000 });
    if (attempt.count >= 8) return send(res, 429, { error: 'Too many attempts. Please wait 15 minutes.' });
    const body = await readBody(req).catch(() => ({}));
    const supplied = Buffer.from(String(body.password || ''));
    const expected = Buffer.from(ADMIN_PASSWORD);
    const valid = ADMIN_PASSWORD && supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
    if (!valid) {
      attempt.count += 1;
      loginAttempts.set(ip, attempt);
      return send(res, 401, { error: ADMIN_PASSWORD ? 'Incorrect password.' : 'Admin password has not been configured on the server.' });
    }
    loginAttempts.delete(ip);
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { expires: Date.now() + 8 * 60 * 60 * 1000 });
    return send(res, 200, { ok: true }, undefined, { 'Set-Cookie': `sahaya_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800` });
  }

  if (req.method === 'POST' && pathname === '/api/admin/logout') {
    const token = cookies(req).sahaya_admin;
    if (token) sessions.delete(token);
    return send(res, 200, { ok: true }, undefined, { 'Set-Cookie': 'sahaya_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }

  if (req.method === 'GET' && pathname === '/api/admin/registrations') {
    if (!isAdmin(req)) return send(res, 401, { error: 'Admin login required.' });
    return send(res, 200, readData());
  }

  return send(res, 404, { error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  if (pathname.startsWith('/api/')) return handleApi(req, res, pathname, url);
  const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (requested.startsWith('data/') || ['server.js', 'start.ps1'].includes(requested)) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  const filePath = path.resolve(ROOT, requested);
  if (!filePath.startsWith(path.resolve(ROOT)) || !types[path.extname(filePath)]) return send(res, 404, 'Not found', 'text/plain; charset=utf-8');
  fs.readFile(filePath, (error, data) => error ? send(res, 404, 'Not found', 'text/plain; charset=utf-8') : send(res, 200, data, types[path.extname(filePath)]));
});

server.listen(PORT, HOST, () => {
  console.log(`SahayaScribe is running on ${HOST}:${PORT}`);
  console.log(`Private admin page: /admin.html`);
  if (!ADMIN_PASSWORD) console.warn('Admin login is disabled. Restart using start.ps1 to set a password.');
});
