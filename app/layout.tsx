import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { Nav } from './components/Nav';

export const metadata: Metadata = {
  title: 'Gestion des biographies',
  description: 'Ajouter, modifier et gérer les biographies',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <Providers>
          <Nav />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
