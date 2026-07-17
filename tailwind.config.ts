import type { Config } from 'tailwindcss';

// shadcn/ui token-based config (CSS variables defined in app/globals.css).
const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // ─── STITCH DESIGN SYSTEM (B namespace) ──────────────────────────────
        // Additive only. Hex values used directly (NOT wrapped in hsl(var()) —
        // these are literal colors, not shadcn CSS-var tokens). Names that would
        // collide with a shadcn key above (primary / secondary / background) are
        // renamed (brand-primary / brand-secondary / surface-cinematic); all other
        // stitch names are kept verbatim from DESIGN.md frontmatter. Nothing here
        // overrides a shadcn token, so stock shadcn components render unchanged.
        // Source: stitch_king_studio_design_system_v2/king_studio_cinematic/DESIGN.md
        // primary fixed to #e83528 (single, both surfaces); #ffb4a9 reserved for
        // an on-dark variant (see step 3).

        // Dual surface (canonical)
        'surface-cinematic': '#181214',
        'surface-warm': '#FBF9F7',
        // Stitch Material surface depth layers
        'surface-dim': '#181214',
        'surface-bright': '#3f3739',
        'surface-container-lowest': '#120d0f',
        'surface-container-low': '#201a1c',
        'surface-container': '#241e20',
        'surface-container-high': '#2f282a',
        'surface-container-highest': '#3a3335',
        'surface-variant': '#3a3335',
        'surface-tint': '#ffb4a9',
        'on-surface': '#ecdfe2',
        'on-surface-variant': '#e6bdb7',
        'inverse-surface': '#ecdfe2',
        'inverse-on-surface': '#362f31',
        outline: '#ac8883',
        'outline-variant': '#5c403b',
        // Brand primary (renamed from stitch `primary`; fixed to #e83528)
        'brand-primary': '#e83528',
        // On-dark variant: #e83528 as text/icon on cinematic #181214 = 4.38:1 (fails AA
        // normal). This apricot tint = 10.88:1 ✓. Use for primary-colored TEXT/icons on
        // dark surfaces; keep #e83528 for fills and large/bold type. (step 3 contrast)
        'brand-primary-on-dark': '#ffb4a9',
        'on-primary': '#690001',
        'primary-container': '#ff5543',
        'on-primary-container': '#5c0001',
        'inverse-primary': '#be0d0b',
        // Secondary (renamed from stitch `secondary`)
        'brand-secondary': '#ffb77f',
        'on-secondary': '#4e2600',
        'secondary-container': '#df7800',
        'on-secondary-container': '#472200',
        // Tertiary
        tertiary: '#79d1ff',
        'on-tertiary': '#003549',
        'tertiary-container': '#2b9bca',
        'on-tertiary-container': '#002d40',
        // Error (stitch; shadcn uses `destructive` — kept separate)
        error: '#D63A3A',
        'on-error': '#690005',
        'error-container': '#93000a',
        'on-error-container': '#ffdad6',
        // Fixed tones
        'primary-fixed': '#ffdad5',
        'primary-fixed-dim': '#ffb4a9',
        'on-primary-fixed': '#410000',
        'on-primary-fixed-variant': '#930003',
        'secondary-fixed': '#ffdcc3',
        'secondary-fixed-dim': '#ffb77f',
        'on-secondary-fixed': '#2f1500',
        'on-secondary-fixed-variant': '#6f3900',
        'tertiary-fixed': '#c3e8ff',
        'tertiary-fixed-dim': '#79d1ff',
        'on-tertiary-fixed': '#001e2c',
        'on-tertiary-fixed-variant': '#004c68',
        // Brand accents + misc (renamed from stitch `background`/`warm-bg`)
        'on-background': '#ecdfe2',
        'brand-violet': '#7B2E8E',
        'brand-pink': '#C53562',
        success: '#2E9E5B',
        'muted-text': '#6B6460',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // Stitch radii — only non-colliding names (shadcn owns sm/md/lg above).
        xl: '1.5rem',
        'brand-card': '1.125rem', // 18px — editorial large cards / panels
        'brand-input': '0.5rem', // stitch DEFAULT — inputs / small buttons
      },
      // Stitch spacing scale (named keys; feed gap-*, p*-*, m*-*).
      spacing: {
        gutter: '24px',
        'stack-sm': '8px',
        'stack-md': '16px',
        'stack-lg': '32px',
        'section-gap': '80px',
        'margin-mobile': '16px',
        'margin-desktop': '40px',
      },
      maxWidth: {
        'container-max': '1280px',
      },
      // Stitch type scale (sizes only; families added in step 2 with next/font).
      fontSize: {
        'display-lg': ['72px', { lineHeight: '1.1', letterSpacing: '0.02em', fontWeight: '400' }],
        'display-lg-mobile': ['48px', { lineHeight: '1.1', fontWeight: '400' }],
        'headline-xl': ['40px', { lineHeight: '1.2', fontWeight: '400' }],
        'headline-lg': ['32px', { lineHeight: '1.2', fontWeight: '400' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'label-sm': ['12px', { lineHeight: '1.4', letterSpacing: '0.05em', fontWeight: '600' }],
      },
      // Font families via next/font CSS variables (defined in app/[locale]/layout.tsx).
      // `sans` (→ Pretendard) overrides the default so body/shadcn inherit Pretendard.
      // Per-scale keys let stitch's `font-headline-lg` / `font-display-lg` / `font-body-md` work.
      fontFamily: {
        sans: ['var(--font-pretendard)', 'Pretendard', 'system-ui', 'sans-serif'],
        headline: ['var(--font-pretendard)', 'Pretendard', 'sans-serif'],
        display: ['var(--font-pretendard)', 'Pretendard', 'sans-serif'],
        'display-lg': ['var(--font-pretendard)', 'Pretendard', 'sans-serif'],
        'display-lg-mobile': ['var(--font-pretendard)', 'Pretendard', 'sans-serif'],
        'headline-xl': ['var(--font-pretendard)', 'Pretendard', 'sans-serif'],
        'headline-lg': ['var(--font-pretendard)', 'Pretendard', 'sans-serif'],
        'body-lg': ['var(--font-pretendard)', 'sans-serif'],
        'body-md': ['var(--font-pretendard)', 'sans-serif'],
        'label-sm': ['var(--font-pretendard)', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
