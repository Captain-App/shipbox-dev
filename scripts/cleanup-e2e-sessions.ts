#!/usr/bin/env npx tsx

/**
 * Cleanup script for E2E test sessions.
 *
 * Finds and deletes sessions with "E2E Test" prefix that may have been
 * left behind by failed integration tests.
 *
 * Usage:
 *   npx tsx scripts/cleanup-e2e-sessions.ts
 *
 * Or with npm script:
 *   npm run cleanup:e2e
 *
 * Environment variables:
 *   E2E_TEST_EMAIL - Email for authentication
 *   E2E_TEST_PASSWORD - Password for authentication
 *   DRY_RUN=true - List sessions without deleting
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://app.captainapp.co.uk";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";
const E2E_PREFIX = "E2E Test";

interface Session {
  id: string;
  title: string;
  created_at: string;
  user_id: string;
}

async function main() {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  const dryRun = process.env.DRY_RUN === "true";

  if (!email || !password) {
    console.error("Error: E2E_TEST_EMAIL and E2E_TEST_PASSWORD are required");
    console.error("\nUsage:");
    console.error("  export E2E_TEST_EMAIL=your-email@example.com");
    console.error("  export E2E_TEST_PASSWORD=your-password");
    console.error("  npx tsx scripts/cleanup-e2e-sessions.ts");
    process.exit(1);
  }

  if (!SUPABASE_ANON_KEY) {
    console.error("Error: VITE_SUPABASE_ANON_KEY environment variable is required");
    process.exit(1);
  }

  console.log("=".repeat(60));
  console.log("E2E Session Cleanup Script");
  console.log("=".repeat(60));
  console.log(`Mode: ${dryRun ? "DRY RUN (no deletions)" : "LIVE (will delete)"}`);
  console.log(`Looking for sessions with prefix: "${E2E_PREFIX}"`);
  console.log("");

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Authenticate
  console.log("Authenticating...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    console.error("Authentication failed:", authError.message);
    process.exit(1);
  }

  const userId = authData.user?.id;
  if (!userId) {
    console.error("No user ID found after authentication");
    process.exit(1);
  }

  console.log(`Authenticated as: ${email} (${userId})`);
  console.log("");

  // Find E2E test sessions
  console.log("Searching for E2E test sessions...");
  const { data: sessions, error: fetchError } = await supabase
    .from("sessions")
    .select("id, title, created_at, user_id")
    .eq("user_id", userId)
    .ilike("title", `${E2E_PREFIX}%`)
    .order("created_at", { ascending: false });

  if (fetchError) {
    console.error("Failed to fetch sessions:", fetchError.message);
    process.exit(1);
  }

  if (!sessions || sessions.length === 0) {
    console.log("No E2E test sessions found.");
    console.log("=".repeat(60));
    process.exit(0);
  }

  console.log(`Found ${sessions.length} E2E test session(s):\n`);

  for (const session of sessions as Session[]) {
    const createdDate = new Date(session.created_at).toLocaleString();
    console.log(`  - ${session.title}`);
    console.log(`    ID: ${session.id}`);
    console.log(`    Created: ${createdDate}`);
    console.log("");
  }

  if (dryRun) {
    console.log("DRY RUN: No sessions were deleted.");
    console.log("Run without DRY_RUN=true to delete these sessions.");
    console.log("=".repeat(60));
    process.exit(0);
  }

  // Delete sessions
  console.log("Deleting sessions...");
  let deleted = 0;
  let failed = 0;

  for (const session of sessions as Session[]) {
    console.log(`  Deleting: ${session.title} (${session.id})...`);

    const { error: deleteError } = await supabase
      .from("sessions")
      .delete()
      .eq("id", session.id);

    if (deleteError) {
      console.log(`    FAILED: ${deleteError.message}`);
      failed++;
    } else {
      console.log(`    OK`);
      deleted++;
    }
  }

  console.log("");
  console.log("=".repeat(60));
  console.log(`Results: ${deleted} deleted, ${failed} failed`);
  console.log("=".repeat(60));

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
