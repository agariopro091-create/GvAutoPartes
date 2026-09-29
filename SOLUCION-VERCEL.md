# Acceso seguro a GvAutoPartes en Vercel

La aplicación ya no usa una contraseña compartida ni protege el acceso con datos del navegador. El inicio de sesión se realiza con Firebase Authentication y las lecturas/escrituras se autorizan mediante reglas de Firestore y roles por UID.

Para configurar el despliegue:

1. En Vercel, conecta el repositorio existente.
2. En **Settings → Environment Variables**, configura las variables `VITE_FIREBASE_*` descritas en [CONFIGURACION-FIREBASE.md](./CONFIGURACION-FIREBASE.md) para Development, Preview y Production.
3. Despliega la aplicación y crea las cuentas en Firebase Authentication.
4. Asigna en Firestore un documento `users/{UID}` con rol `admin`, `employee` o `viewer`, y publica las reglas de `firestore.rules`.
5. Comparte la URL solo con usuarios a quienes se haya creado una cuenta. Nunca compartas una contraseña común.

Si la pantalla indica que Firebase no está configurado, revisa nombres/entornos de las variables Vercel y vuelve a desplegar. Si indica `permission-denied`, revisa Authentication, el documento de rol y las reglas Firestore.

Para el procedimiento completo de configuración y la prueba de dos dispositivos, consulta [CONFIGURACION-FIREBASE.md](./CONFIGURACION-FIREBASE.md).
