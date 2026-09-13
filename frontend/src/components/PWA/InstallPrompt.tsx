import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Clover } from 'lucide-react';
import styles from './InstallPrompt.module.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;

    if (isStandalone) {
      return; // Already installed, do not show
    }

    // Check if user dismissed prompt recently
    const dismissedAt = localStorage.getItem('finrod_pwa_dismissed');
    if (dismissedAt) {
      const daysSinceDismiss = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < 7) {
        return; // Don't prompt for 7 days
      }
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // Delay showing on iOS so it doesn't pop up immediately
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android / Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem('finrod_pwa_dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div className={styles.installBanner}>
      <div className={styles.bannerContent}>
        <div className={styles.appIconWrapper}>
          <Clover size={22} className={styles.cloverIcon} />
        </div>
        <div className={styles.textContainer}>
          <div className={styles.bannerTitle}>FinRod APP no seu celular</div>
          <div className={styles.bannerSubtitle}>Instale na tela inicial para a experiência nativa sem barra do navegador.</div>
        </div>
      </div>

      <div className={styles.bannerActions}>
        <button className={styles.installBtn} onClick={handleInstallClick} id="btn-install-pwa">
          <Download size={16} />
          <span>Instalar</span>
        </button>
        <button className={styles.closeBtn} onClick={handleDismiss} title="Fechar">
          <X size={16} />
        </button>
      </div>

      {showIOSGuide && (
        <div className={styles.iosGuideOverlay} onClick={() => setShowIOSGuide(false)}>
          <div className={styles.iosGuideCard} onClick={e => e.stopPropagation()}>
            <div className={styles.iosGuideHeader}>
              <h4>Instalar no iPhone / iPad</h4>
              <button className={styles.closeBtn} onClick={() => setShowIOSGuide(false)}>
                <X size={18} />
              </button>
            </div>
            <ol className={styles.iosSteps}>
              <li>
                Toque no botão <strong>Compartilhar</strong> <Share size={16} className={styles.inlineIcon} /> na barra inferior do Safari.
              </li>
              <li>
                Role para baixo e toque em <strong>Adicionar à Tela de Início</strong> <PlusSquare size={16} className={styles.inlineIcon} />.
              </li>
              <li>
                Confirme tocando em <strong>Adicionar</strong> no canto superior direito.
              </li>
            </ol>
            <button className={styles.iosGotItBtn} onClick={() => setShowIOSGuide(false)}>
              Entendi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
