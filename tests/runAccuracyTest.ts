import Anthropic from "@anthropic-ai/sdk";
import { TEST_CASES } from "./colorTestData";
import { fetchCelebrityPhoto, downloadPhotoAsBase64 } from "./photoFetcher";
import { COLOR_ANALYSIS_SYSTEM_PROMPT } from "../server/prompts/colorAnalysis";
import * as fs from "fs";
import * as dotenv from "dotenv";
import * as path from "path";

// Load env from project root
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface TestResult {
  name: string;
  expectedSeason: string;
  predictedSeason: string;
  expectedUndertone: string;
  predictedUndertone: string;
  confidence: number;
  seasonMatch: boolean;
  undertoneMatch: boolean;
  familyMatch: boolean;
  reasoning: string;
  photoUrl: string | null;
  error?: string;
}

function getSeasonFamily(season: string): string {
  const s = season.toLowerCase();
  if (s.includes("spring")) return "Spring";
  if (s.includes("summer")) return "Summer";
  if (s.includes("autumn") || s.includes("fall")) return "Autumn";
  if (s.includes("winter")) return "Winter";
  return "Unknown";
}

async function analyzePhoto(
  base64Image: string,
  mimeType: string = "image/jpeg"
): Promise<Record<string, unknown>> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: COLOR_ANALYSIS_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType as "image/jpeg",
              data: base64Image,
            },
          },
          {
            type: "text",
            text: "Analyze this person's personal color season. This is 1 photo: face in natural light. Return the full color analysis JSON.",
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      const cleaned = braceMatch[0]
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]");
      return JSON.parse(cleaned);
    }
    throw new Error("Could not parse AI response as JSON");
  }
}

