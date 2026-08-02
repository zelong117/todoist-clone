import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import AuthWorkflowPanel from '../components/AuthWorkflowPanel';
import { useAuth } from '../contexts/AuthContext';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export default function LoginPage({ onSwitchToRegister }: LoginPageProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password to continue.');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <AuthWorkflowPanel />
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <p className="auth-eyebrow">RETURN TO YOUR WORKSPACE</p>
          <h2 className="auth-form-title">Sign in and pick up where you left off.</h2>
          <p className="auth-form-copy">Your projects, focus sessions, and activity history stay in one place.</p>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {error && <div className="auth-form-error" role="alert">{error}</div>}
            <label>
              <span>Email</span>
              <div className="auth-input-wrap">
                <Mail size={17} aria-hidden="true" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>
            <label>
              <span>Password</span>
              <div className="auth-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="auth-icon-button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            <button type="submit" className="auth-submit" disabled={loading}>
              <span>{loading ? 'Signing in...' : 'Enter workspace'}</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>

          <p className="auth-switch-copy">
            New to TaskFlow?
            <button type="button" onClick={onSwitchToRegister}>Create an account</button>
          </p>
        </div>
      </section>
    </main>
  );
}
