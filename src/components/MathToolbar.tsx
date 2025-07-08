// src/components/MathToolbar.tsx
// FIXED: 2025-07-08 - Corrected math insertion using text with delimiters

"use client";

import React, { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Feather,
  Sigma,
  Pi,
  Infinity,
  Hash,
  Calculator,
  Type,
  Grid3X3,
  ChevronDown,
  Search,
  Copy,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// FIXED: Types and Interfaces
// =============================================================================

export interface MathToolbarProps {
  onInsertMath?: (mathText: string) => void; // FIXED: Changed from (latex, display) to (mathText)
  onInsertSymbol?: (symbol: string) => void;
  className?: string;
  compact?: boolean;
  showLabels?: boolean;
  customSymbols?: MathSymbol[];
  customTemplates?: MathTemplate[];
}

export interface MathSymbol {
  symbol: string;
  latex: string;
  name: string;
  category: string;
  description?: string;
  keywords?: string[];
}

export interface MathTemplate {
  name: string;
  latex: string;
  description: string;
  category: string;
  placeholders?: string[];
  example?: string;
  isDisplay?: boolean; // FIXED: Added to indicate if template should be display math
}

export interface SymbolCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  symbols: MathSymbol[];
}

// =============================================================================
// Math Symbols Database (unchanged)
// =============================================================================

