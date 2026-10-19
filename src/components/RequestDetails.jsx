import { qualificationLabel } from '../lib/constants.js';
import { dateParts, formatTime } from '../lib/format.js';

// The stub of the hall-ticket card: exam date and time.
export function DateBadge({ request }) {
  const { weekday, day, monthYear } = dateParts(request.exam_date);
  return (
    <div className="date-badge">
      <span className="date-weekday">{weekday}</span>
      <strong className="date-day">{day}</strong>
      <span className="date-month">{monthYear}</span>
      <span className="date-time">{formatTime(request.start_time)} – {formatTime(request.end_time)}</span>
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