async function runTests() {
  console.log("\n🎨 AURA COLOR ANALYSIS ACCURACY TEST (Anthropic Claude)\n");
  console.log(`Testing ${TEST_CASES.length} celebrity cases...\n`);
  console.log("=".repeat(60));

  const results: TestResult[] = [];
  let passed = 0;
  let familyPassed = 0;

  for (const testCase of TEST_CASES) {
    console.log(`\n📸 Testing: ${testCase.name}`);
    console.log(`   Expected: ${testCase.expectedSeason} (${testCase.expectedUndertone})`);

    const result: TestResult = {
      name: testCase.name,
      expectedSeason: testCase.expectedSeason,
      predictedSeason: "unknown",
      expectedUndertone: testCase.expectedUndertone,
      predictedUndertone: "unknown",
      confidence: 0,
      seasonMatch: false,
      undertoneMatch: false,
      familyMatch: false,
      reasoning: "",
      photoUrl: null,
    };

    try {
      // Step 1: Get photo
      const photoUrl = await fetchCelebrityPhoto(testCase);
      result.photoUrl = photoUrl;

      if (!photoUrl) {
        result.error = "Could not find photo";
        results.push(result);
        console.log(`   ⚠️  Skipped - no photo found`);
        continue;
      }

      // Step 2: Download as base64
      const downloaded = await downloadPhotoAsBase64(photoUrl);
      if (!downloaded) {
        result.error = "Could not download photo";
        results.push(result);
        console.log(`   ⚠️  Skipped - could not download photo`);
        continue;
      }

      // Step 3: Analyze with retry for rate limits
      console.log(`   Analyzing...`);
      let analysis: Record<string, unknown> | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          analysis = await analyzePhoto(downloaded.data, downloaded.mimeType);
          break;
        } catch (retryErr: unknown) {
          const msg = retryErr instanceof Error ? retryErr.message : String(retryErr);
          if (msg.includes("429") || msg.includes("rate")) {
            const waitSec = 15 * (attempt + 1);
            console.log(`   ⏳ Rate limited, waiting ${waitSec}s (attempt ${attempt + 1}/3)...`);
            await new Promise((r) => setTimeout(r, waitSec * 1000));
          } else {
            throw retryErr;
          }
        }
      }
      if (!analysis) {
        result.error = "Rate limit exceeded after 3 retries";
        results.push(result);
        console.log(`   ⚠️  Skipped - rate limit exceeded`);
        continue;
      }

      // Handle low confidence
      if (analysis.error === "low_confidence") {
        result.error = `Low confidence: ${analysis.message}`;
        results.push(result);
        console.log(`   ⚠️  Low confidence - ${analysis.message}`);
        continue;
      }

      result.predictedSeason = (analysis.season as string) || "unknown";
      result.predictedUndertone = (analysis.undertone as string) || "unknown";
      result.confidence = (analysis.confidence as number) || 0;
      result.reasoning = (analysis.reasoning as string) || "";

      // Normalize undertone for comparison
      const predictedUndertoneNorm = result.predictedUndertone.toLowerCase();
      const undertoneMatch =
        predictedUndertoneNorm.includes(testCase.expectedUndertone) ||
        (testCase.expectedUndertone === "neutral" &&
          (predictedUndertoneNorm.includes("neutral") ||
            predictedUndertoneNorm.includes("warm-neutral") ||
            predictedUndertoneNorm.includes("cool-neutral")));

      // Step 4: Score
      result.seasonMatch =
        result.predictedSeason.toLowerCase() ===
        testCase.expectedSeason.toLowerCase();
      result.undertoneMatch = undertoneMatch;
      result.familyMatch =
        getSeasonFamily(result.predictedSeason) ===
        getSeasonFamily(testCase.expectedSeason);

      if (result.seasonMatch) {
        passed++;
        console.log(
          `   ✅ CORRECT - ${result.predictedSeason} (${result.confidence}% confidence)`
        );
      } else if (result.familyMatch) {
        familyPassed++;
        console.log(
          `   🔶 FAMILY MATCH - Got ${result.predictedSeason}, expected ${testCase.expectedSeason}`
        );
      } else {
        console.log(
          `   ❌ WRONG - Got ${result.predictedSeason}, expected ${testCase.expectedSeason}`
        );
        console.log(`      Reasoning: ${result.reasoning.substring(0, 150)}...`);
      }

      if (!result.undertoneMatch) {
        console.log(
          `      Undertone: got "${result.predictedUndertone}", expected "${testCase.expectedUndertone}"`
        );
      }

      // Small delay between requests
      await new Promise((r) => setTimeout(r, 1000));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      result.error = message;
      console.log(`   💥 ERROR - ${message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }

    results.push(result);
  }

  // Generate report
  const totalTested = results.filter((r) => !r.error).length;
  const exactAccuracy =
    totalTested > 0 ? ((passed / totalTested) * 100).toFixed(1) : "0";
  const familyAccuracy =
    totalTested > 0
      ? (((passed + familyPassed) / totalTested) * 100).toFixed(1)
      : "0";
  const undertoneCorrect = results.filter(
    (r) => !r.error && r.undertoneMatch
  ).length;
  const undertoneAccuracy =
    totalTested > 0
      ? ((undertoneCorrect / totalTested) * 100).toFixed(1)
      : "0";

  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST REPORT");
  console.log("=".repeat(60));
  console.log(`Total cases:         ${TEST_CASES.length}`);
  console.log(`Successfully tested: ${totalTested}`);
  console.log(
    `Skipped/errors:      ${results.filter((r) => r.error).length}`
  );
  console.log(
    `\nExact season match:  ${passed}/${totalTested} (${exactAccuracy}%)`
  );
  console.log(
    `Family match:        ${passed + familyPassed}/${totalTested} (${familyAccuracy}%)`
  );
  console.log(
    `Undertone match:     ${undertoneCorrect}/${totalTested} (${undertoneAccuracy}%)`
  );

  // Show failures
  const failures = results.filter((r) => !r.seasonMatch && !r.error);
  if (failures.length > 0) {
    console.log("\nMISMATCHES:");
    failures.forEach((r) => {
      const icon = r.familyMatch ? "🔶" : "❌";
      console.log(
        `  ${icon} ${r.name}: expected ${r.expectedSeason}, got ${r.predictedSeason} (${r.confidence}%)`
      );
    });
  }

  // Season distribution bias check
  console.log("\nSEASON DISTRIBUTION (bias check):");
  const distribution: Record<string, number> = {};
  results
    .filter((r) => !r.error)
    .forEach((r) => {
      const family = getSeasonFamily(r.predictedSeason);
      distribution[family] = (distribution[family] || 0) + 1;
    });
  Object.entries(distribution)
    .sort(([, a], [, b]) => b - a)
    .forEach(([season, count]) => {
      const pct = ((count / totalTested) * 100).toFixed(0);
      const bar = "█".repeat(Math.round(count * 3));
      console.log(`  ${season.padEnd(8)} ${bar} ${count} (${pct}%)`);
    });

  // Benchmarks
  console.log("\nBENCHMARKS:");
  const familyPct = parseFloat(familyAccuracy);
  const exactPct = parseFloat(exactAccuracy);
  console.log(
    `  Family accuracy ≥ 85%: ${familyPct >= 85 ? "✅ PASS" : "❌ FAIL"} (${familyAccuracy}%)`
  );
  console.log(
    `  Exact accuracy  ≥ 60%: ${exactPct >= 60 ? "✅ PASS" : "❌ FAIL"} (${exactAccuracy}%)`
  );

  // Save detailed JSON report
  const report = {
    timestamp: new Date().toISOString(),
    prompt: "Aura generalized system prompt",
    model: "claude-sonnet-4-20250514",
    summary: {
      total: TEST_CASES.length,
      tested: totalTested,
      exactMatches: passed,
      familyMatches: passed + familyPassed,
      undertoneMatches: undertoneCorrect,
      exactAccuracy: exactAccuracy + "%",
      familyAccuracy: familyAccuracy + "%",
      undertoneAccuracy: undertoneAccuracy + "%",
    },
    distribution,
    results,
  };

  const reportPath = path.join(__dirname, "accuracy-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Full report saved to ${reportPath}`);
}

runTests().catch(console.error);
