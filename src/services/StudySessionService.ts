import { apiFetch } from "../config/apiClient";
import { APIResponseData } from "../config/APIResponse";
import {
  CreateStudySessionRequest,
  StudySessionResponse,
  JoinStudySessionResponse,
  LeaveStudySessionResponse,
  FeedbackEligibilityResponse,
  SubmitStudyFeedbackRequest,
  SubmitStudyFeedbackResponse,
  DetailedUserStatsResponse,
} from "../pages/StudySession/types";
import type {
  GroupStudySessionStatus,
  ParticipantStatus,
  SessionConfirmationStatsResponse,
  StudySessionType,
} from "../pages/StudySession/types";
import type {
  AdminSessionRowResponse,
  AdminSessionStatsResponse,
  ScheduleStatus,
  StudyMode,
  ScheduleType,
} from "../pages/admin/AdminSchedulesPage/types";

import { BASE_URL } from "../config/BaseConfig";

const API_BASE_URL = BASE_URL;

export interface PageResponse<T> {
  content: T[];
  empty: boolean;
  first: boolean;
  last: boolean;
  number: number;
  numberOfElements: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface UserStudySessionParams {
  sessionType?: StudySessionType | null;
  participantStatus?: ParticipantStatus | null;
  sessionStatus?: GroupStudySessionStatus | null;
  startFrom?: string | null;
  startTo?: string | null;
  search?: string;
  page?: number;
  size?: number;
}

export async function createGroupStudySession(
  groupId: number,
  payload: CreateStudySessionRequest,
): Promise<APIResponseData<StudySessionResponse>> {
  const response = await apiFetch<StudySessionResponse>(
    `/api/study-sessions/group/${groupId}`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    API_BASE_URL,
  );

  return response;
}

export async function getUserStudySessions(
  userId: number,
  params: UserStudySessionParams = {},
): Promise<APIResponseData<PageResponse<StudySessionResponse>>> {
  const query = new URLSearchParams();

  if (params.sessionType) query.set("sessionType", params.sessionType);
  if (params.participantStatus)
    query.set("participantStatus", params.participantStatus);
  if (params.sessionStatus) query.set("sessionStatus", params.sessionStatus);
  if (params.startFrom) query.set("startFrom", params.startFrom);
  if (params.startTo) query.set("startTo", params.startTo);
  if (params.search) query.set("search", params.search);
  query.set("page", String(params.page ?? 0));
  query.set("size", String(params.size ?? 20));

  const response = await apiFetch<PageResponse<StudySessionResponse>>(
    `/api/study-sessions/user/${userId}?${query.toString()}`,
    {
      method: "GET",
    },
    API_BASE_URL,
  );

  return response;
}

export async function getGroupStudySessions(
  groupId: number,
  userId?: number,
): Promise<APIResponseData<StudySessionResponse[]>> {
  const query = typeof userId === "number" && Number.isFinite(userId)
    ? `?userId=${userId}`
    : "";
  const response = await apiFetch<StudySessionResponse[]>(
    `/api/study-sessions/group/${groupId}${query}`,
    {
      method: "GET",
    },
    API_BASE_URL,
  );

  return response;
}

export async function createPairStudySession(
  payload: CreateStudySessionRequest,
): Promise<APIResponseData<StudySessionResponse>> {
  const response = await apiFetch<StudySessionResponse>(
    `/api/study-sessions/pair`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    API_BASE_URL,
  );

  return response;
}

export async function getStudySessionById(
  sessionId: number,
  userId: number,
): Promise<APIResponseData<StudySessionResponse>> {
  const response = await apiFetch<StudySessionResponse>(
    `/api/study-sessions/${sessionId}?userId=${userId}`,
    {
      method: "GET",
    },
    API_BASE_URL,
  );

  return response;
}

export async function respondToStudySession(
  sessionId: number,
  userId: number,
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "JOINED" | "ABSENT",
): Promise<APIResponseData<StudySessionResponse>> {
  const response = await apiFetch<StudySessionResponse>(
    `/api/study-sessions/${sessionId}/participants/${userId}/respond`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
    API_BASE_URL,
  );

  return response;
}

export async function respondToMultipleStudySessions(
  userId: number,
  sessionIds: number[],
  status: "ACCEPTED" | "DECLINED",
): Promise<APIResponseData<void>> {
  const response = await apiFetch<void>(
    `/api/study-sessions/participants/${userId}/respond-bulk`,
    {
      method: "PATCH",
      body: JSON.stringify({ sessionIds, status }),
    },
    API_BASE_URL,
  );

  return response;
}

export async function getSessionsByRecurrenceId(
  recurrenceId: string,
  userId: number,
): Promise<APIResponseData<StudySessionResponse[]>> {
  const response = await apiFetch<StudySessionResponse[]>(
    `/api/study-sessions/recurrence/${recurrenceId}?userId=${userId}`,
    {
      method: "GET",
    },
    API_BASE_URL,
  );

  return response;
}

export async function getConfirmationStats(
  sessionId: number,
  userId: number,
): Promise<APIResponseData<SessionConfirmationStatsResponse>> {
  const response = await apiFetch<SessionConfirmationStatsResponse>(
    `/api/study-sessions/${sessionId}/confirmation-stats?userId=${userId}`,
    {
      method: "GET",
    },
    API_BASE_URL,
  );

  return response;
}

export async function joinStudySession(
  sessionId: number,
  userId: number,
): Promise<APIResponseData<JoinStudySessionResponse>> {
  const response = await apiFetch<JoinStudySessionResponse>(
    `/api/study-sessions/${sessionId}/join?userId=${userId}`,
    {
      method: "POST",
    },
    API_BASE_URL,
  );

  return response;
}

export async function cancelStudySession(
  sessionId: number,
  userId: number,
): Promise<APIResponseData<void>> {
  const response = await apiFetch<void>(
    `/api/study-sessions/${sessionId}?userId=${userId}`,
    {
      method: "DELETE",
    },
    API_BASE_URL,
  );

  return response;
}

export async function leaveStudySession(
  sessionId: number,
  userId: number,
): Promise<APIResponseData<LeaveStudySessionResponse>> {
  const response = await apiFetch<LeaveStudySessionResponse>(
    `/api/study-sessions/${sessionId}/leave`,
    {
      method: "POST",
      body: JSON.stringify({ userId }),
    },
    API_BASE_URL,
  );

  return response;
}

export function leaveStudySessionOnUnload(sessionId: number, userId: number) {
  const endpoint = `${API_BASE_URL}/api/study-sessions/${sessionId}/leave`;
  const body = JSON.stringify({ userId });
  const accessToken = localStorage.getItem("accessToken");

  try {
    fetch(endpoint, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body,
    });
  } catch {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon?.(endpoint, blob);
  }
}

