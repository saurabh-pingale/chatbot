import { memo, useState } from 'react';
import { motion } from 'framer-motion';

import { useConfig } from '../../context/ConfigContext';
import { initiateUserSession, getLocationInfo, getIpAddress } from '../../services/chat';
import { EmailInput } from '../../components/Chatbot-UI/EmailInput/EmailInput';
import { OtpInput } from '../../components/Chatbot-UI/OtpInput/OtpInput';
import { validateEmail } from '../../utils/utils';
import { getStoredUtmParameters } from '../../utils/utm';
import { setAuthToken } from '../../utils/auth';
import { sendOTP, verifyOTP } from '../../services/auth';
import type { StyleWithCustomProps, LocationInfo, EmailGateProps } from '../../types';
import './EmailGate.scss';

export const EmailGate = memo<EmailGateProps>(({ onSuccess, onSkip }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(''); 
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const config = useConfig();

  const dynamicStyles: StyleWithCustomProps = {
    '--theme-primary-color': config.primaryColor,
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (error) setError('');
  };

  const handleSendOtp = async () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await sendOTP(email, config.shopId);
      setOtpSent(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to send OTP: ${errorMessage}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const captureLocation = async (): Promise<LocationInfo | null> => {
    try {
      const ip = await getIpAddress();
      const ipLocation = await getLocationInfo(ip);
      return { ip, country: ipLocation?.country, city: ipLocation?.city, region: ipLocation?.region };
    } catch (locError) {
      console.error('Error capturing location:', locError);
      return { ip: 'unknown', country: null, city: null, region: null };
    }
  };
  
  const handleVerifyAndInitSession = async () => {
    if (otp.length !== 4) {
      setError('Please enter the 4-digit OTP');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await verifyOTP(email, otp, config.shopId);
      const utmParams = getStoredUtmParameters();
      const response = await initiateUserSession({ email, shopId: config.shopId, utm_params: utmParams });

      if (!response.token) throw new Error("Failed to retrieve authentication token.");
      
      setAuthToken(response.token);
      const locationInfo = await captureLocation();
      onSuccess(response.token, locationInfo);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Verification failed: ${errorMessage}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipFlow = () => {
    sessionStorage.setItem('sessionViewedEmailGate', 'true');
    onSkip();
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
        {config.storeImage && (
          <img src={config.storeImage} alt="Shop Logo" className="shop-logo-email-gate" />
        )}
        <p className="email-gate-description">
          {otpSent
            ? `We've sent an OTP to ${email}. Please enter it below.`
            : "To get started with our chat assistant, please enter your email address."}
        </p>

        {!otpSent ? (
          <EmailInput
            value={email}
            onChange={handleEmailChange}
            placeholder='Your email address'
            disabled={isLoading}
            hasError={!!error}
            style={dynamicStyles}
          />
        ) : (
          <OtpInput
            onOtpChange={setOtp}
            disabled={isLoading}
            hasError={!!error}
            style={dynamicStyles}
          />
        )}

        {error && <div className="email-gate-error-message visible">{error}</div>}

        <button
          className="email-gate-continue-button"
          onClick={otpSent ? handleVerifyAndInitSession : handleSendOtp}
          disabled={isLoading}
          style={dynamicStyles}
        >
          {isLoading ? 'Loading...' : (otpSent ? 'Verify OTP' : 'Continue')}
        </button>

        {otpSent && (
          <button
            className="email-gate-request-again"
            onClick={handleSendOtp}
            disabled={isLoading}
            style={{ color: config.primaryColor }}
          >
            Didn't receive code? Request again
          </button>
        )}

        {config.allowGuestMode && (
          <button
            className="email-gate-skip-button"
            onClick={handleSkipFlow}
            disabled={isLoading}
          >
            Skip for now
          </button>
        )}
      </div>
    </motion.div>
  );
});