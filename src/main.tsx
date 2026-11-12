import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { FigureGallery } from './dev/FigureGallery';
import { syncLibrary } from './db';
import { lang } from './i18n';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './styles.css';

// Ask the browser not to evict our IndexedDB data when storage runs low.
navigator.storage?.persist?.();
// Library names and tips follow the app language, so they are written to the database on start.
void syncLibrary();
document.documentElement.lang = lang();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {import.meta.env.DEV && location.hash.startsWith('#figuren') ? (
      <FigureGallery
        u={parseFloat(location.hash.split('=')[1] ?? '0')}
        from={Number(location.hash.match(/vanaf=(\d+)/)?.[1] ?? 0)}
      />
    ) : (
      <App />
    )}
  </StrictMode>,
);
