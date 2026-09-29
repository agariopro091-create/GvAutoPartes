# 📦 Sistema de Inventario - GvAutoPartes

Sistema web privado para control de inventario físico vs despacho de autopartes.

## 🔐 Acceso

**Contraseña por defecto:** `gvautopartes2026`

⚠️ **IMPORTANTE:** Cambia la contraseña después del primer acceso usando el botón "¿Cambiar contraseña?" en la pantalla de login.

## 🚀 Deploy en GitHub Pages

### Paso 1: Preparar el repositorio

```bash
# Inicializar git (si no lo has hecho)
git init
git add .
git commit -m "Sistema de inventario Guzimport"
```

### Paso 2: Crear repositorio en GitHub

1. Ve a [github.com/new](https://github.com/new)
2. Nombre: `guzimport-inventario`
3. **Selecciona "Private"** (privado)
4. No inicialices con README
5. Click en "Create repository"

### Paso 3: Subir el código

```bash
git remote add origin https://github.com/TU-USUARIO/guzimport-inventario.git
git branch -M main
git push -u origin main
```

### Paso 4: Configurar GitHub Pages

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Pages**
4. En "Source", selecciona:
   - **Branch:** `main`
   - **Folder:** `/ (root)`
5. Click en **Save**

### Paso 5: Configurar Vite para GitHub Pages

Edita el archivo `vite.config.js` y agrega `base`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/guzimport-inventario/' // ← Agrega esta línea con el nombre de tu repo
})
```

### Paso 6: Hacer deploy

```bash
# Instalar dependencias
npm install

# Compilar el proyecto
npm run build

# Subir los cambios
git add .
git commit -m "Configurar para GitHub Pages"
git push
```

### Paso 7: Acceder a tu web

Después de 1-2 minutos, tu web estará disponible en:

```
https://TU-USUARIO.github.io/guzimport-inventario/
```

## 🔒 Seguridad

- ✅ Contraseña protegida
- ✅ Repositorio privado en GitHub
- ✅ URL no indexada en buscadores
- ✅ Solo accesible con la URL + contraseña

⚠️ **Nota:** La contraseña se guarda en el navegador (localStorage). Para máxima seguridad, no compartas la URL públicamente.

## 📋 Funcionalidades

- ✅ Gestión completa de inventario
- ✅ 3 indicadores de estado (PDF, Excel, Físico)
- ✅ Búsqueda inteligente (sin acentos)
- ✅ Filtros por categoría y estado
- ✅ Agregar, editar y eliminar piezas
- ✅ Exportar a Excel (CSV) con columna de precios
- ✅ Respaldos JSON
- ✅ Exportar como HTML
- ✅ Guardado automático
- ✅ Sistema de login con contraseña

## 🛠️ Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Compilar para producción
npm run build
```

## 📞 Soporte

**GvAutoPartes**
- Documento: 80010868
- Proveedor: Guzimport, C.A.
- Sistema Privado de Inventario

---

© 2026 GvAutoPartes - Sistema Privado
