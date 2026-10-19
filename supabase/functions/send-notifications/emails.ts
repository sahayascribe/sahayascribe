// Email content for booking notifications. Each email has an HTML and a plain-text
// version; both are simple, high contrast and screen-reader friendly.

export type NotificationData = {
  role: 'student' | 'scribe';
  subject: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  centre_name: string;
  centre_address: string;
  question_medium: string;
  recipient_name: string;
  student_name: string;
  student_mobile?: string | null;
  institution?: string | null;
  notes?: string | null;
  scribe_name?: string | null;
  scribe_mobile?: string | null;
  scribe_qualification?: string | null;
  scribe_city?: string | null;
};

export type Email = { subject: string; html: string; text: string };

type Content = {
  subject: string;
  heading: string;
  paragraphs: string[];
  details: [string, string | null | undefined][];
  action: { label: string; path: string };
  footer?: string;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

const firstName = (name: string) => String(name || '').trim().split(/\s+/)[0];

export function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  });
}

export function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const suffix = hours < 12 ? 'AM' : 'PM';
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

const mapsUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

function examDetails(d: NotificationData): [string, string][] {
  return [
    ['Subject', d.subject],
    ['Date', formatDate(d.exam_date)],
    ['Time', `${formatTime(d.start_time)} to ${formatTime(d.end_time)}`],
    ['Centre', d.centre_name],
    ['Address', d.centre_address],
    ['Question paper language', d.question_medium]
  ];
}

function scribeDetails(d: NotificationData): [string, string | null | undefined][] {
  return [
    ['Scribe', d.scribe_name],
    ['Scribe phone', d.scribe_mobile],
    ['Qualification', d.scribe_qualification],
    ['City', d.scribe_city]
  ];
}

function studentDetails(d: NotificationData): [string, string | null | undefined][] {
  return [
    ['Student', d.student_name],
    ['Student phone', d.student_mobile],
    ['Institution', d.institution],
    ['Notes from the student', d.notes]
  ];
}

const contents: Record<string, (d: NotificationData) => Content> = {
  request_created: d => ({
    subject: `Your scribe request for ${d.subject} is live`,
    heading: 'Your request is live',
    paragraphs: [
      `Hi ${firstName(d.recipient_name)}, eligible scribes can now see your request.`,
      'We will email you as soon as a scribe accepts it.'
    ],
    details: examDetails(d),
    action: { label: 'View my requests', path: '/student' }
  }),

  request_accepted: d => d.role === 'student'
    ? {
        subject: `${firstName(d.scribe_name ?? '')} will be your scribe for ${d.subject}`,
        heading: 'A scribe has accepted your exam',
        paragraphs: [
          `Hi ${firstName(d.recipient_name)}, ${d.scribe_name} has accepted your ${d.subject} exam.`,
          'Please call them before the exam to agree where and when to meet.'
        ],
        details: [...scribeDetails(d), ...examDetails(d)],
        action: { label: 'View my requests', path: '/student' }
      }
    : {
        subject: `You are confirmed as scribe for ${d.subject} on ${formatDate(d.exam_date)}`,
        heading: 'Thank you for accepting this exam',
        paragraphs: [
          `Hi ${firstName(d.recipient_name)}, you are writing the ${d.subject} exam for ${d.student_name}.`,
          'Please call the student before the exam to agree where and when to meet.',
          'If you can no longer make it, withdraw from your dashboard as early as possible so another scribe can take it.'
        ],
        details: [...studentDetails(d), ...examDetails(d), ['Map', mapsUrl(d.centre_address)]],
        action: { label: 'View my exams', path: '/scribe' }
      },

  scribe_withdrew: d => ({
    subject: `Your scribe for ${d.subject} has withdrawn`,
    heading: 'Your scribe has withdrawn',
    paragraphs: [
      `Hi ${firstName(d.recipient_name)}, the scribe for your ${d.subject} exam can no longer attend.`,
      'Your request is open again, and other eligible scribes can see it. We will email you when someone accepts.'
    ],
    details: examDetails(d),
    action: { label: 'View my requests', path: '/student' }
  }),

  request_cancelled: d => ({
    subject: `Exam cancelled: ${d.subject} on ${formatDate(d.exam_date)}`,
    heading: 'This exam has been cancelled',
    paragraphs: [
      `Hi ${firstName(d.recipient_name)}, ${d.student_name} has cancelled the ${d.subject} exam you accepted. You do not need to attend.`,
      'Thank you for volunteering. Other students may still need a scribe.'
    ],
    details: examDetails(d),
    action: { label: 'Find other exams', path: '/scribe' }
  }),

  exam_reminder: d => d.role === 'student'
    ? {
        subject: `Reminder: your ${d.subject} exam is tomorrow`,
        heading: 'Your exam is tomorrow',
        paragraphs: [
          `Hi ${firstName(d.recipient_name)}, this is a reminder that ${d.scribe_name} is your scribe for tomorrow's exam.`,
          'If you have not spoken yet, please call them today.'
        ],
        details: [...scribeDetails(d), ...examDetails(d)],
        action: { label: 'View my requests', path: '/student' }
      }
    : {
        subject: `Reminder: you are writing ${firstName(d.student_name)}'s ${d.subject} exam tomorrow`,
        heading: 'Your exam is tomorrow',
        paragraphs: [
          `Hi ${firstName(d.recipient_name)}, this is a reminder that you are the scribe for ${d.student_name}'s exam tomorrow.`,
          'If you have not spoken yet, please call the student today. If you cannot attend, withdraw from your dashboard now so another scribe can take it.'
        ],
        details: [...studentDetails(d), ...examDetails(d), ['Map', mapsUrl(d.centre_address)]],
        action: { label: 'View my exams', path: '/scribe' }
      },

  rate_prompt: d => ({
    subject: `How did your ${d.subject} exam go?`,
    heading: 'Rate your scribe',
    paragraphs: [
      `Hi ${firstName(d.recipient_name)}, we hope your ${d.subject} exam went well.`,
      `Please take a moment to rate ${d.scribe_name}. Your rating helps other students choose with confidence.`
    ],
    details: examDetails(d).slice(0, 2),
    action: { label: 'Rate my scribe', path: '/student' }
  })
};

