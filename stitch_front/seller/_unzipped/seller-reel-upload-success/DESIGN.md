---
name: Artisanal Seller Portal
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
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-mono:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.05em
  button:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max-width: 1440px
  gutter: 24px
  margin-desktop: 48px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is crafted for a premium marketplace ecosystem that bridges the gap between traditional craftsmanship and modern e-commerce management. The aesthetic is **Refined Minimalist with Tactile influence**, emphasizing high-quality materials and organizational clarity. 

The target audience consists of independent artisans and boutique curators who value both aesthetic beauty and functional precision. The UI must evoke a sense of calm authority, reliability, and "digital stationery"—where every interaction feels as intentional as a physical craft. We lean into generous whitespace, elegant serif headers, and subtle geometric accents to create a workspace that inspires creativity while maintaining professional rigor.

## Colors

The palette is rooted in organic, earthy tones balanced by sophisticated jewel-toned accents.

- **Primary (Forest):** Used for primary actions, branding, and high-level navigation. It represents stability and growth.
- **Secondary (Parchment):** The foundational canvas. Use this as the global background color to reduce eye strain and provide a tactile, paper-like quality.
- **Tertiary (Sage):** Used for success states, secondary buttons, and decorative elements that require a softer touch than Forest.
- **Violet & Gold:** Strategic accents for specialized highlights. Use Violet for insight/analytics data and Gold for premium features, achievements, or featured status alerts.
- **Neutrals:** Derived from desaturated Forest tones to ensure harmony across the interface.

## Typography

This design system uses a tripartite typographic scale to balance elegance with technical utility.

1.  **Playfair Display** handles all major headlines. Its high-contrast serifs provide a literary, upscale feel.
2.  **DM Sans** is the workhorse for all body copy, inputs, and standard UI text. It provides high legibility and a contemporary, clean look.
3.  **Space Mono** is reserved for metadata, SKU numbers, timestamps, and analytical data. This adds a "studio/inventory" vibe, reinforcing the feeling of a professional workspace.

## Layout & Spacing

The layout philosophy follows a **Modular Grid** system. We prioritize generous internal padding to maintain the "premium" feel of the brand.

- **Grid:** Use a 12-column grid for desktop with 24px gutters. For the Seller Studio, sidebar navigation is fixed at 280px, with the content area remaining fluid within a max-width container.
- **Rhythm:** All spacing is based on a 4px baseline. Use 16px (4 units) for standard component spacing and 32px (8 units) for section spacing.
- **Responsive:** On mobile, margins collapse to 16px. Cards and complex tables should transform into stacked list views or horizontally scrollable containers to preserve data integrity.

## Elevation & Depth

To maintain the "Parchment" aesthetic, we avoid heavy drop shadows. Instead, we use **Tonal Layering and Fine Outlines**.

- **Level 0 (Base):** Parchment (#F7F3EC).
- **Level 1 (Cards/Containers):** Pure white (#FFFFFF) with a 1px solid border in a very light Sage tint (10% opacity). This creates a "paper on paper" look.
- **Depth:** Use a single, very soft ambient shadow (0px 4px 20px rgba(61, 107, 79, 0.05)) only for floating elements like dropdowns or active modals.
- **Interaction:** Hover states should not lift the element but rather deepen the border color to Forest or change the background slightly to a Sage-tinted Parchment.

## Shapes

The shape language is **Soft and Structural**. We use a conservative corner radius (4px to 12px) to maintain a professional, organized look. 

- **Components (Buttons, Inputs):** 4px (Soft) to keep them feeling crisp and precise.
- **Containers (Cards, Modals):** 8px to 12px (Rounded-LG/XL) to provide a gentle frame for content.
- **Imagery:** Product photography should always use sharp or very slightly rounded (2px) corners to emphasize the craft within the frame.

## Components

- **Buttons:** Primary buttons are solid Forest with White text. Secondary buttons use a Forest outline with Forest text. Tertiary buttons use Sage text with no background. All buttons use DM Sans Bold.
- **Input Fields:** Fields use a white background with a 1px border. On focus, the border shifts to Forest and a subtle Sage "glow" (inner shadow) is applied. Labels use DM Sans Medium in Neutral Dark.
- **Chips & Tags:** Small, rectangular with 2px radius. Use Space Mono for the text. Backgrounds should be light washes of Violet (for status) or Sage (for categories).
- **Cards:** Cards are the primary layout unit. They must have a subtle 1px border. Header areas within cards should use Playfair Display Small.
- **Data Tables:** Highly organized. Header rows use Space Mono in Neutral Medium. Row hover states should use a Parchment-to-Sage subtle gradient.
- **Status Indicators:** Use small, solid circles. Gold for "Featured/Pending," Forest for "Active," and Violet for "Processing."