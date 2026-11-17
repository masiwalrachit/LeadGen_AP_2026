import "@fontsource-variable/manrope";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadGen — Evidence-backed prospecting",
  description:
    "Find businesses showing timely evidence that they may need web development services.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