const MATH_SYMBOLS: SymbolCategory[] = [
  {
    id: "greek",
    name: "Greek Letters",
    icon: <Type className="h-4 w-4" />,
    symbols: [
      // Lowercase Greek
      {
        symbol: "α",
        latex: "\\alpha",
        name: "Alpha",
        category: "greek",
        keywords: ["alpha"],
      },
      {
        symbol: "β",
        latex: "\\beta",
        name: "Beta",
        category: "greek",
        keywords: ["beta"],
      },
      {
        symbol: "γ",
        latex: "\\gamma",
        name: "Gamma",
        category: "greek",
        keywords: ["gamma"],
      },
      {
        symbol: "δ",
        latex: "\\delta",
        name: "Delta",
        category: "greek",
        keywords: ["delta"],
      },
      {
        symbol: "ε",
        latex: "\\epsilon",
        name: "Epsilon",
        category: "greek",
        keywords: ["epsilon"],
      },
      {
        symbol: "ζ",
        latex: "\\zeta",
        name: "Zeta",
        category: "greek",
        keywords: ["zeta"],
      },
      {
        symbol: "η",
        latex: "\\eta",
        name: "Eta",
        category: "greek",
        keywords: ["eta"],
      },
      {
        symbol: "θ",
        latex: "\\theta",
        name: "Theta",
        category: "greek",
        keywords: ["theta"],
      },
      {
        symbol: "ι",
        latex: "\\iota",
        name: "Iota",
        category: "greek",
        keywords: ["iota"],
      },
      {
        symbol: "κ",
        latex: "\\kappa",
        name: "Kappa",
        category: "greek",
        keywords: ["kappa"],
      },
      {
        symbol: "λ",
        latex: "\\lambda",
        name: "Lambda",
        category: "greek",
        keywords: ["lambda"],
      },
      {
        symbol: "μ",
        latex: "\\mu",
        name: "Mu",
        category: "greek",
        keywords: ["mu", "micro"],
      },
      {
        symbol: "ν",
        latex: "\\nu",
        name: "Nu",
        category: "greek",
        keywords: ["nu"],
      },
      {
        symbol: "ξ",
        latex: "\\xi",
        name: "Xi",
        category: "greek",
        keywords: ["xi"],
      },
      {
        symbol: "π",
        latex: "\\pi",
        name: "Pi",
        category: "greek",
        keywords: ["pi"],
      },
      {
        symbol: "ρ",
        latex: "\\rho",
        name: "Rho",
        category: "greek",
        keywords: ["rho"],
      },
      {
        symbol: "σ",
        latex: "\\sigma",
        name: "Sigma",
        category: "greek",
        keywords: ["sigma"],
      },
      {
        symbol: "τ",
        latex: "\\tau",
        name: "Tau",
        category: "greek",
        keywords: ["tau"],
      },
      {
        symbol: "υ",
        latex: "\\upsilon",
        name: "Upsilon",
        category: "greek",
        keywords: ["upsilon"],
      },
      {
        symbol: "φ",
        latex: "\\phi",
        name: "Phi",
        category: "greek",
        keywords: ["phi"],
      },
      {
        symbol: "χ",
        latex: "\\chi",
        name: "Chi",
        category: "greek",
        keywords: ["chi"],
      },
      {
        symbol: "ψ",
        latex: "\\psi",
        name: "Psi",
        category: "greek",
        keywords: ["psi"],
      },
      {
        symbol: "ω",
        latex: "\\omega",
        name: "Omega",
        category: "greek",
        keywords: ["omega"],
      },

      // Uppercase Greek
      {
        symbol: "Γ",
        latex: "\\Gamma",
        name: "Capital Gamma",
        category: "greek",
        keywords: ["Gamma", "capital"],
      },
      {
        symbol: "Δ",
        latex: "\\Delta",
        name: "Capital Delta",
        category: "greek",
        keywords: ["Delta", "capital"],
      },
      {
        symbol: "Θ",
        latex: "\\Theta",
        name: "Capital Theta",
        category: "greek",
        keywords: ["Theta", "capital"],
      },
      {
        symbol: "Λ",
        latex: "\\Lambda",
        name: "Capital Lambda",
        category: "greek",
        keywords: ["Lambda", "capital"],
      },
      {
        symbol: "Ξ",
        latex: "\\Xi",
        name: "Capital Xi",
        category: "greek",
        keywords: ["Xi", "capital"],
      },
      {
        symbol: "Π",
        latex: "\\Pi",
        name: "Capital Pi",
        category: "greek",
        keywords: ["Pi", "capital"],
      },
      {
        symbol: "Σ",
        latex: "\\Sigma",
        name: "Capital Sigma",
        category: "greek",
        keywords: ["Sigma", "capital", "sum"],
      },
      {
        symbol: "Υ",
        latex: "\\Upsilon",
        name: "Capital Upsilon",
        category: "greek",
        keywords: ["Upsilon", "capital"],
      },
      {
        symbol: "Φ",
        latex: "\\Phi",
        name: "Capital Phi",
        category: "greek",
        keywords: ["Phi", "capital"],
      },
      {
        symbol: "Χ",
        latex: "\\Chi",
        name: "Capital Chi",
        category: "greek",
        keywords: ["Chi", "capital"],
      },
      {
        symbol: "Ψ",
        latex: "\\Psi",
        name: "Capital Psi",
        category: "greek",
        keywords: ["Psi", "capital"],
      },
      {
        symbol: "Ω",
        latex: "\\Omega",
        name: "Capital Omega",
        category: "greek",
        keywords: ["Omega", "capital"],
      },
    ],
  },
  {
    id: "operators",
    name: "Operators",
    icon: <Calculator className="h-4 w-4" />,
    symbols: [
      {
        symbol: "+",
        latex: "+",
        name: "Plus",
        category: "operators",
        keywords: ["plus", "add"],
      },
      {
        symbol: "−",
        latex: "-",
        name: "Minus",
        category: "operators",
        keywords: ["minus", "subtract"],
      },
      {
        symbol: "±",
        latex: "\\pm",
        name: "Plus Minus",
        category: "operators",
        keywords: ["plus", "minus"],
      },
      {
        symbol: "∓",
        latex: "\\mp",
        name: "Minus Plus",
        category: "operators",
        keywords: ["minus", "plus"],
      },
      {
        symbol: "×",
        latex: "\\times",
        name: "Times",
        category: "operators",
        keywords: ["times", "multiply"],
      },
      {
        symbol: "÷",
        latex: "\\div",
        name: "Division",
        category: "operators",
        keywords: ["divide", "division"],
      },
      {
        symbol: "·",
        latex: "\\cdot",
        name: "Dot Product",
        category: "operators",
        keywords: ["dot", "product"],
      },
      {
        symbol: "∘",
        latex: "\\circ",
        name: "Composition",
        category: "operators",
        keywords: ["compose"],
      },
      {
        symbol: "⊕",
        latex: "\\oplus",
        name: "Direct Sum",
        category: "operators",
        keywords: ["oplus", "sum"],
      },
      {
        symbol: "⊗",
        latex: "\\otimes",
        name: "Tensor Product",
        category: "operators",
        keywords: ["otimes", "tensor"],
      },
      {
        symbol: "∑",
        latex: "\\sum",
        name: "Summation",
        category: "operators",
        keywords: ["sum", "sigma"],
      },
      {
        symbol: "∏",
        latex: "\\prod",
        name: "Product",
        category: "operators",
        keywords: ["product", "pi"],
      },
      {
        symbol: "∫",
        latex: "\\int",
        name: "Integral",
        category: "operators",
        keywords: ["integral"],
      },
      {
        symbol: "∮",
        latex: "\\oint",
        name: "Contour Integral",
        category: "operators",
        keywords: ["contour", "integral"],
      },
      {
        symbol: "∂",
        latex: "\\partial",
        name: "Partial Derivative",
        category: "operators",
        keywords: ["partial", "derivative"],
      },
      {
        symbol: "∇",
        latex: "\\nabla",
        name: "Nabla",
        category: "operators",
        keywords: ["nabla", "gradient"],
      },
      {
        symbol: "√",
        latex: "\\sqrt{}",
        name: "Square Root",
        category: "operators",
        keywords: ["sqrt", "root"],
      },
      {
        symbol: "∞",
        latex: "\\infty",
        name: "Infinity",
        category: "operators",
        keywords: ["infinity"],
      },
    ],
  },
  {
    id: "relations",
    name: "Relations",
    icon: <Sigma className="h-4 w-4" />,
    symbols: [
      {
        symbol: "=",
        latex: "=",
        name: "Equals",
        category: "relations",
        keywords: ["equals"],
      },
      {
        symbol: "≠",
        latex: "\\neq",
        name: "Not Equal",
        category: "relations",
        keywords: ["not", "equal"],
      },
      {
        symbol: "≈",
        latex: "\\approx",
        name: "Approximately",
        category: "relations",
        keywords: ["approx"],
      },
      {
        symbol: "≡",
        latex: "\\equiv",
        name: "Equivalent",
        category: "relations",
        keywords: ["equiv"],
      },
      {
        symbol: "∼",
        latex: "\\sim",
        name: "Similar",
        category: "relations",
        keywords: ["similar"],
      },
      {
        symbol: "∝",
        latex: "\\propto",
        name: "Proportional",
        category: "relations",
        keywords: ["proportional"],
      },
      {
        symbol: "<",
        latex: "<",
        name: "Less Than",
        category: "relations",
        keywords: ["less"],
      },
      {
        symbol: ">",
        latex: ">",
        name: "Greater Than",
        category: "relations",
        keywords: ["greater"],
      },
      {
        symbol: "≤",
        latex: "\\leq",
        name: "Less Equal",
        category: "relations",
        keywords: ["less", "equal"],
      },
      {
        symbol: "≥",
        latex: "\\geq",
        name: "Greater Equal",
        category: "relations",
        keywords: ["greater", "equal"],
      },
      {
        symbol: "≪",
        latex: "\\ll",
        name: "Much Less",
        category: "relations",
        keywords: ["much", "less"],
      },
      {
        symbol: "≫",
        latex: "\\gg",
        name: "Much Greater",
        category: "relations",
        keywords: ["much", "greater"],
      },
      {
        symbol: "∈",
        latex: "\\in",
        name: "Element Of",
        category: "relations",
        keywords: ["in", "element"],
      },
      {
        symbol: "∉",
        latex: "\\notin",
        name: "Not Element Of",
        category: "relations",
        keywords: ["not", "in"],
      },
      {
        symbol: "⊂",
        latex: "\\subset",
        name: "Subset",
        category: "relations",
        keywords: ["subset"],
      },
      {
        symbol: "⊃",
        latex: "\\supset",
        name: "Superset",
        category: "relations",
        keywords: ["superset"],
      },
      {
        symbol: "⊆",
        latex: "\\subseteq",
        name: "Subset Equal",
        category: "relations",
        keywords: ["subset", "equal"],
      },
      {
        symbol: "⊇",
        latex: "\\supseteq",
        name: "Superset Equal",
        category: "relations",
        keywords: ["superset", "equal"],
      },
    ],
  },
];

