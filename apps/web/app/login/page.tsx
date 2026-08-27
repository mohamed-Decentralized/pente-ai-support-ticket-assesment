'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/auth-provider';
import { ApiError } from '../../lib/api';
import { FieldError, validationAttributes } from '../../components/field-error';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setFieldErrors({});
    const form = new FormData(event.currentTarget);
    try {
      await login(String(form.get('email')), String(form.get('password')));
      router.push('/dashboard');
    } catch (caught) {
      if (caught instanceof ApiError) {
        if (caught.details?.fieldErrors) {
          setFieldErrors(caught.details.fieldErrors);
          setError('Please check the form for errors.');
        } else {
          setError(caught.message);
        }
      } else {
        setError('Sign in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pageShell authShell">
      <div className="authIntro">
        <div className="eyebrow">Staff workspace</div>
        <h1>Staff sign in</h1>
        <p>
          Agents and administrators use this sign-in. Your account role determines the tools you can
          access after signing in.
        </p>
      </div>
      <form className="formCard" onSubmit={submit}>
        <label>
          Email address
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            {...validationAttributes('err-email', fieldErrors.email)}
          />
          <FieldError id="err-email" message={fieldErrors.email} />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete="current-password"
            {...validationAttributes('err-password', fieldErrors.password)}
          />
          <FieldError id="err-password" message={fieldErrors.password} />
        </label>
        {error && (
          <div className="errorPanel" role="alert">
            {error}
          </div>
        )}
        <button className="button primary" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </section>
  );
}
