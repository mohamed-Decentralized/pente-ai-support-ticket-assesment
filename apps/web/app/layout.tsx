import type { Metadata } from 'next';
import { AuthProvider } from '../components/auth-provider';
import { ToastProvider } from '../components/toast-provider';
import { Header } from '../components/header';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pente Support',
  description: 'Customer support ticket management with human-reviewed AI assistance',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AuthProvider>
            <Header />
            <main>{children}</main>
            <footer>Built for clear, accountable customer support.</footer>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
