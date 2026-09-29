# Firebase y sincronización del inventario

La aplicación usa Firebase Authentication para identificar usuarios y Cloud Firestore como fuente de verdad. Un listener `onSnapshot` actualiza la tabla, estadísticas y categorías en tiempo real.

## Flujo y persistencia

```text
Usuario autenticado → Firestore → onSnapshot → clientes conectados
```

Los cambios de cantidades/precio se envían como actualizaciones parciales agrupadas por producto. Crear, editar/eliminar y operaciones de respaldo/reset se confirman antes de mostrar el estado guardado. Los errores conservan la última información visible y no se marcan como guardados.

No se usa localStorage ni IndexedDB como base de datos. Los productos y precios empaquetados se usan solo como catálogo de inicialización: se cargan una vez mediante transacción si `inventory` está realmente vacía y no existe el marcador `system/inventorySeed`. Si Firestore ya tiene datos, no se reemplazan.

## Colecciones

- `inventory/{productId}`: producto, cantidades, categoría, precio, indicadores y fechas de servidor.
- `system/inventorySeed`: marcador de inicialización.
- `users/{uid}`: perfil de roles para las reglas (`admin`, `employee` o `viewer`).

La aplicación actual guarda el conteo/cantidad actual, no un historial de movimientos. No existe una pantalla de entradas/salidas, así que no se crea `inventory_movements`.

## Configuración

Consulta [CONFIGURACION-FIREBASE.md](./CONFIGURACION-FIREBASE.md). Configura las variables `VITE_FIREBASE_*`, habilita Email/Password, crea las cuentas de Authentication, asigna su documento `users/{UID}` y publica las reglas contenidas en `firestore.rules`.

No uses reglas abiertas. La configuración web del SDK es pública y no sustituye las reglas de Firestore. Nunca añadas una service-account key al frontend.

## Prueba

Inicia sesión en dos navegadores con usuarios autorizados. Cambia el precio o una cantidad en uno; el segundo debe recibir el valor mediante el listener sin recargar. Comprueba también el permiso de solo lectura con un usuario `viewer` y desconecta la red para verificar el indicador de sincronización pendiente.
