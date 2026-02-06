# Guía de Despliegue en Vercel 🚀

Sigue estos pasos para que tus compañeros puedan ver la app:

### 1. Preparación en Vercel
1. Ve a [vercel.com](https://vercel.com) y regístrate usando tu cuenta de **GitHub**.
2. Dale al botón **"Add New"** y luego a **"Project"**.
3. Verás una lista de tus repositorios. Busca **`PlanifAI`** y dale a **Import**.

### 2. Configuración de Variables de Entorno (CRITICAL)
Antes de darle al botón "Deploy", baja hasta la sección **Environment Variables**. Tienes que añadir estos 3 valores:

| Key | Value |
| :--- | :--- |
| `VITE_SUPABASE_URL` | `https://ftybizjyqoezsmiqfmun.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_E8MD06yHYlJzzvFwB5hsvQ_5MjQPkw2` |
| `VITE_GEMINI_API_KEY` | `TU_NUEVA_API_KEY_AQUI
` |

> [!TIP]
> Solo tienes que poner el nombre (ej: `VITE_SUPABASE_URL`) a la izquierda y el valor (la URL larga) a la derecha.

### 3. Despliegue
Dale a **Deploy**. En un minuto tendrás un enlace tipo `planifai-xyz.vercel.app`.

---

### Sobre la Privacidad 🔒
- **¿Es automático público?** Sí, cualquier persona que tenga el link podrá entrar.
- **¿Es rastreable?** No. Google no indexará tu web, por lo que nadie la encontrará a menos que tú les pases el enlace.
- **Seguridad**: Solo tú y tus compañeros con el link podrán verlo. Es la forma estándar y segura de probar apps en desarrollo.
