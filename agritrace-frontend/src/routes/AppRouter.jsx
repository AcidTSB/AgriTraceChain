import {
  Navigate,
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from "react-router-dom";
import { AppShellLayout } from "../layouts/AppShellLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { PublicLayout } from "../layouts/PublicLayout";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { AdminFacilityManagementPage } from "../pages/admin/AdminFacilityManagementPage";
import { AdminProductManagementPage } from "../pages/admin/AdminProductManagementPage";
import { AdminUserManagementPage } from "../pages/admin/AdminUserManagementPage";
import { AdminAuditLedgerPage } from "../pages/admin/AdminAuditLedgerPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { FarmerAddTraceLogPage } from "../pages/farmer/FarmerAddTraceLogPage";
import { FarmerBatchDetailPage } from "../pages/farmer/FarmerBatchDetailPage";
import { FarmerBatchListPage } from "../pages/farmer/FarmerBatchListPage";
import { FarmerCreateBatchPage } from "../pages/farmer/FarmerCreateBatchPage";
import { FarmerCreateFarmPage } from "../pages/farmer/FarmerCreateFarmPage";
import { FarmerDashboardPage } from "../pages/farmer/FarmerDashboardPage";
import { FarmerProductListPage } from "../pages/farmer/FarmerProductListPage";
import { FarmerQrSharePage } from "../pages/farmer/FarmerQrSharePage";
import { InternalTraceDetailPage } from "../pages/internal/InternalTraceDetailPage";
import { InternalTraceExplorerPage } from "../pages/internal/InternalTraceExplorerPage";
import { InspectorBatchDetailPage } from "../pages/inspector/InspectorBatchDetailPage";
import { InspectorDashboardPage } from "../pages/inspector/InspectorDashboardPage";
import { InspectorReviewPage } from "../pages/inspector/InspectorReviewPage";
import { AboutPage } from "../pages/public/AboutPage";
import { FaqPage } from "../pages/public/FaqPage";
import { LandingPage } from "../pages/public/LandingPage";
import { PublicErrorPage } from "../pages/public/PublicErrorPage";
import { PublicTraceEntryPage } from "../pages/public/PublicTraceEntryPage";
import { PublicTracePage } from "../pages/public/PublicTracePage";
import { ScanQrPage } from "../pages/public/ScanQrPage";
import { NotFoundPage } from "../pages/shared/NotFoundPage";
import { SettingsPage } from "../pages/shared/SettingsPage";
import { RoleGuard } from "./RoleGuard";

export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/trace-entry" element={<PublicTraceEntryPage />} />
        <Route path="/scan-qr" element={<ScanQrPage />} />
        <Route path="/trace/:batchCode" element={<PublicTracePage />} />
        <Route path="/trace-error" element={<PublicErrorPage />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route
        path="/farmer"
        element={
          <RoleGuard allowedRoles={["FARMER"]}>
            <AppShellLayout />
          </RoleGuard>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<FarmerDashboardPage />} />
        <Route path="farms/new" element={<FarmerCreateFarmPage />} />
        <Route path="products" element={<FarmerProductListPage />} />
        <Route path="batches" element={<FarmerBatchListPage />} />
        <Route path="batches/new" element={<FarmerCreateBatchPage />} />
        <Route path="batches/:batchCode" element={<FarmerBatchDetailPage />} />
        <Route path="batches/:batchCode/trace/new" element={<FarmerAddTraceLogPage />} />
        <Route path="batches/:batchCode/qr-share" element={<FarmerQrSharePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route
        path="/inspector"
        element={
          <RoleGuard allowedRoles={["INSPECTOR"]}>
            <AppShellLayout />
          </RoleGuard>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<InspectorDashboardPage />} />
        <Route path="review" element={<InspectorReviewPage />} />
        <Route path="batches/:batchCode" element={<InspectorBatchDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RoleGuard allowedRoles={["ADMIN"]}>
            <AppShellLayout />
          </RoleGuard>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="products" element={<AdminProductManagementPage />} />
        <Route path="users" element={<AdminUserManagementPage />} />
        <Route path="facilities" element={<AdminFacilityManagementPage />} />
        <Route path="audit" element={<AdminAuditLedgerPage />} />
      </Route>

      <Route
        path="/internal"
        element={
          <RoleGuard allowedRoles={["FARMER", "INSPECTOR", "ADMIN"]}>
            <AppShellLayout />
          </RoleGuard>
        }
      >
        <Route index element={<Navigate to="trace" replace />} />
        <Route path="trace" element={<InternalTraceExplorerPage />} />
        <Route path="trace/:traceId" element={<InternalTraceDetailPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </>,
  ),
);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
