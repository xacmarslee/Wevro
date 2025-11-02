# Wevro Design Guidelines

## Design Approach

**Selected Approach:** Design System with Educational Focus

Drawing inspiration from Linear's clean typography and spatial hierarchy, Notion's organizational clarity, and Quizlet's focused learning interfaces. This creates a productivity-focused educational tool that balances visual sophistication with functional simplicity.

**Core Principles:**
1. **Clarity First:** Every interface element serves a clear purpose without visual noise
2. **Spatial Intelligence:** Use generous spacing to create breathing room and reduce cognitive load
3. **Hierarchy Through Scale:** Establish importance through size and weight, not decoration
4. **Bilingual Excellence:** Traditional Chinese and English coexist harmoniously

---

## Typography System

### Font Families
- **Primary (English):** Inter or Work Sans via Google Fonts - exceptional readability at all sizes
- **Secondary (Traditional Chinese):** Noto Sans TC via Google Fonts - optimized for screen display
- **Monospace (Spelling Mode):** JetBrains Mono - clear letter distinction for typing practice

### Type Scale & Hierarchy
- **Hero Text (Canvas Center Word):** 4xl to 5xl, font-weight: 700
- **Branch Words:** xl to 2xl, font-weight: 600
- **Category Buttons:** base to lg, font-weight: 500
- **Flashcard Front:** 3xl to 4xl, font-weight: 600
- **Flashcard Back (Definition):** lg to xl, font-weight: 400
- **UI Labels & Navigation:** sm to base, font-weight: 500
- **Supporting Text:** sm, font-weight: 400

### Traditional Chinese Typography
- Increase line-height by 0.125 (e.g., from 1.5 to 1.625) for Chinese text
- Use slightly larger font sizes (+0.125rem) for equivalent hierarchy
- Maintain minimum 16px for body text readability

---

## Layout System

### Spacing Primitives
**Core Units:** Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- **Micro spacing:** 2, 4 (element padding, icon margins)
- **Component spacing:** 6, 8, 12 (button padding, card gaps)
- **Section spacing:** 16, 20, 24 (major layout divisions)

### Canvas Layout (Mind-Map Mode)
- **Full viewport height:** 100vh minus header
- **Category bar:** Fixed position at top, h-16, with horizontal scroll for mobile
- **Canvas area:** Remaining space, overflow hidden for pan/zoom
- **Zoom controls:** Fixed bottom-right, space-x-2, p-4
- **Save/Load:** Fixed top-right alongside mode toggle, gap-3

### Flashcard Layout
- **Container:** max-w-2xl centered, min-h-96 to maintain consistency
- **Card aspect ratio:** 3:2 or 4:3 for optimal readability
- **Swipe indicators:** Positioned at card edges with subtle arrows
- **Progress tracker:** Top of viewport, h-2 progress bar
- **Navigation controls:** Bottom-aligned, py-6

### Header Navigation
- **Height:** 16 or 20 (64-80px)
- **Container:** Full width with max-w-7xl inner container
- **Logo/Brand:** Left-aligned, flex items-center
- **Actions:** Right-aligned with gap-4 (Light/Dark toggle, Settings)

---

## Component Library

### Category Buttons
- **Layout:** Horizontal scrollable row with gap-3
- **Individual button:** px-6 py-3, rounded-xl
- **Typography:** font-medium with letter-spacing tight
- **Active state:** Increased shadow and subtle transform scale-105
- **Responsive:** Wrap to 2-3 rows on mobile with consistent spacing

### Mind-Map Nodes
- **Center word:** Largest node with px-8 py-6, rounded-2xl, prominent shadow
- **Branch words:** Medium nodes with px-6 py-4, rounded-xl, moderate shadow
- **Connection lines:** SVG paths with stroke-width of 2-3
- **Node spacing:** Minimum 24-32 units between nodes
- **Hover state:** Scale-105 transform with shadow increase

### Flashcard Components
- **Card container:** Perspective effect for 3D flip, rounded-2xl
- **Front/Back faces:** Full padding (p-8 to p-12), centered content
- **Definition section:** 
  - English word: mb-8, large text
  - Chinese definition: mb-4, generous line-height
  - Part of speech badge: inline-flex px-3 py-1, rounded-full, text-sm
- **Swipe indicators:** Absolute positioned left/right, w-12 h-12 icons

