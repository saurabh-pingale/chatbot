import React from 'react';
import { ProgressBar, Text } from '@shopify/polaris';
import styles from '../styles/progressLoader.module.css';

interface ProgressLoaderProps {
  progress: number;
  message: string;
}

export default function ProgressLoader({ progress, message }: ProgressLoaderProps) {
  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <Text variant="headingLg" as="h2">
          Syncing Your Store
        </Text>
        <Text variant="bodyMd" as="p" tone="subdued">
          {message || "Please wait, this may take a few minutes..."}
        </Text>
        <div className={styles.progressBarContainer}>
          <ProgressBar progress={progress} />
        </div>
        <Text variant="bodyMd" as="p">
          {progress}% Complete
        </Text>
      </div>
    </div>
  );
}