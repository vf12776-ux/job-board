import { useEffect, useState } from 'react';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null);
        setVisible(false);
      });
    }
  };

  if (!visible) return null;

  return (
    <button
      onClick={install}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: '#4caf50',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        padding: '12px 24px',
        zIndex: 9999,
        fontSize: '16px',
        cursor: 'pointer'
      }}
    >
      📱 Установить приложение
    </button>
  );
}