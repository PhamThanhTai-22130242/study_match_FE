export type SessionType = "USER_PAIR" | "GROUP";

export type StudyMode = "ONLINE" | "OFFLINE" | "HYBRID";

export type SessionStatus = "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";

export type ParticipantStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "JOINED"
  | "ABSENT"
  | "PARTIAL"
  | "COMPLETED";

export type ScheduleFilter = "ALL" | "USER_PAIR" | "GROUP" | "PENDING";

export interface StudySessionVm {
  id: number;
  sessionType: SessionType;
  groupId?: number | null;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  studyMode: StudyMode;
  location?: string;
  meetingUrl?: string;
  createdByUserId: number;
  status: SessionStatus;
  participantStatus: ParticipantStatus;
  partnerName?: string;
  groupName?: string;
  groupAvatarUrl?: string | null;
  membersCount?: number;
  subjectName?: string;
  recurrenceId?: string | null;
  recurrenceType?: string | null;
}

export type GroupStudySessionMode = "ONLINE" | "OFFLINE" | "HYBRID";

export type StudySessionType = "GROUP" | "USER_PAIR";

export interface CreateStudySessionRequest {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string | null;
  startTime: string;
  endTime: string;
  studyMode: GroupStudySessionMode;
  location?: string;
  meetingUrl?: string;
  createdByUserId: number;
  sessionType: StudySessionType;
  subjectName?: string | null;
  subjectId?: number | null;
  partnerUserId?: number | null;
  partnerUserName?: string | null;
  recurrenceType: string;
  repeatDays: string[];
}

export type GroupStudySessionStatus =
  | "SCHEDULED"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED";
export interface StudySessionResponse {
  id: number;
  sessionType: StudySessionType;
  groupId: number | null;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  studyMode: GroupStudySessionMode;
  location: string | null;
  meetingUrl: string | null;
  createdByUserId: number;
  status: GroupStudySessionStatus;
  participantStatus: ParticipantStatus;
  partnerName: string | null;
  partnerUserName?: string | null;
  groupName: string | null;
  groupAvatarUrl?: string | null;
  membersCount: number | null;
  subjectName: string | null;
  createdAt: string;
  updatedAt: string;
  totalCreated?: number | null;
  recurrenceId?: string | null;
  recurrenceType?: string | null;
}

export interface SessionParticipantConfirmationResponse {
  userId?: number | null;
  userName?: string | null;
  fullName?: string | null;
  partnerUserName?: string | null;
  role?: string | null;
  status?: ParticipantStatus | null;
  respondedAt?: string | null;
  avatarUrl?: string | null;
}

export interface SessionConfirmationStatsResponse {
  sessionId: number;
  sessionType: StudySessionType;
  currentUserId: number;
  totalParticipants: number;
  acceptedCount: number;
  pendingCount: number;
  declinedCount: number;
  otherParticipants: SessionParticipantConfirmationResponse[];
}

export interface JoinStudySessionResponse {
  sessionId: number;
  roomId: string;
  token: string;
  joinedAt: string;
}

export type AttendanceStatus =
  | "COMPLETED"
  | "PARTIAL"
  | "ABSENT"
  | "NOT_JOINED"
  | "JOINED_SHORT"
  | "JOINED_PARTIAL";

export interface LeaveStudySessionResponse {
  sessionId: number;
  userId: number;
  attendanceLogId?: number;
  joinedAt?: string;
  leftAt: string;
  durationSeconds: number;
  totalDurationSeconds: number;
  joinCount?: number;
  attendanceStatus: AttendanceStatus;
}

export type FeedbackType =
  | "SESSION_FEEDBACK"
  | "REPORT_PROBLEM"
  | "EARLY_LEAVE_REASON"
  | "PARTIAL_FEEDBACK";

export interface FeedbackEligibilityResponse {
  sessionId: number;
  userId: number;
  sessionType: StudySessionType;
  targetUserId: number | null;
  groupId: number | null;
  sessionEnded: boolean;
  canSubmitFeedback: boolean;
  feedbackType: FeedbackType | null;
  totalDurationSeconds: number;
  minRequiredDurationSeconds: number;
  attendanceStatus: AttendanceStatus;
  eligibleForModel: boolean;
}

export interface SubmitStudyFeedbackRequest {
  sessionId: number;
  userId: number;
  targetUserId: number | null;
  groupId: number | null;
  sessionType: StudySessionType;
  feedbackType: FeedbackType;
  rating?: number;
  content: string;
  matchedQualityScore?: number;
  communicationScore?: number;
  studyEffectivenessScore?: number;
  eligibleForModel: boolean;
}

export interface SubmitStudyFeedbackResponse {
  id?: number;
  feedbackId?: number;
  sessionId: number;
  userId?: number;
  reviewerUserId?: number;
  targetUserId?: number | null;
  groupId?: number | null;
  feedbackType: FeedbackType;
  rating?: number;
  matchedQualityScore?: number;
  communicationScore?: number;
  studyEffectivenessScore?: number;
  eligibleForModel?: boolean;
  comment?: string;
  content?: string;
  createdAt: string;
}

export interface DailyStudyTrend {
  date: string;
  durationSeconds: number;
  sessionCount: number;
}

export interface SubjectStudyStats {
  subjectName: string;
  durationSeconds: number;
  sessionCount: number;
}

export interface DetailedUserStatsResponse {
  totalStudyDurationSeconds: number;
  attendanceRate: number;
  joinedCount: number;
  absentCount: number;
  declinedCount: number;
  pendingCount: number;
  dailyTrends: DailyStudyTrend[];
  subjectStats: SubjectStudyStats[];
}
