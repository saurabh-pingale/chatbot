import React, { useState } from 'react';
import { ProgressBar, Text, BlockStack, List, Button } from '@shopify/polaris';
import { CheckCircleIcon } from '@shopify/polaris-icons';
import styles from '../styles/progressLoader.module.css';
import InputImage from '../images/training-input-example.png';

interface ProgressLoaderProps {
  progress: number;
  message: string;
  isComplete: boolean;
  isError: boolean;
  onRetry: () => void;
  onNavigate?: (path: string) => void;
  chatbotDeepLink: string;
}

export default function ProgressLoader({ 
  progress,
  message, 
  isComplete, 
  isError,
  onRetry,
  onNavigate,
  chatbotDeepLink 
}: ProgressLoaderProps) {
  const [loadingButton, setLoadingButton] = useState<string | null>(null);

  const handleNavigate = (path: string, key: string) => {
    if (!onNavigate) return;

    setLoadingButton(key);
    setTimeout(() => {
      onNavigate(path);
    }, 400);
  };

  const handleOpenLink = (url: string, key: string) => {
    setLoadingButton(key);
    setTimeout(() => {
      window.open(url, '_blank');
      setLoadingButton(null);
    }, 400);
  };

  const inProgressView = (
    <>
      <Text variant="headingLg" as="h2">Syncing Your Store</Text>
      <Text variant="bodyMd" as="p" tone="subdued">
        {message || "Please wait, this may take a few minutes..."}
      </Text>
      <div className={styles.progressBarContainer}>
        <ProgressBar progress={progress} />
      </div>
      <Text variant="bodyMd" as="p">{progress}% Complete</Text>
    </>
  );

  const completedView = (
    <div className={styles.completionContent}>
      <CheckCircleIcon className={styles.completionIcon} />
      <Text variant="headingLg" as="h2">Setup Complete!</Text>
      <BlockStack gap="400">
        <List type="bullet">
          <List.Item>Training is complete, and your chatbot is now ready to use.</List.Item>
          <List.Item>To train with additional data, use the input box on the Training Page.</List.Item>
        </List>
        <img 
          src={InputImage} 
          alt="Training data input box example"
          className={styles.completionImage}
        />
      </BlockStack>
      <div className={styles.buttonGroup}>
        <Button 
          onClick={() => handleNavigate('/app', 'home')} 
          loading={loadingButton === 'home'}
          disabled={loadingButton !== null && loadingButton !== 'home'}
        >
          Go to Home
        </Button>
        <Button 
          onClick={() => handleOpenLink(chatbotDeepLink, 'activate')} 
          loading={loadingButton === 'activate'}
          disabled={loadingButton !== null && loadingButton !== 'activate'}
        >
          Activate Chatbot
        </Button>
        <Button 
          variant="primary" 
          onClick={() => handleNavigate('/app/training', 'addData')} 
          loading={loadingButton === 'addData'}
          disabled={loadingButton !== null && loadingButton !== 'addData'}
        >
          Add More Data
        </Button>
      </div>
    </div>
  );

  const errorView = (
    <div className={styles.contentWrapper}>
      <BlockStack gap="400" inlineAlign="center">
        <Text variant="headingLg" as="h2" tone="critical">
            Sync Failed
        </Text>
        <Text variant="bodyMd" as="p" tone="subdued" alignment="center">
            {message || "An unexpected error occurred. Please try again."}
        </Text>
        <Button 
            variant="primary" 
            onClick={onRetry}
            size="large"
        >
            Try Again
        </Button>
      </BlockStack>
    </div>
  );

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        {isComplete ? completedView : isError ? errorView : inProgressView}
      </div>
    </div>
  );
}