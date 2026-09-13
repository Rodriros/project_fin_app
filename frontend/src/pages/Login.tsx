import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Clover, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { fetchPublic } from '../services/api';
import { GoogleAuthButton } from '../components/Auth/GoogleAuthButton';
import styles from './Auth.module.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await fetchPublic('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setAuth(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <div className={styles.logoIcon}>
            <Clover size={36} strokeWidth={2.4} />
          </div>
          <h1 className={styles.authTitle}>FinRod APP</h1>
          <p className={styles.authSubtitle}>Sua gestão financeira inteligente</p>
        </div>

        {error && (
          <div className={styles.errorMessage}>{error}</div>
        )}

        <form onSubmit={handleLogin} className={styles.authForm}>
          <div className={styles.inputGroup}>
            <Mail size={18} className={styles.inputIcon} />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={styles.authInput}
              required
              id="login-email"
            />
          </div>

          <div className={styles.inputGroup}>
            <Lock size={18} className={styles.inputIcon} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={styles.authInput}
              required
              id="login-password"
            />
            <button
              type="button"
              className={styles.togglePassword}
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            className={styles.authButton}
            disabled={loading}
            id="btn-login"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className={styles.divider}>
          <span>ou</span>
        </div>

        <GoogleAuthButton
          mode="login"
          onLoadingChange={setLoading}
          onErrorChange={setError}
        />

        <p className={styles.authFooter}>
          Não tem conta? <Link to="/register" className={styles.authLink}>Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
