import { createRoot } from 'react-dom/client';

import App from './App';
import { shouldRedirectToLogin, forceRedirectToLogin } from './lib/sessionExpired';

import './index.css';

if (shouldRedirectToLogin()) {
  forceRedirectToLogin();
} else {
  createRoot(document.getElementById('root')!).render(<App />);
}
