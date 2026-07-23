import { memo, useState } from 'react';
import { motion } from 'framer-motion';

import { useConfig } from '../../context/ConfigContext';
import { initiateUserSession } from '../../services/chat';
import { EmailInput } from '../../components/Chatbot-UI/EmailInput/EmailInput';
import { OtpInput } from '../../components/Chatbot-UI/OtpInput/OtpInput';
import { validateEmail } from '../../utils/utils';
import { setAuthToken } from '../../utils/auth';
import { sendOTP, verifyOTP } from '../../services/auth';
import type { StyleWithCustomProps, EmailGateProps } from '../../types';
import './EmailGate.scss';

export const EmailGate = memo<EmailGateProps>(({ onSuccess }) => {
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

  const handleVerifyAndInitSession = async () => {
    if (otp.length !== 4) {
      setError('Please enter the 4-digit OTP');
      return;
    }
  
    setIsLoading(true);
    setError('');
  
    try {
      await verifyOTP(email, otp, config.shopId);
    
      const response = await initiateUserSession({ email, shopId: config.shopId });
    
      if (!response.token) throw new Error("Failed to retrieve authentication token.");
      setAuthToken(response.token);
    
      onSuccess(response.token);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Verification failed: ${errorMessage}. Please try again.`);
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
        {config.storeImage && (
          <img src={config.logoUrl || config.storeImage} alt="Shop Logo" className="shop-logo-email-gate" />
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
            onContinue={handleSendOtp}
            isLoading={isLoading}
          />
        ) : (
          <OtpInput
            onOtpChange={setOtp}
            disabled={isLoading}
            hasError={!!error}
            style={dynamicStyles}
            onVerify={handleVerifyAndInitSession}
            onRequestAgain={handleSendOtp}
            isLoading={isLoading}
          />
        )}

        {error && <div className="email-gate-error-message visible">{error}</div>}

      </div>
    </motion.div>
  );
});