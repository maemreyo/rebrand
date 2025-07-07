// OCR v2.0 Text Quality Validation System

import { OCR_CONFIG } from "@/types/ocr";

// Interface for text validation results
export interface TextValidationResult {
  confidence: number;
  isValid: boolean;
  reason: string;
  metrics: {
    charLength: number;
    syllableCount: number;
    syllableDensity: number;
    entropy: number;
    wordCount: number;
    uniqueCharCount: number;
    repetitivePatterns: boolean;
  };
}

// Interface for validation configuration
export interface ValidationConfig {
  minAbsoluteLength: number;
  minSyllableCount: number;
  minSyllableDensity: number;
  minTextEntropy: number;
  minWordCount: number;
  confidenceThreshold: number;
}

/**
 * Enhanced text quality validation using multiple heuristics
 * Designed to detect meaningless content like dots, repetitive patterns, etc.
 */
export class TextQualityValidator {
  private config: ValidationConfig;
  private vntkAvailable: boolean = false;
  private entropyCalculator: any = null;

  constructor(config?: Partial<ValidationConfig>) {
    this.config = {
      minAbsoluteLength: OCR_CONFIG.MIN_ABSOLUTE_LENGTH || 10,
      minSyllableCount: OCR_CONFIG.MIN_SYLLABLE_COUNT || 3,
      minSyllableDensity: OCR_CONFIG.MIN_SYLLABLE_DENSITY || 0.05,
      minTextEntropy: OCR_CONFIG.MIN_TEXT_ENTROPY || 1.5,
      minWordCount: OCR_CONFIG.MIN_WORD_COUNT || 3,
      confidenceThreshold: OCR_CONFIG.OCR_TRIGGER_CONFIDENCE_THRESHOLD || 0.5,
      ...config,
    };

    this.initializeDependencies();
  }

  /**
   * Initialize optional dependencies (vntk, fast-password-entropy)
   */
  private async initializeDependencies(): Promise<void> {
    try {
      // Try to load fast-password-entropy for entropy calculation
      const stringEntropy = await import("fast-password-entropy");
      this.entropyCalculator = stringEntropy.default;
    } catch (error) {
      console.warn(
        "fast-password-entropy not available, using fallback entropy calculation"
      );
    }

    try {
      // Try to load vntk for Vietnamese text processing
      const vntk = await import("vntk");
      this.vntkAvailable = true;
    } catch (error) {
      console.warn("vntk not available, using fallback word segmentation");
    }
  }

  /**
   * Main validation function - determines if text is high quality or needs OCR
   */
  public async validateTextQuality(
    text: string
  ): Promise<TextValidationResult> {
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
    const metrics = await this.calculateMetrics(normalizedText);

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
   * Calculate comprehensive text metrics
   */
  private async calculateMetrics(
    text: string
  ): Promise<TextValidationResult["metrics"]> {
    const charLength = text.length;

    // Calculate entropy (randomness measure)
    const entropy = this.calculateEntropy(text);

    // Calculate word and syllable counts
    const { wordCount, syllableCount } = await this.calculateWordMetrics(text);

    // Calculate syllable density (key metric for Vietnamese text)
    const syllableDensity = charLength > 0 ? syllableCount / charLength : 0;

    // Count unique characters
    const uniqueCharCount = new Set(text.toLowerCase()).size;

    // Detect repetitive patterns
    const repetitivePatterns = this.detectRepetitivePatterns(text);

    return {
      charLength,
      syllableCount,
      syllableDensity,
      entropy,
      wordCount,
      uniqueCharCount,
      repetitivePatterns,
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

    // RULE 1: Syllable density check (most critical for Vietnamese)
    if (metrics.syllableDensity < this.config.minSyllableDensity) {
      return {
        confidence: 0,
        reason: `Critical: Very low syllable density (${metrics.syllableDensity.toFixed(
          4
        )}). Likely meaningless content.`,
      };
    }

    // RULE 2: Entropy check (detects repetitive patterns)
    if (metrics.entropy < this.config.minTextEntropy) {
      confidence -= 0.6;
      reason = `Low entropy (${metrics.entropy.toFixed(
        2
      )}) suggests repetitive or patterned text.`;
    }

    // RULE 3: Word count check
    if (metrics.wordCount < this.config.minWordCount) {
      confidence -= 0.4;
      reason = `Low word count (${metrics.wordCount}). May not contain meaningful content.`;
    }

    // RULE 4: Repetitive pattern detection
    if (metrics.repetitivePatterns) {
      confidence -= 0.3;
      reason = `Repetitive patterns detected. Likely generated or meaningless content.`;
    }

    // RULE 5: Character diversity check
    const diversityRatio =
      metrics.uniqueCharCount / Math.min(metrics.charLength, 50);
    if (diversityRatio < 0.3) {
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
   * Calculate text entropy using fast-password-entropy or fallback
   */
  private calculateEntropy(text: string): number {
    if (this.entropyCalculator) {
      try {
        return this.entropyCalculator(text) / 10; // Normalize to reasonable range
      } catch (error) {
        console.warn("Entropy calculation failed, using fallback");
      }
    }

    // Fallback entropy calculation
    return this.calculateFallbackEntropy(text);
  }

  /**
   * Fallback entropy calculation when fast-password-entropy is not available
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
   * Calculate word and syllable counts with Vietnamese support
   */
  private async calculateWordMetrics(
    text: string
  ): Promise<{ wordCount: number; syllableCount: number }> {
    if (this.vntkAvailable) {
      return await this.calculateVietnameseMetrics(text);
    }

    // Fallback for English/general text
    return this.calculateFallbackMetrics(text);
  }

  /**
   * Calculate metrics using VNTK for Vietnamese text
   */
  private async calculateVietnameseMetrics(
    text: string
  ): Promise<{ wordCount: number; syllableCount: number }> {
    try {
      const vntk = await import("vntk");
      const tokenizer = vntk.wordTokenizer();
      const tokens = tokenizer.tag(text);

      return {
        wordCount: tokens.length,
        syllableCount: tokens.length, // In Vietnamese, words are typically syllables
      };
    } catch (error) {
      console.warn("VNTK processing failed, using fallback");
      return this.calculateFallbackMetrics(text);
    }
  }

  /**
   * Fallback metrics calculation for general text
   */
  private calculateFallbackMetrics(text: string): {
    wordCount: number;
    syllableCount: number;
  } {
    // Simple word splitting for non-Vietnamese text
    const words = text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0 && /[a-zA-ZÀ-ỹ]/.test(word));

    // Estimate syllables (rough approximation)
    const estimatedSyllables = words.reduce((count, word) => {
      return (
        count +
        Math.max(
          1,
          word.replace(
            /[^aeiouàáạảãêếệểễèìíịỉĩòóọỏõôốộổỗơớợởỡùúụủũưứựửữyýỵỷỹ]/gi,
            ""
          ).length
        )
      );
    }, 0);

    return {
      wordCount: words.length,
      syllableCount: estimatedSyllables,
    };
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
    return {
      confidence: 0,
      isValid: false,
      reason,
      metrics: {
        charLength: text.length,
        syllableCount: 0,
        syllableDensity: 0,
        entropy: 0,
        wordCount: 0,
        uniqueCharCount: 0,
        repetitivePatterns: false,
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
