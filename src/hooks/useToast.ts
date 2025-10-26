import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: string }>>([]);

  const show = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return { show, toasts };
}
