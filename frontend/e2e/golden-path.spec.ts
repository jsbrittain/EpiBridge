import { test, expect } from "@playwright/test";
import fs from "fs";
import { createZip } from "./helpers/zip";

const TS = Date.now();

const ANALYSIS_CODE = `\
import pandas as pd
df = pd.read_csv("/data/mexico_dengue_2026/demo.csv")
summary = df.describe()
summary.to_csv("/output/summary.csv")
print(f"Analysis complete. Processed {len(df)} rows, {len(df.columns)} columns.")
`;

test("Golden Path: researcher creates project, uploads bundle, runs analysis, downloads output", async ({
  page,
}) => {
  // 1. Open EpiBridge
  await page.goto("/");

  // 2. Logged in automatically via dev auth — verify header shows user
  await expect(page.getByText("Administrator")).toBeVisible();

  // 3. Navigate to Projects page
  await page.getByRole("link", { name: "Projects" }).click();

  // 4. Create a new project
  await page.getByRole("button", { name: "Create Project" }).click();
  await page.getByPlaceholder("Project name").fill(`Golden Path Test ${TS}`);
  await page.getByPlaceholder("Optional description").fill("End-to-end test project");
  await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();

  // 5. Open the project
  await page.getByText(`Golden Path Test ${TS}`).click();
  await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();

  // 6. Open the Resources tab and attach the Mexico dengue data resource
  await page.getByRole("link", { name: "Resources" }).click();
  await expect(page.getByText("Configure Resources")).toBeVisible();
  await page.locator("tr").filter({ hasText: "mex-dengue-2026" }).getByRole("button", { name: "Attach" }).click();
  // Wait for the attached resource to appear
  await expect(page.getByText("mex-dengue-2026")).toBeVisible();

  // 7. Open the Analysis tab
  await page.getByRole("link", { name: "Analysis" }).click();
  await expect(page.getByRole("heading", { name: "Analysis Bundles" })).toBeVisible();

  // 8. Navigate to Create Analysis
  await page.getByRole("link", { name: "Create Analysis" }).click();

  // 9. Fill the form
  await page.getByLabel("Name").fill(`Test Analysis ${TS}`);
  await page.getByLabel("Version").fill("1.0.0");
  await page.getByLabel("Entrypoint").fill("run.py");
  await page.getByLabel("Execution Environment").selectOption({ label: "Python 3.13 Scientific (python-3.13)" });
  // Select the Mexico Dengue data resource for this bundle
  await page.getByText("mex-dengue-2026").click();

  // 10. Upload the analysis bundle ZIP
  const zipBuffer = createZip([{ name: "run.py", content: ANALYSIS_CODE }]);
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "analysis-bundle.zip", mimeType: "application/zip", buffer: zipBuffer });

  // 11. Save
  await page.getByRole("button", { name: "Save" }).click();

  // 12. Wait for redirect to analysis list, then open the bundle
  await expect(page.getByRole("heading", { name: "Analysis Bundles" })).toBeVisible();
  await page.getByText(`Test Analysis ${TS}`).click();

  // 13. Click Run Analysis
  await page.getByRole("button", { name: "Run Analysis" }).click();

  // 14. Wait for the Execution Request to transition: PENDING → RUNNING → COMPLETED
  await expect(page.getByText("completed").first()).toBeVisible({ timeout: 180_000 });

  // 15. Open the Outputs tab
  await page.getByRole("link", { name: "Outputs" }).click();

  // 16. Download summary.csv
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download" }).first().click(),
  ]);

  // 17. Verify the downloaded file exists and is non-empty
  expect(download.suggestedFilename()).toBe("summary.csv");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  if (downloadPath) {
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(0);
  }
});
