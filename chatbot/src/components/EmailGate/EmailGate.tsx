import { memo, useState } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { ChatbotConfig } from '../../types';
import './EmailGate.scss';

interface EmailGateProps {
  config: ChatbotConfig;
  onSubmit: (email: string) => Promise<void>;
  onSkip: () => Promise<void>;
}

interface StyleWithCustomProps extends CSSProperties {
  '--theme-primary-color'?: string;
  '--theme-primary-color-rgb'?: string;
}

const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const EmailGate = memo<EmailGateProps>(({ 
  config,
  onSubmit,
  onSkip 
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const primaryColorFromConfig = config.primaryColor;
  const dynamicStyles: StyleWithCustomProps = {
    '--theme-primary-color': primaryColorFromConfig,
  };

  const handleSubmit = async () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(email);
    } catch (err) {
      setError('Failed to start chat. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      await onSkip();
    } catch (err) {
      setError('Failed to start chat. Please try again.');
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
        <p className="email-gate-description">
          To get started with our chat assistant, please enter your email address.
          This helps us personalize your experience.
        </p>
        <input
          type="email"
          className={`email-gate-input ${error ? 'has-error' : ''}`}
          placeholder="Your email address"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError('');
          }}
          disabled={isLoading}
          aria-label="Email address"
          aria-describedby="email-error"
          style={dynamicStyles}
        />
        <div
          id="email-error"
          className={`email-gate-error-message ${error ? 'visible' : ''}`}
        >
          {error}
        </div>
        <button
          className="email-gate-continue-button"
          onClick={handleSubmit}
          disabled={isLoading}
          style={dynamicStyles}
        >
          {isLoading ? 'Loading...' : 'Continue to Chat'}
        </button>
        <button
          className="email-gate-skip-button"
          onClick={handleSkip}
          disabled={isLoading}
        >
          Continue as Guest
        </button>
      </div>
    </motion.div>
  );
}); 