# Alta GULA Delivery

E-commerce de delivery con panel de administración completo.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v3 · Supabase · React Query · React Router v6

---

## Deploy en Vercel

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd E-commerce
npm install
```

### 2. Crear proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) y creá un nuevo proyecto
2. En **SQL Editor**, ejecutá los archivos en este orden:
   - `supabase/schema.sql` — tablas y datos iniciales
   - `supabase/rls.sql` — políticas de Row Level Security
   - `supabase/storage.sql` — bucket `product-images`

### 3. Crear el bucket de imágenes

Si preferís hacerlo desde la UI en lugar del SQL:

1. Ir a **Storage** en el panel de Supabase
2. Crear bucket con nombre `product-images`
3. Marcarlo como **público**

### 4. Crear usuario administrador

1. Ir a **Authentication → Users** en el panel de Supabase
2. Click en **Add user** → **Create new user**
3. Ingresar email y contraseña del admin

### 5. Configurar variables de entorno en Vercel

En el panel de tu proyecto en Vercel, agregar:

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto (ej: `https://xxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Anon key del proyecto |
| `VITE_WHATSAPP_NUMBER` | Número fallback (ej: `5491112345678`) |

> El número de WhatsApp también se puede configurar desde el panel admin en `/admin/configuracion`. La variable de entorno actúa como fallback si el campo está vacío en la base de datos.

### 6. Deploy

```bash
# Opción A: conectar el repo desde el panel de Vercel (recomendado)
# Opción B: deploy manual con CLI
npm install -g vercel
vercel --prod
```

El archivo `vercel.json` ya está configurado para que React Router funcione correctamente en producción.

---

## Desarrollo local

```bash
# Copiar variables de entorno
cp .env.example .env
# Completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env

npm run dev
```

---

## Estructura del proyecto

```
src/
├── components/
│   ├── admin/          # AdminLayout, AdminSidebar
│   ├── catalog/        # ProductCard, CategoryRow, CategoryFilter, Skeletons
│   ├── layout/         # Navbar, PublicLayout
│   └── ui/             # Modal
├── context/
│   └── CartContext.tsx # Estado global del carrito (localStorage)
├── hooks/
│   ├── useAuth.ts
│   ├── useCatalog.ts
│   ├── useFadeIn.ts    # IntersectionObserver para animaciones
│   ├── useSettings.ts
│   └── useTickerMessages.ts
├── lib/
│   └── supabase.ts
├── pages/
│   ├── admin/          # Login, Dashboard, Categorías, Productos, Combos,
│   │                   # Banners, Configuración, Pedidos
│   ├── Home.tsx
│   ├── Catalog.tsx
│   └── Checkout.tsx
└── types/index.ts

supabase/
├── schema.sql   # Tablas + datos iniciales
├── rls.sql      # Row Level Security
└── storage.sql  # Bucket product-images
```

---

## Rutas

| Ruta | Descripción |
|---|---|
| `/` | Home con ticker y hero |
| `/productos` | Catálogo con filtros y búsqueda |
| `/checkout` | Formulario → mensaje de WhatsApp |
| `/admin` | Redirige a dashboard o login |
| `/admin/login` | Login de administrador |
| `/admin/dashboard` | Métricas y stock crítico |
| `/admin/categorias` | CRUD de categorías |
| `/admin/productos` | CRUD de productos + upload de imágenes |
| `/admin/combos` | CRUD de combos con ítems |
| `/admin/banners` | Mensajes del ticker |
| `/admin/configuracion` | WhatsApp, delivery, mínimo, nombre |
| `/admin/pedidos` | Procesamiento manual de pedidos |
