import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { fetchPublic } from '../../services/api';
import styles from './GoogleAuthButton.module.css';

interface GoogleAuthButtonProps {
  mode?: 'login' | 'register';
  onLoadingChange?: (loading: boolean) => void;
  onErrorChange?: (error: string) => void;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  mode = 'login',
  onLoadingChange,
  onErrorChange,
}) => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [localClientId, setLocalClientId] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Get client ID from .env or localStorage override
  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const effectiveClientId = localStorage.getItem('finrod_google_client_id') || localStorage.getItem('finapp_google_client_id') || envClientId;
  const isConfigured = Boolean(effectiveClientId && effectiveClientId.trim().length > 10);

  const updateLoading = useCallback((state: boolean) => {
    setLoading(state);
    onLoadingChange?.(state);
  }, [onLoadingChange]);

  const notifyError = useCallback((msg: string) => {
    onErrorChange?.(msg);
  }, [onErrorChange]);

  // Handle Google Auth Token Callback
  const handleCredentialResponse = useCallback(async (response: any) => {
    if (!response?.credential) {
      notifyError('Nenhuma credencial recebida do Google');
      return;
    }

    try {
      updateLoading(true);
      notifyError('');

      const data = await fetchPublic('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential: response.credential }),
      });

      setAuth(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      notifyError(err.message || 'Erro na autenticação com o Google');
    } finally {
      updateLoading(false);
    }
  }, [navigate, notifyError, setAuth, updateLoading]);

  // Initialize Google Identity Services
  useEffect(() => {
    if (!isConfigured) return;

    const initializeGSI = () => {
      // @ts-ignore
      if (window.google?.accounts?.id) {
        try {
          // @ts-ignore
          window.google.accounts.id.initialize({
            client_id: effectiveClientId.trim(),
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          // Render Google Native button if ref is available
          if (googleBtnRef.current) {
            googleBtnRef.current.innerHTML = '';
            // @ts-ignore
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              type: 'standard',
              theme: 'filled_black',
              size: 'large',
              text: mode === 'register' ? 'signup_with' : 'signin_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 380,
            });
          }
        } catch (e) {
          console.warn('Erro ao inicializar Google Identity Services:', e);
        }
      }
    };

    // If script is already loaded
    // @ts-ignore
    if (window.google?.accounts?.id) {
      initializeGSI();
    } else {
      // Check if script is injected, or load it
      const existingScript = document.getElementById('google-gsi-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'google-gsi-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initializeGSI;
        document.head.appendChild(script);
      } else {
        existingScript.addEventListener('load', initializeGSI);
      }
    }
  }, [effectiveClientId, isConfigured, mode, handleCredentialResponse]);

  const handleCustomButtonClick = () => {
    if (!isConfigured) {
      setShowConfigModal(true);
      return;
    }

    // @ts-ignore
    if (window.google?.accounts?.id) {
      // @ts-ignore
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // If One Tap is skipped or blocked, clicking the rendered button works
          console.log('OneTap notification status:', notification.getNotDisplayedReason());
        }
      });
    } else {
      setShowConfigModal(true);
    }
  };

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    if (localClientId.trim()) {
      localStorage.setItem('finrod_google_client_id', localClientId.trim());
      localStorage.setItem('finapp_google_client_id', localClientId.trim());
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        setShowConfigModal(false);
        window.location.reload();
      }, 1000);
    }
  };

  const handleDemoGoogleLogin = async () => {
    try {
      updateLoading(true);
      setShowConfigModal(false);
      notifyError('');

      const data = await fetchPublic('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential: 'demo-google-token' }),
      });

      setAuth(data.token, data.user);
      navigate('/');
    } catch (err: any) {
      notifyError(err.message || 'Erro ao autenticar usuário demo');
    } finally {
      updateLoading(false);
    }
  };

  return (
    <div className={styles.googleContainer}>
      {isConfigured ? (
        <div className={styles.googleButtonWrapper}>
          <div ref={googleBtnRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
        </div>
      ) : (
        <button
          type="button"
          className={styles.customGoogleButton}
          onClick={handleCustomButtonClick}
          disabled={loading}
          id={`btn-google-${mode}`}
        >
          <svg className={styles.googleIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>{mode === 'register' ? 'Registrar com Google' : 'Entrar com Google'}</span>
          <span className={styles.setupBadge}>Configurar</span>
        </button>
      )}

      {/* Modal de Configuração & Modo Demo */}
      {showConfigModal && (
        <div className={styles.modalOverlay} onClick={() => setShowConfigModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <ShieldCheck size={22} color="#b7e452" />
                Configurar Google OAuth 2.0
              </h3>
              <button
                className={styles.closeButton}
                onClick={() => setShowConfigModal(false)}
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p>
                Para habilitar o login seguro do Google na sua aplicação FinRod APP, configure seu <strong>Google Client ID</strong>:
              </p>

              <div className={styles.stepBox}>
                <span className={styles.stepNumber}>Passo 1: Google Cloud Console</span>
                <div>
                  Acesse o{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#b7e452', textDecoration: 'underline' }}
                  >
                    Google Cloud Console <ExternalLink size={12} style={{ display: 'inline' }} />
                  </a>
                  , crie um <strong>OAuth Client ID (Web Application)</strong> e adicione a origem:
                </div>
                <div className={styles.codeSnippet}>http://localhost:5173</div>
              </div>

              <div className={styles.stepBox}>
                <span className={styles.stepNumber}>Passo 2: Inserir Client ID</span>
                <form onSubmit={handleSaveClientId} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <input
                    type="text"
                    placeholder="ex: 123456...apps.googleusercontent.com"
                    value={localClientId}
                    onChange={(e) => setLocalClientId(e.target.value)}
                    className={styles.inputField}
                    required
                  />
                  <button type="submit" className={styles.saveButton}>
                    {savedSuccess ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <CheckCircle2 size={18} /> Salvo com sucesso!
                      </span>
                    ) : (
                      'Salvar e Ativar Google OAuth'
                    )}
                  </button>
                </form>
              </div>

              <div className={styles.stepBox} style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                <span className={styles.stepNumber} style={{ color: '#93c5fd' }}>
                  Ou teste imediatamente (Modo Demo)
                </span>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  Quer apenas experimentar o aplicativo com uma conta Google simulada?
                </p>
                <button
                  type="button"
                  onClick={handleDemoGoogleLogin}
                  className={styles.demoButton}
                  disabled={loading}
                >
                  <Sparkles size={16} />
                  Entrar com Conta Google Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