export async function getFeedbackEligibility(
  sessionId: number,
  userId: number,
): Promise<APIResponseData<FeedbackEligibilityResponse>> {
  const response = await apiFetch<FeedbackEligibilityResponse>(
    `/api/study-sessions/${sessionId}/feedback-eligibility?userId=${userId}`,
    {
      method: "GET",
    },
    API_BASE_URL,
  );

  return response;
}

export async function submitStudyFeedback(
  payload: SubmitStudyFeedbackRequest,
): Promise<APIResponseData<SubmitStudyFeedbackResponse>> {
  const response = await apiFetch<SubmitStudyFeedbackResponse>(
    "/api/study-feedbacks",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    API_BASE_URL,
  );

  return response;
}

export async function getStudyFeedbackBySessionAndUser(
  sessionId: number,
  userId: number,
): Promise<APIResponseData<SubmitStudyFeedbackResponse | null>> {
  const response = await apiFetch<SubmitStudyFeedbackResponse | null>(
    `/api/study-feedbacks/session/${sessionId}/user/${userId}`,
    {
      method: "GET",
    },
    API_BASE_URL,
  );

  return response;
}

export async function getAdminSessionStats(): Promise<
  APIResponseData<AdminSessionStatsResponse>
> {
  const response = await apiFetch<AdminSessionStatsResponse>(
    "/api/admin/sessions/stats",
    {
      method: "GET",
    },
    API_BASE_URL,
  );

  return response;
}

export async function getAdminSessions(params: {
  keyword?: string;
  status?: ScheduleStatus | null;
  studyMode?: StudyMode | null;
  sessionType?: ScheduleType | null;
  startFrom?: string;
  startTo?: string;
  page?: number;
  limit?: number;
}): Promise<APIResponseData<PageResponse<AdminSessionRowResponse>>> {
  const query = new URLSearchParams();

  if (params.keyword) query.set("keyword", params.keyword);
  if (params.status) query.set("status", params.status);
  if (params.studyMode) query.set("studyMode", params.studyMode);
  if (params.sessionType) query.set("sessionType", params.sessionType);
  if (params.startFrom) query.set("startFrom", params.startFrom);
  if (params.startTo) query.set("startTo", params.startTo);
  query.set("page", String(params.page ?? 0));
  query.set("limit", String(params.limit ?? 10));

  const response = await apiFetch<PageResponse<AdminSessionRowResponse>>(
    `/api/admin/sessions?${query.toString()}`,
    {
      method: "GET",
    },
    API_BASE_URL,
  );

  return response;
}

export async function getTopUpcomingSessions(
  userId: number,
): Promise<APIResponseData<StudySessionResponse[]>> {
  const response = await apiFetch<StudySessionResponse[]>(
    `/api/study-sessions/user/${userId}/upcoming`,
    {
      method: "GET",
    },
    API_BASE_URL,
  );
  return response;
}

export async function getDetailedUserStats(
  userId: number,
): Promise<APIResponseData<DetailedUserStatsResponse>> {
  const response = await apiFetch<DetailedUserStatsResponse>(
    `/api/study-sessions/user/${userId}/detailed-stats`,
    {
      method: "GET",
    },
    API_BASE_URL,
  );
  return response;
}

export async function cancelStudySessionForAdmin(
  sessionId: number,
): Promise<APIResponseData<void>> {
  const response = await apiFetch<void>(
    `/api/admin/sessions/${sessionId}/cancel`,
    {
      method: "PATCH",
    },
    API_BASE_URL,
  );
  return response;
}

export async function deleteStudySessionForAdmin(
  sessionId: number,
): Promise<APIResponseData<void>> {
  const response = await apiFetch<void>(
    `/api/admin/sessions/${sessionId}`,
    {
      method: "DELETE",
    },
    API_BASE_URL,
  );
  return response;
}


