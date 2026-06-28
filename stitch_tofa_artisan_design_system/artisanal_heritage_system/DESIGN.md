---
name: Artisanal Heritage System
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#414942'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0f0'
  outline: '#717971'
  outline-variant: '#c1c9c0'
  surface-tint: '#3b684a'
  primary: '#144227'
  on-primary: '#ffffff'
  primary-container: '#2d5a3d'
  on-primary-container: '#9ed0ab'
  inverse-primary: '#a1d2ad'
  secondary: '#755b00'
  on-secondary: '#ffffff'
  secondary-container: '#fed977'
  on-secondary-container: '#785d00'
  tertiary: '#3c3a35'
  on-tertiary: '#ffffff'
  tertiary-container: '#53514b'
  on-tertiary-container: '#c8c4bc'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bceec8'
  primary-fixed-dim: '#a1d2ad'
  on-primary-fixed: '#00210f'
  on-primary-fixed-variant: '#224f33'
  secondary-fixed: '#ffe08f'
  secondary-fixed-dim: '#e6c364'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#584400'
  tertiary-fixed: '#e7e2da'
  tertiary-fixed-dim: '#cac6be'
  on-tertiary-fixed: '#1d1c17'
  on-tertiary-fixed-variant: '#494741'
  background: '#fcf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.01em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
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
  title-lg:
    fontFamily: DM Sans
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
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
    fontFamily: DM Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: DM Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style
The design system is built to evoke the warmth of a curated gift and the timeless quality of Indian craftsmanship. It balances traditional elegance with modern e-commerce efficiency, targeting a discerning audience that values authenticity and the "human touch" behind products. 

The aesthetic is a blend of **Minimalism** and **Tactile** design. It utilizes generous whitespace to let high-quality product photography breathe, while employing subtle gold accents and rich forest tones to establish a premium, trustworthy atmosphere. The emotional response should be one of "discovery and delight"—as if the user is walking through a high-end boutique gallery.

## Colors
The palette is rooted in nature and heritage. 
- **Primary (Forest Green):** Used for brand-heavy moments, primary actions, and success states. It represents growth and stability.
- **Secondary (Gold):** Used sparingly as an accent for highlights, premium badges, and specific decorative borders to evoke a sense of value and craftsmanship.
- **Background (Cream):** Replaces pure white for the main canvas to reduce eye strain and provide a warmer, paper-like feel.
- **On-Surface (Charcoal):** Ensures high legibility for all body text and icons without the harshness of pure black.

## Typography
This design system uses a classic serif-on-sans pairing. **Playfair Display** provides the editorial authority needed for storytelling and product titles. **DM Sans** is used for all functional text, ensuring clarity in descriptions and the checkout flow. Headlines should favor a slightly tighter letter-spacing to maintain a sophisticated look, while labels and small captions use increased tracking for better legibility on mobile devices.

## Layout & Spacing
The layout follows a **fluid grid** logic with a strict 8px baseline rhythm. 
- **Desktop:** A 12-column grid with 24px gutters and 64px outside margins. Large "hero" sections may use a 1-column layout for immersive storytelling.
- **Tablet:** An 8-column grid with 16px gutters and 32px margins.
- **Mobile:** A 4-column grid with 16px gutters and 20px margins. 

Horizontal spacing between related items (like price and rating) should use 8px or 12px, while vertical sections should be separated by 64px to 80px to maintain the "generous whitespace" brand pillar.

## Elevation & Depth
Depth is communicated through **ambient shadows** and **tonal layering**. Surfaces (white) sit on the background (cream) with a very soft, diffused shadow (Blur: 16px, Opacity: 4%, Color: #2D5A3D - tinted green). 

Avoid heavy dark shadows. High-elevation components like modals or dropdowns should use a slightly more pronounced shadow but remain soft. For interactive cards, a subtle lift effect (increasing shadow spread) is preferred over color changes.

## Shapes
The shape language is consistently "Rounded." Standard UI elements like buttons and input fields utilize an 8px radius (0.5rem). Larger containers like product cards and image containers use 16px (1rem). This softness counteracts the sharp precision of the serif typography, making the interface feel more approachable and handmade.

## Components
- **Buttons:** Primary buttons are solid Forest Green with White text. Secondary buttons are Gold outlines or Cream surfaces. Buttons use a minimum height of 48px for touch accessibility.
- **Cards:** This system’s signature component. Product cards feature a White surface, 16px corner radius, and a **4px bottom border in Gold (#C9A84C)** to create a premium "pedestal" effect for the item.
- **Input Fields:** Outlined style using the muted #7A7A7A color. On focus, the border shifts to the Forest Green primary color with a 1px thickness.
- **Chips/Badges:** Used for categories or "Bestseller" tags. Use light tints of the Forest Green or Gold with high-contrast text. Badges should be fully pill-shaped (rounded-xl).
- **Lists:** Clean, horizontal dividers using a 1px solid line in a lightened version of the Cream background to ensure separation without visual clutter.
- **Specialty Components:** Include an "Artisan Story" card—a horizontal layout combining a circular artisan headshot with Playfair Display typography to emphasize the marketplace's human element.