import { createBrowserRouter, Outlet } from "react-router-dom";
import MainLayout from "../pages/MainLayout/MainLayout";
import HomePage from "../pages/HomePage";
import FriendsPage from "../pages/FriendsLayout/FriendsPage";
import SchedulePage from "../pages/SchedulePage/SchedulePage";
import StudyConnectionPage from "../pages/StudyConnection/StudyConnectionPage";
import { AuthLayout } from "../pages/MainLayout/AuthLayout";
import LoginPage from "../pages/Auth/LoginPage";
import RegisterPage from "../pages/Auth/RegisterPage";
import OnboardingFlow from "../pages/Onboarding/Onboarding";
import ConversationPage from "../pages/Conversation/ConversationPage";

import { Navigate } from "react-router-dom";
import { Login } from "@mui/icons-material";
import CreateGroupPage from "../pages/CreateGroup/CreateGroupPage";
import GroupPage from "../pages/Group/GroupPage";
import SearchPage from "../pages/Search/SearchPage";
import ForgotPasswordPage from "../pages/Auth/ResetPassword/ForgotPasswordPage";
import CheckEmailPage from "../pages/Auth/ResetPassword/CheckEmailPage";
import ResetPasswordPage from "../pages/Auth/ResetPassword/ResetPasswordPage";
import ResetPasswordSuccessPage from "../pages/Auth/ResetPassword/ResetPasswordSuccessPage";
import CheckVerifyEmailPage from "../pages/Auth/ResetPassword/CheckVerifyPage";
import VerifyEmailConfirmPage from "../pages/Auth/ResetPassword/VerifyEmailConfirmPage";
import ProfilePage from "../pages/ProfilePage/ProfilePage";
import MyProfilePage from "../pages/MyProfile/MyProfilePage";
import StudyMatchAdminLayout from "../layouts/admin/StudyMatchAdminLayout";
import AdminGroupsPage from "../pages/admin/AdminGroupsPage/AdminGroupsPage";
import AdminUsersPage from "../pages/admin/AdminUsersPage/AdminUsersPage";
import AdminSchedulesPage from "../pages/admin/AdminSchedulesPage/AdminSchedulesPage";
import AdminAIMatchingPage from "../pages/admin/AdminAIMatchingPage/AdminAIMatchingPage";
import AdminReportsPage from "../pages/admin/AdminReportsPage/AdminReportsPage";
import StudySessionPage from "../pages/StudySession/StudySessionPage";
import DetailedStatsPage from "../pages/StudySession/DetailedStatsPage";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage/AdminDashboardPage";
import AdminOverviewPage from "../pages/admin/AdminOverviewPage/AdminOverviewPage";
import LandingPage from "../pages/Landing/LandingPage";
import AdminLoginPage from "../pages/admin/AdminLoginPage";
import MyReportsPage from "../pages/MyReports/MyReportsPage";
import ActivateAdminPage from "../pages/admin/ActivateAdminPage";
import AdminResetPasswordPage from "../pages/admin/AdminResetPasswordPage";
import AdminAuditLogsPage from "../pages/admin/AdminAuditLogsPage/AdminAuditLogsPage";
import DocumentsPage from "../pages/Documents/DocumentsPage";
import MyLibraryPage from "../pages/Documents/MyLibraryPage";
import AdminDocumentsPage from "../pages/admin/AdminDocumentsPage/AdminDocumentsPage";
import AcademicProfilesPage from "../pages/admin/AcademicProfilesPage/AcademicProfilesPage";
import AcademicSubjectsPage from "../pages/admin/AcademicSubjectsPage/AcademicSubjectsPage";
import AcademicCurriculumsPage from "../pages/admin/AcademicCurriculumsPage/AcademicCurriculumsPage";
import AcademicCohortsPage from "../pages/admin/AcademicCohortsPage/AcademicCohortsPage";
import AcademicTermsPage from "../pages/admin/AcademicTermsPage/AcademicTermsPage";

function getRoleFromToken(token: string | null): "admin" | "student" | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const role = String(payload.role ?? "").toLowerCase();
    if (role === "admin" || role === "super_admin") return "admin";
    if (role === "student") return "student";
    return null;
  } catch {
    return null;
  }
}

const ProtectedRoute = () => {
  const role = getRoleFromToken(localStorage.getItem("accessToken"));
  if (!role) return <Navigate to="/" replace />;
  if (role === "admin") return <Navigate to="/admin/overview" replace />;
  return <Outlet />;
};

