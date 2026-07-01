const screens = [...document.querySelectorAll('.screen')];
const toast = document.getElementById('toast');
const eligibleRequests = document.getElementById('eligibleRequests');
const refreshRequestsBtn = document.getElementById('refreshRequestsBtn');

function showScreen(id) {
  screens.forEach(screen => screen.classList.toggle('active', screen.id === id));
  history.replaceState(null, '', `#${id}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => document.querySelector(`#${id} h1`)?.focus({ preventScroll: true }), 50);
  if (id === 'scribe-requests') loadEligibleRequests();
}

document.addEventListener('click', event => {
  const target = event.target.closest('[data-go]');
  if (target) showScreen(target.dataset.go);
});

document.querySelectorAll('form[data-submit]').forEach(form => {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    if (form.dataset.api) {
      const submitButton = form.querySelector('[type="submit"]');
      const originalText = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.textContent = form.dataset.api === 'request' ? 'Publishing request...' : 'Saving registration...';

      try {
        const data = collectFormData(form);
        const endpoint = form.dataset.api === 'request' ? '/api/requests' : `/api/register/${form.dataset.api}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'This could not be saved');

        if (form.dataset.api === 'student') localStorage.setItem('sahayaStudent', JSON.stringify(result.record));
        if (form.dataset.api === 'scribe') localStorage.setItem('sahayaScribe', JSON.stringify(result.record));
        form.reset();
        showScreen(form.dataset.submit);
      } catch (error) {
        notify(error.message === 'Failed to fetch' ? 'Start the SahayaScribe server to save this.' : error.message);
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
      }
      return;
    }

    showScreen(form.dataset.submit);
  });
});

function collectFormData(form) {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  data.writingMedium = formData.getAll('writingMedium');
  data.blockedBackgrounds = formData.getAll('blockedBackgrounds');

  if (form.dataset.api === 'request') {
    const student = readStored('sahayaStudent');
    if (student) {
      data.studentId = student.id;
      data.studentName = student.fullName;
      data.studentMobile = student.mobile;
      data.institution = student.institution;
    }
  }

  return data;
}

async function loadEligibleRequests() {
  if (!eligibleRequests) return;
  const scribe = readStored('sahayaScribe');
  if (!scribe?.id) {
    eligibleRequests.innerHTML = emptyState('Please register as a scribe first so we can check your eligibility.');
    return;
  }

  eligibleRequests.innerHTML = '<div class="empty-card compact"><span aria-hidden="true">⌛</span><h2>Loading eligible exams...</h2><p>Checking medium, qualification and background rules.</p></div>';

  try {
    const response = await fetch(`/api/requests/eligible?scribeId=${encodeURIComponent(scribe.id)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load requests');
    renderRequests(result.requests || [], scribe);
  } catch (error) {
    eligibleRequests.innerHTML = emptyState(error.message === 'Failed to fetch' ? 'Start the SahayaScribe server to view student requests.' : error.message);
  }
}

function renderRequests(requests, scribe) {
  if (!requests.length) {
    eligibleRequests.innerHTML = emptyState(`No eligible open requests right now for ${scribe.fullName}. New exams will appear here when students submit them.`);
    return;
  }

  eligibleRequests.innerHTML = requests.map(request => `
    <article class="request-card">
      <div class="request-card-head">
        <div>
          <span class="request-status">Open request</span>
          <h2>${escapeHtml(request.subject)}</h2>
          <p>${escapeHtml(request.studentName || 'Student')} • ${escapeHtml(request.institution || 'Institution not added')}</p>
        </div>
        <div class="date-badge"><strong>${formatDate(request.examDate)}</strong><span>${escapeHtml(request.startTime)}-${escapeHtml(request.endTime)}</span></div>
      </div>
      <dl>
        <div><dt>Exam centre</dt><dd>${escapeHtml(request.centreName)}</dd></div>
        <div><dt>Location</dt><dd>${escapeHtml(request.centreAddress)}</dd></div>
        <div><dt>Question paper medium</dt><dd>${escapeHtml(request.questionMedium)}</dd></div>
        <div><dt>Required qualification</dt><dd>${escapeHtml(request.preferredQualification)}</dd></div>
        <div><dt>Blocked backgrounds</dt><dd>${request.blockedBackgrounds?.length ? request.blockedBackgrounds.map(escapeHtml).join(', ') : 'None'}</dd></div>
        <div><dt>Notes</dt><dd>${escapeHtml(request.notes || 'No extra notes')}</dd></div>
      </dl>
      <div class="button-row">
        <button class="primary-btn coral-btn" type="button" data-accept-request="${escapeHtml(request.id)}">Accept this exam</button>
        <button class="outline-btn" type="button" data-map-address="${escapeHtml(request.centreAddress)}">View location</button>
      </div>
    </article>
  `).join('');
}

document.addEventListener('click', async event => {
  const acceptButton = event.target.closest('[data-accept-request]');
  if (acceptButton) {
    const scribe = readStored('sahayaScribe');
    if (!scribe?.id) return notify('Please register as a scribe first.');
    acceptButton.disabled = true;
    acceptButton.textContent = 'Accepting...';
    try {
      const response = await fetch(`/api/requests/${encodeURIComponent(acceptButton.dataset.acceptRequest)}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scribeId: scribe.id })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not accept this request');
      notify('Exam accepted. The student can now be notified.');
      loadEligibleRequests();
    } catch (error) {
      notify(error.message);
      acceptButton.disabled = false;
      acceptButton.textContent = 'Accept this exam';
    }
  }

  const mapButton = event.target.closest('[data-map-address]');
  if (mapButton) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapButton.dataset.mapAddress)}`;
    window.open(url, '_blank', 'noopener');
  }
});

refreshRequestsBtn?.addEventListener('click', loadEligibleRequests);

document.querySelectorAll('.otp-btn').forEach(button => {
  button.addEventListener('click', () => {
    if (button.textContent.includes('Pin')) {
      notify('Map pin opened — location can be connected in the production app.');
      return;
    }
    notify('OTP sending needs a secure backend connection. This button is currently a demo.');
  });
});

document.getElementById('contrastBtn').addEventListener('click', () => {
  document.body.classList.toggle('high-contrast');
  notify(document.body.classList.contains('high-contrast') ? 'High contrast on' : 'High contrast off');
});

document.getElementById('textSizeBtn').addEventListener('click', () => {
  document.body.classList.toggle('large-text');
  notify(document.body.classList.contains('large-text') ? 'Larger text on' : 'Larger text off');
});

document.querySelectorAll('.rating-stars button').forEach((star, index, stars) => {
  star.addEventListener('click', () => {
    stars.forEach((item, itemIndex) => item.classList.toggle('selected', itemIndex <= index));
    notify(`${index + 1} star${index ? 's' : ''} selected`);
  });
});

function readStored(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}

function emptyState(message) {
  return `<div class="empty-card compact"><span aria-hidden="true">☷</span><h2>No exams to show</h2><p>${escapeHtml(message)}</p></div>`;
}

function formatDate(value) {
  if (!value) return 'Date not set';
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

const initial = location.hash.slice(1);
if (initial && document.getElementById(initial)?.classList.contains('screen')) showScreen(initial);