// =============================================================================
// FIXED: Math Templates Database with display math indicators
// =============================================================================

const MATH_TEMPLATES: MathTemplate[] = [
  // Fractions
  {
    name: "Fraction",
    latex: "\\frac{a}{b}",
    description: "Simple fraction",
    category: "basic",
    placeholders: ["numerator", "denominator"],
    example: "\\frac{1}{2}",
    isDisplay: false,
  },
  {
    name: "Complex Fraction",
    latex: "\\frac{\\frac{a}{b}}{\\frac{c}{d}}",
    description: "Fraction of fractions",
    category: "basic",
    placeholders: ["a", "b", "c", "d"],
    example: "\\frac{\\frac{1}{2}}{\\frac{3}{4}}",
    isDisplay: true,
  },

  // Powers and Roots
  {
    name: "Power",
    latex: "x^{n}",
    description: "Exponential power",
    category: "basic",
    placeholders: ["base", "exponent"],
    example: "x^{2}",
    isDisplay: false,
  },
  {
    name: "Subscript",
    latex: "x_{n}",
    description: "Subscript notation",
    category: "basic",
    placeholders: ["variable", "subscript"],
    example: "x_{1}",
    isDisplay: false,
  },
  {
    name: "Square Root",
    latex: "\\sqrt{x}",
    description: "Square root",
    category: "basic",
    placeholders: ["expression"],
    example: "\\sqrt{16}",
    isDisplay: false,
  },
  {
    name: "nth Root",
    latex: "\\sqrt[n]{x}",
    description: "nth root",
    category: "basic",
    placeholders: ["n", "expression"],
    example: "\\sqrt[3]{8}",
    isDisplay: false,
  },

  // Calculus
  {
    name: "Limit",
    latex: "\\lim_{x \\to a} f(x)",
    description: "Limit notation",
    category: "calculus",
    placeholders: ["variable", "approach", "function"],
    example: "\\lim_{x \\to 0} \\frac{\\sin x}{x}",
    isDisplay: true,
  },
  {
    name: "Derivative",
    latex: "\\frac{d}{dx} f(x)",
    description: "Derivative notation",
    category: "calculus",
    placeholders: ["variable", "function"],
    example: "\\frac{d}{dx} x^2",
    isDisplay: false,
  },
  {
    name: "Partial Derivative",
    latex: "\\frac{\\partial f}{\\partial x}",
    description: "Partial derivative",
    category: "calculus",
    placeholders: ["function", "variable"],
    example: "\\frac{\\partial f}{\\partial x}",
    isDisplay: false,
  },
  {
    name: "Definite Integral",
    latex: "\\int_{a}^{b} f(x) \\, dx",
    description: "Definite integral",
    category: "calculus",
    placeholders: ["lower", "upper", "function", "variable"],
    example: "\\int_{0}^{1} x^2 \\, dx",
    isDisplay: true,
  },
  {
    name: "Indefinite Integral",
    latex: "\\int f(x) \\, dx",
    description: "Indefinite integral",
    category: "calculus",
    placeholders: ["function", "variable"],
    example: "\\int x^2 \\, dx",
    isDisplay: false,
  },

  // Summation and Products
  {
    name: "Summation",
    latex: "\\sum_{i=1}^{n} a_i",
    description: "Summation notation",
    category: "series",
    placeholders: ["index", "start", "end", "term"],
    example: "\\sum_{i=1}^{n} i^2",
    isDisplay: true,
  },
  {
    name: "Product",
    latex: "\\prod_{i=1}^{n} a_i",
    description: "Product notation",
    category: "series",
    placeholders: ["index", "start", "end", "term"],
    example: "\\prod_{i=1}^{n} i",
    isDisplay: true,
  },

  // Matrices
  {
    name: "2x2 Matrix",
    latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}",
    description: "2x2 matrix with parentheses",
    category: "matrices",
    placeholders: ["a", "b", "c", "d"],
    example: "\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}",
    isDisplay: true,
  },
  {
    name: "3x3 Matrix",
    latex:
      "\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}",
    description: "3x3 matrix with parentheses",
    category: "matrices",
    placeholders: ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
    example:
      "\\begin{pmatrix} 1 & 0 & 0 \\\\ 0 & 1 & 0 \\\\ 0 & 0 & 1 \\end{pmatrix}",
    isDisplay: true,
  },
  {
    name: "Determinant",
    latex: "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}",
    description: "Determinant notation",
    category: "matrices",
    placeholders: ["a", "b", "c", "d"],
    example: "\\begin{vmatrix} 1 & 2 \\\\ 3 & 4 \\end{vmatrix}",
    isDisplay: true,
  },

  // Cases and Systems
  {
    name: "Cases",
    latex:
      "\\begin{cases} f(x) & \\text{if } x > 0 \\\\ g(x) & \\text{if } x \\leq 0 \\end{cases}",
    description: "Piecewise function",
    category: "systems",
    placeholders: ["f(x)", "condition1", "g(x)", "condition2"],
    example:
      "\\begin{cases} x^2 & \\text{if } x \\geq 0 \\\\ -x^2 & \\text{if } x < 0 \\end{cases}",
    isDisplay: true,
  },

  // Trigonometry
  {
    name: "Sine",
    latex: "\\sin(x)",
    description: "Sine function",
    category: "trigonometry",
    placeholders: ["angle"],
    example: "\\sin(\\theta)",
    isDisplay: false,
  },
  {
    name: "Cosine",
    latex: "\\cos(x)",
    description: "Cosine function",
    category: "trigonometry",
    placeholders: ["angle"],
    example: "\\cos(\\theta)",
    isDisplay: false,
  },
  {
    name: "Tangent",
    latex: "\\tan(x)",
    description: "Tangent function",
    category: "trigonometry",
    placeholders: ["angle"],
    example: "\\tan(\\theta)",
    isDisplay: false,
  },
];

