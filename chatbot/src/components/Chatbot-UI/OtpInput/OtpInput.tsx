import { memo, useState, useRef, useEffect } from 'react';
import type { OtpInputProps } from '../../../types';
import './OtpInput.scss';

export const OtpInput = memo<OtpInputProps>(({ onOtpChange, disabled, hasError, style }) => {
  const [otp, setOtp] = useState<string[]>(Array(4).fill(''));
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    onOtpChange(otp.join(''));
  }, [otp, onOtpChange]);

  const handleOtpValueChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedData = e.clipboardData.getData('Text').trim();
    if (/^\d{4}$/.test(pastedData)) {
      e.preventDefault();
      const otpArray = pastedData.split('');
      setOtp(otpArray);
      otpInputRefs.current[3]?.focus();
    }
  };

  return (
    <div className="otp-input-container">
      {Array.from({ length: 4 }).map((_, index) => (
        <input
          key={`otp-${index}`}
          ref={el => { otpInputRefs.current[index] = el; }}
          type="text"
          maxLength={1}
          className={`otp-input ${hasError ? 'has-error' : ''}`}
          value={otp[index]}
          onChange={(e) => handleOtpValueChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={index === 0 ? handlePaste : undefined}
          disabled={disabled}
          aria-label={`OTP digit ${index + 1}`}
          style={style}
        />
      ))}
    </div>
  );
});