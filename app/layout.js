import "./globals.css";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#050506"
};

export const metadata = {
  title: "Scoreboard",
  description: "A shared four-player scoreboard for tracking lies.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Scoreboard",
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.svg"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>{children}</body>
    </html>
  );
}
