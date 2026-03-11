# Fashion Ecommerce Design System

A minimal, monochrome design system with subtle olive accents for premium streetwear ecommerce.

## Design Philosophy

- **Monochrome Aesthetic**: Pure black, white, and grayscale palette
- **White Background**: Clean, spacious layout with generous whitespace
- **Black Typography**: Bold, uppercase headings for brand impact
- **Olive Accent**: Hsl(75, 40%, 45%) for interactive elements and CTAs
- **Minimal Design**: Reduces cognitive load and emphasizes products
- **Large Whitespace**: Creates breathing room and luxury feel

## Color Palette

### Light Mode (Default)
- **Background**: #FFFFFF (0 0% 100%)
- **Foreground**: #000000 (0 0% 0%)
- **Secondary**: #F2F2F2 (0 0% 95%)
- **Muted**: #E6E6E6 (0 0% 90%)
- **Accent**: #6B8E23 (75 40% 45%) - Olive
- **Border**: #E0E0E0 (0 0% 88%)

### Dark Mode
- **Background**: #0D0D0D (0 0% 5%)
- **Foreground**: #FAFAFA (0 0% 98%)
- **Secondary**: #262626 (0 0% 15%)
- **Muted**: #333333 (0 0% 20%)
- **Accent**: #7BA52D (75 40% 55%) - Lighter Olive
- **Border**: #262626 (0 0% 15%)

## Typography

### Font Families
- **Body**: Inter (sans-serif) - Minimal, clean readability
- **Display**: Space Mono (monospace) - Bold, distinctive headings

### Font Scale
```
h1: 3rem (48px) - Bold, Uppercase
h2: 2.25rem (36px) - Bold, Uppercase
h3: 1.875rem (30px) - Bold, Uppercase
h4: 1.5rem (24px) - Bold, Uppercase
h5: 1.25rem (20px) - Bold, Uppercase
h6: 1.125rem (18px) - Bold, Uppercase
body: 1rem (16px) - Regular weight
small: 0.875rem (14px) - Regular weight
```

### Text Styling
- All headings: Bold, Uppercase, Tight letter-spacing
- Body text: 150% line-height for readability
- Headings: 120% line-height for visual hierarchy

## Spacing System (8px Base)

- **xs**: 0.25rem (2px)
- **sm**: 0.5rem (4px)
- **md**: 1rem (8px)
- **lg**: 1.5rem (12px)
- **xl**: 2rem (16px)
- **2xl**: 3rem (24px)
- **3xl**: 4rem (32px)
- **4xl**: 6rem (48px)

## Component Library

### Button
```tsx
<Button variant="default">Default Button</Button>
<Button variant="outline">Outline Button</Button>
<Button variant="ghost">Ghost Button</Button>
<Button variant="accent">Accent Button</Button>
```

**Variants:**
- `default`: Black background, white text
- `outline`: Border only, black text
- `ghost`: Transparent, black text on hover
- `accent`: Olive background, white text (CTAs)

**Sizes:**
- `sm`: Small (9px height)
- `default`: Medium (10px height)
- `lg`: Large (11px height)
- `icon`: Square icon button

### Input
- 2px border, monochrome
- Focus ring in olive accent
- Placeholder text in muted color

### Navigation Bar
- Sticky top position with z-50
- 2px bottom border
- Logo and navigation links in bold uppercase
- Mobile drawer menu
- Cart icon with quantity badge
- Search functionality

### Product Card
- Aspect ratio 1:1 square image
- 2px border frame
- Category badge top-left
- Price and name below image
- Favorite button (heart icon) top-right
- Hover overlay with "Add to Cart" button
- Image zoom on hover effect

### Product Grid
- Responsive columns: 1, 2, 3, or 4
- Grid gap: 1.5rem (lg)
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3-4 columns

### Cart Drawer
- Slides in from right
- Overlay backdrop with blur effect
- Header with title and close button
- Scrollable items list
- Quantity controls (-/+)
- Item removal
- Cart total and checkout button
- Empty state message

### Modal
- Centered dialog
- 2px border frame
- Header with title and close button
- Sizes: sm, md, lg, full
- Backdrop blur effect
- Fade-in animation

### Search Bar
- Text input with border
- Clear button (X icon) on input
- Dropdown suggestions
- Keyboard navigation support

### Icons
- **CartIcon**: Shopping bag with quantity badge
- **FavoriteIcon**: Heart icon with fill state
- SVG-based from Lucide React
- 24px default size
- Hover opacity effect

## Animations

- **fade-in**: 0.3s ease-out opacity transition
- **accordion-down**: Smooth height expansion
- **accordion-up**: Smooth height collapse
- Hover effects: opacity and background transitions
- Smooth scrolling enabled globally

## Responsive Design

### Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

### Strategy
- Mobile-first approach
- Hidden elements: Search bar (shown on sm+)
- Navigation drawer: Visible on mobile, hidden on md+
- Grid columns: Adapt based on viewport

## Accessibility

- Semantic HTML elements
- ARIA labels on interactive elements
- Focus ring styling in olive accent
- Screen reader only class (.sr-only)
- Proper heading hierarchy
- Color contrast meets WCAG AA standards

## Best Practices

1. **Use Whitespace**: Don't crowd the layout
2. **Bold Typography**: Make headings command attention
3. **Accent Sparingly**: Olive accent for important CTAs only
4. **Consistent Borders**: 2px borders on containers
5. **Minimal Effects**: Subtle hover/transition effects
6. **Product Focus**: Large images, minimal distractions
7. **Clear Hierarchy**: Size and weight differences

## Component Usage Examples

### Creating a Product Showcase
```tsx
<ProductGrid
  products={products}
  columns={4}
  onAddToCart={handleAddToCart}
  onFavorite={handleFavorite}
  favoritedIds={favoritedIds}
/>
```

### Using the Cart System
```tsx
<CartDrawer
  isOpen={isCartOpen}
  onClose={handleCartClose}
  items={cartItems}
  onUpdateQuantity={handleUpdateQuantity}
  onRemoveItem={handleRemoveItem}
/>
```

### Navigation Setup
```tsx
<Navbar
  cartCount={cartItems.length}
  onCartClick={handleCartOpen}
  onSearchClick={handleSearchOpen}
/>
```

## Future Enhancements

- Product detail page with image gallery
- Filtering and sorting components
- Checkout flow pages
- User account dashboard
- Wishlist functionality
- Order history page
- Size guide modal
- Product reviews section
- Related products carousel
