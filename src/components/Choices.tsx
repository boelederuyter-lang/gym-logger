export type Optie<T> = [T, string, string?];

export function Choices<T extends string | number>({
  options,
  value,
  onChange,
  columns,
  label,
}: {
  options: Optie<T>[];
  value: T;
  onChange: (v: T) => void;
  columns: number;
  label: string;
}) {
  return (
    <div
      className={`choices ${columns >= 3 ? 'centered' : ''}`}
      style={{ '--cols': columns } as React.CSSProperties}
      role="radiogroup"
      aria-label={label}
    >
      {options.map(([v, title, sub]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={v === value}
          className={`choice ${v === value ? 'active' : ''}`}
          onClick={() => onChange(v)}
        >
          <strong>{title}</strong>
          {sub && <span>{sub}</span>}
        </button>
      ))}
    </div>
  );
}
