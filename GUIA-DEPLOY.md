# Despliegue de GvAutoPartes

Este repositorio contiene una aplicación Vite + React. Puede desplegarse en Vercel conectando el repositorio existente; conserva su configuración de Vite y no requiere convertirla a Next.js.

## Antes de publicar

1. Crea/configura Firebase Authentication y Cloud Firestore según [CONFIGURACION-FIREBASE.md](./CONFIGURACION-FIREBASE.md).
2. En Vercel → **Settings → Environment Variables**, agrega los valores `VITE_FIREBASE_*` para cada entorno que vayas a desplegar.
3. Crea usuarios en Firebase Authentication, asigna documentos de rol `users/{UID}` y publica `firestore.rules`.
4. Despliega el proyecto y confirma que la pantalla permita iniciar sesión y que el inventario cargue desde Firestore.

## Comprobación rápida

Abre dos sesiones autenticadas en navegadores distintos. Cambia precio o cantidad en una y confirma que la otra se actualice sola. Comprueba también el indicador de desconexión/error y que un usuario `viewer` no pueda guardar.

## Problemas frecuentes

- **Firebase no configurado:** comprueba las variables `VITE_FIREBASE_*` en el entorno Vercel y crea un nuevo despliegue después de cambiarlas.
- **`permission-denied`:** el usuario debe existir en Authentication y en Firestore `users/{UID}` con rol válido; confirma que las reglas publicadas sean las del archivo `firestore.rules`.
- **No aparecen cambios:** confirma que ambas sesiones apuntan al mismo Firebase Project ID, que el listener está conectado y que la operación muestra estado sincronizado.

No existe una contraseña de aplicación predeterminada. Las credenciales se gestionan por Firebase Authentication, no con localStorage.
