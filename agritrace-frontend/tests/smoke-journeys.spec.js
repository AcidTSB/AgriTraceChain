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
  batchCode: "BATCH-2001",
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

function authStorage(user) {
  return {
    state: {
      accessToken: "fake.jwt.token",
      user: {
        id: 1,
        role: user.role,
        username: user.username,
        email: user.email ?? `${user.username ?? "user"}@agri.local`,
        walletAddress: user.walletAddress ?? "0xabc123456789",
      },
    },
    version: 0,
  };
}

async function setAuth(page, user) {
  await page.evaluate((storage) => {
    localStorage.setItem("agritrace-auth-storage", JSON.stringify(storage));
  }, authStorage(user));
}

async function setupMockApi(page, options = {}) {
  let farmCreated = options.farmCreated ?? false;
  let batchCreated = options.batchCreated ?? true;
  let plantingAdded = options.plantingAdded ?? true;
  let harvestAdded = options.harvestAdded ?? true;
  let inspectionSubmitted = options.inspectionSubmitted ?? false;
  let productActive = options.productActive ?? true;
  let profile = {
    username: options.profile?.username ?? "farmer.demo",
    fullName: options.profile?.fullName ?? "Farmer Demo",
    email: options.profile?.email ?? "farmer.demo@agri.local",
    region: options.profile?.region ?? "Lam Dong",
  };

  const currentProduct = () => ({
    id: PRODUCT.id,
    name: PRODUCT.name,
    code: PRODUCT.code,
    description: options.productDescription ?? "AgriTrace coffee batch",
    isActive: productActive,
  });

  const plantingLog = {
    id: "log-planting",
    action: "PLANTING",
    timestamp: "2026-04-22T08:00:00.000Z",
    location: "Zone A",
    notes: "Planting completed",
    integrityStatus: "VERIFIED",
    actor: "farmer.demo",
    latitude: 11.9462,
    longitude: 108.4429,
  };

  const harvestLog = {
    id: "log-harvest",
    action: "HARVESTING",
    timestamp: "2026-04-22T10:00:00.000Z",
    location: "Zone A",
    quantity: 300,
    notes: "Harvest completed",
    integrityStatus: "VERIFIED",
    actor: "farmer.demo",
    latitude: 11.9462,
    longitude: 108.4429,
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
    latitude: 11.9402,
    longitude: 108.4541,
  };

  const getInternalLogs = () => {
    const logs = [];
    if (plantingAdded) {
      logs.push(plantingLog);
    }
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
          ...plantingLog,
          id: "pub-planting-1001",
          action: "PLANTING",
        },
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
      latitude: item.latitude,
      longitude: item.longitude,
    }));
  };

  await page.context().route("**/api/**", async (route) => {
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

    if (path === "/api/v1/users/me" && method === "GET") {
      await route.fulfill(apiSuccess(profile));
      return;
    }

    if (path === "/api/v1/users/me" && method === "PUT") {
      const payload = JSON.parse(request.postData() || "{}");
      profile = {
        ...profile,
        ...payload,
      };
      await route.fulfill(apiSuccess(profile));
      return;
    }

    if (path === "/api/v1/auth/change-password" && method === "POST") {
      await route.fulfill(apiSuccess({ success: true }));
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
      await route.fulfill(apiSuccess([currentProduct()]));
      return;
    }

    if (path === "/api/v1/products/page" && method === "GET") {
      const content = [currentProduct()];
      await route.fulfill(apiSuccess({ content, totalElements: content.length, totalPages: 1, number: 0 }));
      return;
    }

    if (path === `/api/v1/products/${PRODUCT.id}` && method === "GET") {
      await route.fulfill(apiSuccess(currentProduct()));
      return;
    }

    if (path === `/api/v1/products/${PRODUCT.id}` && method === "PUT") {
      const payload = JSON.parse(request.postData() || "{}");
      if (typeof payload.isActive === "boolean") {
        productActive = payload.isActive;
      }
      await route.fulfill(apiSuccess(currentProduct()));
      return;
    }

    if (path === "/api/v1/batches" && method === "POST") {
      batchCreated = true;
      await route.fulfill(apiSuccess(BATCH));
      return;
    }

    if (path === "/api/v1/batches/page" && method === "GET") {
      const content = batchCreated ? [BATCH] : [];
      await route.fulfill(apiSuccess({ content, totalElements: content.length, totalPages: 1, number: 0 }));
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
      if (payload.action === "PLANTING") {
        plantingAdded = true;
      }
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
  await page.getByRole("button", { name: "Quét QR" }).click();
  await page.getByLabel("Mã lô thủ công").fill("AT-1001");
  await page.getByRole("button", { name: "Mở truy xuất public" }).click();

  await expect(page).toHaveURL(/\/trace\/AT-1001$/);
  await expect(page.getByTestId("trust-headline")).toHaveText("ĐÃ XÁC MINH");
  await expect(page.getByText("Cổng kiểm định")).toBeVisible();
});

test("Farmer journey: Login -> Create Farm -> Create Batch -> Add Trace -> Share QR", async ({ page }) => {
  await setupMockApi(page, { farmCreated: false, batchCreated: false, harvestAdded: false });
  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({ latitude: 10.762622, longitude: 106.660172 });

  await page.goto("/login");
  await page.getByLabel("Email").fill("farmer.demo@agri.local");
  await page.getByLabel("Mật khẩu").fill("demo123");
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  await expect(page).toHaveURL(/\/farmer\/dashboard$/);
  await page.getByRole("button", { name: "Tạo nông trại đầu tiên" }).click();

  await page.getByLabel("Tên nông trại").fill("Dalat Farm");
  await page.getByLabel("Địa điểm").fill("Lam Dong");
  await page.getByRole("button", { name: "Lấy vị trí" }).click();
  await page.getByRole("button", { name: "Tạo nông trại" }).click();

  await expect(page).toHaveURL(/\/farmer\/batches\/new$/);
  await page.getByLabel("Sản lượng dự kiến").fill("500");
  await page.getByRole("button", { name: "Tạo lô", exact: true }).click();

  await expect(page).toHaveURL(/\/farmer\/batches\/BATCH-2001$/);
  await page.locator('a[href$="/trace/new"]').first().click();

  await expect(page).toHaveURL(/\/farmer\/batches\/BATCH-2001\/trace\/new$/);
  await page.locator("#action").selectOption("HARVESTING");
  await page.locator("#location").fill("Zone A");
  await page.getByRole("button", { name: "Lấy vị trí" }).click();
  await page.locator("#quantity").fill("300");
  await page.getByRole("button", { name: "Ghi nhật ký" }).click();
  await page.getByRole("button", { name: "Xác nhận ghi", exact: true }).click();

  await expect(page).toHaveURL(/\/farmer\/batches\/BATCH-2001$/);
  await page.getByRole("button", { name: "Chia sẻ QR" }).click();

  await expect(page).toHaveURL(/\/farmer\/batches\/BATCH-2001\/qr-share$/);
  await expect(page.getByText("Liên kết truy xuất công khai")).toBeVisible();
  await expect(page.locator("img[alt='QR for BATCH-2001']")).toBeVisible();
});

test("Inspector journey: Login -> Queue -> Review -> Submit INSPECTION -> VERIFIED", async ({ page }) => {
  await page.context().grantPermissions(["geolocation"]);
  await page.context().setGeolocation({ latitude: 10.762622, longitude: 106.660172 });

  await page.addInitScript(() => {
    localStorage.setItem("agritrace-inspector-queue-codes", JSON.stringify(["BATCH-2001"]));
  });

  await setupMockApi(page, {
    farmCreated: true,
    batchCreated: true,
    harvestAdded: true,
    inspectionSubmitted: false,
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill("inspector.demo@agri.local");
  await page.getByLabel("Mật khẩu").fill("demo123");
  await page.getByRole("button", { name: "Đăng nhập" }).click();

  await expect(page).toHaveURL(/\/inspector\/review$/);
  await page.getByRole("link", { name: "Hàng đợi review" }).click();
  await expect(page).toHaveURL(/\/inspector\/review$/);

  await page.getByRole("button", { name: "Xem chi tiết" }).first().click();
  await expect(page).toHaveURL(/\/inspector\/batches\/BATCH-2001$/);

  await page.getByRole("button", { name: "Lấy vị trí" }).click();
  await page.locator("form button:has-text('Gửi kiểm định')").click();

  await page.evaluate(async (payload) => {
    await fetch("/api/v1/trace-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }, {
    batchId: BATCH.id,
    action: "INSPECTION",
    location: "Inspection Center",
    notes: "Quality check completed",
    latitude: 10.762622,
    longitude: 106.660172,
  });

  await page.goto("/trace/BATCH-2001");
  await expect(page.getByTestId("trust-headline")).toHaveText("ĐÃ XÁC MINH");
  await expect(page.getByText("Cổng kiểm định")).toBeVisible();
});

test("Scanner journey: blocked camera still allows manual batch code entry", async ({ page }) => {
  await setupMockApi(page, { harvestAdded: true, inspectionSubmitted: true });

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: () => Promise.reject(new DOMException("Permission denied", "NotAllowedError")),
      },
    });
  });

  await page.goto("/scan-qr");
  await expect(page.getByText(/Không thể mở camera|Trình duyệt không hỗ trợ quét camera/).first()).toBeVisible();
  await page.getByLabel("Mã lô thủ công").fill("BATCH-2001");
  await page.getByRole("button", { name: "Mở truy xuất public" }).click();

  await expect(page).toHaveURL(/\/trace\/BATCH-2001$/);
  await expect(page.getByTestId("trust-headline")).toHaveText("ĐÃ XÁC MINH");
});

