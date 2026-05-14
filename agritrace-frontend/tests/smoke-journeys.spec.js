import { expect, test } from "@playwright/test";

const FARM = {
  id: 11,
  name: "Dalat Farm",
  location: "Lam Dong",
};

const PRODUCT = {
  id: 21,
  name: "Coffee",
  code: "CF01",
};

const BATCH = {
  id: 101,
  batchCode: "AT-2001",
  farmId: FARM.id,
  farmName: FARM.name,
  productId: PRODUCT.id,
  productName: PRODUCT.name,
  status: "ACTIVE",
  quantity: 500,
  createdAt: "2026-04-22T09:00:00.000Z",
};

function apiSuccess(data) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data }),
  };
}

async function setupMockApi(page, options = {}) {
  let farmCreated = options.farmCreated ?? false;
  let batchCreated = options.batchCreated ?? true;
  let harvestAdded = options.harvestAdded ?? true;
  let inspectionSubmitted = options.inspectionSubmitted ?? false;

  const harvestLog = {
    id: "log-harvest",
    action: "HARVESTING",
    timestamp: "2026-04-22T10:00:00.000Z",
    location: "Zone A",
    quantity: 300,
    notes: "Harvest completed",
    integrityStatus: "VERIFIED",
    actor: "farmer.demo",
  };

  const inspectionLog = {
    id: "log-inspection",
    action: "INSPECTION",
    timestamp: "2026-04-22T12:00:00.000Z",
    location: "Inspection Center",
    quantity: 300,
    notes: "Quality check completed",
    integrityStatus: "VERIFIED",
    actor: "inspector.demo",
  };

  const getInternalLogs = () => {
    const logs = [];
    if (harvestAdded) {
      logs.push(harvestLog);
    }
    if (inspectionSubmitted) {
      logs.push(inspectionLog);
    }
    return logs;
  };

  const getPublicLogs = (code) => {
    if (code === "AT-1001") {
      return [
        {
          ...harvestLog,
          id: "pub-harvest-1001",
          action: "HARVESTING",
        },
        {
          ...inspectionLog,
          id: "pub-inspection-1001",
          action: "INSPECTION",
        },
      ];
    }

    if (code !== BATCH.batchCode) {
      return [];
    }

    return getInternalLogs().map((item) => ({
      id: `pub-${item.id}`,
      action: item.action,
      timestamp: item.timestamp,
      location: item.location,
      quantity: item.quantity,
      notes: item.notes,
      integrityStatus: item.integrityStatus,
    }));
  };

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname;

    if (path === "/api/v1/auth/login" && method === "POST") {
      const payload = JSON.parse(request.postData() || "{}");
      const username = payload.username || "";
      const role = username.includes("inspector") ? "INSPECTOR" : "FARMER";
      await route.fulfill(apiSuccess({
        accessToken: "fake.jwt.token",
        role,
        username,
      }));
      return;
    }

    if (path === "/api/v1/auth/register" && method === "POST") {
      await route.fulfill(apiSuccess({ id: 999 }));
      return;
    }

    if (path === "/api/v1/farms/my" && method === "GET") {
      await route.fulfill(apiSuccess(farmCreated ? [FARM] : []));
      return;
    }

    if (path === "/api/v1/farms" && method === "POST") {
      farmCreated = true;
      await route.fulfill(apiSuccess(FARM));
      return;
    }

    if (path === "/api/v1/products" && method === "GET") {
      await route.fulfill(apiSuccess([PRODUCT]));
      return;
    }

    if (path === "/api/v1/batches" && method === "POST") {
      batchCreated = true;
      await route.fulfill(apiSuccess(BATCH));
      return;
    }

    if (path === `/api/v1/batches/farm/${FARM.id}` && method === "GET") {
      await route.fulfill(apiSuccess(batchCreated ? [BATCH] : []));
      return;
    }

    if (path === `/api/v1/batches/${BATCH.batchCode}` && method === "GET") {
      await route.fulfill(apiSuccess(BATCH));
      return;
    }

    if (path.startsWith("/api/v1/batches/") && method === "GET") {
      const code = decodeURIComponent(path.split("/").pop());
      if (code === "AT-1001") {
        await route.fulfill(apiSuccess({
          ...BATCH,
          id: 201,
          batchCode: "AT-1001",
          productName: "Tea",
          farmName: "Bao Loc Farm",
        }));
        return;
      }
      await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({}) });
      return;
    }

    if (path === `/api/v1/trace-logs/batch/${BATCH.id}` && method === "GET") {
      await route.fulfill(apiSuccess(getInternalLogs()));
      return;
    }

    if (path === "/api/v1/trace-logs" && method === "POST") {
      const payload = JSON.parse(request.postData() || "{}");
      if (payload.action === "HARVESTING") {
        harvestAdded = true;
      }
      if (payload.action === "INSPECTION") {
        inspectionSubmitted = true;
      }
      await route.fulfill(apiSuccess({ id: Date.now(), ...payload }));
      return;
    }

    if (path.startsWith("/api/public/trace/") && method === "GET") {
      const code = decodeURIComponent(path.split("/").pop());
      const logs = getPublicLogs(code);
      await route.fulfill(apiSuccess(logs));
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ message: `Unhandled mock endpoint: ${method} ${path}` }),
    });
  });
}

