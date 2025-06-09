import { memo, useState, useEffect } from 'react';
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
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [currentShopId, setCurrentShopId] = useState<string | null>(null);

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

  const handleOtpSubmit = async () => {
    if (otp.length !== 6) {
        setError('Please enter a valid 6-digit OTP');
        return;
    }
    if (!currentShopId) {
        setError('Cannot proceed: Shop ID is not configured.');
        return;
    }

    setIsLoading(true);
    setError('');
    try {
        await verifyOTP(email, otp, currentShopId);
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
            <input
                type="text"
                className={`email-gate-input ${error ? 'has-error' : ''}`}
                placeholder='Enter your 6-digit OTP'
                value={otp}
                onChange={(e) => {
                    setOtp(e.target.value);
                    if (error) setError('');
                }}
                disabled={isLoading}
                aria-label="OTP"
                aria-describedby="otp-error"
                style={dynamicStyles}
            />
        )}
        <div
          id="email-error"
          className={`email-gate-error-message ${error ? 'visible' : ''}`}
        >
          {error}
        </div>
        <button
          className="email-gate-continue-button"
          onClick={otpSent ? handleOtpSubmit : handleEmailSubmit}
          disabled={isLoading || !currentShopId}
          style={dynamicStyles}
        >
          {isLoading ? 'Loading...' : (otpSent ? 'Verify OTP' : 'Continue')}
        </button>
      </div>
    </motion.div>
  );
});