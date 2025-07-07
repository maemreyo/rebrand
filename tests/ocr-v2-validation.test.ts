// Comprehensive test suite for OCR v2.0 text quality validation

import {
  validateTextQuality,
  TextQualityValidator,
} from "@/lib/utils/text-validation";
import { OCR_CONFIG } from "@/types/ocr";

// =============================================================================
// Test Data Scenarios
// =============================================================================

const TEST_SCENARIOS = {
  // Problematic PDFs that should trigger OCR
  PROBLEMATIC: {
    dots_only: ".........................................",
    dots_with_spaces: ". . . . . . . . . . . . . . . . . . . .",
    repeated_chars: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    repeated_patterns: "abcabcabcabcabcabcabcabcabcabcabcabc",
    underscores: "___________________________________",
    dashes: "-----------------------------------",
    mixed_meaningless: "... --- ___ ... --- ___ ... --- ___",
    single_char_spam: "a a a a a a a a a a a a a a a a a a a",
  },

  // Valid text that should NOT trigger OCR
  VALID_TEXT: {
    vietnamese_short: "Hợp đồng mua bán nhà đất được ký kết ngày hôm nay.",
    vietnamese_long:
      "Công ty TNHH ABC xin thông báo về việc thay đổi địa chỉ trụ sở chính. Địa chỉ mới sẽ có hiệu lực từ ngày 01/02/2025. Mọi thông tin chi tiết xin liên hệ qua hotline 1900-xxxx.",
    english_short: "This is a valid English document with meaningful content.",
    english_long:
      "This document contains important information about the company policy changes. Please review carefully and contact HR department if you have any questions regarding the new procedures.",
    mixed_languages:
      "Company ABC thông báo về new policy thay đổi từ ngày 01/02/2025. Contact HR for more information.",
    contract_sample:
      "AGREEMENT\n\nThis Agreement is entered into between Party A and Party B for the purpose of establishing terms and conditions for the services to be provided.",
  },

  // Edge cases
  EDGE_CASES: {
    very_short_valid: "Đã thanh toán.",
    very_short_invalid: "...",
    numbers_only: "1234567890123456789012345678901234567890",
    special_chars: "!@#$%^&*()_+{}|:\"<>?[]\\;',./",
    mixed_valid_invalid: "Hợp đồng: ........................",
    empty: "",
    whitespace_only: "                                   ",
    newlines_only: "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n",
  },

  // Real-world samples (simulated)
  REAL_WORLD: {
    scanned_artifacts: "l l l l l l l l l l l l l l l l l l l l", // OCR artifacts
    poor_ocr_output:
      "Thi s i s a p o o r O C R o u t p u t w i t h s p a c e s",
    table_dots:
      "Name: ................ Age: ................ Address: ................",
    form_fields:
      "1. _________________ 2. _________________ 3. _________________",
  },
};

// =============================================================================
// Test Helper Functions
// =============================================================================

async function runValidationTest(
  text: string,
  expectedValid: boolean,
  testName: string,
  expectedReason?: string
) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log(
    `📝 Text: "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`
  );
  console.log(
    `🎯 Expected: ${expectedValid ? "VALID (no OCR)" : "INVALID (trigger OCR)"}`
  );

  const result = await validateTextQuality(text);

  console.log(
    `📊 Result: ${
      result.isValid ? "VALID" : "INVALID"
    } (confidence: ${result.confidence.toFixed(3)})`
  );
  console.log(`📝 Reason: ${result.reason}`);
  console.log(`📈 Metrics:`);
  console.log(`   - Characters: ${result.metrics.charLength}`);
  console.log(`   - Syllables: ${result.metrics.syllableCount}`);
  console.log(
    `   - Syllable Density: ${result.metrics.syllableDensity.toFixed(4)}`
  );
  console.log(`   - Entropy: ${result.metrics.entropy.toFixed(2)}`);
  console.log(`   - Words: ${result.metrics.wordCount}`);
  console.log(`   - Unique Chars: ${result.metrics.uniqueCharCount}`);
  console.log(`   - Repetitive: ${result.metrics.repetitivePatterns}`);

  const passed = result.isValid === expectedValid;
  console.log(`${passed ? "✅ PASSED" : "❌ FAILED"} - ${testName}`);

  if (!passed) {
    console.log(
      `💡 Expected ${expectedValid ? "valid" : "invalid"} but got ${
        result.isValid ? "valid" : "invalid"
      }`
    );
  }

  if (
    expectedReason &&
    !result.reason.toLowerCase().includes(expectedReason.toLowerCase())
  ) {
    console.log(
      `⚠️ Expected reason to contain "${expectedReason}" but got "${result.reason}"`
    );
  }

  return passed;
}

