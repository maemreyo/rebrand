// UPDATED: 08-07-2025 - Removed VNTK dependency completely, simplified universal text validation
// src/lib/utils/text-validation.ts

// Universal Text Quality Validation System (No Vietnamese-specific dependencies)

import { OCR_CONFIG } from "@/types/ocr";

// Interface for text validation results
export interface TextValidationResult {
  confidence: number;
  isValid: boolean;
  reason: string;
  metrics: {
    charLength: number;
    wordCount: number;
    wordDensity: number; // Renamed from syllableDensity
    entropy: number;
    uniqueCharCount: number;
    repetitivePatterns: boolean;
    averageWordLength: number; // New metric
  };
}

// Interface for validation configuration
export interface ValidationConfig {
  minAbsoluteLength: number;
  minWordCount: number;
  minWordDensity: number; // Renamed from syllableDensity
  minTextEntropy: number;
  minAverageWordLength: number; // New threshold
  confidenceThreshold: number;
}

/**
 * Universal text quality validation using language-agnostic heuristics
 * Designed to detect meaningless content like dots, repetitive patterns, etc.
 * Works for all languages without specific NLP dependencies.
 */
export class TextQualityValidator {
  private config: ValidationConfig;
  private entropyCalculator: any = null;

  constructor(config?: Partial<ValidationConfig>) {
    this.config = {
      minAbsoluteLength: OCR_CONFIG.MIN_ABSOLUTE_LENGTH || 10,
      minWordCount: OCR_CONFIG.MIN_WORD_COUNT || 3,
      minWordDensity: OCR_CONFIG.MIN_WORD_DENSITY || 0.05, // Universal word density
      minTextEntropy: OCR_CONFIG.MIN_TEXT_ENTROPY || 1.5,
      minAverageWordLength: OCR_CONFIG.MIN_AVERAGE_WORD_LENGTH || 2.5,
      confidenceThreshold: OCR_CONFIG.OCR_TRIGGER_CONFIDENCE_THRESHOLD || 0.5,
      ...config,
    };

    // Only initialize entropy calculator if available
    this.initializeEntropy();
  }

  /**
   * Initialize entropy calculator (optional dependency)
   */
  private async initializeEntropy(): Promise<void> {
    // Only try to load fast-password-entropy on server-side
    if (typeof window !== 'undefined') {
      return; // Skip on client-side
    }

    try {
      const stringEntropy = await import("fast-password-entropy");
      this.entropyCalculator = stringEntropy.default;
    } catch (error) {
      // Silent fallback - no warnings needed
    }
  }

  /**
   * Main validation function - determines if text is high quality or needs OCR
   * @param text - Text to validate
   * @returns Promise<TextValidationResult>
   */
  public async validateTextQuality(text: string): Promise<TextValidationResult> {
    // Normalize and clean text
    const normalizedText = this.normalizeText(text);

    if (normalizedText.length < this.config.minAbsoluteLength) {
      return this.createFailureResult(
        normalizedText,
        "Text too short for meaningful analysis",
        { charLength: normalizedText.length }
      );
    }

    // Calculate all metrics
    const metrics = this.calculateMetrics(normalizedText);

    // Apply validation rules and calculate confidence
    const { confidence, reason } = this.applyValidationRules(metrics);

    const isValid = confidence >= this.config.confidenceThreshold;

    return {
      confidence,
      isValid,
      reason,
      metrics,
    };
  }

  /**
   * Calculate comprehensive text metrics (universal approach)
   */
  private calculateMetrics(text: string): TextValidationResult["metrics"] {
    const charLength = text.length;

    // Calculate entropy (randomness measure)
    const entropy = this.calculateEntropy(text);

    // Universal word analysis
    const words = this.extractWords(text);
    const wordCount = words.length;
    const averageWordLength = wordCount > 0 
      ? words.reduce((sum, word) => sum + word.length, 0) / wordCount 
      : 0;

    // Calculate word density (universal alternative to syllable density)
    const wordDensity = charLength > 0 ? wordCount / charLength : 0;

    // Count unique characters
    const uniqueCharCount = new Set(text.toLowerCase()).size;

    // Detect repetitive patterns
    const repetitivePatterns = this.detectRepetitivePatterns(text);

    return {
      charLength,
      wordCount,
      wordDensity,
      entropy,
      uniqueCharCount,
      repetitivePatterns,
      averageWordLength,
    };
  }

