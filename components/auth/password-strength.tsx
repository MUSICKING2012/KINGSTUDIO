'use client';
import zxcvbn from 'zxcvbn';

export function PasswordStrength({ value, label }: { value: string; label: string }) {
  const score = value ? zxcvbn(value).score : 0;
  const colors = [
    'bg-destructive',
    'bg-destructive',
    'bg-yellow-500',
    'bg-green-500',
    'bg-green-600',
  ];
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded ${i < score ? colors[score] : 'bg-muted'}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {label}: {['—', 'weak', 'fair', 'good', 'strong'][score]}
      </p>
    </div>
  );
}
