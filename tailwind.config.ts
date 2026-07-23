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

        // License badge accent (song-card) — kept separate from shadcn `destructive`/`accent`.
        success: '#2E9E5B',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'brand-card': '1.125rem', // 18px — editorial large cards / panels
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
      keyframes: {
        ksMarquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'ks-marquee': 'ksMarquee 24s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
