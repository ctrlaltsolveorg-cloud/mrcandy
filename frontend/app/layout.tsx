import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-quicksand",
});

export const metadata: Metadata = {
  title: "Mr. Candy - Fresh Groceries",
  description: "Dukan ka saara saman, ab aapki ungliyon par",
};

import { Toaster } from 'react-hot-toast';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${quicksand.variable} h-full antialiased`}
    >
      <body className={`${quicksand.className} min-h-full flex flex-col font-sans`}>
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
