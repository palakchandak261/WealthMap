import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../LoginPage';
import { AuthProvider } from '../../../context/AuthContext';

// Basic mock for API calls
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

describe('LoginPage Component', () => {
  it('renders the login form correctly', () => {
    renderWithProviders(<LoginPage />);
    
    expect(screen.getByText('Welcome to WealthMap')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('shows error when submitting empty fields', async () => {
    renderWithProviders(<LoginPage />);
    
    const submitBtn = screen.getByRole('button', { name: 'Sign In' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields.')).toBeInTheDocument();
    });
  });

  it('allows toggling between password and OTP login', () => {
    renderWithProviders(<LoginPage />);
    
    // Initially shows password field
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    
    // Click OTP toggle
    const toggleBtn = screen.getByText('Login with OTP instead');
    fireEvent.click(toggleBtn);
    
    // Password field should disappear
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send OTP/i })).toBeInTheDocument();
  });
});
