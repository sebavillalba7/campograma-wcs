# Campograma WCS — guía para publicar en Vercel

Aplicación abierta, sin login, para cargar CSV de Catapult OpenField, reproducir un campograma y comparar partidos por bloques sincronizados.

## 1. Crear las cuentas necesarias

1. Entrá a [github.com](https://github.com) y creá una cuenta si todavía no tenés.
2. Entrá a [vercel.com](https://vercel.com) y elegí **Continue with GitHub**.
3. Autorizá a Vercel para acceder a tus repositorios.

## 2. Subir este proyecto a GitHub

1. En GitHub, presioná **New repository**.
2. Nombre sugerido: `campograma-wcs`.
3. Elegí **Private** mientras lo probás y creá el repositorio sin README.
4. Descomprimí este proyecto en tu PC.
5. Abrí una terminal dentro de la carpeta y ejecutá:

```bash
git init
git add .
git commit -m "Primera versión Campograma WCS"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/campograma-wcs.git
git push -u origin main
```

También podés subir los archivos desde la web de GitHub con **Add file → Upload files**.

## 3. Publicar en Vercel

1. En el panel de Vercel presioná **Add New → Project**.
2. Elegí el repositorio `campograma-wcs`.
3. Vercel detectará automáticamente **Next.js**.
4. No agregues variables de entorno en esta versión.
5. Presioná **Deploy**.
6. Al finalizar, Vercel mostrará una URL similar a `campograma-wcs.vercel.app`.

Cada vez que subas un cambio a la rama `main`, Vercel publicará la nueva versión automáticamente.

## 4. Probarlo en tu computadora (opcional)

Necesitás Node.js 20 o superior.

```bash
npm install
npm run dev
```

Abrí `http://localhost:3000`.

## Cómo deben ser los CSV

### CSV resumen

Debe tener una fila por jugador y minuto. La app reconoce nombres equivalentes, pero se recomienda usar:

```csv
Athlete,Minute,Total Distance,Mts/min,Mts > 19,Mts > 24,A+D,Max Velocity
L Menossi,12,118.4,118.4,8.2,1.6,4,27.8
```

### CSV GPS individual

Un archivo por jugador:

```csv
Athlete,Timestamp,Seconds,Velocity,Acceleration,Latitude,Longitude,Positional Quality
L Menossi,2026-08-23 18:02:01,1,12.4,0.8,-31.633000,-60.700000,1
```

- Todos los archivos deben pertenecer al mismo partido.
- `Timestamp` debe ser absoluto y compartir zona horaria.
- No se inventan posiciones cuando faltan coordenadas.
- El arquero se muestra, pero se excluye de métricas colectivas.

## Persistencia actual y Supabase

La versión incluida guarda los partidos en **IndexedDB**, dentro del navegador. Esto significa:

- no requiere login ni expone los CSV en una base pública;
- al volver desde la misma computadora y navegador, los partidos siguen disponibles;
- borrar los datos del navegador o cambiar de dispositivo elimina ese acceso.

Para sincronizar partidos entre dispositivos hace falta identificar a cada usuario. La opción segura es agregar posteriormente **Supabase Auth** (puede ser enlace mágico por email) y guardar:

- metadatos y notas en Postgres;
- CSV originales o paquetes procesados en Supabase Storage;
- políticas RLS para que cada usuario solo acceda a sus partidos.

No se recomienda Supabase público sin autenticación: cualquier visitante podría leer, reemplazar o borrar datos GPS ajenos si las políticas quedan abiertas.

## Alcance técnico de esta versión

- La carga exige dos URLs públicas y las conserva como referencias.
- La extracción automática de eventos desde SofaScore/FotMob no se ejecuta todavía: esas webs cambian sus interfaces y suelen bloquear consultas desde el navegador. Para producción conviene una función de servidor con adaptadores por fuente y una revisión manual de eventos.
- El campo se normaliza con percentiles GPS y genera reproducción por tiempo.
- La tabla por minuto, los bloques y la comparación usan las columnas disponibles del resumen.
- Los partidos se comparan por el inicio de cada bloque y las métricas quedan lado a lado.

## Próxima etapa recomendada

1. Validar esta versión con 3–5 partidos reales de OpenField.
2. Ajustar alias exactos de columnas y detección del entretiempo con esos archivos.
3. Incorporar orientación por arquero y controles LI/LD, MOI/MOD.
4. Agregar cálculo rolling WCS 1′/3′/5′/10′ y exportación Excel.
5. Incorporar cronología mediante una función de servidor y confirmación del usuario.
6. Recién entonces activar Supabase Auth + Storage para sincronización multidispositivo.
