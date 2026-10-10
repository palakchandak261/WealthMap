import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

import React from 'react';

// Mock ReCAPTCHA since it requires a real DOM/Network
vi.mock('react-google-recaptcha', () => {
  return {
    default: (props: any) => {
      React.useEffect(() => {
        if (props.onChange) {
          props.onChange('fake-captcha-token');
        }
      }, [props.onChange]);
      return React.createElement('div', { 'data-testid': 'mock-recaptcha' }, 'ReCAPTCHA Mock');
    }
  };
});