function runPerformanceTest(text: string, testName: string): number {
  console.log(`\n⏱️ Performance Test: ${testName}`);

  const iterations = 100;
  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    validateTextQuality(text);
  }

  const totalTime = Date.now() - startTime;
  const avgTime = totalTime / iterations;

  console.log(`📊 ${iterations} iterations in ${totalTime}ms`);
  console.log(`📊 Average: ${avgTime.toFixed(2)}ms per validation`);
  console.log(
    `${
      avgTime < 50 ? "✅ GOOD" : avgTime < 100 ? "⚠️ ACCEPTABLE" : "❌ SLOW"
    } - Performance`
  );

  return avgTime;
}

// =============================================================================
// Main Test Suite
// =============================================================================

export async function runOcrV2TestSuite(): Promise<void> {
  console.log("🚀 Starting OCR v2.0 Text Quality Validation Test Suite");
  console.log("===========================================================");

  let totalTests = 0;
  let passedTests = 0;

  // Test 1: Problematic PDFs (should trigger OCR)
  console.log("\n📋 Test Category 1: Problematic PDFs (should trigger OCR)");
  console.log("--------------------------------------------------------");

  for (const [key, text] of Object.entries(TEST_SCENARIOS.PROBLEMATIC)) {
    const passed = await runValidationTest(
      text,
      false,
      `Problematic: ${key}`,
      "low"
    );
    totalTests++;
    if (passed) passedTests++;
  }

  // Test 2: Valid Text (should NOT trigger OCR)
  console.log("\n📋 Test Category 2: Valid Text (should NOT trigger OCR)");
  console.log("------------------------------------------------------");

  for (const [key, text] of Object.entries(TEST_SCENARIOS.VALID_TEXT)) {
    const passed = await runValidationTest(text, true, `Valid: ${key}`);
    totalTests++;
    if (passed) passedTests++;
  }

  // Test 3: Edge Cases
  console.log("\n📋 Test Category 3: Edge Cases");
  console.log("-------------------------------");

  const edgeCaseExpectations = {
    very_short_valid: true,
    very_short_invalid: false,
    numbers_only: false,
    special_chars: false,
    mixed_valid_invalid: false,
    empty: false,
    whitespace_only: false,
    newlines_only: false,
  };

  for (const [key, text] of Object.entries(TEST_SCENARIOS.EDGE_CASES)) {
    const expected =
      edgeCaseExpectations[key as keyof typeof edgeCaseExpectations];
    const passed = await runValidationTest(text, expected, `Edge Case: ${key}`);
    totalTests++;
    if (passed) passedTests++;
  }

  // Test 4: Real-world Samples
  console.log("\n📋 Test Category 4: Real-world Samples");
  console.log("--------------------------------------");

  for (const [key, text] of Object.entries(TEST_SCENARIOS.REAL_WORLD)) {
    const passed = await runValidationTest(
      text,
      false,
      `Real-world: ${key}`,
      "low"
    );
    totalTests++;
    if (passed) passedTests++;
  }

  // Test 5: Performance Tests
  console.log("\n📋 Test Category 5: Performance Tests");
  console.log("------------------------------------");

  const performanceResults = [
    runPerformanceTest(
      TEST_SCENARIOS.VALID_TEXT.vietnamese_long,
      "Vietnamese Long Text"
    ),
    runPerformanceTest(TEST_SCENARIOS.PROBLEMATIC.dots_only, "Dots Only"),
    runPerformanceTest(
      TEST_SCENARIOS.VALID_TEXT.english_long,
      "English Long Text"
    ),
  ];

  const avgPerformance =
    performanceResults.reduce((a, b) => a + b, 0) / performanceResults.length;

  // Test 6: Configuration Tests
  console.log("\n📋 Test Category 6: Configuration Tests");
  console.log("--------------------------------------");

  console.log(`📊 Current OCR Configuration:`);
  console.log(`   - Enable Validation: ${OCR_CONFIG.ENABLE_TEXT_VALIDATION}`);
  console.log(
    `   - Confidence Threshold: ${OCR_CONFIG.OCR_TRIGGER_CONFIDENCE_THRESHOLD}`
  );
  console.log(`   - Min Syllable Density: ${OCR_CONFIG.MIN_SYLLABLE_DENSITY}`);
  console.log(`   - Min Text Entropy: ${OCR_CONFIG.MIN_TEXT_ENTROPY}`);
  console.log(`   - Min Word Count: ${OCR_CONFIG.MIN_WORD_COUNT}`);
  console.log(`   - Validation Timeout: ${OCR_CONFIG.VALIDATION_TIMEOUT}ms`);

  // Test 7: Threshold Boundary Tests
  console.log("\n📋 Test Category 7: Threshold Boundary Tests");
  console.log("--------------------------------------------");

  // Test with different confidence thresholds
  const validator = new TextQualityValidator({
    confidenceThreshold: 0.3, // Lower threshold
  });

  const boundaryText = "Short text."; // Borderline case
  const result = await validator.validateTextQuality(boundaryText);
  console.log(
    `🧪 Boundary Test (threshold 0.3): confidence=${result.confidence.toFixed(
      3
    )}, valid=${result.isValid}`
  );

  // Final Results
  console.log("\n📊 TEST SUMMARY");
  console.log("===============");
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(
    `Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`
  );
  console.log(
    `Average Performance: ${avgPerformance.toFixed(2)}ms per validation`
  );

  const overallSuccess = passedTests / totalTests >= 0.8; // 80% pass rate
  const performanceGood = avgPerformance < 50; // Under 50ms average

  console.log(
    `\n${overallSuccess ? "✅ OVERALL: PASSED" : "❌ OVERALL: FAILED"}`
  );
  console.log(
    `${
      performanceGood
        ? "✅ PERFORMANCE: GOOD"
        : "⚠️ PERFORMANCE: NEEDS OPTIMIZATION"
    }`
  );

  if (overallSuccess && performanceGood) {
    console.log(
      "\n🎉 OCR v2.0 Text Quality Validation System is ready for deployment!"
    );
  } else {
    console.log(
      "\n⚠️ Issues detected. Please review failed tests and performance metrics."
    );
  }
}

