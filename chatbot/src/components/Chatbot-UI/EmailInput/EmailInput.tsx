import { memo } from 'react';
import type { EmailInputProps } from '../../../types';
import './EmailInput.scss';

export const EmailInput = memo<EmailInputProps>(({
  value,
  onChange,
  placeholder,
  disabled,
  hasError,
  style,
  onContinue,
  isLoading,
}) => (
  <div className="email-input-wrapper">
    <input
      type="email"
      className={`custom-email-input ${hasError ? 'has-error' : ''}`}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label="Email address"
      aria-describedby="email-error"
      style={style}
    />
    <button
      className="email-continue-button"
      onClick={onContinue}
      disabled={isLoading}
      style={style}
    >
      {isLoading ? 'Loading...' : 'Continue'}
    </button>
  </div>
));