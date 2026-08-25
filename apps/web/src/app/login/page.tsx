'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './login.css';

const API_URL = 'http://localhost:3000';

type AuthMode = 'login' | 'register';

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem('mavryk_token');
    if (token) {
      router.replace('/');
    }
  }, [router]);

  const passwordValidation: PasswordValidation = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
  };

  const isPasswordValid =
    passwordValidation.minLength &&
    passwordValidation.hasUppercase &&
    passwordValidation.hasNumber;

  const isPasswordsMatch = password === confirmPassword;

  const isFormValid =
    username.trim().length >= 3 &&
    (mode === 'login' ? password.length > 0 : isPasswordValid && isPasswordsMatch);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid || isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      const endpoint =
        mode === 'login' ? '/auth/login-password' : '/auth/register-password';

      const body: Record<string, string> =
        mode === 'login'
          ? { username: username.trim().toLowerCase(), password }
          : {
              username: username.trim().toLowerCase(),
              password,
              ...(email.trim() ? { email: email.trim() } : {}),
            };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        const message =
          typeof data.message === 'string'
            ? data.message
            : Array.isArray(data.message)
              ? data.message[0]
              : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
        throw new Error(message);
      }

      // Store auth data
      localStorage.setItem('mavryk_token', data.token);
      localStorage.setItem('mavryk_refresh_token', data.refreshToken);
      if (data.user) {
        localStorage.setItem('mavryk_user', JSON.stringify(data.user));
      }

      setIsSuccess(true);

      // Redirect after brief success animation
      setTimeout(() => {
        router.replace('/');
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  }

  function switchMode(newMode: AuthMode) {
    setMode(newMode);
    setError(null);
    setPassword('');
    setConfirmPassword('');
  }

  if (isSuccess) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo__icon">M</div>
            <span className="login-logo__text">
              Mavryk<span className="login-logo__text--accent">SEO</span>
            </span>
          </div>
          <div className="login-success">
            <div className="login-success__icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="login-success__text">
              {mode === 'register' ? 'Đăng ký thành công!' : 'Đăng nhập thành công!'}
            </p>
            <p className="login-success__subtext">Đang chuyển hướng đến Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo__icon">M</div>
          <span className="login-logo__text">
            Mavryk<span className="login-logo__text--accent">SEO</span>
          </span>
        </div>

        {/* Header */}
        <div className="login-header">
          <h1 className="login-header__title">
            {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </h1>
          <p className="login-header__subtitle">
            {mode === 'login'
              ? 'Chào mừng trở lại! Nhập thông tin đăng nhập.'
              : 'Bắt đầu tối ưu hóa SEO ngay hôm nay.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="login-tabs" role="tablist">
          <button
            className={`login-tab ${mode === 'login' ? 'login-tab--active' : ''}`}
            onClick={() => switchMode('login')}
            role="tab"
            aria-selected={mode === 'login'}
            id="tab-login"
            type="button"
          >
            Đăng nhập
          </button>
          <button
            className={`login-tab ${mode === 'register' ? 'login-tab--active' : ''}`}
            onClick={() => switchMode('register')}
            role="tab"
            aria-selected={mode === 'register'}
            id="tab-register"
            type="button"
          >
            Đăng ký
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="login-error" role="alert">
            <svg className="login-error__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {/* Username */}
          <div className="login-field">
            <label className="login-field__label" htmlFor="login-username">
              Tên đăng nhập
            </label>
            <div className="login-field__input-wrap">
              <input
                id="login-username"
                className="login-field__input"
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                spellCheck={false}
              />
            </div>
          </div>

          {/* Email — register only */}
          {mode === 'register' && (
            <div className="login-field">
              <label className="login-field__label" htmlFor="login-email">
                Email <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tùy chọn)</span>
              </label>
              <div className="login-field__input-wrap">
                <input
                  id="login-email"
                  className="login-field__input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>
          )}



          {/* Password */}
          <div className="login-field">
            <label className="login-field__label" htmlFor="login-password">
              Mật khẩu
            </label>
            <div className="login-field__input-wrap">
              <input
                id="login-password"
                className="login-field__input"
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'login' ? '••••••••' : 'Tối thiểu 8 ký tự'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                className="login-field__toggle-pw"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Password rules — register only */}
          {mode === 'register' && password.length > 0 && (
            <div className="login-pw-rules">
              <PasswordRule passed={passwordValidation.minLength} label="Ít nhất 8 ký tự" />
              <PasswordRule passed={passwordValidation.hasUppercase} label="Có ít nhất 1 chữ hoa (A-Z)" />
              <PasswordRule passed={passwordValidation.hasNumber} label="Có ít nhất 1 số (0-9)" />
            </div>
          )}

          {/* Confirm Password — register only */}
          {mode === 'register' && (
            <div className="login-field">
              <label className="login-field__label" htmlFor="login-confirm-password">
                Xác nhận mật khẩu
              </label>
              <div className="login-field__input-wrap">
                <input
                  id="login-confirm-password"
                  className="login-field__input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  style={{ paddingRight: 44 }}
                />
              </div>
              {confirmPassword.length > 0 && (
                <div className="login-pw-rules">
                  <PasswordRule passed={isPasswordsMatch} label={isPasswordsMatch ? 'Mật khẩu trùng khớp' : 'Mật khẩu không trùng khớp'} />
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="login-submit"
            disabled={!isFormValid || isLoading}
            id="login-submit-btn"
          >
            {isLoading ? (
              <span className="login-submit__dots">
                <span className="login-submit__dot" />
                <span className="login-submit__dot" />
                <span className="login-submit__dot" />
              </span>
            ) : mode === 'login' ? (
              'Đăng nhập'
            ) : (
              'Tạo tài khoản'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="login-footer">
          <p className="login-footer__text">
            {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            <button
              className="login-footer__link"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              type="button"
            >
              {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/* Password rule indicator component */
function PasswordRule({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className={`login-pw-rule ${passed ? 'login-pw-rule--pass' : ''}`}>
      <svg
        className="login-pw-rule__icon"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {passed ? (
          <polyline points="20 6 9 17 4 12" />
        ) : (
          <circle cx="12" cy="12" r="10" />
        )}
      </svg>
      <span>{label}</span>
    </div>
  );
}
