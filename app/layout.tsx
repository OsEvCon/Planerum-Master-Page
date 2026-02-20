import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planerum",
  description: "Planerum master page project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
