import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import * as fs from "fs";
import { createZip } from "./helpers/zip";
import { login } from "./helpers/auth";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "https://localhost";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@epibridge.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";

const ANALYSIS_CODE = `\
import pandas as pd
df = pd.read_csv("/data/mexico_dengue_2026/demo.csv")
summary = df.describe()
summary.to_csv("/output/summary.csv")
print(f"Analysis complete. Processed {len(df)} rows, {len(df.columns)} columns.")
`;

test("Canonical Workflow", async ({ page }) => {
  const TS = Date.now();
  const projectName = `Canonical Workflow Test ${TS}`;
  const analysisName = `Test Analysis ${TS}`;

  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(page.getByTestId("header-user-name")).toHaveText(
    "Administrator",
  );

  // Publish platform terms via API (auto-accepts admin; version 2.0.0 avoids
  // conflict with seed-terms which uses 1.0.0)
  await page.request.post(`${BASE}/api/admin/terms/platform`, {
    data: {
      version: "2.0.0",
      title: "EpiBridge Platform Terms of Service",
      content: "## Terms\n\nBy using this platform you agree to these terms.",
    },
  });

  // Navigate to Environments page and verify environment discovery
  await page.getByRole("link", { name: "Environments" }).click();
  await expect(
    page.getByRole("heading", { name: "Execution Environments" }),
  ).toBeVisible();
  await expect(page.locator("table")).toBeVisible();
  await expect(page.getByText("Python 3.13").first()).toBeVisible();
  await page.getByText("Python 3.13").first().click();

  // Verify environment detail page
  await expect(
    page.getByRole("heading", { name: "Environment Details" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Local Development" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dockerfile" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Published Artefacts" }),
  ).toBeVisible();
  await expect(page.getByText("Pull the image")).toBeVisible();
  await expect(page.getByText("Run a container")).toBeVisible();

  // Navigate back and then to Projects page
  await page.getByRole("link", { name: "← Environments" }).click();
  await page.getByRole("link", { name: "Projects" }).click();

  // Create a new project
  await page.getByRole("button", { name: "Create Project" }).click();
  await page.getByPlaceholder("Project name").fill(projectName);
  await page
    .getByPlaceholder("Optional description")
    .fill("End-to-end test project");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create" })
    .click();

  // Open the project
  await page.getByText(projectName).click();
  await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();

  // Open the Resources tab and attach the Mexico dengue data resource
  await page.getByRole("link", { name: "Resources" }).click();
  await expect(page.getByText("Configure Resources")).toBeVisible();
  await page
    .locator("tr")
    .filter({ hasText: "mex-dengue-2026" })
    .getByRole("button", { name: "Attach" })
    .click();
  await expect(
    page.getByText("Mexico Dengue Surveillance 2026 — Terms of Service"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Acknowledge & Continue" }).click();
  await expect(page.getByText("mex-dengue-2026")).toBeVisible();

  // Open the Analysis tab
  await page.getByRole("link", { name: "Analysis" }).click();
  await expect(page.getByTestId("analysis-heading")).toBeVisible();

  // Navigate to Create Analysis
  await page.getByRole("link", { name: "Create Analysis" }).click();

  // Fill the form
  await page.getByLabel("Name").fill(analysisName);
  await page.getByLabel("Version").fill("1.0.0");
  await page.getByLabel("Entrypoint").fill("run.py");
  await page.getByLabel("Interpreter").selectOption("Python");
  await page
    .getByLabel("Execution Environment")
    .selectOption({ label: "Python 3.13" });
  await page.getByText("mex-dengue-2026").click();

  // Upload the analysis bundle ZIP
  const zipBuffer = createZip([
    { name: "run.py", content: ANALYSIS_CODE },
    { name: "requirements.txt", content: "" },
  ]);
  await page.locator('input[type="file"]').setInputFiles({
    name: "analysis-bundle.zip",
    mimeType: "application/zip",
    buffer: zipBuffer,
  });

  // Save
  await page.getByRole("button", { name: "Save" }).click();

  // Wait for redirect to analysis list, then open the bundle
  await page.waitForURL(/\/projects\/[^/]+\/analysis$/);
  await expect(page.getByTestId("analysis-heading")).toBeVisible();
  await expect(page.getByText(analysisName)).toBeVisible();
  await page.getByText(analysisName).click();

  // Submit the bundle (DRAFT → SUBMITTED) via the Submit button
  await page.getByRole("button", { name: "Submit" }).click();
  await expect(page.getByText("Submitted")).toBeVisible();

  // Approve the bundle (SUBMITTED → APPROVED_FOR_EXECUTION) via the Approve button
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Approved for Execution")).toBeVisible();

  // Run Analysis button is now visible; click it
  await page.getByRole("button", { name: "Run Analysis" }).click();

  // Wait for the Execution Request to transition: PENDING → RUNNING → COMPLETED
  await expect(
    page.locator("tr").filter({ hasText: analysisName }).getByText("completed"),
  ).toBeVisible({ timeout: 180_000 });

  // Navigate to Admin → Outputs to review and release the output set
  await page.getByRole("link", { name: "Admin" }).click();
  await page.getByRole("link", { name: "Outputs" }).click();

  // Find the output set row for this test's analysis and click Approve
  const setRow = page.locator("tr").filter({ hasText: analysisName }).first();
  await expect(setRow).toBeVisible({ timeout: 30_000 });
  await setRow.getByRole("button", { name: "Approve" }).click();
  await expect(setRow.getByText("Approved")).toBeVisible();

  // Click Release
  await setRow.getByRole("button", { name: "Release" }).click();
  await expect(setRow.getByText("Released")).toBeVisible();

  // Navigate back to the project outputs page
  await page.getByRole("link", { name: "Projects" }).click();
  await page.getByText(projectName).click();
  await page.getByRole("link", { name: "Outputs" }).click();

  // Download the Release Package ZIP
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download All" }).click(),
  ]);

  // Navigate to Admin Audit Log and verify governance events are recorded
  await page.getByRole("link", { name: "Admin" }).click();
  await page.getByRole("link", { name: "Audit Log" }).click();
  await expect(page.getByText("Audit Log")).toBeVisible();
  const auditTable = page.locator(".table");
  await expect(auditTable.getByText("project.created").first()).toBeVisible({
    timeout: 10_000,
  });
  await expect(auditTable.getByText("bundle.submitted").first()).toBeVisible();
  await expect(auditTable.getByText("bundle.approved").first()).toBeVisible();
  await expect(
    auditTable.getByText("execution.requested").first(),
  ).toBeVisible();
  await expect(
    auditTable.getByText("execution.completed").first(),
  ).toBeVisible();
  await expect(
    auditTable.getByText("output_set.approved").first(),
  ).toBeVisible();
  await expect(
    auditTable.getByText("output_set.released").first(),
  ).toBeVisible();

  // Verify the downloaded file is a ZIP containing summary.csv
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  if (downloadPath) {
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(0);

    const listing = execSync(`unzip -l "${downloadPath}"`, {
      encoding: "utf-8",
    });
    expect(listing).toContain("summary.csv");
    expect(listing).toContain("execution_metadata.json");
  }

  await page.getByRole("button", { name: "Sign out" }).click();
});
