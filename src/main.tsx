import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { FigureGallery } from './dev/FigureGallery';
import { syncLibrary } from './db';
import './styles.css';

// Ask the browser not to evict our IndexedDB data when storage runs low.
navigator.storage?.persist?.();
void syncLibrary();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {import.meta.env.DEV && location.hash.startsWith('#figuren') ? (
      <FigureGallery u={parseFloat(location.hash.split('=')[1] ?? '0')} />
    ) : (
      <App />
    )}
  </StrictMode>,
);
