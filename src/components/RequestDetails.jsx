import { qualificationLabel } from '../lib/constants.js';
import { dateParts, formatTime } from '../lib/format.js';

// Calendar-style tile with the exam date.
export function DateBadge({ request }) {
  const { weekday, day, monthYear } = dateParts(request.exam_date);
  return (
    <div className="date-badge" aria-label={`${weekday} ${day} ${monthYear}`} role="img">
      <span className="date-month">{monthYear.split(' ')[0]}</span>
      <strong className="date-day">{day}</strong>
      <span className="date-weekday">{weekday}</span>
    </div>
  );
}

export function ExamTime({ request }) {
  return (
    <p className="request-time">
      <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.5" /><path d="M8 4.5V8l2.5 1.5" /></svg>
      {formatTime(request.start_time)} – {formatTime(request.end_time)}
    </p>
  );
}

// Card heading: date tile, status, subject, a subtitle and the exam time.
export function RequestHead({ request, status, subtitle }) {
  return (
    <div className="request-card-head">
      <DateBadge request={request} />
      <div>
        <span className="request-status">{status}</span>
        <h2>{request.subject}</h2>
        <p>{subtitle}</p>
        <ExamTime request={request} />
      </div>
    </div>
  );
}

export function RequestFacts({ request, extra = [] }) {
  const facts = [
    // The centre name is already in the card heading.
    ['Centre address', request.centre_address],
    ['Question paper language', request.question_medium],
    request.min_qualification_level && ['Minimum qualification', qualificationLabel(request.min_qualification_level)],
    request.blocked_backgrounds && ['Blocked backgrounds', request.blocked_backgrounds.length ? request.blocked_backgrounds.join(', ') : 'None'],
    ['Notes', request.notes || 'No extra notes'],
    ...extra
  ].filter(Boolean);
  return (
    <dl className="facts">
      {facts.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}
    </dl>
  );
}
