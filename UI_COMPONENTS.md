# UI Components Documentation

This project uses **shadcn/ui** components built with **Radix UI** primitives and **Tailwind CSS**.

## Available Components

### Form Components
- **Button** - Various button variants (default, destructive, outline, secondary, ghost, link)
- **Input** - Text input fields with proper styling
- **Textarea** - Multi-line text input
- **Label** - Accessible labels for form controls
- **Checkbox** - Checkboxes with proper state management
- **Switch** - Toggle switches
- **Select** - Dropdown select menus with search capability

### Layout Components
- **Card** - Flexible card container with header, content, and footer
- **Tabs** - Tabbed interface for organizing content
- **Badge** - Small status indicators and labels
- **Progress** - Progress bars for loading states

### Feedback Components
- **Dialog** - Modal dialogs with proper accessibility
- **Tooltip** - Hover tooltips for additional information
- **Toggle** - Toggle buttons for binary states

## Usage Example

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Form Example</CardTitle>
        <CardDescription>A simple form using shadcn/ui components</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="Enter your email" />
        </div>
        <Button>Submit</Button>
      </CardContent>
    </Card>
  )
}
```

## Configuration

The components are configured via `components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

## Styling

All components use CSS variables for theming, defined in `src/app/globals.css`. The theme supports both light and dark modes automatically.

## Demo

Visit `/components-demo` to see all components in action with comprehensive examples.

## Adding New Components

To add new shadcn/ui components:

1. Install the component: `pnpm dlx shadcn@latest add [component-name]`
2. Import and use in your React components
3. Add to `src/components/ui/index.ts` for easy importing

## Dependencies

The UI components rely on:
- **@radix-ui/react-*** - Unstyled, accessible components
- **class-variance-authority** - For variant-based styling
- **tailwind-merge** - For merging Tailwind classes
- **lucide-react** - For icons

## Best Practices

1. Use semantic HTML elements where possible
2. Always provide proper labels for form controls
3. Use the `cn()` utility for merging classes
4. Follow the component API patterns established by shadcn/ui
5. Test components in both light and dark modes