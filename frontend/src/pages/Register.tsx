import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Clover, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { fetchPublic } from '../services/api';
import { GoogleAuthButton } from '../components/Auth/GoogleAuthButton';
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

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <div className={styles.logoIcon}>
            <Clover size={36} strokeWidth={2.4} />
          </div>
          <h1 className={styles.authTitle}>FinRod APP</h1>
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
              aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
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

        <GoogleAuthButton
          mode="register"
          onLoadingChange={setLoading}
          onErrorChange={setError}
        />

        <p className={styles.authFooter}>
          Já tem conta? <Link to="/login" className={styles.authLink}>Faça login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
