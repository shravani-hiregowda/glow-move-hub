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
    const pushupCard = page.getByRole("heading", { name: "Push-Up Power" }).first();
    await expect(pushupCard).toBeVisible();
  });

  test("displays workout catalog exercise cards with valid image references", async ({ page }) => {
    const workoutsSection = page.locator("text=Explore Workouts");
    await expect(workoutsSection).toBeVisible();

    const pushupCard = page.getByRole("heading", { name: "Push-Up Power" }).first();
    await expect(pushupCard).toBeVisible();

    const cardImage = page.locator("img").first();
    await expect(cardImage).toBeVisible();
    const src = await cardImage.getAttribute("src");
    expect(src).toBeTruthy();
    expect(src).toMatch(/(\/api\/v1\/media\/file\/|\/assets\/|data:image\/|https?:\/\/)/);
  });

  test("filters workouts dynamically via search input", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Search workouts...");
    await expect(searchInput).toBeVisible();

    // Type search query
    await searchInput.fill("Dumbbell Bench Press");

    // Push-Up Power should be filtered out
    await expect(page.getByRole("heading", { name: "Dumbbell Bench Press" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Push-Up Power" })).not.toBeVisible();
  });

  test("opens workout details modal and closes it", async ({ page }) => {
    // Click on Push-Up Power workout card
    const card = page.getByRole("heading", { name: "Push-Up Power" }).first();
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

test.describe.serial("Phase 4 Authentication & Server-Enforced RBAC", () => {
  const timestamp = Date.now();
  const TEST_ADMIN_EMAIL = `e2e-admin-${timestamp}@test.local`;
  const TEST_ADMIN_PASSWORD = "E2EAdminPassword123!";
  const TEST_MEMBER_EMAIL = `e2e-member-${timestamp}@test.local`;
  const TEST_MEMBER_PASSWORD = "E2EMemberPassword123!";

  test.beforeAll(async () => {
    // Dynamically initialize dedicated test admin in database
    const { PrismaClient } = await import("@prisma/client");
    const argon2 = (await import("argon2")).default;
    const prisma = new PrismaClient();

    try {
      const passwordHash = await argon2.hash(TEST_ADMIN_PASSWORD, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      });

      await prisma.user.create({
        data: {
          email: TEST_ADMIN_EMAIL,
          passwordHash,
          role: "ADMIN",
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  });

  test.afterAll(async () => {
    // Clean up dedicated test users and any created sessions
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    try {
      await prisma.session.deleteMany({
        where: {
          user: {
            email: {
              startsWith: "e2e-",
            },
          },
        },
      });

      await prisma.user.deleteMany({
        where: {
          email: {
            startsWith: "e2e-",
          },
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  });

  test("1. Login page loads without console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/login");
    await expect(page.locator("h1")).toContainText(/Access Portal|Create Account/i);
    await expect(page.getByPlaceholder("Email address")).toBeVisible();
    await expect(page.getByPlaceholder(/Password/i)).toBeVisible();

    const unexpectedErrors = consoleErrors.filter(
      (err) => !err.includes("401") && !err.includes("Unauthorized")
    );
    expect(unexpectedErrors).toEqual([]);
  });

  test("2. Unauthenticated visitor navigating to /admin is redirected away", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator("h1")).toContainText(/Access Portal/i);
  });

  test("3. Member can register and log in", async ({ page }) => {
    await page.goto("/login");

    // Switch to register mode
    await page.getByRole("button", { name: /register/i }).click();
    await expect(page.locator("h1")).toContainText(/Create Account/i);

    // Fill registration credentials
    await page.getByPlaceholder("Email address").fill(TEST_MEMBER_EMAIL);
    await page.getByPlaceholder(/Password/i).fill(TEST_MEMBER_PASSWORD);

    // Submit registration
    await page.getByRole("button", { name: /create member account/i }).click();

    // Registration succeeds and redirects member to home page
    await expect(page).toHaveURL(/\/?$/);
  });

  test("4. Authentication survives a page refresh through /api/v1/auth/me", async ({ page }) => {
    // Log in as registered member
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill(TEST_MEMBER_EMAIL);
    await page.getByPlaceholder(/Password/i).fill(TEST_MEMBER_PASSWORD);
    const [loginResponse] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/v1/auth/login")),
      page.getByRole("button", { name: /authenticate/i }).click(),
    ]);
    expect(loginResponse.status()).toBe(200);
    await expect(page).toHaveURL(/\/?$/);

    // Reload page and verify /api/v1/auth/me confirms authenticated session
    const [meResponse] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/v1/auth/me")),
      page.reload(),
    ]);
    expect(meResponse.status()).toBe(200);
    const body = await meResponse.json();
    const user = body.data?.user || body.user;
    expect(user.email).toBe(TEST_MEMBER_EMAIL);
    expect(user.role).toBe("MEMBER");
  });

  test("5. Member cannot access administrator-only operations", async ({ page }) => {
    // Log in as MEMBER
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill(TEST_MEMBER_EMAIL);
    await page.getByPlaceholder(/Password/i).fill(TEST_MEMBER_PASSWORD);
    const [loginResponse] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/v1/auth/login")),
      page.getByRole("button", { name: /authenticate/i }).click(),
    ]);
    expect(loginResponse.status()).toBe(200);
    await expect(page).toHaveURL(/\/?$/);

    // Attempt to access /admin
    await page.goto("/admin");
    // Verify ProtectedRoute renders Access Restricted gate
    await expect(page.locator("h2")).toContainText(/Access Restricted/i);
    await expect(page.locator("text=Administrator privileges are required")).toBeVisible();
    await expect(page.locator("text=Manage your workout library")).not.toBeVisible();
  });

  test("6. Administrator can log in and access the intended admin interface", async ({ page }) => {
    await page.goto("/login");

    await page.getByPlaceholder("Email address").fill(TEST_ADMIN_EMAIL);
    await page.getByPlaceholder(/Password/i).fill(TEST_ADMIN_PASSWORD);
    const [loginResponse] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/v1/auth/login")),
      page.getByRole("button", { name: /authenticate/i }).click(),
    ]);
    expect(loginResponse.status()).toBe(200);

    // Verify redirected to /admin
    await expect(page).toHaveURL(/.*\/admin/);
    await expect(page.locator("h1")).toContainText(/Admin.*Dashboard/i);
    await expect(page.locator("text=Manage your workout library")).toBeVisible();
  });

  test("7. Logout clears the authenticated state and revokes the server session", async ({ page }) => {
    // Log in as administrator
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill(TEST_ADMIN_EMAIL);
    await page.getByPlaceholder(/Password/i).fill(TEST_ADMIN_PASSWORD);
    const [loginResponse] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/v1/auth/login")),
      page.getByRole("button", { name: /authenticate/i }).click(),
    ]);
    expect(loginResponse.status()).toBe(200);
    await expect(page).toHaveURL(/.*\/admin/);

    // Click Log Out and wait for server response
    const [logoutResponse] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/v1/auth/logout")),
      page.getByRole("button", { name: /log out/i }).click(),
    ]);
    expect(logoutResponse.status()).toBe(200);

    // Verify redirected to login portal
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("8. Revoked session cannot regain access simply by refreshing the page", async ({ page }) => {
    // Log in as administrator then log out
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill(TEST_ADMIN_EMAIL);
    await page.getByPlaceholder(/Password/i).fill(TEST_ADMIN_PASSWORD);
    const [loginResponse] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/v1/auth/login")),
      page.getByRole("button", { name: /authenticate/i }).click(),
    ]);
    expect(loginResponse.status()).toBe(200);
    await expect(page).toHaveURL(/.*\/admin/);

    const [logoutResponse] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/v1/auth/logout")),
      page.getByRole("button", { name: /log out/i }).click(),
    ]);
    expect(logoutResponse.status()).toBe(200);
    await expect(page).toHaveURL(/.*\/login/);

    // Refresh page
    await page.reload();
    await expect(page).toHaveURL(/.*\/login/);

    // Attempt to access /admin with revoked session
    await page.goto("/admin");
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator("text=Manage your workout library")).not.toBeVisible();
  });

  test("9. Administrator workout editor renders workout image upload area", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill(TEST_ADMIN_EMAIL);
    await page.getByPlaceholder(/Password/i).fill(TEST_ADMIN_PASSWORD);
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/v1/auth/login")),
      page.getByRole("button", { name: /authenticate/i }).click(),
    ]);

    await expect(page).toHaveURL(/.*\/admin/);
    await page.getByRole("button", { name: /add workout/i }).click();

    // Verify image upload label is visible
    await expect(page.locator("text=Workout Image")).toBeVisible();
    await expect(page.locator("text=PNG, JPG or WEBP (Max 5MB)")).toBeVisible();
  });
});
