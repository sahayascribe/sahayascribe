import { qualificationLabel } from '../lib/constants.js';
import { formatDate, formatTime } from '../lib/format.js';

export function DateBadge({ request }) {
  return (
    <div className="date-badge">
      <strong>{formatDate(request.exam_date)}</strong>
      <span>{formatTime(request.start_time)} – {formatTime(request.end_time)}</span>
    </div>
  );
}

export function RequestFacts({ request, extra = [] }) {
  const facts = [
    ['Exam centre', request.centre_name],
    ['Location', request.centre_address],
    ['Question paper medium', request.question_medium],
    request.min_qualification_level && ['Minimum qualification', qualificationLabel(request.min_qualification_level)],
    request.blocked_backgrounds && ['Blocked backgrounds', request.blocked_backgrounds.length ? request.blocked_backgrounds.join(', ') : 'None'],
    ['Notes', request.notes || 'No extra notes'],
    ...extra
  ].filter(Boolean);
  return (
    <dl>
      {facts.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}
    </dl>
  );
}
