import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

import React from 'react';

// Mock ReCAPTCHA since it requires a real DOM/Network
vi.mock('react-google-recaptcha', () => {
  const MockReCaptcha = ({ onChange }: { onChange?: (token: string) => void }) => {
    React.useEffect(() => {
      onChange?.('fake-captcha-token');
    }, [onChange]);
    return React.createElement('div', { 'data-testid': 'mock-recaptcha' }, 'ReCAPTCHA Mock');
  };
  return { default: MockReCaptcha };
});
