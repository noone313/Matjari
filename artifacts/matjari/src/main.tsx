import { createRoot } from 'react-dom/client';
import { setAuthTokenGetter } from '@workspace/api-client-react';

import App from './App';

import './index.css';

// Register a token getter so customFetch sends the Authorization header as a
// fallback when the httpOnly cookie is not available (e.g. cross-origin on
// Railway). The httpOnly cookie remains the primary XSS protection layer.
setAuthTokenGetter(() => localStorage.getItem('matjari_token'));

createRoot(document.getElementById('root')!).render(<App />);
