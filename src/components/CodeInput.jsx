export const CODE_LENGTH = 6;

// One real input (so autofill, paste and screen readers work normally), drawn as six boxes.
export default function CodeInput({ value, onChange, inputRef, disabled, describedBy }) {
  return (
    <div className="code-input">
      <input
        ref={inputRef}
        id="code"
        name="code"
        value={value}
        onChange={event => onChange(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
        required
        disabled={disabled}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern={`[0-9]{${CODE_LENGTH}}`}
        maxLength={CODE_LENGTH}
        aria-describedby={describedBy}
      />
      <div className="code-boxes" aria-hidden="true">
        {Array.from({ length: CODE_LENGTH }, (_, index) => (
          <span key={index} className={index === Math.min(value.length, CODE_LENGTH - 1) ? 'current' : ''}>
            {value[index] ?? ''}
          </span>
        ))}
      </div>
    </div>
  );
}
