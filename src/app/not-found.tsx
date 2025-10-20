import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Ghost, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-6">
      <div className="max-w-md w-full text-center bg-white rounded-xl shadow-xl p-8 border border-neutral-200">
        <Ghost className="mx-auto h-16 w-16 text-neutral-900 mb-4" />
        <h1 className="text-3xl font-extrabold text-neutral-900 mb-2">Página no encontrada</h1>
        <p className="text-base text-neutral-500 mb-6">
          No pudimos encontrar la página que buscas.<br />
          Es posible que haya sido movida, eliminada o que la URL esté mal escrita.
        </p>
        <Link href="/">
          <Button className="w-full bg-neutral-900 text-white text-base font-semibold py-2 rounded-lg shadow hover:bg-neutral-800 transition-colors gap-2">
            <ArrowLeft className="h-5 w-5" />
            Volver al inicio
          </Button>
        </Link>
        <div className="mt-6 text-xs text-neutral-400">Error 404 • © {new Date().getFullYear()} Cochera System</div>
      </div>
    </div>
  );
}
