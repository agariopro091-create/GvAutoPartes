import { useState, type FormEvent } from 'react';
import { signInWithEmailAndPassword, type Auth } from 'firebase/auth';

function readableAuthError(code?: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'El correo o la contraseña no son correctos.';
    case 'auth/too-many-requests':
      return 'Se bloquearon temporalmente los intentos. Inténtalo más tarde.';
    case 'auth/network-request-failed':
      return 'No fue posible conectar con Firebase. Revisa tu conexión.';
    case 'auth/invalid-email':
      return 'Escribe un correo electrónico válido.';
    case 'auth/operation-not-allowed':
      return 'Firebase no tiene habilitado el acceso con correo y contraseña. En Authentication → Sign-in method, habilita Email/Password.';
    case 'auth/unauthorized-domain':
      return 'Este dominio no está autorizado en Firebase. Agrégalo en Authentication → Settings → Authorized domains.';
    case 'auth/user-disabled':
      return 'Esta cuenta está deshabilitada en Firebase Authentication. Contacta al administrador del proyecto.';
    case 'auth/invalid-api-key':
    case 'auth/configuration-not-found':
      return 'La configuración de Firebase no coincide con el proyecto o la app web. Verifica las variables VITE_FIREBASE_*.';
    default:
      return code
        ? `No se pudo iniciar sesión (Firebase: ${code}). Verifica la configuración de Authentication y la cuenta.`
        : 'No se pudo iniciar sesión. Verifica tu cuenta e inténtalo de nuevo.';
  }
}

export default function AuthGate({ auth }: { auth: Auth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (cause) {
      const code = cause && typeof cause === 'object' && 'code' in cause
        ? String(cause.code)
        : undefined;
      setError(readableAuthError(code));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
      <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800">GvAutoPartes</h1>
        <p className="mt-2 text-sm text-gray-600">Inicia sesión para consultar y sincronizar el inventario.</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="firebase-email" className="mb-1 block text-sm font-medium text-gray-700">Correo electrónico</label>
            <input
              id="firebase-email"
              autoComplete="username"
              type="email"
              required
              value={email}
              onChange={event => setEmail(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label htmlFor="firebase-password" className="mb-1 block text-sm font-medium text-gray-700">Contraseña</label>
            <input
              id="firebase-password"
              autoComplete="current-password"
              type="password"
              required
              value={password}
              onChange={event => setPassword(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>
        <p className="mt-4 text-xs leading-5 text-gray-500">
          Las cuentas se administran en Firebase Authentication. Solicita acceso al administrador de la aplicación.
        </p>
      </section>
    </main>
  );
}