test("Consumer journey: Landing -> Scan QR -> Public Trace -> VERIFIED", async ({ page }) => {
  await setupMockApi(page, { inspectionSubmitted: true, harvestAdded: true });

  await page.goto("/");
  await page.getByRole("button", { name: "Scan QR" }).click();
  await page.getByLabel("Manual batch code").fill("AT-1001");
  await page.getByRole("button", { name: "Open Public Trace" }).click();

  await expect(page).toHaveURL(/\/trace\/AT-1001$/);
  await expect(page.getByTestId("trust-headline")).toHaveText("VERIFIED");
  await expect(page.getByText("QC Gate")).toBeVisible();
});

test("Farmer journey: Login -> Create Farm -> Create Batch -> Add Trace -> Share QR", async ({ page }) => {
  await setupMockApi(page, { farmCreated: false, batchCreated: false, harvestAdded: false });

  await page.goto("/login");
  await page.getByLabel("Email").fill("farmer.demo@agri.local");
  await page.getByLabel("Password").fill("demo123");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/\/farmer\/dashboard$/);
  await page.getByRole("button", { name: "Create first farm" }).click();

  await page.getByLabel("Farm Name").fill("Dalat Farm");
  await page.getByLabel("Location").fill("Lam Dong");
  await page.getByRole("button", { name: "Create Farm" }).click();

  await expect(page).toHaveURL(/\/farmer\/batches\/new$/);
  await page.getByLabel("Initial Quantity").fill("500");
  await page.getByRole("button", { name: "Create Batch" }).click();

  await expect(page).toHaveURL(/\/farmer\/batches\/AT-2001$/);
  await page.getByRole("button", { name: "Add Trace Log" }).click();

  await expect(page).toHaveURL(/\/farmer\/batches\/AT-2001\/trace\/new$/);
  await page.getByLabel("Action").selectOption("HARVESTING");
  await page.getByLabel("Location").fill("Zone A");
  await page.getByLabel("Quantity (required for selected action)").fill("300");
  await page.getByRole("button", { name: "Add Trace Log" }).click();
  await page.getByRole("button", { name: "Submit", exact: true }).click();

  await expect(page).toHaveURL(/\/farmer\/batches\/AT-2001$/);
  await page.getByRole("button", { name: "QR Share" }).click();

  await expect(page).toHaveURL(/\/farmer\/batches\/AT-2001\/qr-share$/);
  await expect(page.getByText("Public trace link")).toBeVisible();
  await expect(page.locator("img[alt='QR for AT-2001']")).toBeVisible();
});

test("Inspector journey: Login -> Queue -> Review -> Submit INSPECTION -> VERIFIED", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("agritrace-inspector-queue-codes", JSON.stringify(["AT-2001"]));
  });

  await setupMockApi(page, {
    farmCreated: true,
    batchCreated: true,
    harvestAdded: true,
    inspectionSubmitted: false,
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill("inspector.demo@agri.local");
  await page.getByLabel("Password").fill("demo123");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(/\/inspector\/review$/);
  await page.getByRole("link", { name: "Review Queue" }).click();
  await expect(page).toHaveURL(/\/inspector\/review$/);

  await page.getByRole("button", { name: "View Detail" }).first().click();
  await expect(page).toHaveURL(/\/inspector\/batches\/AT-2001$/);

  await page.getByRole("button", { name: "Submit Inspection" }).click();
  await page.getByRole("button", { name: "Submit", exact: true }).click();

  await expect(page).toHaveURL(/\/inspector\/review$/);

  await page.goto("/trace/AT-2001");
  await expect(page.getByTestId("trust-headline")).toHaveText("VERIFIED");
  await expect(page.getByText("QC Gate")).toBeVisible();
});