// =============================================================================
// FIXED: MathToolbar Component
// =============================================================================

export const MathToolbar: React.FC<MathToolbarProps> = ({
  onInsertMath,
  onInsertSymbol,
  className,
  compact = false,
  showLabels = true,
  customSymbols = [],
  customTemplates = [],
}) => {
  // =============================================================================
  // State Management
  // =============================================================================

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("greek");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isSymbolsOpen, setIsSymbolsOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // =============================================================================
  // Helper Functions
  // =============================================================================

  const allSymbols = React.useMemo(() => {
    const builtInSymbols = MATH_SYMBOLS.flatMap((cat) => cat.symbols);
    return [...builtInSymbols, ...customSymbols];
  }, [customSymbols]);

  const allTemplates = React.useMemo(() => {
    return [...MATH_TEMPLATES, ...customTemplates];
  }, [customTemplates]);

  const filteredSymbols = React.useMemo(() => {
    if (!searchQuery) return allSymbols;

    const query = searchQuery.toLowerCase();
    return allSymbols.filter(
      (symbol) =>
        symbol.name.toLowerCase().includes(query) ||
        symbol.latex.toLowerCase().includes(query) ||
        symbol.keywords?.some((keyword) =>
          keyword.toLowerCase().includes(query)
        )
    );
  }, [allSymbols, searchQuery]);

  const filteredTemplates = React.useMemo(() => {
    if (!searchQuery) return allTemplates;

    const query = searchQuery.toLowerCase();
    return allTemplates.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query)
    );
  }, [allTemplates, searchQuery]);

  // =============================================================================
  // FIXED: Event Handlers
  // =============================================================================

  const handleInsertSymbol = useCallback(
    (symbol: MathSymbol) => {
      try {
        // FIXED: Insert symbol latex directly
        const symbolText = symbol.latex;
        onInsertSymbol?.(symbolText);
        setIsSymbolsOpen(false);
      } catch (error) {
        console.error("Failed to insert symbol:", error);
      }
    },
    [onInsertSymbol]
  );

  const handleInsertTemplate = useCallback(
    (template: MathTemplate) => {
      try {
        // FIXED: Insert template with proper delimiters based on isDisplay
        const mathText = template.isDisplay
          ? `$$${template.latex}$$`
          : `$${template.latex}$`;

        onInsertMath?.(mathText);
        setSelectedTemplate(template.name);
        setIsTemplatesOpen(false);

        // Clear selection after a delay
        setTimeout(() => setSelectedTemplate(null), 1000);
      } catch (error) {
        console.error("Failed to insert template:", error);
      }
    },
    [onInsertMath]
  );

  const handleQuickMath = useCallback(
    (type: "inline" | "display") => {
      try {
        // FIXED: Insert proper math text with delimiters
        const placeholder = type === "inline" ? "x" : "\\int_0^1 f(x) \\, dx";
        const mathText =
          type === "inline" ? `$${placeholder}$` : `$$${placeholder}$$`;
        onInsertMath?.(mathText);
      } catch (error) {
        console.error("Failed to insert quick math:", error);
      }
    },
    [onInsertMath]
  );

  // =============================================================================
  // Keyboard Shortcuts (unchanged)
  // =============================================================================

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isSymbolsOpen && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (event.key.length === 1 && /[a-zA-Z]/.test(event.key)) {
          searchInputRef.current?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSymbolsOpen]);

  // =============================================================================
  // Render Methods (mostly unchanged, just some FIXED labels)
  // =============================================================================

  const renderQuickButtons = () => (
    <div className="flex items-center space-x-1">
      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        onClick={() => handleQuickMath("inline")}
        className="flex items-center space-x-1"
        title="Insert inline math ($x$)"
      >
        <Feather className="h-4 w-4" />
        {showLabels && !compact && <span>$x$</span>}
      </Button>

      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        onClick={() => handleQuickMath("display")}
        className="flex items-center space-x-1"
        title="Insert display math ($$x$$)"
      >
        <Pi className="h-4 w-4" />
        {showLabels && !compact && <span>$$x$$</span>}
      </Button>
    </div>
  );

  const renderSymbolsPopover = () => (
    <Popover open={isSymbolsOpen} onOpenChange={setIsSymbolsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className="flex items-center space-x-1"
        >
          <Sigma className="h-4 w-4" />
          {showLabels && !compact && <span>Symbols</span>}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search symbols..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8"
            />
          </div>
        </div>

        <Tabs
          value={selectedCategory}
          onValueChange={setSelectedCategory}
          className="w-full"
        >
          <TabsList className="grid grid-cols-3 w-full rounded-none border-b">
            {MATH_SYMBOLS.slice(0, 3).map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="flex items-center space-x-1 text-xs"
              >
                {category.icon}
                <span className="hidden sm:inline">{category.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="h-48 overflow-y-auto">
            {searchQuery ? (
              <div className="p-2">
                <div className="grid grid-cols-6 gap-1">
                  {filteredSymbols.slice(0, 48).map((symbol, index) => (
                    <button
                      key={index}
                      onClick={() => handleInsertSymbol(symbol)}
                      className="p-2 text-center hover:bg-muted rounded border border-transparent hover:border-border transition-colors"
                      title={`${symbol.name} (${symbol.latex})`}
                    >
                      <span className="text-lg">{symbol.symbol}</span>
                    </button>
                  ))}
                </div>
                {filteredSymbols.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No symbols found for "{searchQuery}"
                  </div>
                )}
              </div>
            ) : (
              MATH_SYMBOLS.map((category) => (
                <TabsContent
                  key={category.id}
                  value={category.id}
                  className="p-2 m-0"
                >
                  <div className="grid grid-cols-6 gap-1">
                    {category.symbols.map((symbol, index) => (
                      <button
                        key={index}
                        onClick={() => handleInsertSymbol(symbol)}
                        className="p-2 text-center hover:bg-muted rounded border border-transparent hover:border-border transition-colors"
                        title={`${symbol.name} (${symbol.latex})`}
                      >
                        <span className="text-lg">{symbol.symbol}</span>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              ))
            )}
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  );

  const renderTemplatesPopover = () => (
    <Popover open={isTemplatesOpen} onOpenChange={setIsTemplatesOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          className="flex items-center space-x-1"
        >
          <Grid3X3 className="h-4 w-4" />
          {showLabels && !compact && <span>Templates</span>}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8"
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto">
          <div className="p-2 space-y-1">
            {filteredTemplates.map((template, index) => (
              <button
                key={index}
                onClick={() => handleInsertTemplate(template)}
                className={cn(
                  "w-full text-left p-2 rounded hover:bg-muted transition-colors",
                  "border border-transparent hover:border-border",
                  selectedTemplate === template.name && "bg-muted border-border"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm flex items-center space-x-2">
                      <span>{template.name}</span>
                      {template.isDisplay && (
                        <Badge variant="outline" className="text-xs">
                          Display
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {template.description}
                    </div>
                  </div>
                  <div className="ml-2">
                    <Badge variant="secondary" className="text-xs">
                      {template.category}
                    </Badge>
                  </div>
                </div>
                <div className="mt-1 text-xs font-mono bg-muted p-1 rounded">
                  {template.latex.length > 40
                    ? `${template.latex.substring(0, 40)}...`
                    : template.latex}
                </div>
              </button>
            ))}
            {filteredTemplates.length === 0 && (
              <div className="text-center text-muted-foreground py-4">
                No templates found for "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );

  // =============================================================================
  // Main Render
  // =============================================================================

  return (
    <div
      className={cn(
        "math-toolbar flex items-center space-x-2 p-2 bg-muted/50 border-b border-border",
        compact && "py-1",
        className
      )}
    >
      {/* Quick Math Buttons */}
      {renderQuickButtons()}

      <Separator orientation="vertical" className="h-6" />

      {/* Symbols Palette */}
      {renderSymbolsPopover()}

      {/* Templates Dropdown */}
      {renderTemplatesPopover()}

      {/* Search Status */}
      {searchQuery && (
        <div className="flex items-center space-x-1">
          <Badge variant="outline" className="text-xs">
            {filteredSymbols.length + filteredTemplates.length} results
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="h-6 w-6 p-0"
          >
            ×
          </Button>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// Utility Functions (unchanged)
// =============================================================================

export const createCustomSymbol = (
  symbol: string,
  latex: string,
  name: string,
  category: string,
  keywords: string[] = []
): MathSymbol => ({
  symbol,
  latex,
  name,
  category,
  keywords,
});

export const createCustomTemplate = (
  name: string,
  latex: string,
  description: string,
  category: string,
  placeholders: string[] = [],
  isDisplay: boolean = false
): MathTemplate => ({
  name,
  latex,
  description,
  category,
  placeholders,
  isDisplay,
});

// =============================================================================
// Export Everything
// =============================================================================

export { MATH_SYMBOLS, MATH_TEMPLATES };
// export type { MathSymbol, MathTemplate, SymbolCategory };
