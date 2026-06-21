---
name: Tohfa Seller Studio
colors:
  surface: '#fdf9f2'
  surface-dim: '#dddad3'
  surface-bright: '#fdf9f2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3ec'
  surface-container: '#f1ede6'
  surface-container-high: '#ebe8e1'
  surface-container-highest: '#e6e2db'
  on-surface: '#1c1c18'
  on-surface-variant: '#414942'
  inverse-surface: '#31302c'
  inverse-on-surface: '#f4f0e9'
  outline: '#717972'
  outline-variant: '#c1c9c0'
  surface-tint: '#3a684c'
  primary: '#255338'
  on-primary: '#ffffff'
  primary-container: '#3d6b4f'
  on-primary-container: '#b7e9c6'
  inverse-primary: '#a0d2b0'
  secondary: '#49663f'
  on-secondary: '#ffffff'
  secondary-container: '#c8e9b8'
  on-secondary-container: '#4d6a43'
  tertiary: '#573b81'
  on-tertiary: '#ffffff'
  tertiary-container: '#70539b'
  on-tertiary-container: '#e8d6ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bceecb'
  primary-fixed-dim: '#a0d2b0'
  on-primary-fixed: '#002110'
  on-primary-fixed-variant: '#214f36'
  secondary-fixed: '#caecbb'
  secondary-fixed-dim: '#afd0a0'
  on-secondary-fixed: '#062103'
  on-secondary-fixed-variant: '#324e29'
  tertiary-fixed: '#ecdcff'
  tertiary-fixed-dim: '#d6baff'
  on-tertiary-fixed: '#270550'
  on-tertiary-fixed-variant: '#54387e'
  background: '#fdf9f2'
  on-background: '#1c1c18'
  surface-variant: '#e6e2db'
typography:
  headline-xl:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  headline-md:
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
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
  label-mono:
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
  unit: 8px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 64px
  margin-tablet: 32px
  margin-mobile: 16px
---

## Brand & Style

This design system embodies an **Artisanal Minimalist** aesthetic, tailored specifically for a high-end seller ecosystem. The visual narrative balances the organic warmth of craftsmanship with the precision of a professional studio environment. It aims to evoke a sense of quiet confidence, heritage, and curated quality.

The interface prioritizes clarity and focus, utilizing generous whitespace to allow product photography and artisanal content to breathe. By blending traditional editorial cues with modern functionalism, the design system creates a sophisticated workspace that feels like a physical atelier transitioned into a digital medium. The target audience—independent creators and boutique merchants—should feel empowered by a tool that respects the artistry of their trade.

## Colors

The palette is rooted in a natural, grounded spectrum. 
- **Forest (#3D6B4F)** serves as the anchor, used for primary actions, heavy text, and brand signifiers to establish authority.
- **Parchment (#F7F3EC)** is the foundational canvas, replacing stark white to provide a softer, more tactile background that reduces eye strain during long studio sessions.
- **Sage (#8FAF82)** acts as a supportive secondary hue, ideal for success states, subtle highlights, and secondary UI elements.
- **Violet (#7B5EA7)** provides a sophisticated counterpoint, used sparingly for creative features, insights, or "pro" tier indicators.
- **Gold (#C8973A)** is reserved for moments of celebration, high-value accents, and badges of quality.

Use a "Ink on Paper" philosophy: backgrounds should feel like material surfaces, and text should feel like deeply pigmented ink.

## Typography

The typographic scale uses a deliberate contrast between three distinct voices:
1. **Playfair Display** (Serif): Used for large titles and section headers to convey the "Studio" heritage. It should always appear in Forest or dark neutrals.
2. **DM Sans** (Sans-Serif): The workhorse for all functional content, descriptions, and data entry. Its low-contrast, geometric forms ensure legibility across dense dashboard views.
3. **Space Mono** (Monospace): Employed for technical data, SKUs, timestamps, and small uppercase labels. It adds a "workshop" or "registry" feel, suggesting precision and inventory management.

Maintain a vertical rhythm by using the 4px baseline grid. Body text should prioritize generous line-height to maintain an open, sophisticated feel.

## Layout & Spacing

The layout philosophy follows a **Fixed-Fluid Hybrid** model. Content is centered within a 1440px max-width container for desktop to maintain optimal line lengths and focus. 

- **Studio Grid:** A 12-column grid is used for dashboards. For editorial-style pages (like Storefront Editors), use a shifted 8-column layout with a wide left margin to create an asymmetric, contemporary look.
- **Negative Space:** Use "Generous" spacing increments (32px, 48px, 64px) between major sections to prevent the interface from feeling cluttered, even when data-heavy.
- **Mobile:** On mobile, collapse to a single column with 16px side margins. Use horizontal scrolling "shelves" for secondary data sets (like recent orders) to keep the vertical scroll meaningful.

## Elevation & Depth

Hierarchy is established through **Soft Tonal Layering** rather than aggressive shadows.

1. **Base:** The Parchment surface is the lowest level.
2. **Cards:** Use a very subtle, diffused shadow (0px 4px 20px, 4% opacity of Forest) to lift primary content containers off the background.
3. **Interactive:** Elements like buttons or active inputs use a slightly more defined shadow on hover to simulate a physical "press-ready" state.
4. **Overlays:** Modals and menus use a backdrop blur (8px) with a 20% Parchment tint to maintain the organic feel of the app while focusing the user's attention.

Avoid hard black shadows; always tint shadows with a hint of the Forest or Sage hues to keep them integrated with the palette.

## Shapes

The shape language is **Soft and Structural**. 
- A base radius of **0.25rem (4px)** is applied to small components like input fields and tags to maintain a professional, slightly architectural edge.
- **0.5rem (8px)** is used for standard cards and containers, providing a modern but grounded feel.
- Avoid fully circular "pill" shapes for buttons; instead, use the `rounded-sm` (4px) setting to echo the look of traditional labels or high-end stationery.

## Components

- **Buttons:** Primary buttons use the Forest background with Parchment text. Secondary buttons are outlined in Sage with a subtle 1px border. The "Gold" color is used for specialized "Promote" or "Featured" actions.
- **Input Fields:** Use a 1px border of Sage on a white background (not Parchment) to provide a clear target for data entry. Labels should always be in **Space Mono (label-caps)** for a structured, technical look.
- **Chips & Tags:** Use low-saturation Sage or Violet backgrounds with dark text. These should be rectangular with 2px corner radii to mimic cloth tags.
- **Cards:** Cards should have a 1px Sage-tinted border or the soft shadow defined in the Elevation section. Headers within cards should use Playfair Display Small.
- **Lists:** Data tables should be minimal, using horizontal dividers only (1px Parchment-Dark). Avoid vertical lines. Use Space Mono for all numeric data (prices, stock counts).
- **Specialty Components:** 
    - *The "Craftsman's Badge":* A Gold-tinted decorative element used to highlight top-performing products.
    - *The "Studio Sidebar":* A dark-themed (Forest) navigation bar to provide high contrast against the Parchment work area.