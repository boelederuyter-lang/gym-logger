import { hidePrBanner, usePrBanner } from '../prBanner';

export function PrBanner() {
  const pr = usePrBanner();
  if (!pr) return null;
  return (
    <button className="pr-banner" key={pr.id} onClick={hidePrBanner} aria-live="polite">
      <span className="pr-trophy">🏆</span>
      <span className="grow">
        <strong className="block">Nieuw PR, {pr.exercise}</strong>
        <span className="block">{pr.detail}</span>
        <span className="block small">{pr.previous}</span>
      </span>
    </button>
  );
}
