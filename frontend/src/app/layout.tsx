import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EFIS 2.0 — Emergency Fund Intelligence System",
  description: "Next-gen stochastic financial resilience, risk modeling, and liquidity stress testing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
