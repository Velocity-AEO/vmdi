import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export const metadata: Metadata = {
  title: "VMDI — Content Platform",
  description: "VAEO internal content publishing platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-text antialiased">
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