test("Settings journey: profile save and refresh persist API data", async ({ page }) => {
  await setupMockApi(page, {
    profile: {
      username: "farmer.demo",
      fullName: "Farmer Demo",
      email: "farmer.demo@agri.local",
      region: "Lam Dong",
    },
  });

  await page.goto("/");
  await setAuth(page, {
    role: "FARMER",
    username: "farmer.demo",
    email: "farmer.demo@agri.local",
    walletAddress: "0xabc123456789",
  });

  await page.goto("/farmer/settings");
  const profileForm = page.locator("section").filter({ has: page.getByText("Thông tin hồ sơ") });

  await expect(profileForm.locator("input").nth(0)).toHaveValue("Farmer Demo");
  await profileForm.locator("input").nth(0).fill("Farmer Demo Updated");
  await profileForm.locator("input").nth(2).fill("farmer.updated@agri.local");
  await profileForm.locator("input").nth(3).fill("Lam Dong - Zone B");
  await profileForm.getByRole("button", { name: "Cập nhật hồ sơ" }).click();

  await expect(page.getByText("Cập nhật hồ sơ thành công.")).toBeVisible();

  await page.reload();
  await expect(profileForm.locator("input").nth(0)).toHaveValue("Farmer Demo Updated");
  await expect(profileForm.locator("input").nth(2)).toHaveValue("farmer.updated@agri.local");
  await expect(profileForm.locator("input").nth(3)).toHaveValue("Lam Dong - Zone B");

  await page.getByRole("button", { name: "Bảo mật" }).click();
  const passwordInputs = page.locator('input[type="password"]');
  await passwordInputs.nth(0).fill("OldPass!23");
  await passwordInputs.nth(1).fill("NewPass!23");
  await passwordInputs.nth(2).fill("NewPass!23");
  await page.getByRole("button", { name: "Đổi mật khẩu" }).click();

  await expect(page.getByText("Đổi mật khẩu thành công.")).toBeVisible();
});

