import { Alert, Snackbar } from '@mui/material';
import { useEffect, useState, type ReactNode } from 'react';
import { setGlobalErrorHandler } from './notifications';

export function AppNotifications({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    setGlobalErrorHandler((m) => {
      setMessage(m);
      setOpen(true);
    });
    return () => setGlobalErrorHandler(null);
  }, []);

  return (
    <>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setOpen(false)} severity="warning" variant="filled">
          {message}
        </Alert>
      </Snackbar>
    </>
  );
}

