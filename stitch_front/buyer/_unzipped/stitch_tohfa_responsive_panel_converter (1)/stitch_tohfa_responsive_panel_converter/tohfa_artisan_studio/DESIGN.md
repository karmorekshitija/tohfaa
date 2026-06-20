---
name: Tohfa Artisan Studio
colors:
  surface: '#f9faf5'
  surface-dim: '#d9dad6'
  surface-bright: '#f9faf5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f0'
  surface-container: '#edeeea'
  surface-container-high: '#e7e9e4'
  surface-container-highest: '#e2e3df'
  on-surface: '#1a1c1a'
  on-surface-variant: '#414942'
  inverse-surface: '#2e312e'
  inverse-on-surface: '#f0f1ed'
  outline: '#717972'
  outline-variant: '#c1c9c0'
  surface-tint: '#3a684c'
  primary: '#255338'
  on-primary: '#ffffff'
  primary-container: '#3d6b4f'
  on-primary-container: '#b7e9c6'
  inverse-primary: '#a0d2b0'
  secondary: '#605e59'
  on-secondary: '#ffffff'
  secondary-container: '#e6e2db'
  on-secondary-container: '#66645f'
  tertiary: '#35512c'
  on-tertiary: '#ffffff'
  tertiary-container: '#4c6942'
  on-tertiary-container: '#c5e7b6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bceecb'
  primary-fixed-dim: '#a0d2b0'
  on-primary-fixed: '#002110'
  on-primary-fixed-variant: '#214f36'
  secondary-fixed: '#e6e2db'
  secondary-fixed-dim: '#c9c6c0'
  on-secondary-fixed: '#1c1c18'
  on-secondary-fixed-variant: '#484742'
  tertiary-fixed: '#caecbb'
  tertiary-fixed-dim: '#afd0a0'
  on-tertiary-fixed: '#062103'
  on-tertiary-fixed-variant: '#324e29'
  background: '#f9faf5'
  on-background: '#1a1c1a'
  surface-variant: '#e2e3df'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.1em
  mono-data:
    fontFamily: Space Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  section-gap: 80px
---

## Brand & Style
The design system embodies a scholarly, artisanal, and elegant aesthetic, tailored for a high-end studio environment that values craftsmanship and history. The personality is curated and intentional, evoking the feeling of a well-preserved archive or a modern atelier.

The design style is a sophisticated blend of **Minimalism** and **Tactile** influences. It utilizes generous whitespace and a restricted, high-quality palette to create a sense of calm authority. Elements feel grounded and physical, prioritizing legible, beautiful typography and subtle, paper-like textures to establish an emotional connection with users who appreciate the "slow-made" movement and academic precision.

## Colors
The palette is rooted in the organic and the archival. 

- **Primary (Forest):** Used for primary actions, navigation headers, and deep structural elements. It provides the "scholarly" weight.
- **Secondary (Parchment):** The foundational surface color. It replaces pure white to reduce eye strain and provide a tactile, paper-like quality.
- **Tertiary (Sage):** Used for subtle backgrounds, secondary buttons, and decorative separators.
- **Accents (Violet & Gold):** Violet is reserved for specialty interactions or sophisticated highlights. Gold is used for "Artisan" certification stamps, premium tiers, or high-value call-to-outs.

The system operates exclusively in a light-themed mode to maintain the "ink-on-paper" feel.

## Typography
The typographic hierarchy is the core of this design system's identity. 

**Playfair Display** provides the editorial and authoritative voice for all headlines and display elements. It should be used with tight letter-spacing in larger sizes.

**DM Sans** offers a clean, contemporary contrast for body copy, ensuring high readability across long-form artisanal descriptions and scholarly articles.

**Space Mono** acts as the "archival" accent. It is used for labels, metadata, serial numbers, and technical details, evoking the feeling of a museum catalog or a typewriter-set index card. Always use uppercase for `label-caps` to emphasize its utilitarian nature.

## Layout & Spacing
The layout follows a **fixed-grid** philosophy on desktop to preserve intentional whitespace, centering content within a 1280px container. On mobile, the system shifts to a fluid layout with generous margins.

Spacing follows a 4px base unit, but emphasizes large "breathing rooms" between sections (80px+) to maintain an upscale, gallery-like feel. Components should be grouped tightly using `stack-sm` or `stack-md`, but separated from other groups by `stack-lg`. Use vertical rhythm to guide the eye through content as if reading a printed manuscript.

## Elevation & Depth
In alignment with the scholarly aesthetic, depth is achieved through **Tonal Layers** and **Low-Contrast Outlines** rather than heavy shadows.

- **Level 0 (Base):** Parchment (#F7F3EC).
- **Level 1 (Cards/Containers):** A slightly lighter tint of Parchment or white, defined by a 1px solid border in Sage (#8FAF82) at 30% opacity.
- **Level 2 (Modals/Popovers):** Defined by a very soft, ambient shadow (Color: Forest, Opacity: 8%, Blur: 20px) to simulate a piece of cardstock sitting atop the page.

Avoid blurs or glassmorphism. Surfaces should feel opaque and substantial, like high-quality paper.

## Shapes
This design system utilizes **Soft** geometry. All primary UI elements (buttons, inputs, cards) use a 0.25rem (4px) corner radius. This subtle rounding takes the "edge" off the design, making it feel artisanal rather than industrial, while still maintaining the structure required for a scholarly look. 

Large image containers may use `rounded-lg` (8px) for a softer presentation of studio photography.

## Components
- **Buttons:** Primary buttons are solid Forest (#3D6B4F) with white DM Sans text. Secondary buttons are outlined in Forest with a Parchment fill. Label text should be Medium weight.
- **Inputs:** Use a 1px border in Sage (#8FAF82). On focus, the border transitions to Forest. Labels above inputs should always use `label-caps` in Space Mono.
- **Cards:** Cards should have no shadow by default; they are defined by a 1px Sage border. The header of the card should use Playfair Display.
- **Chips/Tags:** Used for categorization (e.g., "Handmade," "Ceramics"). These use the `mono-data` typography style with a Sage background at 20% opacity.
- **Lists:** Archival-style lists should use Space Mono for numerals or bullets to emphasize the curated nature of the content.
- **Specialty Component - "The Seal":** A decorative circular element using the Gold accent, used to indicate "Verified Artisan" or "Limited Edition" items.