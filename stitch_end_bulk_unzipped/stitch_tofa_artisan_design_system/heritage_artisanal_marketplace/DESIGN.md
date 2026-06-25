---
name: Heritage Artisanal Marketplace
colors:
  surface: '#fff8f3'
  surface-dim: '#e2d9cf'
  surface-bright: '#fff8f3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fcf2e8'
  surface-container: '#f6ece2'
  surface-container-high: '#f0e7dd'
  surface-container-highest: '#eae1d7'
  on-surface: '#1f1b15'
  on-surface-variant: '#414942'
  inverse-surface: '#343029'
  inverse-on-surface: '#f9efe5'
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
  tertiary: '#624400'
  on-tertiary: '#ffffff'
  tertiary-container: '#815a00'
  on-tertiary-container: '#ffd796'
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
  tertiary-fixed: '#ffdeaa'
  tertiary-fixed-dim: '#f3be5d'
  on-tertiary-fixed: '#271900'
  on-tertiary-fixed-variant: '#5f4100'
  background: '#fff8f3'
  on-background: '#1f1b15'
  surface-variant: '#eae1d7'
typography:
  display-lg:
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
  label-md:
    fontFamily: Space Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style

This design system captures the essence of premium Indian craftsmanship, blending traditional artistry with a modern, high-end commerce experience. The brand personality is "The Discerning Curator"—sophisticated, warm, and deeply respectful of heritage.

The design style is **Warm Minimalist / Tactile Modern**. It avoids the sterility of standard tech platforms by using a textured color palette and organic structural elements. Visual interest is driven by high-quality product photography, generous whitespace, and "Tactile Markers"—specifically subtle dot-grid patterns reminiscent of block printing and ghosted botanical iconography that act as decorative watermarks. The emotional response should be one of trust, calm, and the tactile satisfaction of a handmade object.

## Colors

The palette is rooted in earth tones and natural pigments.
- **Primary (Forest):** Used for key actions, brand presence, and primary navigation.
- **Sage:** Used for success states, secondary accents, and soft background fills.
- **Amber:** Reserved for premium highlights, artisan badges, and price emphasis.
- **Surface & Background:** The use of `#F7F3EC` for surfaces creates a "paper-like" feel, distinguishing functional areas from the pure `#FFFFFF` page background.
- **Functional Grays:** Text and borders use desaturated, warm-tinted neutrals to maintain a soft, organic contrast rather than a harsh digital black.

## Typography

This design system uses a tri-font hierarchy to balance elegance, readability, and technical precision.
- **Playfair Display:** Used for all editorial headings and product names. It communicates luxury and the "hand-of-the-maker."
- **DM Sans:** The workhorse for body copy, descriptions, and UI controls. Its low-contrast, geometric shapes provide a modern counterpoint to the serif headings.
- **Space Mono:** Utilized for data-rich elements such as dimensions, SKU numbers, prices, and small labels. Its technical aesthetic reinforces the "authentic/cataloged" nature of the marketplace.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a maximum container width to ensure readability on large displays. 
- **Desktop:** 12-column grid, 24px gutters, 80px side margins.
- **Tablet:** 8-column grid, 24px gutters, 40px side margins.
- **Mobile:** 4-column grid, 16px gutters, 16px side margins.

Spacing follows an 8px base unit. Larger "breathable" gaps (48px+) should be used between major sections to maintain a premium, non-cluttered feel. Content should be grouped within `Surface` (#F7F3EC) cards or sections to create a clear visual hierarchy against the `Background` (#FFFFFF).

## Elevation & Depth

Elevation is achieved through **Tonal Layering** and **Soft Ambient Shadows** rather than aggressive highlights.
- **Level 0 (Floor):** Pure `#FFFFFF` background.
- **Level 1 (Surface):** `#F7F3EC` surfaces with no shadow, used for subtle grouping.
- **Level 2 (Interactive):** White cards with a very soft, diffused shadow (`0 4px 20px rgba(31, 27, 21, 0.06)`).
- **Depth Detail:** Borders are used sparingly. When used, they should be 1px solid `#C3C8C1`. To suggest a handcrafted feel, interactive elements can use a "pressed" state that shifts the background to Sage or Amber without changing the elevation.

## Shapes

The shape language is sophisticated and approachable.
- **Cards & Primary Containers:** Use `rounded-xl` (12px) to soften the layout.
- **Buttons & Inputs:** Use `rounded-lg` (8px) for a slightly more structured look.
- **Decorative Elements:** Artisan dot patterns should be arranged in strict grids but appear with low opacity (10-15%) to act as a texture rather than a shape.
- **Iconography:** Use "Ghost Leaf" icons (custom-drawn, thin-stroke botanical line art) as decorative watermarks in the corners of sections or as bullet points for premium product features.

## Components

- **Buttons:** Primary buttons are solid `Forest` (#3D6B4F) with white `DM Sans` text. Secondary buttons use a `Border` (#C3C8C1) with Forest text. All buttons have an 8px radius.
- **Cards:** Product cards use the `rounded-xl` (12px) radius. They sit on the `Surface` color with a 1px border or a soft Level 2 shadow. Pricing on cards must be set in `Space Mono`.
- **Chips/Tags:** Use `Sage` (#8FAF82) for "In Stock" or category tags, and `Amber` (#C8973A) for "Limited Edition" or "Handmade." Text in chips should be `Space Mono` (label-sm).
- **Input Fields:** Soft `Surface` background with a bottom-only border or a light all-around border in `#C3C8C1`. Focus state uses a 1px `Forest` border.
- **Lists:** Clean typography-led lists with `Ghost Leaf` icons as bullets for high-tier artisanal details.
- **Artisan Badge:** A special component—a circular element with a rotating "Certified Handcrafted" text in `Space Mono` around a central dot pattern or leaf icon.