  /**
   * Apply validation rules and calculate confidence score
   */
  private applyValidationRules(metrics: TextValidationResult["metrics"]): {
    confidence: number;
    reason: string;
  } {
    let confidence = 1.0;
    let reason = "Valid text content";

    // RULE 1: Word density check (universal alternative to syllable density)
    if (metrics.wordDensity < this.config.minWordDensity) {
      return {
        confidence: 0.1,
        reason: `Critical: Very low word density (${metrics.wordDensity.toFixed(
          4
        )}). Likely meaningless content or pattern.`,
      };
    }

    // RULE 2: Word count check
    if (metrics.wordCount < this.config.minWordCount) {
      confidence -= 0.5;
      reason = `Low word count (${metrics.wordCount}). May not contain meaningful content.`;
    }

    // RULE 3: Average word length check (too short = gibberish, too long = corrupted)
    if (metrics.averageWordLength < this.config.minAverageWordLength) {
      confidence -= 0.3;
      reason = `Very short average word length (${metrics.averageWordLength.toFixed(1)}). Likely fragmented text.`;
    } else if (metrics.averageWordLength > 15) {
      confidence -= 0.4;
      reason = `Unusually long average word length (${metrics.averageWordLength.toFixed(1)}). Likely corrupted text.`;
    }

    // RULE 4: Entropy check (detects repetitive patterns)
    if (metrics.entropy < this.config.minTextEntropy) {
      confidence -= 0.4;
      reason = `Low entropy (${metrics.entropy.toFixed(
        2
      )}) suggests repetitive or patterned text.`;
    }

    // RULE 5: Repetitive pattern detection
    if (metrics.repetitivePatterns) {
      confidence -= 0.3;
      reason = `Repetitive patterns detected. Likely generated or meaningless content.`;
    }

    // RULE 6: Character diversity check
    const diversityRatio = metrics.uniqueCharCount / Math.min(metrics.charLength, 50);
    if (diversityRatio < 0.25) {
      confidence -= 0.2;
      reason = `Low character diversity (${diversityRatio.toFixed(
        2
      )}). Limited vocabulary detected.`;
    }

    // Ensure confidence is between 0 and 1
    confidence = Math.max(0, Math.min(1, confidence));

    return { confidence, reason };
  }

  /**
   * Extract words using universal approach (works for most languages)
   */
  private extractWords(text: string): string[] {
    // Universal word extraction using Unicode word boundaries
    return text
      .toLowerCase()
      .split(/[\s\p{P}\p{S}]+/u) // Split on whitespace, punctuation, symbols
      .filter(word => 
        word.length > 0 && 
        /\p{L}/u.test(word) // Contains at least one letter (any language)
      );
  }

  /**
   * Calculate text entropy using fast-password-entropy or fallback
   */
  private calculateEntropy(text: string): number {
    if (this.entropyCalculator) {
      try {
        return this.entropyCalculator(text) / 10; // Normalize to reasonable range
      } catch (error) {
        // Silent fallback
      }
    }

    // Fallback entropy calculation (Shannon entropy)
    return this.calculateFallbackEntropy(text);
  }

  /**
   * Fallback entropy calculation (Shannon entropy)
   */
  private calculateFallbackEntropy(text: string): number {
    const freq: { [key: string]: number } = {};

    // Count character frequencies
    for (const char of text.toLowerCase()) {
      freq[char] = (freq[char] || 0) + 1;
    }

    // Calculate Shannon entropy
    let entropy = 0;
    const textLength = text.length;

    for (const count of Object.values(freq)) {
      const probability = count / textLength;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Detect repetitive patterns in text
   */
  private detectRepetitivePatterns(text: string): boolean {
    // Check for repeated characters (e.g., "...", "aaa", "___")
    if (/(.)\1{4,}/.test(text)) {
      return true;
    }

    // Check for repeated short patterns (e.g., "abab", "123123")
    for (let len = 2; len <= 4; len++) {
      const pattern = text.substring(0, len);
      if (pattern.length === len) {
        const regex = new RegExp(
          `(${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}){3,}`
        );
        if (regex.test(text)) {
          return true;
        }
      }
    }

    // Check for excessive repetition of the same word
    const words = this.extractWords(text);
    if (words.length > 0) {
      const wordFreq: { [key: string]: number } = {};
      for (const word of words) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
      
      // If any word appears more than 30% of the time, it's likely repetitive
      const maxFreq = Math.max(...Object.values(wordFreq));
      if (maxFreq / words.length > 0.3) {
        return true;
      }
    }

    return false;
  }

  /**
   * Normalize text for consistent processing
   */
  private normalizeText(text: string): string {
    return text
      .normalize("NFC") // Unicode normalization
      .trim()
      .replace(/\s+/g, " "); // Normalize whitespace
  }

  /**
   * Create a failure result with minimal metrics
   */
  private createFailureResult(
    text: string,
    reason: string,
    partialMetrics: Partial<TextValidationResult["metrics"]> = {}
  ): TextValidationResult {
    const words = this.extractWords(text);
    
    return {
      confidence: 0,
      isValid: false,
      reason,
      metrics: {
        charLength: text.length,
        wordCount: words.length,
        wordDensity: words.length / (text.length || 1),
        entropy: 0,
        uniqueCharCount: new Set(text.toLowerCase()).size,
        repetitivePatterns: false,
        averageWordLength: words.length > 0 
          ? words.reduce((sum, w) => sum + w.length, 0) / words.length 
          : 0,
        ...partialMetrics,
      },
    };
  }
}

// Factory function for easy usage
export async function validateTextQuality(
  text: string,
  config?: Partial<ValidationConfig>
): Promise<TextValidationResult> {
  const validator = new TextQualityValidator(config);
  return await validator.validateTextQuality(text);
}

// Async version that properly initializes dependencies
export async function validateTextQualityAsync(
  text: string,
  config?: Partial<ValidationConfig>
): Promise<TextValidationResult> {
  const validator = new TextQualityValidator(config);
  // Give time for dependencies to initialize
  await new Promise((resolve) => setTimeout(resolve, 10));
  return validator.validateTextQuality(text);
}