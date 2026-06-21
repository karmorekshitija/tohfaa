---
name: Artisan Studio Aesthetic
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
  tertiary: '#6e3a40'
  on-tertiary: '#ffffff'
  tertiary-container: '#8a5157'
  on-tertiary-container: '#ffd2d5'
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
  tertiary-fixed: '#ffdadc'
  tertiary-fixed-dim: '#fcb4ba'
  on-tertiary-fixed: '#360d14'
  on-tertiary-fixed-variant: '#6b373d'
  background: '#fdf9f2'
  on-background: '#1c1c18'
  surface-variant: '#e6e2db'
  violet-accent: '#7B5EA7'
  gold-leaf: '#C8973A'
  parchment-base: '#F7F3EC'
  forest-deep: '#3D6B4F'
  sage-muted: '#8FAF82'
typography:
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: DM Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: DM Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Space Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  max-width: 1440px
---

## Brand & Style

This design system is crafted for an artisan-focused digital environment, balancing the raw, organic nature of handmade goods with the professional rigor of a creative studio. The brand personality is rooted in three pillars: **Heritage**, **Precision**, and **Tactility**. It targets sophisticated creators who value quality over quantity and demand a workspace that feels as intentional as the products they create.

The design style is a sophisticated blend of **Minimalism** and **Tactile** design. By utilizing high-quality serif typography against a "parchment" canvas, the UI evokes the feeling of a clean gallery or a well-organized atelier. Elements are grounded by realistic, soft shadows and subtle textures that simulate physical paper and high-end materials, ensuring the digital interface never feels cold or sterile.

## Colors

The palette is inspired by natural materials and traditional craft environments. The primary color, **Forest**, provides a stable, professional anchor for navigation and primary actions. **Sage** acts as a secondary bridge, used for success states or subtle background shifts that feel organic rather than synthetic.

The foundation of the entire system is **Parchment**, which replaces pure white to reduce eye strain and provide a tactile, paper-like surface. **Violet** is used sparingly as a creative accent for highlights or special "maker" milestones, while **Gold** is reserved for premium features, high-value status indicators, and delicate decorative elements. All colors are calibrated to maintain high legibility against the Parchment base.

## Typography

The typographic scale creates a tension between the classic and the technical. **Playfair Display** is utilized for all headings to project authority and elegance, drawing on the tradition of editorial design. **DM Sans** provides a clean, highly legible experience for body copy and long-form data, ensuring the "studio" aspect of the product remains functional and modern.

**Space Mono** serves as the system’s "accidental" or "technical" voice. It is used for labels, metadata, and micro-copy, mimicking the look of typewriter-set tags or inventory labels found in a real-world studio. This contrast ensures that functional information is clearly distinguished from editorial content.

## Layout & Spacing

The layout philosophy follows a **fixed-fluid hybrid grid**. Content is contained within a 1440px maximum width on desktop to maintain readability, while utilizing a fluid 12-column grid within that container. Spacing is based on a strict 8px rhythmic scale to ensure mathematical harmony across all components.

On mobile devices, margins shrink to 16px to maximize screen real estate, while the 12-column grid collapses into a single-column stack. Larger "Studio" views (like dashboards) utilize a sidebar-main layout where the sidebar remains fixed at 280px and the main content area adjusts fluidly. Generous whitespace is a requirement, not a suggestion, to maintain the minimalist, gallery-like aesthetic.

## Elevation & Depth

Hierarchy in this design system is established through **Tonal Layers** and **Ambient Shadows**. Instead of harsh black shadows, elevations are created using soft, diffused blurs tinted with a hint of the Forest or Sage colors (e.g., `#3D6B4F` at 8% opacity). This creates a "weighted" feel that mimics objects resting on thick paper.

Surface tiers are defined by subtle shifts in the Parchment base:
1. **Level 0 (Base):** Standard Parchment background.
2. **Level 1 (Cards):** Slightly lifted with a 4px blur shadow.
3. **Level 2 (Modals/Dropdowns):** Elevated with a 12px blur shadow and a 1px solid border in a faint Forest tint to define edges clearly.
4. **Level 3 (Primary Actions):** Uses "inner-glow" techniques to simulate a slightly debossed or embossed tactile effect for buttons.

## Shapes

The shape language is consistently **Rounded**. A 0.5rem (8px) corner radius is the standard for cards and input fields, striking a balance between the organic softness of artisan products and the structural integrity of a professional tool. 

Larger containers like modals use a `rounded-xl` (1.5rem) radius to feel more inviting, while primary buttons and interactive chips often lean towards a full pill-shape to distinguish them as highly interactive touchpoints. Border widths for ghost buttons or outlined cards should never exceed 1px to maintain the delicate, clean aesthetic.

## Components

### Buttons
Primary buttons use the Forest background with Parchment text. They feature a subtle "pressed" state that utilizes a slight inner shadow to mimic a physical button press. Secondary buttons use the Sage color or a 1px Forest outline.

### Input Fields
Inputs are styled as "underlined" or "soft-boxed." When focused, the bottom border transitions to Gold, and the label (in Space Mono) shifts upward. This reinforces the "Studio" metaphor of filling out a logbook or inventory sheet.

### Cards
Cards are the primary container for product listings and analytics. They should have a 1px border in a very light Sage and no background fill (transparent to the Parchment base) unless they are being hovered, at which point they gain a Level 1 shadow and a solid Parchment fill.

### Chips & Tags
Used for inventory status (e.g., "In Stock," "Made to Order"). These utilize the Space Mono font and are styled with a low-saturation background of the status color (Forest for success, Gold for warning) to keep the UI quiet.

### Checkboxes & Radios
These are custom-styled to look like hand-drawn marks. Checkboxes use a solid Forest fill with a Parchment "check" icon when active, maintaining the high-contrast artisan look.