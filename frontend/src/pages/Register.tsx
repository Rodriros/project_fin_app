import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Clover, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { fetchPublic } from '../services/api';
import styles from './Auth.module.css';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const data = await fetchPublic('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      setAuth(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google OAuth não configurado. Configure VITE_GOOGLE_CLIENT_ID no .env');
      return;
    }

    // @ts-ignore
    if (window.google?.accounts?.id) {
      // @ts-ignore
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          try {
            setLoading(true);
            const data = await fetchPublic('/auth/google', {
              method: 'POST',
              body: JSON.stringify({ credential: response.credential }),
            });
            setAuth(data.token, data.user);
            navigate('/');
          } catch (err: any) {
            setError(err.message || 'Erro na autenticação Google');
          } finally {
            setLoading(false);
          }
        },
      });
      // @ts-ignore
      window.google.accounts.id.prompt();
    } else {
      setError('Google Identity Services não carregado. Verifique sua conexão.');
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <div className={styles.logoIcon}>
            <Clover size={32} />
          </div>
          <h1 className={styles.authTitle}>FinApp</h1>
          <p className={styles.authSubtitle}>Crie sua conta para gerenciar suas finanças</p>
        </div>

        {error && (
          <div className={styles.errorMessage}>{error}</div>
        )}

        <form onSubmit={handleRegister} className={styles.authForm}>
          <div className={styles.inputGroup}>
            <User size={18} className={styles.inputIcon} />
            <input
              type="text"
              placeholder="Nome completo"
              value={name}
              onChange={e => setName(e.target.value)}
              className={styles.authInput}
              required
              id="register-name"
            />
          </div>

          <div className={styles.inputGroup}>
            <Mail size={18} className={styles.inputIcon} />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={styles.authInput}
              required
              id="register-email"
            />
          </div>

          <div className={styles.inputGroup}>
            <Lock size={18} className={styles.inputIcon} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha (mínimo 6 caracteres)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={styles.authInput}
              required
              minLength={6}
              id="register-password"
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className={styles.inputGroup}>
            <Lock size={18} className={styles.inputIcon} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirmar senha"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className={styles.authInput}
              required
              id="register-confirm-password"
            />
          </div>

          <button
            type="submit"
            className={styles.authButton}
            disabled={loading}
            id="btn-register"
          >
            {loading ? 'Registrando...' : 'Criar Conta'}
          </button>
        </form>

        <div className={styles.divider}>
          <span>ou</span>
        </div>

        <button
          type="button"
          className={styles.googleButton}
          onClick={handleGoogleRegister}
          disabled={loading}
          id="btn-google-register"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Registrar com Google
        </button>

        <p className={styles.authFooter}>
          Já tem conta? <Link to="/login" className={styles.authLink}>Faça login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
