import { data } from "react-router-dom";
import { APIResponse, APIResponseData } from "../config/APIResponse";
import { apiFetch } from "../config/apiClient";

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  onboardingCompleted: boolean;
  userId: number;
  emailVerified: boolean;
}

export async function login(
  email: string,
  password: string,
): Promise<APIResponseData<AuthResponse>> {
  const response = await apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return response;
}

export async function adminLogin(
  email: string,
  password: string,
): Promise<APIResponseData<AuthResponse>> {
  const response = await apiFetch<AuthResponse>("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return response;
}

export async function loginWithGoogle(
  idToken: string,
): Promise<APIResponseData<AuthResponse>> {
  const response = await apiFetch<AuthResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
  return response;
}

export async function register(
  fullName: string,
  email: string,
  password: string,
): Promise<APIResponseData<AuthResponse>> {
  const response = await apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ fullName, email, password }),
  });
  return response;
}

export async function logout(): Promise<APIResponseData<String>> {
  const refreshToken = localStorage.getItem("refreshToken");
  const response = await apiFetch<String>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
  return response;
}

export async function forgetPassword(
  email: string,
): Promise<APIResponseData<String>> {
  const response = await apiFetch<String>("/auth/forget-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return response;
}

export async function resetEmailVerification(
  email: string,
): Promise<APIResponseData<String>> {
  const response = await apiFetch<String>("/auth/reset-verify-email", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return response;
}

export async function confirmEmailVerification(
  token: string,
): Promise<APIResponseData<any>> {
  const response = await apiFetch<any>(`/verify-email/confirm?token=${encodeURIComponent(token)}`, {
    method: "GET",
  });
  return response;
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<APIResponseData<String>> {
  const response = await apiFetch<String>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
  return response;
}

export async function testApi(
  userId: number,
): Promise<APIResponseData<string>> {
  const response = await apiFetch<string>(`/admin`, {
    method: "GET",
  });
  return response;
}

export async function adminForgetPassword(
  email: string,
): Promise<APIResponseData<String>> {
  const response = await apiFetch<String>("/auth/admin/forget-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return response;
}

export async function adminResetPassword(
  token: string,
  newPassword: string,
): Promise<APIResponseData<String>> {
  const response = await apiFetch<String>("/auth/admin/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
  return response;
}
