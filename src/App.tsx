import { Pause, CloudOff, ShieldCheck } from 'lucide-react';

export default function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 text-slate-900">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <Pause aria-hidden="true" size={28} strokeWidth={1.8} />
        </div>

        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          GvAutoPartes
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Proyecto temporalmente en pausa
        </h1>
        <p className="mt-4 max-w-lg leading-7 text-slate-600">
          La conexión y sincronización con Firebase están desactivadas mientras se realizan cambios en el proyecto.
        </p>

        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <div className="flex items-start gap-3">
            <CloudOff aria-hidden="true" className="mt-0.5 shrink-0 text-amber-800" size={20} />
            <div>
              <h2 className="font-semibold text-amber-950">Sincronización desactivada</h2>
              <p className="mt-1 text-sm leading-6 text-amber-900/80">
                Esta versión no inicia sesión, no consulta el inventario remoto y no envía cambios a Firebase.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 text-sm leading-6 text-slate-500">
          <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-slate-400" size={18} />
          <p>Los datos alojados en Firebase permanecen intactos.</p>
        </div>
      </section>
    </main>
  );
}
