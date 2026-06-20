---
name: King Studio Cinematic
colors:
  surface: '#181214'
  surface-dim: '#181214'
  surface-bright: '#3f3739'
  surface-container-lowest: '#120d0f'
  surface-container-low: '#201a1c'
  surface-container: '#241e20'
  surface-container-high: '#2f282a'
  surface-container-highest: '#3a3335'
  on-surface: '#ecdfe2'
  on-surface-variant: '#e6bdb7'
  inverse-surface: '#ecdfe2'
  inverse-on-surface: '#362f31'
  outline: '#ac8883'
  outline-variant: '#5c403b'
  surface-tint: '#ffb4a9'
  primary: '#ffb4a9'
  on-primary: '#690001'
  primary-container: '#ff5543'
  on-primary-container: '#5c0001'
  inverse-primary: '#be0d0b'
  secondary: '#ffb77f'
  on-secondary: '#4e2600'
  secondary-container: '#df7800'
  on-secondary-container: '#472200'
  tertiary: '#79d1ff'
  on-tertiary: '#003549'
  tertiary-container: '#2b9bca'
  on-tertiary-container: '#002d40'
  error: '#D63A3A'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdad5'
  primary-fixed-dim: '#ffb4a9'
  on-primary-fixed: '#410000'
  on-primary-fixed-variant: '#930003'
  secondary-fixed: '#ffdcc3'
  secondary-fixed-dim: '#ffb77f'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6f3900'
  tertiary-fixed: '#c3e8ff'
  tertiary-fixed-dim: '#79d1ff'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#004c68'
  background: '#181214'
  on-background: '#ecdfe2'
  surface-variant: '#3a3335'
  brand-violet: '#7B2E8E'
  brand-pink: '#C53562'
  warm-bg: '#FBF9F7'
  success: '#2E9E5B'
  muted-text: '#6B6460'
typography:
  display-lg:
    fontFamily: Anton
    fontSize: 72px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: 0.02em
  display-lg-mobile:
    fontFamily: Anton
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.1'
  headline-xl:
    fontFamily: Anton
    fontSize: 40px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-lg:
    fontFamily: Anton
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Pretendard
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Pretendard
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: Pretendard
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  section-gap: 80px
---

## Brand & Style

The design system is anchored in the "Regal yet Authentic" persona, bridging the high-glamour world of K-POP with the professional technicality of a world-class recording studio. The aesthetic follows a **Corporate Modern** foundation infused with **Cinematic High-Contrast** elements. 

The experience is a journey: it begins with immersive, moody "Studio" dark modes to evoke emotion and prestige, then transitions into high-clarity, warm "Light" modes for the functional booking and information-dense sections. Visuals should feel "expensive" through the use of generous whitespace, sophisticated gradients, and high-impact typography that mirrors professional audio equipment displays and premium entertainment branding.

## Colors

The palette utilizes a "Signature Spectrum" that moves from Orange to Violet. This gradient is the primary brand identifier and should be used for high-impact storytelling elements like step connectors, icon fills, and decorative glows.

- **Primary Action**: `#F0392B` (Red-Orange) is the high-energy driver for CTAs and active states.
- **Surface Strategy**: The system uses a dual-surface approach. Cinematic sections use `#1A1416` as the base. Transactional and informational sections use `#FBF9F7`, a "Warm Bone" white that feels more premium and less sterile than pure white.
- **Accessibility**: All text pairings must meet WCAG 2.1 AA standards. Ensure the Red-Orange primary is only paired with White or Dark-Base backgrounds where contrast ratios exceed 4.5:1.

## Typography

This design system pairs the high-impact, condensed power of **Anton** for headlines with the modern, neutral precision of **Pretendard** for UI and body copy.

- **Headlines**: Always use Anton for English headlines. Its condensed nature allows for large, cinematic type treatments even on mobile. For non-English headlines, use Pretendard in Bold.
- **UI & Body**: Pretendard is selected for its exceptional multi-language support (KR, EN, JP, CN) and its balanced, modern grotesque feel.
- **Hierarchy**: Use `uppercase` styling for labels and specific headline levels to reinforce the "Professional Studio" look, reminiscent of label makers and mixing console notations.

## Layout & Spacing

The layout philosophy is **Mobile-First with Generous Whitespace**. 

- **Grid System**: Use a 12-column fluid grid for desktop and a 4-column grid for mobile. 
- **The Alternating Section Rule**: Content should be structured in "blocks." Transition between Dark Base and Warm Light surfaces to signal shifts between "Brand Storytelling" and "Functional Interaction."
- **Safe Zones**: Ensure a minimum 44px touch target for all interactive elements in the booking flow (calendar days, time slots, and package selections).
- **Responsive Behavior**: On desktop, cards should span 3 or 4 columns. On mobile, they should reflow to a single stack or a horizontally scrollable "snap" carousel.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layering** and **Atmospheric Glows**.

- **Cinematic Depth**: In dark sections, depth is created not with shadows, but with the "Signature Spectrum" gradient used as a low-opacity backdrop blur (50px-100px blur) to simulate studio lighting.
- **Transactional Depth**: In light sections, use soft, diffused shadows (`0px 10px 30px rgba(26, 20, 22, 0.05)`) to lift package cards and booking modules from the Warm Bone background.
- **Interactive Layers**: Sticky headers and booking bars should use a "Glassmorphism" effect—a semi-transparent background (90% opacity) with a background blur of 12px to maintain context while ensuring legibility.

## Shapes

The shape language balances the "Bold Condensed" type with **Rounded** containers to maintain a welcoming, premium feel.

- **Primary Radius**: 0.5rem (8px) for input fields and small buttons.
- **Large Containers**: Package cards and category cards use 1rem (16px) to feel substantial and modern.
- **Pill Motif**: Action buttons can optionally use pill-shapes (full rounding) to contrast against the sharp, vertical lines of the Equalizer-Crown logo.
- **Interactive States**: Selected cards (like a chosen recording package) should feature a 2px solid border in Primary Red-Orange.

## Components

### Buttons
- **Primary Action**: Gradient background (Orange to Red-Orange), White text, Bold weight.
- **Secondary**: Ghost style with 2px Primary Red-Orange border or Dark Base outline.
- **Tertiary/Text**: Underlined label text in Bold Pretendard.

### Cards (Packages)
- Features a high-quality studio image at the top.
- Content area uses the Warm Light base.
- Prices should be prominent using the Headline-LG style.

### Booking Modules
- **Calendar**: Clean grid with `success` color for available days and `closed` (muted) for unavailable ones.
- **Progress Bar**: Repurpose the "Equalizer-Crown" bars as a horizontal progress indicator, where bars "light up" in the brand gradient as steps are completed.

### Inputs & Forms
- Outlined fields with a subtle 1px border. 
- On focus, the border transitions to Primary Red-Orange with a 2px "glow" shadow.
- Error states must include both the `error` red color and an icon for accessibility.

### Sticky Navigation
- A slim, high-utility bar that persists on mobile for the "Book Now" action, ensuring the primary conversion goal is always within thumb's reach.