test("Pause trace lifecycle: admin suspend, roles see paused state, admin re-enables", async ({ page }) => {
  await setupMockApi(page, {
    farmCreated: true,
    batchCreated: true,
    harvestAdded: true,
    inspectionSubmitted: true,
    productActive: true,
  });

  await page.goto("/");
  await setAuth(page, {
    role: "ADMIN",
    username: "admin.demo",
  });

  await page.goto("/admin/products");
  await page.evaluate(async () => {
    await fetch("/api/v1/products/21", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
  });

  await setAuth(page, {
    role: "FARMER",
    username: "farmer.demo",
  });
  await page.goto("/farmer/batches/BATCH-2001");
  await expect(page.getByText("Truy xuất tạm ngừng").first()).toBeVisible();

  await setAuth(page, {
    role: "INSPECTOR",
    username: "inspector.demo",
  });
  await page.goto("/inspector/batches/BATCH-2001");
  await expect(page.getByText("Truy xuất tạm ngừng").first()).toBeVisible();

  await page.goto("/trace/BATCH-2001");
  await expect(page.getByText("Truy xuất tạm ngừng").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Hành trình GPS" })).toBeHidden();
  await expect(page.locator(".leaflet-container")).toHaveCount(0);

  await setAuth(page, {
    role: "ADMIN",
    username: "admin.demo",
  });
  await page.goto("/admin/products");
  await page.evaluate(async () => {
    await fetch("/api/v1/products/21", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
  });

  await setAuth(page, {
    role: "FARMER",
    username: "farmer.demo",
  });
  await page.goto("/farmer/batches/BATCH-2001");
  await expect(page.getByText("Truy xuất tạm ngừng")).toHaveCount(0);

  await setAuth(page, {
    role: "INSPECTOR",
    username: "inspector.demo",
  });
  await page.goto("/inspector/batches/BATCH-2001");
  await expect(page.getByText("Truy xuất tạm ngừng")).toHaveCount(0);

  await page.goto("/trace/BATCH-2001");
  await expect(page.getByText("Truy xuất tạm ngừng")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Hành trình GPS" })).toBeVisible();
  await expect(page.locator(".leaflet-container")).toHaveCount(1);
});
