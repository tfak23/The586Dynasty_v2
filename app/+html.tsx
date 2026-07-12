import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Kill-switch for stale/foreign service workers. This app registers no service
// worker, but a leftover SW (cache "dogguy-v2") at the tfak23.github.io origin
// root has been intercepting this path and serving old cached builds, so
// deploys weren't reaching users. Unregister any SW and clear all caches on
// every load so clients always get the freshly deployed bundle.
const swKillSwitch = `
(function () {
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(function (regs) { regs.forEach(function (r) { r.unregister(); }); })
        .catch(function () {});
    }
    if (typeof caches !== 'undefined' && caches.keys) {
      caches.keys()
        .then(function (keys) { keys.forEach(function (k) { caches.delete(k); }); })
        .catch(function () {});
    }
  } catch (e) {}
})();
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Remove any stale/foreign service worker before the app boots */}
        <script dangerouslySetInnerHTML={{ __html: swKillSwitch }} />

        {/* iOS home screen icon */}
        <link rel="apple-touch-icon" href="/The586Dynasty_v2/apple-touch-icon.jpg?v=2" />

        {/* PWA meta */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="586 Dynasty" />
        <meta name="theme-color" content="#0a1628" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
