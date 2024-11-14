import "./globals.css";
import { Inter } from "next/font/google";
import { NextAuthProvider } from "@/components/providers/next-auth-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToasterProvider } from "@/components/providers/toaster-provider";
import { SocketProvider } from "@/components/providers/socket-provider";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Office Supplies Tracker",
  description: "Track and manage office supplies inventory",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.className
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextAuthProvider>
            <SocketProvider>
              <ToasterProvider />
              {children}
            </SocketProvider>
          </NextAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
