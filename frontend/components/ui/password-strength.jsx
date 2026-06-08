import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PasswordStrengthIndicator({ password }) {
  const commonPasswords = ["123456", "12345678", "password", "qwerty", "123456789", "12345", "1234", "111111", "1234567"];
  
  const rules = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    { label: 'Not a common password', met: password.length > 0 && !commonPasswords.includes(password.toLowerCase()) },
  ];

  if (!password) {
    return null;
  }

  return (
    <div className="space-y-2 mt-2 bg-muted/50 p-3 rounded-lg border border-border">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Password Requirements</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rules.map((rule, index) => (
          <div key={index} className="flex items-center gap-2">
            {rule.met ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground/50" />
            )}
            <span
              className={cn(
                "text-xs font-medium transition-colors duration-300",
                rule.met ? "text-emerald-500" : "text-muted-foreground"
              )}
            >
              {rule.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
