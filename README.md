# GvAutoPartes — Control de inventario

Aplicación web para control de inventario físico y despacho de autopartes. Los productos se almacenan en Cloud Firestore y se sincronizan en tiempo real entre sesiones autenticadas.

## Configuración

Sigue [CONFIGURACION-FIREBASE.md](./CONFIGURACION-FIREBASE.md) para crear/configurar Firebase Authentication, Firestore, sus reglas y las variables `VITE_FIREBASE_*`. Las cuentas se crean en Firebase Console; no hay contraseña compartida ni registro público. Las reglas de Firestore controlan el acceso por roles.

## Funcionalidades

- Inventario sincronizado en tiempo real desde Firestore.
- Edición de cantidades y precios con escrituras parciales.
- Crear, editar y eliminar productos y categorías.
- Búsqueda, filtros por estado/categoría y exportación Excel.
- Respaldo JSON descargable e importación hacia Firestore.
- Restablecimiento explícito del catálogo inicial.
- Indicadores de sincronización, conexión y errores.

## Desarrollo

1. Configura las variables de Firebase de acuerdo con `.env.example` en `.env.local`.
2. Ejecuta `npm install` y `npm run dev`.
3. Para validar, ejecuta `npm run typecheck` y `npm run build`.

La configuración web que comienza por `VITE_` llega al navegador; no pongas claves de service account o credenciales administrativas en la app. No se usa localStorage como almacenamiento del inventario.

© 2026 GvAutoPartes