const AdminProtectedRoute = () => {
  const role = getRoleFromToken(localStorage.getItem("accessToken"));
  if (role !== "admin") return <Navigate to="/admin/login" replace />;
  return <Outlet />;
};

const PublicLayout = () => {
  const role = getRoleFromToken(localStorage.getItem("accessToken"));
  if (role === "admin") return <Navigate to="/admin/overview" replace />;
  if (role === "student") return <Navigate to="/home" replace />;
  return <Outlet />;
};

const NotFoundRedirect = () => {
  const role = getRoleFromToken(localStorage.getItem("accessToken"));
  if (role === "admin") return <Navigate to="/admin/overview" replace />;
  if (role === "student") return <Navigate to="/home" replace />;
  return <Navigate to="/" replace />;
};

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      {
        path: "/",
        element: <LandingPage />,
      },
    ],
  },

  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/onboarding", element: <OnboardingFlow /> },
      {
        path: "/forgot-password",
        element: <ForgotPasswordPage />,
      },
      {
        path: "/check-email",
        element: <CheckEmailPage />,
      },
      {
        path: "/reset-password",
        element: <ResetPasswordPage />,
      },
      {
        path: "/reset-password-success",
        element: <ResetPasswordSuccessPage />,
      },
      {
        path: "/verify-email",
        element: <CheckVerifyEmailPage />,
      },
      {
        path: "/verify-email/confirm",
        element: <VerifyEmailConfirmPage />,
      },
      {
        path: "/activate-admin",
        element: <ActivateAdminPage />,
      },
    ],
  },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: "/home", element: <HomePage /> },
          { path: "/friends", element: <HomePage /> },
          { path: "/schedule", element: <StudySessionPage /> },
          { path: "/analytics", element: <DetailedStatsPage /> },
          { path: "/profile/:id", element: <ProfilePage /> },
          { path: "/my-profile", element: <MyProfilePage /> },
          { path: "/conversation", element: <ConversationPage /> },
          { path: "/recommendation", element: <StudyConnectionPage /> },
          { path: "/groups", element: <GroupPage /> },
          { path: "/search", element: <SearchPage /> },
          { path: "/reports/my", element: <MyReportsPage /> },
          { path: "/report", element: <Navigate to="/reports/my" replace /> },
          { path: "/documents", element: <DocumentsPage /> },
          { path: "/documents/:documentId", element: <DocumentsPage /> },
          { path: "/documents/my-library", element: <MyLibraryPage /> },
        ],
      },
    ],
  },

  {
    element: <AuthLayout />,
    children: [{ path: "/create-group", element: <CreateGroupPage /> }],
  },

  {
    path: "/admin/login",
    element: <AdminLoginPage />,
  },
  {
    path: "/admin/reset-password",
    element: <AdminResetPasswordPage />,
  },

  {
    path: "/admin",
    element: <AdminProtectedRoute />,
    children: [
      {
        element: <StudyMatchAdminLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/admin/overview" replace />,
          },
          {
            path: "overview",
            element: <AdminOverviewPage />,
          },
          {
            path: "chat-manager",
            element: <AdminDashboardPage />,
          },
          {
            path: "dashboard",
            element: <Navigate to="/admin/overview" replace />,
          },
          {
            path: "users",
            element: <AdminUsersPage />,
          },
          {
            path: "profiles",
            element: <AcademicProfilesPage />,
          },
          {
            path: "curriculums",
            element: <AcademicCurriculumsPage />,
          },
          {
            path: "subjects",
            element: <AcademicSubjectsPage />,
          },
          {
            path: "cohorts",
            element: <AcademicCohortsPage />,
          },
          {
            path: "academic-terms",
            element: <AcademicTermsPage />,
          },
          {
            path: "groups",
            element: <AdminGroupsPage />,
          },
          {
            path: "schedules",
            element: <AdminSchedulesPage />,
          },
          {
            path: "matching",
            element: <AdminAIMatchingPage />,
          },
          {
            path: "reports",
            element: <AdminReportsPage />,
          },
          {
            path: "documents",
            element: <AdminDocumentsPage />,
          },
          {
            path: "audit-logs",
            element: <AdminAuditLogsPage />,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundRedirect />,
  },
]);
