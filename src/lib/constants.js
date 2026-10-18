export const STUDY_MEDIUMS = ['English', 'Kannada', 'Hindi', 'Tamil', 'Telugu', 'Other'];
export const WRITING_MEDIUMS = ['English', 'Kannada', 'Hindi', 'Tamil', 'Telugu'];
export const BACKGROUNDS = ['Science', 'Commerce', 'Arts', 'Other'];
export const BLOCKABLE_BACKGROUNDS = ['Science', 'Commerce', 'Arts'];
export const OCCUPATIONS = ['School Student', 'College Student', 'Working Professional'];

// Must match the qualification_level / min_qualification_level checks in the database.
export const QUALIFICATION_LEVELS = [
  { value: 1, label: '10th pass' },
  { value: 2, label: '12th pass' },
  { value: 3, label: 'Graduate' },
  { value: 4, label: 'Postgraduate' }
];
export const REQUEST_QUALIFICATION_LEVELS = QUALIFICATION_LEVELS.filter(level => level.value <= 3);

export const qualificationLabel = value => QUALIFICATION_LEVELS.find(level => level.value === Number(value))?.label ?? '—';

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
