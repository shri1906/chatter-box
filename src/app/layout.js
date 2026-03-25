import './globals.css';
import { AuthProvider } from '../lib/auth';
import { ThemeProvider } from '../lib/theme';

export const metadata = { title: 'ChatterBox 💬', description: 'Real-time chat' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
