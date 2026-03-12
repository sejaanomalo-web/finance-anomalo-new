import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

export function LoginPage() {
  const { login, session } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, session]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Falha no login. Verifique e-mail e senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--bg)] p-6 text-[var(--fg)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,.16),transparent_40%),radial-gradient(circle_at_80%_0,rgba(14,116,144,.15),transparent_30%)]" />
      <form onSubmit={handleSubmit} className="glass-panel relative z-10 w-full max-w-md space-y-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Finance Anomalo</p>
          <h1 className="mt-1 text-2xl font-semibold">Entrar no sistema</h1>
        </div>

        <label className="block text-sm">
          E-mail
          <input
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="block text-sm">
          Senha
          <input
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[var(--accent)] px-4 py-2 font-medium text-[var(--accent-fg)] transition hover:opacity-90 disabled:opacity-70"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
