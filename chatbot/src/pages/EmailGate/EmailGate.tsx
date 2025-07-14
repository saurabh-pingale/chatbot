import { memo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { validateEmail, getShopId } from '../../utils/utils';
import { sendOTP, verifyOTP } from '../../services/auth';
import type { EmailGateProps, StyleWithCustomProps } from '../../types';
import './EmailGate.scss';

export const EmailGate = memo<EmailGateProps>(({ 
  config,
  onSubmit
}) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(4).fill(''));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [currentShopId, setCurrentShopId] = useState<string | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>(Array(4).fill(null));

  if (otpInputRefs.current.length !== 4) {
    otpInputRefs.current = Array(4).fill(null);
  }

  useEffect(() => {
    const shopId = getShopId();
    if (shopId) {
      setCurrentShopId(shopId);
    } else {
      setError('Configuration error: Shop ID is missing.');
      console.error('EmailGate: Shop ID could not be determined.');
    }
  }, []);

  const primaryColorFromConfig = config.primaryColor;
  const dynamicStyles: StyleWithCustomProps = {
    '--theme-primary-color': primaryColorFromConfig,
  };

  const handleEmailSubmit = async () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!currentShopId) {
      setError('Cannot proceed: Shop ID is not configured.');
      return;
    }

    setIsLoading(true);
    setError('');
    try {
      await sendOTP(email, currentShopId);
      setOtpSent(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to send OTP: ${errorMessage}. Please try again.`);
      console.error("Error during handleEmailSubmit in EmailGate:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (!value && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }

    if (error) setError('');
  };

  const handleOtpSubmit = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 4) {
        setError('Please enter a valid 4-digit OTP');
        return;
    }
    if (!currentShopId) {
        setError('Cannot proceed: Shop ID is not configured.');
        return;
    }

    setIsLoading(true);
    setError('');
    try {
        await verifyOTP(email, otpString, currentShopId);
        if (onSubmit) {
            await onSubmit(email);
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(`Failed to verify OTP: ${errorMessage}. Please try again.`);
        console.error("Error during handleOtpSubmit in EmailGate:", err);
    } finally {
        setIsLoading(false);
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedData = e.clipboardData.getData('Text').trim();
    if (/^\d{4}$/.test(pastedData)) {
      e.preventDefault();
      const otpArray = pastedData.split('');
      setOtp(otpArray);
      otpArray.forEach((digit, i) => {
        if (otpInputRefs.current[i]) {
          otpInputRefs.current[i]!.value = digit;
        }
      });
      otpInputRefs.current[3]?.focus();
    }
  };

  return (
    <motion.div
      className="email-gate-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="email-gate-content">
        {config.displayShopLogo && config.shopLogoUrl && (
          <img src={config.shopLogoUrl} alt="Shop Logo" className="shop-logo-email-gate" />
        )}
        <p className="email-gate-description">
          {otpSent 
            ? `We've sent an OTP to ${email}. Please enter it below.`
            : "To get started with our chat assistant, please enter your email address. This helps us personalize your experience."}
        </p>
        {!otpSent ? (
            <input
              type="email"
              className={`email-gate-input ${error ? 'has-error' : ''}`}
              placeholder='Your email address'
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              disabled={isLoading || !currentShopId}
              aria-label="Email address"
              aria-describedby="email-error"
              style={dynamicStyles}
            />
        ) : (
             <div className="otp-input-container">
              {Array.from({ length: 4 }).map((_, index) => (
                <input
                  key={index}
                  ref={el => {
                    otpInputRefs.current[index] = el
                  }}
                  type="text"
                  maxLength={1}
                  className={`otp-input ${error ? 'has-error' : ''}`}
                  value={otp[index]}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(e, index)}
                  onPaste={index === 0 ? handleOtpPaste : undefined}
                  disabled={isLoading}
                  aria-label={`OTP digit ${index + 1}`}
                  style={dynamicStyles}
                />
              ))}
            </div>
        )}
        
        {error && (
          <div
            id="email-error"
            className={`email-gate-error-message ${error ? 'visible' : ''}`}
          >
            {error}
          </div>
        )}

        <button
          className="email-gate-continue-button"
          onClick={otpSent ? handleOtpSubmit : handleEmailSubmit}
          disabled={isLoading || !currentShopId}
          style={dynamicStyles}
        >
          {isLoading ? 'Loading...' : (otpSent ? 'Verify OTP' : 'Continue')}
        </button>

        {otpSent && (
          <button
            className="email-gate-request-again"
            onClick={handleEmailSubmit}
            disabled={isLoading}
            style={{ color: primaryColorFromConfig }}
          >
            Didn't receive code? Request again
          </button>
        )}
      </div>
    </motion.div>
  );
});