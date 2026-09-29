# 🔥 Guía de Configuración Firebase para GvAutoPartes

## ✅ ¡Tu aplicación ya está conectada a Firebase!

Ahora tu equipo puede acceder al inventario en tiempo real desde cualquier dispositivo. Los cambios se sincronizan automáticamente.

---

## 📋 Pasos para Configurar Firebase

### **Paso 1: Crear Proyecto en Firebase**

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Click en **"Agregar proyecto"** o **"Add project"**
3. Nombre del proyecto: `gvautopartes-inventario` (o el que prefieras)
4. Acepta los términos y click en **"Continuar"**
5. Desactiva Google Analytics (opcional) y click en **"Crear proyecto"**

---

### **Paso 2: Crear Base de Datos Firestore**

1. En el menú lateral izquierdo, click en **"Firestore Database"**
2. Click en **"Crear base de datos"**
3. Selecciona **"Comenzar en modo de prueba"** (para empezar)
4. Ubicación: `us-central1` (o la más cercana a ti)
5. Click en **"Habilitar"**

⚠️ **IMPORTANTE:** Después de probar, cambia las reglas de seguridad:
- Ve a la pestaña **"Reglas"**
- Reemplaza el contenido con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /inventory/{document=**} {
      allow read, write: if true; // Para desarrollo
      // Para producción, usa autenticación:
      // allow read, write: if request.auth != null;
    }
  }
}
```

---

### **Paso 3: Registrar tu Aplicación Web**

1. En la página principal del proyecto, busca **"Tus aplicaciones"**
2. Click en el ícono **Web** (`</>`)
3. Nombre del app: `GvAutoPartes Web`
4. **NO** marques "Configurar también Firebase Hosting"
5. Click en **"Registrar app"**

---

### **Paso 4: Copiar Configuración de Firebase**

Firebase te mostrará un objeto de configuración como este:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "gvautopartes-inventario.firebaseapp.com",
  projectId: "gvautopartes-inventario",
  storageBucket: "gvautopartes-inventario.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

**¡Copia TODOS estos valores!**

---

### **Paso 5: Actualizar tu Código**

1. Abre el archivo `src/firebase.ts` en tu editor
2. Reemplaza los valores placeholder con tus credenciales reales:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", // ← Tu API Key
  authDomain: "gvautopartes-inventario.firebaseapp.com", // ← Tu Auth Domain
  projectId: "gvautopartes-inventario", // ← Tu Project ID
  storageBucket: "gvautopartes-inventario.appspot.com", // ← Tu Storage Bucket
  messagingSenderId: "123456789012", // ← Tu Messaging Sender ID
  appId: "1:123456789012:web:abcdef1234567890" // ← Tu App ID
};
```

3. Guarda el archivo

---

### **Paso 6: Subir Cambios a GitHub**

```bash
# Agregar cambios
git add .

# Hacer commit
git commit -m "Conectar aplicación con Firebase Firestore"

# Subir a GitHub
git push origin main
```

---

### **Paso 7: Desplegar en Vercel**

Vercel detectará automáticamente los cambios y desplegará la nueva versión con Firebase integrado.

---

## 🎯 ¿Cómo Funciona Ahora?

### **Sincronización en Tiempo Real:**

✅ **Todos los usuarios ven los mismos datos**
- Cuando alguien edita un producto, todos lo ven inmediatamente
- No es necesario recargar la página
- Los cambios se guardan automáticamente en la nube

✅ **Estado de sincronización visible:**
- 🔄 **"Sincronizando con Firebase..."** - Conectando con la base de datos
- ⏳ **"Guardando en la nube..."** - Guardando cambios
- ✅ **"Sincronizado en tiempo real"** - Todo actualizado
- ❌ **"Error de conexión"** - Problema de conexión

✅ **Primera vez que se carga:**
- La app detecta si Firestore está vacío
- Si está vacío, sube automáticamente los 275 productos iniciales
- Si ya tiene datos, los descarga y los muestra

---

## 🔐 Seguridad (Recomendado para Producción)

### **Opción 1: Reglas de Firestore Básicas**

Para permitir que solo usuarios autenticados editen:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /inventory/{document=**} {
      allow read: if true; // Todos pueden leer
      allow write: if request.auth != null; // Solo autenticados pueden escribir
    }
  }
}
```

### **Opción 2: Autenticación de Firebase**

1. En Firebase Console, ve a **"Authentication"**
2. Click en **"Comenzar"**
3. Habilita los métodos de autenticación que prefieras:
   - Email/Password
   - Google
   - etc.

4. Agrega autenticación a tu app (requiere cambios adicionales en el código)

---

## 📊 Estructura de Datos en Firestore

Tu base de datos tendrá:

```
Firestore Database
└── inventory (colección)
    ├── R42XLS-G (documento)
    │   ├── sku: "R42XLS-G"
    │   ├── description: "Bujía Punta Carbón"
    │   ├── vehicles: "CHEVROLET CORSA..."
    │   ├── qtyPdf: 16
    │   ├── qtyReceived: 16
    │   ├── unitPrice: 1.35
    │   └── ...
    ├── 41-602 (documento)
    │   └── ...
    └── ... (275 documentos en total)
```

---

## 🚀 Características de Firebase

✅ **Tiempo Real:** Los cambios se reflejan instantáneamente para todos los usuarios  
✅ **Escalable:** Puede manejar miles de usuarios simultáneos  
✅ **Confiable:** Datos respaldados en la nube de Google  
✅ **Gratuito:** El plan gratuito (Spark) es suficiente para tu caso de uso  
✅ **Multi-dispositivo:** Funciona en cualquier navegador o dispositivo  

---

## 💰 Límites del Plan Gratuito de Firebase

- **Almacenamiento:** 1 GB de datos
- **Lecturas:** 50,000 por día
- **Escrituras:** 20,000 por día
- **Eliminaciones:** 20,000 por día

**Para tu inventario de 275 productos, estos límites son más que suficientes.**

---

## 🛠️ Solución de Problemas

### **Problema: "Error de conexión"**

**Solución:**
1. Verifica que las credenciales en `src/firebase.ts` sean correctas
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
