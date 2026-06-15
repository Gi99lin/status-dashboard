import { DEMO } from '../lib/demo';

// Brand mark shown in the top bar and on the login screen.
// In demo mode it switches to the lightning favicon + "demo.map" so the
// demo deployment is instantly recognizable (and matches the tab/favicon).
export function Brand({ className }: { className: string }) {
  if (DEMO) {
    return (
      <div className={className}>
        <img className="mk-img" src="/favicon.svg" alt="" width={20} height={20} /> demo<b>.map</b>
      </div>
    );
  }
  return (
    <div className={className}>
      <span className="mk">◇</span> stack<b>.map</b>
    </div>
  );
}
