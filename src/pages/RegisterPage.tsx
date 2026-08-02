import { useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import AuthWorkflowPanel from '../components/AuthWorkflowPanel';
import { useAuth } from '../contexts/AuthContext';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export default function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password) {
      setError('Complete each field to create your workspace.');
      return;
    }
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), name.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Unable to create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <AuthWorkflowPanel />
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <p className="auth-eyebrow">CREATE YOUR WORKSPACE</p>
          <h2 className="auth-form-title">Start with one clear next step.</h2>
          <p className="auth-form-copy">Create a personal workspace now. Projects, focus time, and progress build from there.</p>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {error && <div className="auth-form-error" role="alert">{error}</div>}
            <label>
              <span>Name</span>
              <div className="auth-input-wrap">
                <UserRound size={17} aria-hidden="true" />
                <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="How should we call you?" autoComplete="name" required />
              </div>
            </label>
            <label>
              <span>Email</span>
              <div className="auth-input-wrap">
                <Mail size={17} aria-hidden="true" />
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
              </div>
            </label>
            <label>
              <span>Password</span>
              <div className="auth-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" required />
                <button type="button" className="auth-icon-button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            <label>
              <span>Confirm password</span>
              <div className="auth-input-wrap">
                <LockKeyhole size={17} aria-hidden="true" />
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" autoComplete="new-password" required />
              </div>
            </label>
            <button type="submit" className="auth-submit" disabled={loading}>
              <span>{loading ? 'Creating workspace...' : 'Create workspace'}</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>

          <p className="auth-switch-copy">
            Already have an account?
            <button type="button" onClick={onSwitchToLogin}>Sign in</button>
          </p>
        </div>
      </section>
    </main>
  );
}
