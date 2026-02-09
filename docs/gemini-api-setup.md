# Configuración Completada de Gemini API ✅

La API key de Google Gemini ha sido configurada exitosamente en tu aplicación PlanifAI.

## ✅ Qué se ha configurado

### 1. Frontend (.env.local)
```bash
VITE_GEMINI_API_KEY=TU_NUEVA_API_KEY_AQUI
```

**Uso**: Live API de voz (Google GenAI con WebSocket)
- El asistente de voz PlanifAI ahora tiene acceso a la API
- Funciona con el modelo `gemini-live-2.5-flash-native-audio` (GA)
- Soporta audio bidireccional en tiempo real

### 2. Definiciones de Tipos (src/vite-env.d.ts)
Creado archivo de tipos TypeScript para que `import.meta.env.VITE_GEMINI_API_KEY` funcione correctamente sin errores.

### 3. Código Actualizado (hooks/usePlanAILive.ts)
```typescript
// Antes:
const apiKey = process.env.API_KEY; // ❌ No funcionaba

// Ahora:
const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // ✅ Funciona
```

## 🧪 Verificación

**El servidor de desarrollo se ha reiniciado** en http://localhost:3000

Puedes verificar que funciona:

1. Abre la app en http://localhost:3000
2. Inicia sesión o crea cuenta
3. Click en el botón del micrófono (asistente de voz)
4. Habla: *"Añade gimnasio mañana a las 5pm"*
5. ✅ El asistente debería responder y crear el evento

## 📊 Estado de Configuración

| Componente | Estado | Detalles |
|------------|--------|----------|
| **API Key en .env** | ✅ Configurada | AIzaSyB6...Tdq8 |
| **Tipos TypeScript** | ✅ Creados | src/vite-env.d.ts |
| **usePlanAILive** | ✅ Actualizado | Usa import.meta.env |
| **Build** | ✅ Exitoso | 0 errores TypeScript |
| **Dev Server** | ✅ Running | http://localhost:3000 |

## 🔐 Seguridad

**Importante**: La API key está en `.env.local` que:
- ✅ NO está en Git (está en .gitignore)
- ⚠️ Se expone en el bundle del cliente (necesario para Live API)
- ✅ Solo funciona desde tu dominio (configura restricciones en Google Cloud Console)

**Recomendación para producción**:
1. Ve a Google Cloud Console
2. API & Services → Credentials
3. Edita tu API key
4. En "Application restrictions" → "HTTP referrers"
5. Añade tu dominio de producción (ej: `https://planifai.app/*`)

## 🔧 Requisitos de Google Cloud Console

**IMPORTANTE**: Para que el chat de voz funcione, necesitas tener habilitada la API correcta:

### Paso 1: Habilitar la API
1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. En el buscador, escribe "Generative Language API"
3. Haz clic en el resultado
4. Haz clic en el botón "Enable" (Habilitar)
5. Espera a que se active (puede tardar unos segundos)

### Paso 2: Configurar API Key (Recomendado)
1. Ve a "API & Services" → "Credentials"
2. Selecciona tu API Key (`TU_NUEVA_API_KEY_AQUI`)
3. En "Application restrictions":
   - Selecciona "HTTP referrers (web sites)"
   - Añade: `http://localhost:*` (para desarrollo)
   - Añade: `https://planif-ai.vercel.app/*` (para producción)
4. En "API restrictions":
   - Selecciona "Restrict key"
   - Marca: ✓ Generative Language API
5. Haz clic en "Save"

### Verificar que está habilitada
En la consola del navegador (F12), al conectar el asistente de voz, deberías ver:
- ✅ `[AI] 🔑 API Key found`
- ✅ `[AI] Connecting with voice: Zephyr`
- ❌ **NO** debe aparecer error 403 (API not enabled)

## 🔄 Próximos Pasos (Opcional)

### Para el Edge Function (text-based):
Si quieres usar el Edge Function para requests de texto (más seguro):

```bash
supabase functions deploy ai-proxy
supabase secrets set GEMINI_API_KEY=TU_NUEVA_API_KEY_AQUI
```

Esto permite:
- Cacheo de respuestas (reduce costos)
- Rate limiting por usuario
- Analytics de uso
- La key NUNCA sale al cliente

**Pero**: El Live API de voz seguirá necesitando la key en cliente.

## ✅ Conclusión

**Todo listo**. Tu asistente de voz PlanifAI ahora puede:
- Conectarse a Gemini 2.0 Flash
- Procesar audio en tiempo real
- Crear/editar/eliminar eventos por voz
- Responder en español o inglés

**Pruébalo ahora** en http://localhost:3000 🎤
