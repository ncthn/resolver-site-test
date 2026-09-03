/**
 * The support bubble, loaded on demand.
 *
 * Not injected into the HTML, deliberately. Where it belongs is a decision only the app
 * can make: the Shopify panel always, the console only under Settings and only for an
 * admin, the marketing site always. HTML injection cannot express that, and it could not
 * reach the embedded panel reliably either, because App Bridge re-navigates that frame.
 *
 * The server ships the id in a meta tag and nothing else, so with no id nothing loads
 * anywhere: clearing CRISP_WEBSITE_ID in Render still removes the bubble everywhere.
 */
declare global {
  interface Window { $crisp?: unknown[]; CRISP_WEBSITE_ID?: string }
}

function websiteId(): string {
  const el = document.querySelector('meta[name="crisp-website-id"]');
  return (el?.getAttribute('content') || '').trim();
}

let loading = false;

/** Load the script once. Safe to call repeatedly. */
function ensureLoaded(): boolean {
  const id = websiteId();
  if (!id) return false;
  if (loading) return true;
  loading = true;
  window.$crisp = window.$crisp || [];
  window.CRISP_WEBSITE_ID = id;
  const s = document.createElement('script');
  s.src = 'https://client.crisp.chat/l.js';
  s.async = true;
  document.head.appendChild(s);
  return true;
}

/** Show or hide the bubble. Loads Crisp the first time it is asked to show.
 *
 *  Hiding rather than unloading is deliberate: Crisp has no supported teardown, and
 *  removing its script mid-session leaves an orphaned widget. `chat:hide` is the
 *  operation it actually supports, and it survives being called before load because
 *  $crisp queues commands until the runtime arrives. */
export function setSupportChat(visible: boolean): void {
  if (!visible) {
    if (loading) (window.$crisp as unknown[] | undefined)?.push(['do', 'chat:hide']);
    return;
  }
  if (!ensureLoaded()) return;
  (window.$crisp as unknown[]).push(['do', 'chat:show']);
}
