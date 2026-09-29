# Configuración Firebase para GvAutoPartes

La app usa Firebase Authentication y Cloud Firestore. Firestore es la fuente de verdad y `onSnapshot` mantiene el inventario actualizado en los clientes conectados. La interfaz solo confirma una edición cuando la operación contra Firebase termina correctamente.

## 1. Crear o seleccionar un proyecto

1. Abre [tu proyecto Firebase](https://console.firebase.google.com/project/gvautopartes-4889f/overview) (`gvautopartes-4889f`).
2. En **Build → Firestore Database**, crea la base de datos en producción y elige una región cercana a tus usuarios.
3. En **Project settings → General → Your apps**, registra una aplicación web y copia su configuración web. El ID de proyecto y el dominio de autenticación ya están indicados en `.env.example`; la API key, el ID del remitente y el ID de la app web deben copiarse de esta configuración.

La configuración del Firebase Web SDK (incluida su API key) se distribuye al navegador; no es una credencial administrativa. Las reglas de Firestore son las que protegen los datos. Nunca pongas una service-account key en variables `VITE_` ni en el frontend.

## 2. Variables de entorno

Copia `.env.example` a `.env.local` para desarrollo, o configura estas variables en Vercel **Settings → Environment Variables** para los entornos Development, Preview y Production:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET (opcional; la app no usa Firebase Storage)
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Usa los valores de la aplicación web de Firebase. No edites `src/firebase.ts` para pegar credenciales. `.env.local` está excluido de Git.

## 3. Habilitar autenticación y crear cuentas

1. En Firebase Console abre **Build → Authentication → Get started**.
2. En **Sign-in method**, habilita **Email/Password**.
3. En **Users**, crea una cuenta para cada integrante. La app permite iniciar sesión; no ofrece registro público.
4. Copia el UID de cada usuario creado. En Firestore crea la colección `users`, un documento cuyo ID sea ese UID y el campo `role`:
   - `admin`: lectura, escritura y administración de roles en las reglas.
   - `employee`: lectura y edición del inventario.
   - `viewer`: solo lectura.
5. Para el primer administrador, crea su documento `users/{UID}` desde Firebase Console. La consola administrativa no está restringida por las reglas de clientes.

La aplicación no tiene una pantalla para asignar roles. Los roles se administran en Firebase Console hasta que se solicite una interfaz administrativa.

## 4. Aplicar reglas de Firestore

En **Firestore Database → Rules**, copia y publica el contenido de `firestore.rules`. No uses reglas abiertas (`allow read, write: if true`). Las reglas requieren una sesión Firebase y un documento de rol en `users/{UID}`; lectores pueden consultar, y solo `admin`/`employee` pueden modificar productos. Solo `admin` puede administrar documentos de usuario.

## 5. Colecciones y migración inicial

La aplicación usa estas rutas:

```text
inventory/{productId}       Un documento por producto (SKU como ID; SKU con “/” codificado)
system/inventorySeed        Marcador de inicialización, creado una sola vez
users/{firebaseAuthUid}     Perfil/rol asignado por el administrador
```

`inventory` conserva la colección que ya usaba esta app. Si está vacía y no tiene marcador, una transacción Firestore carga el catálogo inicial empaquetado una única vez. Si ya contiene documentos, no los reemplaza ni vuelve a subir los datos estáticos. Después de esa inicialización, los datos editables se leen de Firestore.

Cada producto contiene SKU, descripción, vehículos, categoría, cantidades, precio, indicadores y fechas `createdAt`/`updatedAt` de Firestore. Las categorías del filtro se derivan de los productos sincronizados.

## 6. Prueba en dos dispositivos

1. Configura las variables de entorno y publica las reglas.
2. Crea dos usuarios/cuentas (o usa la misma cuenta en dos sesiones) y asigna un rol `admin` o `employee` en Firestore.
3. Abre la aplicación en dos navegadores o computadores e inicia sesión.
4. Cambia en el primer equipo el precio o una cantidad de un SKU.
5. Espera el estado “Sincronizado en tiempo real”: el segundo cliente debe reflejar el cambio automáticamente, sin recargar.
6. Confirma también que `viewer` puede leer pero no guardar y que desconectar la red muestra estado de conexión/error sin confirmar escrituras pendientes.

## 7. Límites del alcance actual

La app registra el conteo actual de cantidades, no un libro de movimientos de entradas/salidas. Por eso no se crea una colección `inventory_movements`: no hay formularios existentes de movimientos que migrar. Las copias Excel/JSON se generan o descargan localmente como exportaciones, pero no son la fuente de datos. No se usa `localStorage` ni IndexedDB como base de datos. No se habilita persistencia offline durable; la interfaz muestra cambios pendientes y solo los marca guardados cuando Firebase los confirma.

Si aparece `permission-denied`, verifica que el usuario haya iniciado sesión, que exista `users/{UID}` con rol válido y que las reglas publicadas sean las del archivo `firestore.rules`. Si falta configuración, revisa los nombres `VITE_FIREBASE_*` en `.env.local` o en Vercel y vuelve a iniciar/desplegar la app.

2. Asegúrate de que Firestore esté habilitado en Firebase Console
3. Revisa las reglas de seguridad de Firestore

### **Problema: "Los datos no se sincronizan"**

**Solución:**
1. Abre la consola del navegador (F12)
2. Busca errores en la pestaña "Console"
3. Verifica que Firestore tenga la colección "inventory"

### **Problema: "Se borraron mis datos"**

**Solución:**
1. Los datos están en Firestore, no se pierden
2. Usa el botón "📂 Cargar Respaldo" para restaurar desde un JSON
3. O usa "🔄 Resetear" para volver a los datos originales

---

## 📞 Soporte

Si tienes problemas con la configuración:

1. **Documentación de Firebase:** https://firebase.google.com/docs
2. **Consola de Firebase:** https://console.firebase.google.com/
3. **Revisar logs:** Abre la consola del navegador (F12) para ver errores

---

## 🎉 ¡Listo!

Tu aplicación ahora está conectada a Firebase y tu equipo puede:

✅ Acceder al inventario desde cualquier dispositivo  
✅ Ver los cambios en tiempo real  
✅ Editar cantidades y precios  
✅ Agregar nuevos productos  
✅ Exportar a Excel con todos los datos actualizados  

**¡Bienvenido al inventario en la nube!** 🚀
