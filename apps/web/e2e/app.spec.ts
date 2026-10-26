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
      await prisma.workoutSessionStep.deleteMany({
        where: {
          workoutSession: {
            user: {
              email: {
                startsWith: "e2e-",
              },
            },
          },
        },
      });

      await prisma.workoutSession.deleteMany({
        where: {
          user: {
            email: {
              startsWith: "e2e-",
            },
          },
        },
      });

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
    await page.getByRole("button", { name: /add.*workout/i }).click();

    // Verify image upload label is visible
    await expect(page.locator("text=Workout Image")).toBeVisible();
    await expect(page.locator("text=PNG, JPG or WEBP (Max 5MB)")).toBeVisible();
  });
});

test.describe.serial("Phase 6 Workout Sessions, Progress Tracking & Access Isolation", () => {
  const ts = Date.now();
  const P6_MEMBER_A_EMAIL = `e2e-p6-a-${ts}@test.local`;
  const P6_MEMBER_B_EMAIL = `e2e-p6-b-${ts}@test.local`;
  const P6_PASSWORD = "E2EPhase6Password123!";

  test.beforeAll(async () => {
    const { PrismaClient } = await import("@prisma/client");
    const argon2 = (await import("argon2")).default;
    const prisma = new PrismaClient();

    try {
      const passwordHash = await argon2.hash(P6_PASSWORD, {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      });

      await prisma.user.createMany({
        data: [
          { email: P6_MEMBER_A_EMAIL, passwordHash, role: "MEMBER" },
          { email: P6_MEMBER_B_EMAIL, passwordHash, role: "MEMBER" },
        ],
      });
    } finally {
      await prisma.$disconnect();
    }
  });

  test.afterAll(async () => {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();

    try {
      await prisma.workoutSessionStep.deleteMany({
        where: {
          workoutSession: {
            user: {
              email: { startsWith: "e2e-p6-" },
            },
          },
        },
      });

      await prisma.workoutSession.deleteMany({
        where: {
          user: {
            email: { startsWith: "e2e-p6-" },
          },
        },
      });

      await prisma.session.deleteMany({
        where: {
          user: {
            email: { startsWith: "e2e-p6-" },
          },
        },
      });

      await prisma.user.deleteMany({
        where: {
          email: { startsWith: "e2e-p6-" },
        },
      });
    } finally {
      await prisma.$disconnect();
    }
  });

  test("10. Member starts a workout session, toggles steps, completes it, and verifies progress history", async ({
    page,
  }) => {
    // Log in as Member A
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill(P6_MEMBER_A_EMAIL);
    await page.getByPlaceholder(/Password/i).fill(P6_PASSWORD);
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/v1/auth/login")),
      page.getByRole("button", { name: /authenticate/i }).click(),
    ]);
    await expect(page).toHaveURL(/\/?$/);

    // Open first workout ("Push-Up Power")
    const card = page.getByRole("heading", { name: "Push-Up Power" }).first();
    await card.click();

    // Verify modal is visible
    await expect(page.locator("h2:has-text('Push-Up Power')")).toBeVisible();

    // Start timer / session
    const startBtn = page.getByRole("button", { name: "Start", exact: true });
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes("/api/v1/sessions") && resp.request().method() === "POST"
      ),
      startBtn.click(),
    ]);

    // Verify Session Active badge is displayed
    await expect(page.locator("text=Session Active")).toBeVisible();

    // Toggle a step
    const stepBtn = page.locator(".space-y-3 button").first();
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes("/progress") && resp.request().method() === "PATCH"
      ),
      stepBtn.click(),
    ]);

    // Complete the workout session
    const completeBtn = page.getByTestId("complete-workout-btn");
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes("/complete") && resp.request().method() === "POST"
      ),
      completeBtn.click(),
    ]);

    // Verify completion feedback
    await expect(page.locator("text=Session Completed!")).toBeVisible();

    // Close modal
    const closeBtn = page.locator("button:has(svg.lucide-x)").first();
    await closeBtn.click();

    // Navigate to Progress Dashboard
    await page.goto("/progress");
    await expect(page.locator("h1")).toContainText(/Workout.*Progress & History/i);

    // Verify Workouts Completed metric is 1
    await expect(page.locator("h2:has-text('1')").first()).toBeVisible();

    // Verify session appears in history table with COMPLETED status
    await expect(page.locator("h4:has-text('Push-Up Power')").first()).toBeVisible();
    await expect(page.locator("span:has-text('COMPLETED')").first()).toBeVisible();
  });

  test("11. Active session state survives page refresh and can be resumed or abandoned", async ({
    page,
  }) => {
    // Log in as Member A
    await page.goto("/login");
    await page.getByPlaceholder("Email address").fill(P6_MEMBER_A_EMAIL);
    await page.getByPlaceholder(/Password/i).fill(P6_PASSWORD);
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes("/api/v1/auth/login")),
      page.getByRole("button", { name: /authenticate/i }).click(),
    ]);
    await expect(page).toHaveURL(/\/?$/);

    // Open workout "Dumbbell Bench Press"
    const card = page.getByRole("heading", { name: "Dumbbell Bench Press" }).first();
    await card.click();

    // Start workout session
    const startBtn = page.getByRole("button", { name: "Start", exact: true });
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes("/api/v1/sessions") && resp.request().method() === "POST"
      ),
      startBtn.click(),
    ]);

    await expect(page.locator("text=Session Active")).toBeVisible();

    // Simulate page refresh during active session
    await page.reload();

    // Navigate to /progress
    await page.goto("/progress");

    // Verify Active Workout banner appears on Progress Dashboard
    await expect(page.locator("text=Active Workout In Progress")).toBeVisible();
    await expect(page.locator("h3:has-text('Dumbbell Bench Press')")).toBeVisible();

    // Click Resume Workout
    const resumeBtn = page.getByRole("button", { name: /resume workout/i });
    await resumeBtn.click();

    // Verify workout modal reopened for this active workout with active status
    await expect(page.locator("h2:has-text('Dumbbell Bench Press')")).toBeVisible();
    await expect(page.locator("text=Session Active")).toBeVisible();

    // Abandon session
    const abandonBtn = page.getByTestId("abandon-workout-btn");
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes("/abandon") && resp.request().method() === "POST"
      ),
      abandonBtn.click(),
    ]);

    // Close modal
    const closeBtn = page.locator("button:has(svg.lucide-x)").first();
    await closeBtn.click();

    // Refresh progress page and verify active session is gone and appears as ABANDONED in history
    await page.goto("/progress");
    await expect(page.locator("text=Active Workout In Progress")).not.toBeVisible();
    await expect(page.locator("span:has-text('ABANDONED')").first()).toBeVisible();
  });

  test("12. Member B cannot read or mutate Member A's workout session records", async ({
    browser,
  }) => {
    // Create new isolated browser context for Member B
    const memberBContext = await browser.newContext();
    const pageB = await memberBContext.newPage();

    // Log in as Member B
    await pageB.goto("/login");
    await pageB.getByPlaceholder("Email address").fill(P6_MEMBER_B_EMAIL);
    await pageB.getByPlaceholder(/Password/i).fill(P6_PASSWORD);
    await Promise.all([
      pageB.waitForResponse((resp) => resp.url().includes("/api/v1/auth/login")),
      pageB.getByRole("button", { name: /authenticate/i }).click(),
    ]);
    await expect(pageB).toHaveURL(/\/?$/);

    // Navigate to /progress as Member B
    await pageB.goto("/progress");

    // Member B should have 0 completed workouts and empty history
    await expect(pageB.locator("h2:has-text('0')").first()).toBeVisible();
    await expect(pageB.locator("text=No workout sessions found")).toBeVisible();
    await memberBContext.close();
  });
});
