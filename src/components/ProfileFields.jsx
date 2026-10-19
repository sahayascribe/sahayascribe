// Form fields shared by registration and the "My profile" page, so both always
// collect the same values in the same shape as the database columns.
import { BACKGROUNDS, OCCUPATIONS, QUALIFICATION_LEVELS, STUDY_MEDIUMS, WRITING_MEDIUMS } from '../lib/constants.js';

const mobileProps = {
  name: 'mobile',
  required: true,
  type: 'tel',
  autoComplete: 'tel-national',
  inputMode: 'numeric',
  pattern: '[6-9][0-9]{9}',
  maxLength: 10,
  placeholder: '10-digit mobile number',
  title: '10-digit Indian mobile number'
};

export function StudentFields({ profile = {} }) {
  return (
    <>
      <label>Full name *<input name="fullName" required minLength={2} maxLength={120} autoComplete="name" placeholder="Enter your full name" defaultValue={profile.full_name} /></label>
      <label>Mobile number *<input {...mobileProps} defaultValue={profile.mobile} /></label>
      <label>School or college *<input name="institution" required minLength={2} maxLength={160} placeholder="Name of institution" defaultValue={profile.institution} /></label>
      <label>Semester or year *<input name="semesterYear" required maxLength={40} placeholder="e.g. Semester 4" defaultValue={profile.semester_year} /></label>
      <label className="full">Medium of study *
        <select name="medium" required defaultValue={profile.medium ?? ''}>
          <option value="" disabled>Select your medium</option>
          {STUDY_MEDIUMS.map(medium => <option key={medium}>{medium}</option>)}
        </select>
      </label>
    </>
  );
}

export function readStudentForm(formElement) {
  const form = new FormData(formElement);
  return {
    values: {
      full_name: form.get('fullName').trim(),
      mobile: form.get('mobile').trim(),
      institution: form.get('institution').trim(),
      semester_year: form.get('semesterYear').trim(),
      medium: form.get('medium')
    }
  };
}

export function ScribeFields({ profile = {} }) {
  const mediums = profile.writing_mediums ?? [];
  return (
    <>
      <label>Full name *<input name="fullName" required minLength={2} maxLength={120} autoComplete="name" placeholder="Enter your full name" defaultValue={profile.full_name} /></label>
      <label>Mobile number *<input {...mobileProps} defaultValue={profile.mobile} /></label>
      <label>Age *<input name="age" required type="number" min={16} max={100} placeholder="Your age" defaultValue={profile.age} /></label>
      <label>City *<input name="city" required minLength={2} maxLength={80} placeholder="Your city" defaultValue={profile.city} /></label>
      <fieldset className="full">
        <legend>You are a *</legend>
        <div className="choice-pills">
          {OCCUPATIONS.map(occupation => (
            <label key={occupation}><input required type="radio" name="occupation" value={occupation} defaultChecked={profile.occupation === occupation} /><span>{occupation}</span></label>
          ))}
        </div>
      </fieldset>
      <label>Highest qualification *
        <select name="qualificationLevel" required defaultValue={profile.qualification_level ?? ''}>
          <option value="" disabled>Select level</option>
          {QUALIFICATION_LEVELS.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}
        </select>
      </label>
      <label>Course or degree *<input name="qualification" required maxLength={120} placeholder="e.g. BCom, BSc, Engineering, SSLC" defaultValue={profile.qualification} /></label>
      <label className="full">Background or stream *
        <select name="background" required defaultValue={profile.background ?? ''}>
          <option value="" disabled>Select background</option>
          {BACKGROUNDS.map(background => <option key={background}>{background}</option>)}
        </select>
      </label>
      <fieldset className="full">
        <legend>Languages you can write in * <small>(choose all that apply)</small></legend>
        <div className="choice-pills">
          {WRITING_MEDIUMS.map(medium => (
            <label key={medium}><input type="checkbox" name="writingMedium" value={medium} defaultChecked={mediums.includes(medium)} /><span>{medium}</span></label>
          ))}
        </div>
      </fieldset>
    </>
  );
}

export function readScribeForm(formElement) {
  const form = new FormData(formElement);
  const writingMediums = form.getAll('writingMedium');
  if (!writingMediums.length) return { error: 'Please choose at least one medium you can write in.' };
  return {
    values: {
      full_name: form.get('fullName').trim(),
      mobile: form.get('mobile').trim(),
      age: Number(form.get('age')),
      city: form.get('city').trim(),
      occupation: form.get('occupation'),
      qualification_level: Number(form.get('qualificationLevel')),
      qualification: form.get('qualification').trim(),
      background: form.get('background'),
      writing_mediums: writingMediums
    }
  };
}
