---
name: Artisanal Heritage
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
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
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
  label-sm:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.05em
  button-text:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

This design system establishes a visual language for a heritage marketplace that feels both scholarly and artisanal. The aesthetic draws heavily from high-end editorial journals and museum archives, balancing academic precision with the warmth of handcrafted goods.

The brand personality is authoritative yet inviting—a "curated luxury" approach that treats products as historical artifacts rather than mere commodities. The emotional response should be one of discovery, trust, and timelessness. To achieve this, the system utilizes a **Minimalist-Editorial** style characterized by expansive whitespace, a sophisticated serif-led hierarchy, and a tactile color palette that avoids pure blacks or clinical whites.

## Colors

The color strategy mimics the materials of a traditional workshop and parchment. 

- **Primary (Forest Green):** Used for primary actions, brand moments, and high-contrast accents against the cream surfaces.
- **Secondary (Sage):** Softens the palette; used for success states, secondary categories, or tonal backgrounds.
- **Tertiary (Amber):** Reserved for highlights, craftsmanship badges, and calls to attention that require a "warm glow."
- **Neutrals:** The surface color (`#F7F3EC`) provides a warm, paper-like foundation. Text is kept in a deep charcoal (`#1F1B15`) rather than black to maintain a softer, organic feel.

## Typography

The typographic system uses a tri-font pairing to define the "scholarly journal" aesthetic:

1.  **Playfair Display:** Used for headlines and brand storytelling. It provides the elegance of a classic serif. Use "Italic" styles sparingly for emphasis or captions to enhance the editorial feel.
2.  **DM Sans:** The workhorse for all body copy and interface elements. Its low-contrast, geometric shapes ensure high legibility and a modern touch.
3.  **Space Mono:** Reserved for metadata, SKU numbers, labels, and technical data. This adds a "catalogued" or "archival" feel to the data-heavy portions of the UI.

## Layout & Spacing

The design system utilizes a **Fixed Grid** approach for desktop to maintain the "page-like" feel of a physical journal, while transitioning to a fluid 4-column layout for mobile devices.

- **Grid:** 12-column grid on desktop with a maximum width of 1280px.
- **Rhythm:** An 8px baseline grid is used for vertical rhythm, though 4px increments are allowed for tight component-level spacing.
- **White Space:** Generous padding (minimum 64px between major sections) is required to prevent the UI from feeling "crowded," maintaining the premium, curated atmosphere.

## Elevation & Depth

To maintain a tactile, paper-like quality, this design system avoids heavy drop shadows and instead uses **Tonal Layers** and **Low-Contrast Outlines**.

- **Surfaces:** Depth is created by placing `#FFFFFF` (Page) cards on top of `#F7F3EC` (Surface) backgrounds.
- **Borders:** Use 1px solid borders in `#C3C8C1` for structural definition.
- **Shadows:** When necessary for high-level modals or floating elements, use a very soft, multi-layered "ambient" shadow: `0 10px 30px -10px rgba(31, 27, 21, 0.08)`. Avoid harsh black shadows.

## Shapes

The shape language is deliberately soft to contrast with the sharp serifs of the typography. 

- **Large Components (Cards, Modals):** Use a 18px corner radius to emphasize the "handcrafted" and approachable nature of the brand.
- **Smaller Components (Tiles, Buttons, Input Fields):** Use a 14px corner radius.
- **Icons:** Use medium-stroke icons (2px) with rounded caps to match the shape language.

## Components

### Buttons
- **Primary:** Solid `#3D6B4F` with white text. 14px rounded corners. No shadow.
- **Secondary:** Ghost style with `#3D6B4F` border and text. 
- **Tertiary:** Text-only with an underline, using `#C8973A` for specific craft-related calls to action.

### Input Fields
- Background: `#FFFFFF`. Border: 1px solid `#C3C8C1`.
- Labels: Use **Space Mono** in `#74786F`, positioned above the field.
- Focus State: Border color shifts to `#3D6B4F` with a 2px outer ring in `#8FAF82` at 20% opacity.

### Cards & Tiles
- Product tiles should use the 14px radius. 
- Ensure a 1:1 or 4:5 aspect ratio for imagery to maintain the editorial look. 
- Prices should always be set in **DM Sans** (Medium weight).

### Chips & Badges
- Used for "Limited Edition" or "Origin" tags. 
- Use `#F7F3EC` background with `#74786F` text in **Space Mono**. 
- Border-radius should be fully pill-shaped for these smaller elements.

### Lists
- Separate list items with a hairline border (`#C3C8C1`).
- Use generous vertical padding (16px - 20px) to allow the content to breathe.