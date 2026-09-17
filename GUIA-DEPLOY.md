# 🚀 GUÍA COMPLETA: Subir tu Sistema a GitHub con Contraseña

## ✅ Lo que ya tienes listo:

1. ✅ Sistema de inventario completo
2. ✅ Pantalla de login con contraseña
3. ✅ Todas las funcionalidades funcionando
4. ✅ README.md creado
5. ✅ .gitignore configurado

---

## 📋 PASO A PASO PARA SUBIR A GITHUB

### **PASO 1: Crear cuenta en GitHub (si no tienes)**

1. Ve a [github.com](https://github.com)
2. Click en "Sign up"
3. Completa el registro
4. Verifica tu email

---

### **PASO 2: Instalar Git en tu computadora**

**Windows:**
- Descarga: https://git-scm.com/download/win
- Instala con las opciones por defecto

**Mac:**
```bash
# Abre Terminal y escribe:
xcode-select --install
```

**Linux:**
```bash
sudo apt-get install git
```

---

### **PASO 3: Configurar Git**

Abre tu terminal (CMD en Windows, Terminal en Mac/Linux) y escribe:

```bash
# Configura tu nombre
git config --global user.name "Tu Nombre"

# Configura tu email (el mismo de GitHub)
git config --global user.email "tu-email@ejemplo.com"
```

---

### **PASO 4: Crear repositorio en GitHub**

1. Ve a [github.com/new](https://github.com/new)
2. Llena los campos:
   - **Repository name:** `guzimport-inventario`
   - **Description:** `Sistema de inventario privado - GUZIMPORT`
   - **⚠️ Selecciona: Private** (MUY IMPORTANTE)
   - **NO marques** "Add a README file"
   - **NO marques** "Add .gitignore"
   - **NO marques** "Choose a license"
3. Click en **"Create repository"**

---

### **PASO 5: Subir tu código a GitHub**

Abre la terminal en la carpeta de tu proyecto y ejecuta:

```bash
# Inicializar git
git init

# Agregar todos los archivos
git add .

# Crear primer commit
git commit -m "Sistema de inventario Guzimport con login"

# Cambiar rama principal a 'main'
git branch -M main

# Conectar con tu repositorio de GitHub
# ⚠️ CAMBIA "TU-USUARIO" por tu usuario real de GitHub
git remote add origin https://github.com/TU-USUARIO/guzimport-inventario.git

# Subir el código
git push -u origin main
```

**GitHub te pedirá:**
1. Tu usuario de GitHub
2. Tu contraseña o **Personal Access Token**

**Para crear un Personal Access Token:**
1. Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click en "Generate new token"
3. Marca los permisos: `repo` (todo)
4. Click en "Generate token"
5. **COPIA EL TOKEN** (solo se muestra una vez)
6. Úsalo como contraseña cuando Git te lo pida

---

### **PASO 6: Configurar para GitHub Pages**

#### **6.1: Editar vite.config.js**

Abre el archivo `vite.config.js` y modifícalo así:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/guzimport-inventario/' // ← AGREGA ESTA LÍNEA
})
```

#### **6.2: Compilar y subir cambios**

```bash
# Compilar el proyecto
npm run build

# Subir los cambios
git add .
git commit -m "Configurar base para GitHub Pages"
git push
```

---

### **PASO 7: Activar GitHub Pages**

1. Ve a tu repositorio en GitHub
2. Click en **"Settings"** (arriba a la derecha)
3. En el menú lateral izquierdo, busca **"Pages"**
4. En la sección **"Build and deployment"**:
   - **Source:** Selecciona "Deploy from a branch"
   - **Branch:** Selecciona `main`
   - **Folder:** Selecciona `/ (root)`
5. Click en **"Save"**

⚠️ **IMPORTANTE:** GitHub Pages para repositorios privados requiere **GitHub Pro** ($4/mes).

**Alternativa GRATIS:** Usa **Vercel** o **Netlify** (ver abajo)

---

### **PASO 8: Acceder a tu web**

Después de 2-3 minutos, tu web estará en:

```
https://TU-USUARIO.github.io/guzimport-inventario/
```

**Primera vez que entras:**
- Contraseña por defecto: `guzimport2026`
- **CÁMBIALA INMEDIATAMENTE** usando el botón "¿Cambiar contraseña?"

---

## 🎯 ALTERNATIVA GRATIS: Vercel (RECOMENDADO)

Si no quieres pagar GitHub Pro, usa **Vercel** (100% gratis):

### **Pasos para Vercel:**

1. Ve a [vercel.com](https://vercel.com)
2. Click en "Sign Up" → "Continue with GitHub"
3. Autoriza Vercel a acceder a tu GitHub
4. Click en **"Add New Project"**
5. Busca tu repositorio `guzimport-inventario`
6. Click en **"Import"**
7. Vercel detecta automáticamente que es Vite + React
8. Click en **"Deploy"**
9. ¡Listo! En 30 segundos tendrás tu URL

**Tu URL será algo como:**
```
https://guzimport-inventario.vercel.app
```

**Ventajas de Vercel:**
- ✅ 100% GRATIS
- ✅ Funciona con repositorios privados
- ✅ Deploy automático al hacer push
- ✅ HTTPS incluido
- ✅ URL personalizada disponible

---

## 🔐 SEGURIDAD

### **Niveles de seguridad:**

1. **Repositorio privado en GitHub**
   - Solo tú (y quien invites) pueden ver el código
   - Nadie más puede acceder al repositorio

2. **URL no pública**
   - Tu web no aparece en Google
   - Solo quien tenga la URL exacta puede acceder

3. **Contraseña en la app**
   - Pantalla de login antes de ver el inventario
   - Puedes cambiar la contraseña cuando quieras

### **Recomendaciones:**

- ✅ No compartas la URL públicamente
- ✅ Cambia la contraseña por defecto inmediatamente
- ✅ Usa una contraseña fuerte (mínimo 8 caracteres)
- ✅ No subas el proyecto a repositorios públicos

---

## 📝 RESUMEN RÁPIDO

### **Opción 1: GitHub Pages (Requiere GitHub Pro $4/mes)**
```bash
git init
git add .
git commit -m "Sistema de inventario"
git remote add origin https://github.com/TU-USUARIO/guzimport-inventario.git
git push -u origin main
# Luego activa GitHub Pages en Settings
```

### **Opción 2: Vercel (GRATIS - RECOMENDADO)**
```bash
# Sube tu código a GitHub primero
git init
git add .
git commit -m "Sistema de inventario"
git remote add origin https://github.com/TU-USUARIO/guzimport-inventario.git
git push -u origin main

# Luego ve a vercel.com y conecta tu repositorio
```

---

## ❓ PROBLEMAS COMUNES

### **"La página no carga después de hacer deploy"**
- Espera 2-3 minutos
- Verifica que el archivo `vite.config.js` tenga la línea `base: '/guzimport-inventario/'`
- Haz push de los cambios

### **"No puedo hacer push a GitHub"**
- Verifica que estés usando tu Personal Access Token (no tu contraseña)
- Asegúrate de que el repositorio sea privado

### **"La contraseña no funciona"**
- Contraseña por defecto: `guzimport2026`
- Si la cambiaste, usa la nueva contraseña
- Si la olvidaste, borra el localStorage del navegador

---

## 📞 SOPORTE

Si tienes problemas:
1. Revisa que todos los pasos estén completos
2. Verifica que el repositorio sea privado
3. Asegúrate de que `vite.config.js` tenga la línea `base`
4. Espera 2-3 minutos después del deploy

---

**¡Listo! Tu sistema de inventario estará disponible en una web privada con contraseña.** 🔐
