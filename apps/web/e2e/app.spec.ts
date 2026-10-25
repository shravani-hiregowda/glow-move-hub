import { test, expect } from "@playwright/test";

/**
 * JERAI FIT — End-to-End Suite
 *
 * NOTE ON SECURITY LIMITATIONS:
 * The current application uses client-side localStorage token simulation
 * ('glow_move_auth_token' = 'authenticated') and hardcoded portal checks.
 * This suite verifies the current UI behavior as built, while explicitly
 * documenting that true authentication and authorization enforcement will be
 * migrated to trusted server endpoints in Phase 4.
 */

test.describe("Public Application Experience", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads the public homepage and renders header and branding", async ({ page }) => {
    // Check navigation brand
    await expect(page.locator("nav")).toContainText("JERAI");
    await expect(page.locator("nav")).toContainText("FIT");

    // Check Hero section content
    const heading = page.locator("h1");
    await expect(heading).toContainText(/Transform Your/i);
  });

  test("displays workout catalog with exercise cards", async ({ page }) => {
    // Scroll to workouts section
    const workoutsSection = page.locator("text=Explore Workouts");
    await expect(workoutsSection).toBeVisible();

    // Verify default workout card is visible
    const pushupCard = page.locator("text=Push-Up Power");
    await expect(pushupCard).toBeVisible();
  });

  test("filters workouts dynamically via search input", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search workouts...");
    await expect(searchInput).toBeVisible();

    // Type search query
    await searchInput.fill("Dumbbell Bench Press");

    // Push-Up Power should be filtered out
    await expect(page.locator("text=Dumbbell Bench Press")).toBeVisible();
    await expect(page.locator("text=Push-Up Power")).not.toBeVisible();
  });

  test("opens workout details modal and closes it", async ({ page }) => {
    // Click on Push-Up Power workout card
    const card = page.locator("text=Push-Up Power").first();
    await card.click();

    // Modal should appear with focus instructions and timer
    const modalHeading = page.locator("h2:has-text('Push-Up Power')");
    await expect(modalHeading).toBeVisible();
    await expect(page.locator("text=Focus Mode Instructions")).toBeVisible();
    await expect(page.locator("text=Workout Timer")).toBeVisible();

    // Close the modal via the close button (top right X)
    const closeButton = page.locator("button:has(svg.lucide-x)").first();
    await closeButton.click();

    // Modal heading should disappear
    await expect(modalHeading).not.toBeVisible();
  });

  test("toggles theme between dark and light modes", async ({ page }) => {
    const htmlElement = page.locator("html");

    // Find the theme toggle button in navbar (contains Lucide Sun or Moon icon)
    const themeButton = page.locator("nav button:has(svg.lucide-sun), nav button:has(svg.lucide-moon)").first();
    await expect(themeButton).toBeVisible();

    const initialIsDark = await htmlElement.evaluate((el) => el.classList.contains("dark"));

    // Toggle theme
    await themeButton.click();

    const afterToggleIsDark = await htmlElement.evaluate((el) => el.classList.contains("dark"));
    expect(afterToggleIsDark).not.toBe(initialIsDark);
  });
});

test.describe("Admin Route Protection (Client-Side Simulated Gate)", () => {
  test("unauthenticated visitor navigating to /admin is redirected to /login", async ({ page }) => {
    // Ensure clean storage state
    await page.addInitScript(() => {
      localStorage.removeItem("glow_move_auth_token");
    });

    await page.goto("/admin");

    // ProtectedRoute should redirect unauthenticated users to /login
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator("h1")).toContainText(/Admin Portal/i);
  });

  test("authenticating via admin portal grants access to /admin dashboard", async ({ page }) => {
    await page.goto("/login");

    // Fill credentials matching current client implementation
    await page.getByPlaceholder("Username").fill("mainAdmin");
    await page.getByPlaceholder("Password").fill("mainAdmin@123");

    // Click Authenticate
    await page.getByRole("button", { name: /authenticate/i }).click();

    // Verify redirected to /admin
    await expect(page).toHaveURL(/.*\/admin/);
    await expect(page.locator("h1")).toContainText(/Admin Dashboard/i);
  });
});