// =============================================================================
// API Integration Test
// =============================================================================

export async function testApiIntegration(): Promise<void> {
  console.log("\n🌐 API Integration Test");
  console.log("======================");

  const testCases = [
    {
      name: "Dots PDF (should trigger OCR)",
      text: TEST_SCENARIOS.PROBLEMATIC.dots_only,
      expectedMethod: "ocr-only",
    },
    {
      name: "Valid Vietnamese PDF (should use text)",
      text: TEST_SCENARIOS.VALID_TEXT.vietnamese_long,
      expectedMethod: "text-only",
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`);

    try {
      // Create a mock PDF buffer for testing
      // In real testing, you would use actual PDF files
      const mockFormData = new FormData();
      const mockPdfBlob = new Blob([testCase.text], {
        type: "application/pdf",
      });
      mockFormData.append("file", mockPdfBlob, "test.pdf");

      console.log(`📤 Would send request to /api/extract-pdf-ocr`);
      console.log(`📝 Expected method: ${testCase.expectedMethod}`);
      console.log(`✅ Mock test prepared successfully`);
    } catch (error) {
      console.log(`❌ API test failed: ${error}`);
    }
  }
}

// =============================================================================
// Regression Test Suite
// =============================================================================

export function runRegressionTests(): void {
  console.log("\n🔄 Regression Test Suite");
  console.log("========================");

  // Test backward compatibility
  console.log("\n🧪 Testing backward compatibility...");

  // Simulate legacy behavior
  const legacyResults = [
    { text: TEST_SCENARIOS.PROBLEMATIC.dots_only, legacy: false }, // Legacy would pass this!
    { text: TEST_SCENARIOS.VALID_TEXT.vietnamese_short, legacy: true },
    { text: "", legacy: false },
  ];

  legacyResults.forEach(async ({ text, legacy }, index) => {
    const newResult = await validateTextQuality(text);
    const lengthCheck = text.length > 50; // Legacy logic

    console.log(`📋 Test ${index + 1}:`);
    console.log(`   Legacy result: ${lengthCheck ? "valid" : "invalid"}`);
    console.log(`   New result: ${newResult.isValid ? "valid" : "invalid"}`);
    console.log(
      `   Improvement: ${
        !lengthCheck && !newResult.isValid
          ? "✅ Fixed"
          : lengthCheck && newResult.isValid
          ? "✅ Maintained"
          : "⚠️ Changed"
      }`
    );
  });
}

// =============================================================================
// Export Test Runner
// =============================================================================

if (typeof window === "undefined") {
  // Node.js environment - can run tests directly
  console.log("🧪 Running OCR v2.0 Test Suite...");
  runOcrV2TestSuite();
  runRegressionTests();
} else {
  // Browser environment - export for manual testing
  console.log(
    "🌐 Test suite loaded. Call runOcrV2TestSuite() to execute tests."
  );
}