### Custom Keyboard (Spelling Mode)
- **Layout:** Fixed bottom, full-width, pb-safe for mobile
- **Key grid:** 4 rows, responsive key sizing
- **Individual keys:** min-h-12 to min-h-14, rounded-lg, font-medium
- **Spacebar:** colspan spanning 4-5 keys
- **Special keys:** Backspace and Enter with distinct treatment

### Mode Toggle (Light/Dark)
- **Design:** Icon-based toggle button, w-10 h-10 minimum
- **Position:** Header right-side, accessible at all times
- **Transition:** Smooth theme change with 300ms duration

### Action Buttons
- **Primary (Create Branch, Generate):** px-6 py-3, rounded-xl, font-semibold
- **Secondary (Cancel, Back):** px-5 py-2.5, rounded-lg, font-medium
- **Icon buttons:** w-10 h-10, rounded-full for circular actions
- **Touch targets:** Minimum 44x44px for mobile accessibility

### Cards & Containers
- **Mind map info panel:** Floating panel, w-80, rounded-2xl, p-6
- **Flashcard deck preview:** Grid layout, gap-4, rounded-xl cards
- **Settings panel:** Slide-over with max-w-md, p-6

---

## Interactive States & Transitions

### Node Interactions
- **Dragging:** Cursor grab/grabbing, slight opacity reduction
- **Connecting:** Animated line drawing from parent to child
- **Expanding:** Fade-in + scale animation (200-300ms)
- **Tap to center:** Smooth transition to new center position (400ms)

### Flashcard Interactions
- **Flip animation:** rotateY transform, 400ms duration, ease-in-out
- **Swipe gesture:** Follow finger with transform translateX
- **Swipe threshold:** 40% of card width triggers action
- **Exit animation:** Slide off screen with fade-out (300ms)

### General Transitions
- **All transitions:** Use ease-in-out or custom cubic-bezier
- **Hover states:** 150ms for subtle feedback
- **Page transitions:** 300ms for mode switching
- **Loading states:** Skeleton screens with subtle pulse animation

---

## Accessibility & Localization

### Language Switching
- **Toggle placement:** Header with clear EN/中 indicator
- **Content update:** Immediate UI text change without page reload
- **Persistence:** Save preference to localStorage

### Touch & Keyboard
- **All buttons:** Minimum 44x44px touch targets
- **Keyboard navigation:** Full support with visible focus states
- **Focus indicators:** 2-3px outline offset by 2px
- **Skip links:** Hidden but accessible for screen readers

### Contrast & Readability
- **Text hierarchy maintained** across light/dark modes
- **Interactive elements** clearly distinguished from static content
- **Line length:** Max 65-75 characters for optimal reading

---

## Responsive Behavior

### Breakpoints
- **Mobile:** < 768px - Single column, full-width canvas
- **Tablet:** 768px - 1024px - Category buttons may wrap, optimized canvas
- **Desktop:** > 1024px - Full horizontal category bar, spacious canvas

### Mobile Optimizations
- **Category buttons:** Horizontal scroll with snap points
- **Canvas controls:** Larger touch targets (w-12 h-12 minimum)
- **Flashcards:** Swipe gestures primary interaction
- **Keyboard:** Full-width bottom sheet with safe area padding

### Desktop Enhancements
- **Hover states:** Rich feedback on all interactive elements
- **Keyboard shortcuts:** Displayed in tooltips (e.g., "Press Enter to expand")
- **Multi-select:** Shift+click for batch flashcard operations
- **Zoom:** Mouse wheel support with smooth scaling

---

## Visual Rhythm & Polish

### Consistent Rounding
- **Large containers:** rounded-2xl (16px)
- **Cards & panels:** rounded-xl (12px)
- **Buttons:** rounded-lg to rounded-xl (8-12px)
- **Pills & badges:** rounded-full

### Shadow System
- **Subtle (resting):** Small shadow for depth perception
- **Moderate (elevated):** Cards and important nodes
- **Strong (active):** Center word, active flashcard
- **Layered:** Combine multiple shadows for richness

### Border Usage
- **Minimal borders:** Rely on shadows and spacing for separation
- **Functional borders:** Input fields, keyboard keys use subtle borders
- **Dividers:** When needed, use thin borders (1px) with reduced opacity

This design creates a professional, focused learning environment that respects both English and Traditional Chinese typography while maintaining exceptional usability across the interactive canvas and flashcard modes.