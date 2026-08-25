import type { Metadata } from "next";
import "./globals.css";
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
