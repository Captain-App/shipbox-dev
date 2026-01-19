import { Scenario } from "../framework";
import { authScenarios } from "./auth-scenarios";
import { boxScenarios } from "./box-scenarios";
import { onboardingScenarios } from "./onboarding-scenarios";
import { integrationScenarios } from "./integration-scenarios";

/**
 * All scenario definitions combined (excluding integration scenarios)
 * Import specific scenario lists for targeted testing
 */
export const allScenarios: Scenario[] = [
  ...authScenarios,
  ...boxScenarios,
  ...onboardingScenarios,
];

/**
 * All scenarios including integration tests
 * Use this for full test suite runs
 */
export const allScenariosWithIntegration: Scenario[] = [
  ...allScenarios,
  ...integrationScenarios,
];

/**
 * Helper function to get scenarios by category
 */
export function scenariosByCategory(
  category: string,
): Scenario[] {
  return allScenariosWithIntegration.filter((s) =>
    s.categories.some((c) => c === category),
  );
}

/**
 * Print scenario statistics
 */
export function printScenarioStats(): void {
  console.log("\n📊 Scenario Statistics:");
  console.log(`   Total scenarios: ${allScenariosWithIntegration.length}`);
  console.log(`   Auth scenarios: ${authScenarios.length}`);
  console.log(`   Box scenarios: ${boxScenarios.length}`);
  console.log(`   Onboarding scenarios: ${onboardingScenarios.length}`);
  console.log(`   Integration scenarios: ${integrationScenarios.length}\n`);
}

// Re-export for convenience
export { authScenarios, boxScenarios, onboardingScenarios, integrationScenarios };
