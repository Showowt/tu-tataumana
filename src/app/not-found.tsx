import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="font-body text-[10px] tracking-[0.3em] text-charcoal/40 mb-4">
          404
        </p>
        <h1 className="font-display text-3xl text-charcoal mb-4">
          Page not found
        </h1>
        <p className="font-body text-sm text-charcoal/60 mb-6">
          P&aacute;gina no encontrada. La p&aacute;gina que buscas no existe.
        </p>
        <Link
          href="/"
          className="font-body text-sm border border-rose-soft text-rose-soft px-6 py-3 min-h-[44px] hover:bg-rose-soft hover:text-cream transition-colors inline-block"
        >
          Back to home / Volver al inicio
        </Link>
      </div>
    </div>
  );
}
