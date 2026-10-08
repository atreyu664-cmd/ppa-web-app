import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Premium Positioning Architect™",
  description: "Build a Strategic Positioning Blueprint through a guided positioning assessment.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
