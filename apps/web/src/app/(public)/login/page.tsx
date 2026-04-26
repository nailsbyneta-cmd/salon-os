'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage(): React.JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState('lorenc@beautyneta.ch');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // In dev mode, we just check email matches and redirect to /admin
      // In production, WorkOS would handle this
      if (email !== 'lorenc@beautyneta.ch') {
        setError('Invalid email. Use lorenc@beautyneta.ch for demo.');
        setLoading(false);
        return;
      }

      // Demo: redirect straight to admin (getCurrentTenant() reads from env vars)
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Salon OS</h1>
          <p className="text-text-muted">Demo Login</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
              placeholder="lorenc@beautyneta.ch"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
              placeholder="(any password for demo)"
            />
            <p className="text-xs text-text-muted mt-1">
              For this demo, any password works. Production uses WorkOS.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-brand-accent text-white font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-text-secondary">
          <p className="font-medium mb-2">Demo Credentials:</p>
          <p>
            Email: <code className="bg-white px-2 py-1 rounded">lorenc@beautyneta.ch</code>
          </p>
          <p>
            Password: <code className="bg-white px-2 py-1 rounded">any password</code>
          </p>
          <p className="mt-2 text-xs">
            ⚠️ This is a development login only. Production uses WorkOS SSO.
          </p>
        </div>
      </div>
    </div>
  );
}
