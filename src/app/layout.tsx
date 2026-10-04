import type { Metadata } from "next";
import "./globals.css";
import "../features/intro/components/intro-screen.css";
import "../features/roulette/components/roulette-screen.css";
import "../features/roulette/components/how-to-play-screen.css";
import "../features/roulette/components/history-dialog.css";
import ServiceWorkerRegistrar from "./ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "Akkey Roulette",
  description: "Wedding lucky draw app shell"
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja">
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
