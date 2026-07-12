import { test, expect } from "@playwright/test";
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

test("Execution Monitoring", async ({ page }) => {
  const TS = Date.now();
  const projectName = `Exec Monitor Test ${TS}`;
  const analysisName = `Analysis ${TS}`;

  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

  // Publish platform terms via API
  await page.request.post(`${BASE}/api/admin/terms/platform`, {
    data: {
      version: "2.0.0",
      title: "EpiBridge Platform Terms of Service",
      content: "## Terms\n\nBy using this platform you agree to these terms.",
    },
  });

  // Create a project
  await page.getByRole("link", { name: "Projects" }).click();
  await page.getByRole("button", { name: "Create Project" }).click();
  await page.getByPlaceholder("Project name").fill(projectName);
  await page.getByPlaceholder("Optional description").fill("Execution monitoring test project");
  await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();

  // Open the project
  await page.getByText(projectName).click();
  await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();

  // Attach the Mexico dengue data resource
  await page.getByRole("link", { name: "Resources", exact: true }).click();
  await expect(page.getByText("Configure Resources")).toBeVisible();
  await page
    .locator("tr")
    .filter({ hasText: "mex-dengue-2026" })
    .getByRole("button", { name: "Attach" })
    .click();
  await page.getByRole("button", { name: "Acknowledge & Continue" }).click();
  await expect(page.getByText("mex-dengue-2026")).toBeVisible();

  // Create a new Draft Bundle
  await page.getByRole("link", { name: "Analysis" }).click();
  await page.getByRole("button", { name: "New Draft Bundle" }).click();
  await page.waitForURL(/\/projects\/[^/]+\/analysis\/[^/]+$/);
  await expect(page.getByText("Draft — Editable")).toBeVisible();

  // Rename the draft
  await page.locator('input[type="text"]').first().fill(analysisName);

  // Upload analysis code
  const zipBuffer = createZip([
    { name: "run.py", content: ANALYSIS_CODE },
    { name: "requirements.txt", content: "" },
  ]);
  await page.getByRole("button", { name: "Upload ZIP" }).click();
  await page.getByText("Upload ZIP").click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "analysis-bundle.zip",
    mimeType: "application/zip",
    buffer: zipBuffer,
  });

  // Configure execution settings
  await page.getByLabel("Environment").selectOption({ label: "Python 3.13" });
  await page.locator("#edit-version-exec").fill("1.0.0");
  await page.waitForTimeout(1000);
  const entrypointSelect = page.locator("select").filter({ has: page.locator('option[value="run.py"]') }).first();
  if (await entrypointSelect.isVisible()) {
    await entrypointSelect.selectOption("run.py");
  }
  await page.getByLabel("Interpreter").selectOption("Python");
  await page.getByText("(mex-dengue-2026)").click();

  // Save and re-open
  await page.getByRole("button", { name: "Save and Close" }).click();
  await page.waitForURL(/\/projects\/[^/]+\/analysis$/);
  await page.getByText(analysisName).click();
  await page.waitForURL(/\/projects\/[^/]+\/analysis\/[^/]+$/);

  // Submit, approve, run
  await page.getByRole("button", { name: "Submit for Review" }).click();
  await expect(page.getByText("Submitted")).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Approved for Execution")).toBeVisible();
  await page.getByRole("button", { name: "Run Analysis" }).click();

  // Wait for completion
  await expect(
    page.locator("tr").filter({ hasText: analysisName }).getByText("completed"),
  ).toBeVisible({ timeout: 180_000 });

  // ---------------------------------------------------------------
  // Execution Monitoring tests begin here
  // ---------------------------------------------------------------

  // Navigate to Admin → Executions
  await page.getByRole("link", { name: "Admin" }).click();
  await page.getByRole("link", { name: "Executions" }).click();
  await expect(page.getByText("Execution Monitoring")).toBeVisible();

  // The default filter is Pending (auto-refresh active).
  // The execution is completed, so Pending filter should show empty state.
  await expect(page.getByText("No pending execution requests.")).toBeVisible();

  // Switch to Running filter — also empty state (execution is completed).
  await page.getByRole("button", { name: "Running" }).click();
  await expect(page.getByText("No running execution requests.")).toBeVisible();

  // Switch to All filter to see the completed execution.
  await page.getByRole("button", { name: "All" }).click();
  await expect(
    page.locator("tr").filter({ hasText: analysisName }).first(),
  ).toBeVisible({ timeout: 15_000 });

  // Verify the status badge shows Completed.
  await expect(
    page.locator("tr").filter({ hasText: analysisName }).first().getByText("Completed"),
  ).toBeVisible();

  // Click the analysis name to expand the execution log.
  await page
    .locator("tr")
    .filter({ hasText: analysisName })
    .first()
    .locator("td")
    .first()
    .click();
  await expect(page.getByText("Execution Log")).toBeVisible();

  // Verify log content contains expected output (the completion log includes analysis name).
  await expect(page.getByText(/EXECUTION COMPLETED/)).toBeVisible();
  await expect(page.getByText("50 rows")).toBeVisible();

  // Collapse the log.
  await page
    .locator("tr")
    .filter({ hasText: analysisName })
    .first()
    .locator("td")
    .first()
    .click();
  await expect(page.getByText("Execution Log")).not.toBeVisible();

  // Switch to Completed filter directly.
  await page.getByRole("button", { name: "Completed" }).click();
  await expect(
    page.locator("tr").filter({ hasText: analysisName }).first(),
  ).toBeVisible({ timeout: 10_000 });

  // Verify the manual Refresh button exists and is functional.
  await page.getByRole("button", { name: "Refresh" }).click();
  await expect(
    page.locator("tr").filter({ hasText: analysisName }).first(),
  ).toBeVisible({ timeout: 10_000 });
});