export function renderEmail(kind: string, data: NotificationData, appUrl: string): Email {
  const build = contents[kind];
  if (!build) throw new Error(`Unknown notification kind: ${kind}`);
  const c = build(data);
  const details = c.details.filter((row): row is [string, string] => Boolean(row[1] && String(row[1]).trim()));
  const actionUrl = new URL(c.action.path, appUrl).toString();
  const footer = 'You are receiving this because of an exam booking on SahayaScribe.';

  const detailHtml = details
    .map(([label, value]) => {
      const shown = /^https?:\/\//.test(value)
        ? `<a href="${escapeHtml(value)}" style="color:#0b3d91;">Open in Google Maps</a>`
        : escapeHtml(value).replace(/\n/g, '<br>');
      const tel = /phone$/i.test(label) ? `<a href="tel:+91${escapeHtml(value)}" style="color:#0b3d91;">${escapeHtml(value)}</a>` : shown;
      return `<p style="margin:0 0 10px;"><strong>${escapeHtml(label)}:</strong> ${tel}</p>`;
    })
    .join('\n');

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(c.subject)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;color:#111111;font-family:'Atkinson Hyperlegible',Verdana,Arial,sans-serif;font-size:18px;line-height:1.6;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
<p style="margin:0 0 16px;font-weight:bold;color:#0b3d91;">SahayaScribe</p>
<h1 style="margin:0 0 16px;font-size:26px;line-height:1.3;">${escapeHtml(c.heading)}</h1>
${c.paragraphs.map(p => `<p style="margin:0 0 16px;">${escapeHtml(p)}</p>`).join('\n')}
<h2 style="margin:24px 0 12px;font-size:20px;">Details</h2>
${detailHtml}
<p style="margin:24px 0;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#0b3d91;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">${escapeHtml(c.action.label)}</a></p>
<p style="margin:32px 0 0;font-size:15px;color:#444444;">${escapeHtml(footer)}</p>
</div>
</body>
</html>`;

  const text = [
    c.heading,
    '',
    ...c.paragraphs.flatMap(p => [p, '']),
    'Details',
    ...details.map(([label, value]) => `${label}: ${value}`),
    '',
    `${c.action.label}: ${actionUrl}`,
    '',
    footer
  ].join('\n');

  return { subject: c.subject, html, text };
}
