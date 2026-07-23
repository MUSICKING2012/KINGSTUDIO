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

        // Editorial redesign v3 (Tailwind_Token_Spec_v1 §1a) — brand base literals.
        // Mirror globals.css :root --background/--foreground; keep both in sync on any change.
        paper: '#F0EEE9', // = --background real value (SoT: globals.css :root)
        ink: '#141210', // = --foreground real value (SoT: globals.css :root)
        // (§1a) no `accent` literal — collides with shadcn `accent`; deferred to sequence 3.

        // Editorial redesign v3 (Tailwind_Token_Spec_v1 §1) — dark/light surface tokens.
        // Consumed by later page slices; brand paper/ink/accent (shadcn CSS vars) unchanged.
        'ink-deep': '#111010', // dark section bg (Provide·Booking bar·Subscribe·toast)
        'ink-raise': '#1c1a19', // elevated field within dark section (booking input/select, dark image bg)
        'ink-footer': '#0b0a0a', // footer bg (ks-footer measured)
        'paper-raise': '#F5F3EE', // light card bg (package card light variant)
        'paper-dim': '#e6e3dc', // image placeholder bg
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'brand-card': '1.125rem', // 18px — editorial large cards / panels
        // Editorial redesign v3 (Tailwind_Token_Spec_v1 §4) — measured radii.
        'ks-field': '11px', // booking field · CTA · toast
        'ks-card': '14px', // hero NYT card
        'ks-img': '16px', // category · Boost image
        'ks-panel': '18px', // hero photo · package card · dark image
        'ks-bar': '20px', // booking bar container
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
        // Editorial redesign v3 (Tailwind_Token_Spec_v1 §2) — `edi-` scale; existing display-* untouched.
        'edi-hero': [
          'clamp(58px,14.5vw,200px)',
          { lineHeight: '0.86', letterSpacing: '0.01em', fontWeight: '800' },
        ],
        'edi-shout': [
          'clamp(60px,15vw,210px)',
          { lineHeight: '0.86', letterSpacing: '-0.01em', fontWeight: '900' },
        ],
        'edi-xl': ['clamp(34px,6.4vw,84px)', { lineHeight: '0.98', fontWeight: '900' }],
        'edi-lg': ['clamp(34px,5.4vw,74px)', { lineHeight: '0.98', fontWeight: '800' }],
        'edi-md': ['clamp(30px,5.2vw,68px)', { lineHeight: '1', fontWeight: '800' }],
        'edi-sm': ['clamp(30px,4.6vw,60px)', { lineHeight: '1.02', fontWeight: '800' }],
        'edi-cat': ['clamp(26px,3.8vw,46px)', { lineHeight: '1.08', fontWeight: '900' }],
        'edi-kicker': ['clamp(22px,2.4vw,30px)', { lineHeight: '1.02', fontWeight: '800' }],
        'edi-book': ['clamp(18px,2.2vw,26px)', { fontWeight: '800' }],
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
      // Editorial redesign v3 (Tailwind_Token_Spec_v1 §5) — hero photo/caption shadows.
      boxShadow: {
        'edi-photo': '0 24px 60px rgba(20, 18, 16, 0.22)', // hero overlap photo
        'edi-caption': '0 6px 18px rgba(20, 18, 16, 0.16)', // caption card over photo
      },
      // Editorial redesign v3 (Tailwind_Token_Spec_v1 §6) — marquee/toast motion.
      keyframes: {
        'edi-marquee': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'edi-toast': {
          from: { opacity: '0', transform: 'translate(-50%, 12px)' },
          to: { opacity: '1', transform: 'translate(-50%, 0)' },
        },
      },
      animation: {
        'edi-marquee': 'edi-marquee 24s linear infinite',
        'edi-toast': 'edi-toast 0.25s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
