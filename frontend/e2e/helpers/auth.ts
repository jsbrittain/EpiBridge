import { expect, type Page } from "@playwright/test";

export async function login(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Authentication is complete once the application has left the login page.
  // The AuthGate is the single authority responsible for post-authentication
  // routing. Depending on governance state, users may arrive at `/terms` or
  // directly within the application.
  //
  // After this point, authentication is established and the AuthGate
  // has made its routing decision (terms redirect or full app).
  await page.waitForFunction(
    () => !window.location.pathname.startsWith("/login"),
    { timeout: 15000 },
  );

  // If the AuthGate redirected to /terms, accept and continue.
  if (page.url().includes("/terms")) {
    await expect(
      page.getByRole("button", { name: "Accept" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Accept" }).click();
    await page.waitForFunction(
      () => !window.location.pathname.startsWith("/terms"),
      { timeout: 15000 },
    );
  }
}
