import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

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
