import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RegisterPage from '../RegisterPage';
import { AuthProvider } from '../../../context/AuthContext';

vi.mock('../../../services/api', () => ({
  isDemoMode: () => false,
  default: {
    post: vi.fn(),
    get: vi.fn(() => Promise.resolve({ data: { success: false } }))
  }
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('RegisterPage Component', () => {
  it('renders the registration form correctly', () => {
    renderWithProviders(<RegisterPage />);
    
    expect(screen.getByText('Your money, less stressful.')).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('shows error if passwords do not match', async () => {
    renderWithProviders(<RegisterPage />);
    
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText('Re-enter password'), { target: { value: 'password456' } });

    const submitBtn = screen.getByRole('button', { name: 'Create Account' });
    
    // Wait for the mocked CAPTCHA to provide the token and enable the button
    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });

    fireEvent.click(submitBtn);

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
  });
});
