const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const searchInput = document.getElementById('searchInput');
const tableHead = document.getElementById('tableHead');
const tableBody = document.getElementById('tableBody');
const emptyState = document.getElementById('emptyState');
let registrations = { students: [], scribes: [] };
let activeTab = 'students';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const initials = name => name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const dateText = value => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

async function loadRegistrations() {
  const response = await fetch('/api/admin/registrations');
  if (response.status === 401) return showLogin();
  if (!response.ok) throw new Error('Unable to load registrations');
  registrations = await response.json();
  document.getElementById('studentCount').textContent = registrations.students.length;
  document.getElementById('scribeCount').textContent = registrations.scribes.length;
  document.getElementById('totalCount').textContent = registrations.students.length + registrations.scribes.length;
  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  renderTable();
}

function showLogin() {
  dashboardView.classList.add('hidden');
  loginView.classList.remove('hidden');
}

function renderTable() {
  const term = searchInput.value.trim().toLowerCase();
  const rows = registrations[activeTab].filter(item => JSON.stringify(item).toLowerCase().includes(term));
  document.getElementById('pageTitle').textContent = activeTab === 'students' ? 'Registered students' : 'Registered scribes';
  searchInput.placeholder = activeTab === 'students' ? 'Search by name, mobile or institution' : 'Search by name, mobile or city';
  tableHead.innerHTML = activeTab === 'students'
    ? '<tr><th>STUDENT</th><th>MOBILE</th><th>SCHOOL / COLLEGE</th><th>YEAR</th><th>MEDIUM</th><th>REGISTERED</th></tr>'
    : '<tr><th>SCRIBE</th><th>MOBILE</th><th>CITY</th><th>QUALIFICATION</th><th>WRITING MEDIUM</th><th>REGISTERED</th></tr>';
  tableBody.innerHTML = rows.map(item => activeTab === 'students' ? `
    <tr><td><div class="person"><span>${escapeHtml(initials(item.fullName))}</span><b>${escapeHtml(item.fullName)}</b></div></td><td>${escapeHtml(item.mobile)}</td><td>${escapeHtml(item.institution)}</td><td>${escapeHtml(item.semesterYear)}</td><td><span class="chip">${escapeHtml(item.medium)}</span></td><td>${escapeHtml(dateText(item.registeredAt))}</td></tr>` : `
    <tr><td><div class="person"><span>${escapeHtml(initials(item.fullName))}</span><b>${escapeHtml(item.fullName)}</b></div></td><td>${escapeHtml(item.mobile)}</td><td>${escapeHtml(item.city)}</td><td>${escapeHtml(item.qualification)}</td><td>${escapeHtml((item.writingMedium || []).join(', '))}</td><td>${escapeHtml(dateText(item.registeredAt))}</td></tr>`).join('');
  emptyState.classList.toggle('hidden', rows.length > 0);
  document.querySelector('.table-wrap').classList.toggle('hidden', rows.length === 0);
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginError.textContent = '';
  const button = loginForm.querySelector('button');
  button.disabled = true;
  button.textContent = 'Signing in…';
  try {
    const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: document.getElementById('password').value }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    loginForm.reset();
    await loadRegistrations();
  } catch (error) {
    loginError.textContent = error.message;
  } finally {
    button.disabled = false;
    button.innerHTML = 'Open dashboard <span>→</span>';
  }
});

document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
  activeTab = button.dataset.tab;
  document.querySelectorAll('[data-tab]').forEach(item => item.classList.toggle('active', item === button));
  searchInput.value = '';
  renderTable();
}));
searchInput.addEventListener('input', renderTable);
document.getElementById('refreshBtn').addEventListener('click', () => loadRegistrations().catch(() => {}));
document.getElementById('logoutBtn').addEventListener('click', async () => { await fetch('/api/admin/logout', { method: 'POST' }); showLogin(); });
loadRegistrations().catch(showLogin);
