import { useEffect, useMemo, useState } from "react";
import type {
  SessionConfirmationStatsResponse,
  StudySessionVm,
  StudySessionResponse,
  JoinStudySessionResponse,
  FeedbackEligibilityResponse,
  SubmitStudyFeedbackResponse,
} from "../types";
import {
  getStudySessionById,
  getConfirmationStats,
  respondToStudySession,
  joinStudySession,
  cancelStudySession,
  respondToMultipleStudySessions,
  getSessionsByRecurrenceId,
  getFeedbackEligibility,
  getStudyFeedbackBySessionAndUser,
} from "../../../services/StudySessionService";
import FeedbackSubmitSheet from "./FeedbackModal";
import { toast } from "react-toastify";
import {
  Clock,
  MapPin,
  Video,
  BookOpen,
  Users,
  User,
  X,
  AlertCircle,
  BarChart3,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

interface SessionDetailModalProps {
  session: StudySessionVm | null;
  onClose: () => void;
  onSessionUpdated?: (session: StudySessionVm) => void;
  onJoinSession?: (joinData: JoinStudySessionResponse) => void;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSessionTimeRange(startTimeStr: string, endTimeStr: string) {
  const start = new Date(startTimeStr);
  const end = new Date(endTimeStr);

  const timeStr = `${start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
  const dateStr = start.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

  return { timeStr, dateStr };
}

function formatSessionSingleOptionDate(s: StudySessionVm) {
  const start = new Date(s.startTime);
  const end = new Date(s.endTime);
  const weekday = start.toLocaleDateString("vi-VN", { weekday: "long" });
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const dateStr = start.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = `${start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}–${end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
  return `${capitalizedWeekday}, ${dateStr} · ${timeStr}`;
}

function getStudyModeBadge(mode: string) {
  if (mode === "ONLINE") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200">
        <Video className="h-3 w-3 text-gray-500" />
        Online
      </span>
    );
  }
  if (mode === "OFFLINE") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200">
        <MapPin className="h-3 w-3 text-gray-500" />
        Trực tiếp
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200">
      Kết hợp
    </span>
  );
}

function getParticipantStatusLabel(status: string) {
  if (status === "PENDING") return "Chờ xác nhận";
  if (status === "ACCEPTED") return "Đã xác nhận";
  if (status === "JOINED") return "Đã tham gia";
  if (status === "DECLINED") return "Đã từ chối";
  if (status === "ABSENT") return "Vắng mặt";
  if (status === "PARTIAL") return "Tham gia một phần";
  if (status === "COMPLETED") return "Hoàn thành";
  return status;
}

function getModeLabel(mode: string) {
  if (mode === "ONLINE") return "Online";
  if (mode === "OFFLINE") return "Trực tiếp";
  return "Kết hợp";
}

function getSessionStatusLabel(status?: string | null) {
  if (status === "SCHEDULED") return "Đã lên lịch";
  if (status === "ONGOING") return "Đang diễn ra";
  if (status === "COMPLETED") return "Đã hoàn thành";
  if (status === "CANCELLED") return "Đã hủy";
  return status || "Chưa rõ";
}

function mapResponseToVm(
  response: StudySessionResponse,
  fallback: StudySessionVm,
): StudySessionVm {
  return {
    ...fallback,
    id: response.id,
    sessionType: response.sessionType,
    groupId: response.groupId,
    title: response.title,
    description: response.description ?? undefined,
    startTime: response.startTime,
    endTime: response.endTime,
    studyMode: response.studyMode,
    location: response.location ?? undefined,
    meetingUrl: response.meetingUrl ?? undefined,
    createdByUserId: response.createdByUserId,
    status: response.status,
    participantStatus: response.participantStatus,
    partnerName:
      response.partnerUserName ?? response.partnerName ?? fallback.partnerName,
    groupName: response.groupName ?? undefined,
    membersCount: response.membersCount ?? undefined,
    subjectName: response.subjectName ?? undefined,
    recurrenceId: response.recurrenceId ?? undefined,
    recurrenceType: response.recurrenceType ?? undefined,
  };
}

function getParticipantName(participant: {
  userName?: string | null;
  fullName?: string | null;
  partnerUserName?: string | null;
}) {
  return (
    participant.fullName ||
    participant.userName ||
    participant.partnerUserName ||
    "Bạn học"
  );
}

function formatRespondedAt(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadgeClass(status?: string | null) {
  if (status === "ACCEPTED" || status === "JOINED") {
    return "text-emerald-600";
  }
  if (status === "PENDING") {
    return "text-blue-600";
  }
  if (status === "DECLINED") {
    return "text-rose-600";
  }
  return "text-gray-500";
}

function hasSessionEnded(session: StudySessionVm | null) {
  if (!session) return false;
  const now = new Date();
  const endTime = new Date(session.endTime);
  return now > endTime;
}

const extractErrorMessage = (res: any, fallback: string): string => {
  if (!res) return fallback;
  if (typeof res === "string") return res;
  if (res.message && res.message !== "No message available") return res.message;
  if (res.error && typeof res.error === "string") return res.error;
  if (res.errors && Array.isArray(res.errors) && res.errors.length > 0) {
    const firstErr = res.errors[0];
    if (typeof firstErr === "string") return firstErr;
    if (firstErr.defaultMessage) return firstErr.defaultMessage;
  }
  return fallback;
};

export function SessionDetailModal({
  session,
  onClose,
  onSessionUpdated,
  onJoinSession,
}: SessionDetailModalProps) {
  const [detail, setDetail] = useState<StudySessionResponse | null>(null);
  const [confirmationStats, setConfirmationStats] =
    useState<SessionConfirmationStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState("");
  const [responding, setResponding] = useState<"ACCEPTED" | "DECLINED" | null>(
    null,
  );
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [recurrenceSelectType, setRecurrenceSelectType] = useState<"SINGLE" | "ALL" | "CUSTOM">("SINGLE");
  const [recurrenceSessions, setRecurrenceSessions] = useState<StudySessionResponse[]>([]);
  const [selectedRecurrenceSessionIds, setSelectedRecurrenceSessionIds] = useState<number[]>([]);
  const [loadingRecurrence, setLoadingRecurrence] = useState(false);
  const [feedbackEligibility, setFeedbackEligibility] = useState<FeedbackEligibilityResponse | null>(null);
  const [userFeedback, setUserFeedback] = useState<SubmitStudyFeedbackResponse | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadDetail() {
      if (!session) {
        setDetail(null);
        setError("");
        setLoading(false);
        return;
      }
      setDetail(null);
      setError("");
      const userId = Number(localStorage.getItem("userId"));
      if (!Number.isFinite(userId) || userId <= 0) {
        setDetail(null);
        setError("Không tìm thấy userId. Vui lòng đăng nhập lại.");
        return;
      }
      try {
        setLoading(true);
        const response = await getStudySessionById(session.id, userId);
        if (!mounted) return;
        setDetail(response.data);
      } catch {
        if (!mounted) return;
        setDetail(null);
        setError("Không thể tải chi tiết lịch học");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    loadDetail();
    return () => {
      mounted = false;
    };
  }, [session?.id]);

  useEffect(() => {
    let mounted = true;
    async function loadStats() {
      if (!session) {
        setConfirmationStats(null);
        setLoadingStats(false);
        return;
      }
      const userId = Number(localStorage.getItem("userId"));
      if (!Number.isFinite(userId) || userId <= 0) {
        setConfirmationStats(null);
        return;
      }
      const canViewStats =
        session.sessionType === "USER_PAIR" ||
        session.createdByUserId === userId;
      if (!canViewStats) {
        setConfirmationStats(null);
        return;
      }
      try {
        setLoadingStats(true);
        const response = await getConfirmationStats(session.id, userId);
        if (!mounted) return;
        setConfirmationStats(response.data);
      } catch {
        if (!mounted) return;
        setConfirmationStats(null);
      } finally {
        if (mounted) {
          setLoadingStats(false);
        }
      }
    }
    loadStats();
    return () => {
      mounted = false;
    };
  }, [session?.id, session?.sessionType, session?.createdByUserId]);

  useEffect(() => {
    let mounted = true;
    async function loadFeedback() {
      if (!session) {
        setFeedbackEligibility(null);
        setUserFeedback(null);
        return;
      }
      const userIdVal = Number(localStorage.getItem("userId"));
      if (!Number.isFinite(userIdVal) || userIdVal <= 0) {
        setFeedbackEligibility(null);
        setUserFeedback(null);
        return;
      }
      const ended =
        session.status === "COMPLETED" ||
        hasSessionEnded(session) ||
        (detail && (detail.status === "COMPLETED" || hasSessionEnded(mapResponseToVm(detail, session))));
      if (!ended) {
        setFeedbackEligibility(null);
        setUserFeedback(null);
        return;
      }
      try {
        setLoadingFeedback(true);
        const [eligibilityRes, feedbackRes] = await Promise.allSettled([
          getFeedbackEligibility(session.id, userIdVal),
          getStudyFeedbackBySessionAndUser(session.id, userIdVal),
        ]);
        if (!mounted) return;
        if (eligibilityRes.status === "fulfilled" && eligibilityRes.value?.data) {
          setFeedbackEligibility(eligibilityRes.value.data);
        } else {
          setFeedbackEligibility(null);
        }
        if (feedbackRes.status === "fulfilled" && feedbackRes.value?.data) {
          setUserFeedback(feedbackRes.value.data);
        } else {
          setUserFeedback(null);
        }
      } catch {
        // ignore
      } finally {
        if (mounted) {
          setLoadingFeedback(false);
        }
      }
    }
    loadFeedback();
    return () => {
      mounted = false;
    };
  }, [session?.id, session?.status, session?.endTime, detail?.status, detail?.endTime]);

  const currentSession = useMemo<StudySessionVm | null>(() => {
    if (!detail || !session) return session;
    return {
      ...session,
      sessionType: detail.sessionType,
      groupId: detail.groupId,
      title: detail.title,
      description: detail.description ?? undefined,
      startTime: detail.startTime,
      endTime: detail.endTime,
      studyMode: detail.studyMode,
      location: detail.location ?? undefined,
      meetingUrl: detail.meetingUrl ?? undefined,
      createdByUserId: detail.createdByUserId,
      status: detail.status,
      participantStatus: detail.participantStatus,
      partnerName:
        detail.partnerUserName ?? detail.partnerName ?? session.partnerName,
      groupName: detail.groupName ?? undefined,
      membersCount: detail.membersCount ?? undefined,
      subjectName: detail.subjectName ?? undefined,
    };
  }, [detail, session]);

  const userId = Number(localStorage.getItem("userId"));
  const isCreator = (currentSession?.createdByUserId || session?.createdByUserId) === userId;
  const isCancelled = (currentSession?.status || session?.status) === "CANCELLED";
  const isCompleted = (currentSession?.status || session?.status) === "COMPLETED";
  const isEnded = isCompleted || hasSessionEnded(currentSession);
  const startTimeVal = new Date(currentSession?.startTime || session?.startTime || 0).getTime();
  const endTimeVal = new Date(currentSession?.endTime || session?.endTime || 0).getTime();
  const isOngoing =
    (currentSession?.status || session?.status) === "ONGOING" ||
    (!isEnded && !isCancelled && startTimeVal <= now && now <= endTimeVal);
  const canCancel = startTimeVal - now >= 5 * 60 * 1000;

  const canEvaluate =
    isEnded &&
    !isCancelled &&
    !userFeedback &&
    Boolean(
      feedbackEligibility?.canSubmitFeedback &&
      feedbackEligibility?.feedbackType === "SESSION_FEEDBACK" &&
      feedbackEligibility?.attendanceStatus !== "ABSENT" &&
      feedbackEligibility?.attendanceStatus !== "NOT_JOINED"
    );

  const showFeedbackSection =
    (isEnded || isCompleted) &&
    !isCancelled &&
    (Boolean(userFeedback) || canEvaluate);

  const showFooter =
    (currentSession?.participantStatus === "PENDING" && !isCancelled) ||
    (!hasSessionEnded(currentSession) &&
      ["ACCEPTED", "JOINED"].includes(currentSession?.participantStatus || "") &&
      currentSession?.studyMode !== "OFFLINE" &&
      !isCancelled) ||
    (isCreator && !isCancelled && !isCompleted && canCancel) ||
    (!isCreator && !isCancelled && !isCompleted && ["ACCEPTED", "DECLINED"].includes(currentSession?.participantStatus || ""));

  const handleRespond = async (status: "ACCEPTED" | "DECLINED") => {
    if (!session) return;
    const userIdVal = Number(localStorage.getItem("userId"));
    if (!Number.isFinite(userIdVal) || userIdVal <= 0) {
      setError("Không tìm thấy userId. Vui lòng đăng nhập lại.");
      return;
    }
    try {
      setResponding(status);
      setError("");
      const response = await respondToStudySession(session.id, userIdVal, status);
      if (response.data) {
        toast.success(
          status === "ACCEPTED"
            ? "Đã xác nhận tham gia buổi học"
            : "Đã từ chối tham gia buổi học"
        );
        const updatedSession = mapResponseToVm(response.data, session);
        onSessionUpdated?.(updatedSession);
        window.dispatchEvent(new Event("study_session_updated"));
        onClose();
      } else {
        const errorMsg = extractErrorMessage(response, "Không thể gửi phản hồi cho lịch học");
        toast.error(errorMsg);
        onClose();
      }
    } catch {
      const errorMsg = "Không thể gửi phản hồi cho lịch học";
      toast.error(errorMsg);
      onClose();
    } finally {
      setResponding(null);
    }
  };

  const handleOpenRecurrenceModal = async (status: "ACCEPTED" | "DECLINED") => {
    if (!session) return;
    const userIdVal = Number(localStorage.getItem("userId"));
    if (!Number.isFinite(userIdVal) || userIdVal <= 0) {
      setError("Không tìm thấy userId. Vui lòng đăng nhập lại.");
      return;
    }
    const recId = currentSession?.recurrenceId || session?.recurrenceId;
    if (!recId) {
      await handleRespond(status);
      return;
    }

    try {
      setResponding(status);
      setLoadingRecurrence(true);
      setError("");
      const response = await getSessionsByRecurrenceId(recId, userIdVal);
      if (response.data) {

        const pendingSessions = response.data.filter(
          (s) => s.participantStatus === "PENDING"
        );

        if (pendingSessions.length <= 1) {

          await handleRespond(status);
          return;
        }

        setRecurrenceSessions(pendingSessions);
        setSelectedRecurrenceSessionIds(pendingSessions.map((s) => s.id));
        setRecurrenceSelectType("SINGLE");
        setShowRecurrenceModal(true);
      } else {
        setError("Không thể tải danh sách chuỗi lịch lặp");
      }
    } catch {
      setError("Có lỗi xảy ra khi tải chuỗi lịch lặp");
    } finally {
      setLoadingRecurrence(false);
    }
  };

  const handleRecurrenceRespondSubmit = async () => {
    if (!session || !responding) return;
    const userIdVal = Number(localStorage.getItem("userId"));
    if (!Number.isFinite(userIdVal) || userIdVal <= 0) {
      setError("Không tìm thấy userId. Vui lòng đăng nhập lại.");
      return;
    }

    let idsToRespond: number[] = [];
    if (recurrenceSelectType === "SINGLE") {
      idsToRespond = [session.id];
    } else if (recurrenceSelectType === "ALL") {
      idsToRespond = recurrenceSessions.map(s => s.id);
    } else {
      idsToRespond = selectedRecurrenceSessionIds;
    }

    if (idsToRespond.length === 0) {
      toast.warning("Vui lòng chọn ít nhất một buổi học");
      return;
    }

    try {
      setLoadingRecurrence(true);
      setError("");
      const response = await respondToMultipleStudySessions(userIdVal, idsToRespond, responding);
      if (response.success) {
        toast.success(
          responding === "ACCEPTED"
            ? `Đã xác nhận tham gia ${idsToRespond.length} buổi học`
            : `Đã từ chối tham gia ${idsToRespond.length} buổi học`
        );
        setShowRecurrenceModal(false);
        const detailResponse = await getStudySessionById(session.id, userIdVal);
        if (detailResponse.data) {
          const updatedSession = mapResponseToVm(detailResponse.data, session);
          onSessionUpdated?.(updatedSession);
        }
        window.dispatchEvent(new Event("study_session_updated"));
        onClose();
      } else {
        const errorMsg = extractErrorMessage(response, "Không thể cập nhật trạng thái chuỗi lịch học");
        toast.error(errorMsg);
        setShowRecurrenceModal(false);
        onClose();
      }
    } catch {
      const errorMsg = "Có lỗi xảy ra khi cập nhật trạng thái chuỗi lịch học";
      toast.error(errorMsg);
      setShowRecurrenceModal(false);
      onClose();
    } finally {
      setLoadingRecurrence(false);
      setResponding(null);
    }
  };

  const handleJoinSession = async () => {
    if (!session || joining) return;
    const userIdVal = Number(localStorage.getItem("userId"));
    if (!Number.isFinite(userIdVal) || userIdVal <= 0) {
      setError("Không tìm thấy userId. Vui lòng đăng nhập lại.");
      return;
    }
    const startTime = new Date(session.startTime).getTime();
    const currentTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    if (startTime - currentTime > fiveMinutes) {
      toast.warning("Chỉ được tham gia trước giờ học 5 phút hoặc khi buổi học đang diễn ra.");
      return;
    }
    try {
      setJoining(true);
      setError("");
      const response = await joinStudySession(session.id, userIdVal);
      if (response.data) {
        onJoinSession?.(response.data);
      }
    } catch {
      setError("Không thể kết nối phòng học");
    } finally {
      setJoining(false);
    }
  };

  const handleCancel = async () => {
    if (!session || cancelling) return;
    const userIdVal = Number(localStorage.getItem("userId"));
    if (!Number.isFinite(userIdVal) || userIdVal <= 0) {
      setError("Không tìm thấy userId. Vui lòng đăng nhập lại.");
      return;
    }
    const currentStartTime = new Date(currentSession?.startTime || session.startTime).getTime();
    if (currentStartTime - Date.now() < 5 * 60 * 1000) {
      toast.error("Không thể hủy lịch học trước giờ bắt đầu dưới 5 phút.");
      return;
    }
    try {
      setCancelling(true);
      setError("");
      await cancelStudySession(session.id, userIdVal);
      onSessionUpdated?.({
        ...(currentSession || session),
        status: "CANCELLED" as any,
      });
      onClose();
    } catch {
      setError("Không thể hủy lịch học");
    } finally {
      setCancelling(false);
    }
  };

  if (!session) return null;

  const isGroup = (currentSession?.sessionType || session.sessionType) === "GROUP";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/40 px-4 py-6">
      <div className="relative w-full max-w-2xl flex flex-col max-h-[90vh] bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden animate-scale-in">
        <div className="flex items-start justify-between border-b border-gray-100 bg-white px-6 py-5 shrink-0">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {isCancelled ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                  Đã hủy
                </span>
              ) : isEnded ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-gray-500" />
                  Đã kết thúc
                </span>
              ) : isOngoing ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  Đang diễn ra
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  Đã lên lịch
                </span>
              )}

              {getStudyModeBadge(currentSession?.studyMode || session.studyMode)}

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200">
                {isGroup ? <Users className="h-3 w-3 text-gray-500" /> : <User className="h-3 w-3 text-gray-500" />}
                {isGroup ? "Nhóm học" : "Cặp đôi 1-1"}
              </span>

              {(currentSession?.subjectName || session.subjectName) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200">
                  <BookOpen className="h-3 w-3 text-gray-500" />
                  {currentSession?.subjectName || session.subjectName}
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold text-gray-900 leading-snug">
              {currentSession?.title || session.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 animate-fade-in">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <div className="text-xs font-semibold">{error}</div>
            </div>
          )}

          {isCancelled && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 animate-fade-in">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
              <div>
                <div className="text-xs font-bold">Lịch học này đã bị hủy</div>
                <div className="text-[10px] text-red-700 mt-1">Buổi học đã được hủy bởi người tạo lịch học.</div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-sm font-semibold text-gray-500">Đang tải thông tin chi tiết...</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Thời gian</span>
                  <div className="mt-1.5 text-sm font-bold text-gray-800">
                    {formatDateTime(currentSession?.startTime || session.startTime)}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Đến: {formatDateTime(currentSession?.endTime || session.endTime)}
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hình thức</span>
                  <div className="mt-1.5 text-sm font-bold text-gray-800">
                    {getModeLabel(currentSession?.studyMode || session.studyMode)}
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {isGroup ? "Nhóm học" : "Bạn học"}
                  </span>
                  <div className="mt-1.5 text-sm font-bold text-gray-800">
                    {isGroup
                      ? currentSession?.groupName || session.groupName || "Nhóm học"
                      : currentSession?.partnerName || session.partnerName || "Bạn học"}
                  </div>
                  {isGroup && (
                    <div className="mt-1 text-xs text-gray-500">
                      Quy mô: {currentSession?.membersCount || session.membersCount || 0} thành viên
                    </div>
                  )}
                </div>

                {/* <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Địa điểm / Link học</span>
                  {currentSession?.location || currentSession?.meetingUrl || session.location || session.meetingUrl ? (
                    <div className="mt-1.5 min-w-0">
                      {(currentSession?.location || session.location) && (
                        <div className="text-sm font-medium text-gray-800 break-words">
                          {currentSession?.location || session.location}
                        </div>
                      )}
                      {(currentSession?.meetingUrl || session.meetingUrl) && (
                        <div className="mt-1.5">
                          <a
                            href={currentSession?.meetingUrl || session.meetingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            Mở phòng học online
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1.5 text-xs text-gray-400 font-medium italic">
                      Chưa cập nhật địa điểm hoặc link
                    </div>
                  )}
                </div> */}

                <div className="md:col-span-2 bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nội dung học</span>
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-600 whitespace-pre-wrap">
                    {currentSession?.description || session.description || "Không có nội dung mô tả"}
                  </p>
                </div>
              </div>

              {confirmationStats && (
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center">
                      <div>
                        <div className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                          Trạng thái xác nhận
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {confirmationStats.sessionType === "USER_PAIR"
                            ? "Buổi học cá nhân 1-1"
                            : "Danh sách xác nhận thành viên"}
                        </div>
                      </div>
                    </div>
                    {loadingStats && (
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500" />
                      </span>
                    )}
                  </div>

                  <div className="overflow-hidden bg-white mt-1">
                    <table className="w-full text-center border-collapse">
                      <thead>
                        <tr className="bg-gray-50/75 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          <th className="px-4 py-2 font-bold">Tham gia</th>
                          <th className="px-4 py-2 font-bold">Đồng ý</th>
                          <th className="px-4 py-2 font-bold">Chờ</th>
                          <th className="px-4 py-2 font-bold">Từ chối</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="text-lg font-bold text-gray-800">
                          <td className="px-4 py-2.5 font-mono">{confirmationStats.totalParticipants}</td>
                          <td className="px-4 py-2.5 font-mono">{confirmationStats.acceptedCount}</td>
                          <td className="px-4 py-2.5 font-mono">{confirmationStats.pendingCount}</td>
                          <td className="px-4 py-2.5 font-mono">{confirmationStats.declinedCount}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-2 mt-4">
                    {confirmationStats.otherParticipants.length === 0 ? (
                      <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-6 text-xs text-gray-400 text-center font-medium">
                        Chưa có dữ liệu xác nhận
                      </div>
                    ) : (
                      confirmationStats.otherParticipants.map((participant, index) => (
                        <div
                          key={`${participant.userId ?? participant.fullName ?? index}`}
                          className="flex items-center justify-between rounded-xl bg-gray-50/40 border border-gray-100 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                              {getParticipantName(participant).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-gray-800">
                                {getParticipantName(participant)}
                              </div>
                              <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                                <span>
                                  {participant.role === "PARTICIPANT" ? "Thành viên" : "Người tạo lịch"}
                                </span>
                                {participant.respondedAt && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span>{formatRespondedAt(participant.respondedAt)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold ${getStatusBadgeClass(participant.status)}`}>
                            {getParticipantStatusLabel(participant.status || "")}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Đánh giá buổi học (Chỉ hiển thị khi đã có đánh giá hoặc user đã tham gia và đủ điều kiện đánh giá) */}
              {showFeedbackSection && (
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Đánh giá buổi học
                      </span>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {userFeedback
                          ? "Bạn đã gửi đánh giá cho buổi học này."
                          : "Đánh giá chất lượng và trải nghiệm học tập của bạn."}
                      </div>
                    </div>

                    {userFeedback ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Đã đánh giá
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowFeedbackModal(true)}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white transition-all shadow-sm shadow-blue-600/10 shrink-0"
                      >
                        Đánh giá buổi học
                      </button>
                    )}
                  </div>

                  {userFeedback && (
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs text-gray-700 space-y-1">
                      {userFeedback.rating && (
                        <div className="font-semibold text-gray-800">
                          Điểm đánh giá: {userFeedback.rating}/5
                        </div>
                      )}
                      {(userFeedback.comment || userFeedback.content) && (
                        <p className="text-gray-600 italic">
                          "{userFeedback.comment || userFeedback.content}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {showFooter && (
          <div className="sticky bottom-0 z-10 border-t border-gray-100 bg-white px-6 py-4 flex flex-col gap-3 shrink-0">
            {currentSession?.participantStatus === "PENDING" && !isCancelled && (
              <div className="flex flex-col gap-3 sm:flex-row">
                {hasSessionEnded(currentSession) ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-xl bg-gray-100 border border-gray-200 px-5 py-2.5 text-xs font-bold text-gray-400 cursor-not-allowed"
                  >
                    Buổi học đã kết thúc
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenRecurrenceModal("ACCEPTED")}
                      disabled={responding !== null}
                      className="flex-1 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm shadow-blue-600/10"
                    >
                      {responding === "ACCEPTED" ? "Đang xử lý..." : "Xác nhận tham gia"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenRecurrenceModal("DECLINED")}
                      disabled={responding !== null}
                      className="flex-1 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-all"
                    >
                      {responding === "DECLINED" ? "Đang xử lý..." : "Từ chối"}
                    </button>
                  </>
                )}
              </div>
            )}

            {!hasSessionEnded(currentSession) &&
              ["ACCEPTED", "JOINED"].includes(currentSession?.participantStatus || "") &&
              currentSession?.studyMode !== "OFFLINE" &&
              !isCancelled && (
                <button
                  type="button"
                  onClick={handleJoinSession}
                  disabled={joining}
                  className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-md shadow-blue-600/20 transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:shadow-blue-600/30 disabled:opacity-50"
                >
                  {joining ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Đang kết nối...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Video className="h-4 w-4" />
                      Tham gia phòng học
                    </span>
                  )}
                </button>
              )}

            {!isCreator && !isCancelled && !isCompleted && currentSession?.participantStatus === "ACCEPTED" && (
              <button
                type="button"
                onClick={() => handleOpenRecurrenceModal("DECLINED")}
                disabled={responding !== null}
                className="w-full rounded-xl px-5 py-2.5 text-xs font-bold transition-all border bg-white border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              >
                {responding === "DECLINED" ? "Đang xử lý..." : "Hủy tham gia"}
              </button>
            )}

            {!isCreator && !isCancelled && !isCompleted && currentSession?.participantStatus === "DECLINED" && (
              <button
                type="button"
                onClick={() => handleOpenRecurrenceModal("ACCEPTED")}
                disabled={responding !== null}
                className="w-full rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/10 transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                {responding === "ACCEPTED" ? "Đang xử lý..." : "Tham gia lại"}
              </button>
            )}

            {isCreator && !isCancelled && !isCompleted && canCancel && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="w-full rounded-xl px-5 py-2.5 text-xs font-bold transition-all border bg-white border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                {cancelling ? "Đang hủy..." : "Hủy buổi học"}
              </button>
            )}
          </div>
        )}
      </div>

      {showFeedbackModal && feedbackEligibility && (
        <FeedbackSubmitSheet
          eligibility={feedbackEligibility}
          onClose={() => setShowFeedbackModal(false)}
          onSuccess={(newFeedback) => {
            setUserFeedback(newFeedback);
            setShowFeedbackModal(false);
            toast.success("Cảm ơn bạn đã gửi đánh giá buổi học!");
          }}
        />
      )}

      {showRecurrenceModal && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-gray-900/50 px-4 py-6">
          <div className="relative w-full max-w-lg bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5 shrink-0">
              <h3 className="text-base font-bold text-gray-900 leading-snug">
                {responding === "ACCEPTED" ? "Xác nhận tham gia" : "Từ chối lịch học"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowRecurrenceModal(false);
                  setResponding(null);
                }}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-sm font-semibold text-gray-800">
                Bạn muốn áp dụng cho những buổi nào?
              </p>

              <div className="space-y-3">
                {session && (
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="recurrenceSelectType"
                      checked={recurrenceSelectType === "SINGLE"}
                      onChange={() => setRecurrenceSelectType("SINGLE")}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-200"
                    />
                    <div>
                      <span className="text-sm font-semibold text-gray-800">
                        Chỉ buổi này
                      </span>
                      <span className="block text-xs text-gray-500 mt-0.5">
                        {formatSessionSingleOptionDate(session)}
                      </span>
                    </div>
                  </label>
                )}

                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="recurrenceSelectType"
                    checked={recurrenceSelectType === "ALL"}
                    onChange={() => setRecurrenceSelectType("ALL")}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-200"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      Tất cả {recurrenceSessions.length} buổi chưa phản hồi
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      Áp dụng cho các buổi sắp tới trong chuỗi
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="recurrenceSelectType"
                    checked={recurrenceSelectType === "CUSTOM"}
                    onChange={() => setRecurrenceSelectType("CUSTOM")}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-200"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      Tự chọn buổi học
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      Chọn từng buổi cụ thể
                    </span>
                  </div>
                </label>
              </div>

              {recurrenceSelectType === "CUSTOM" && (
                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 bg-gray-50/50 max-h-48 overflow-y-auto">
                  {recurrenceSessions.map((s) => {
                    const isSel = selectedRecurrenceSessionIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-start gap-3 px-4 py-3.5 hover:bg-white cursor-pointer select-none transition-colors ${isSel ? "bg-blue-50/20" : ""
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => {
                            if (isSel) {
                              setSelectedRecurrenceSessionIds(
                                selectedRecurrenceSessionIds.filter((id) => id !== s.id)
                              );
                            } else {
                              setSelectedRecurrenceSessionIds([
                                ...selectedRecurrenceSessionIds,
                                s.id,
                              ]);
                            }
                          }}
                          className="mt-1 h-4.5 w-4.5 rounded border-gray-300 text-blue-600 focus:ring-blue-200"
                        />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-bold text-gray-800 truncate">
                              {s.title}
                            </div>
                            {getStudyModeBadge(s.studyMode)}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-gray-400" />
                              {(() => {
                                const { timeStr, dateStr } = formatSessionTimeRange(s.startTime, s.endTime);
                                return (
                                  <>
                                    <span className="font-semibold text-gray-700">{timeStr}</span>, {dateStr}
                                  </>
                                );
                              })()}
                            </span>
                          </div>

                          {(s.studyMode === "ONLINE" && s.meetingUrl) && (
                            <div className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                              <Video className="h-3.5 w-3.5 text-blue-500" />
                              <span className="truncate">{s.meetingUrl}</span>
                            </div>
                          )}

                          {(s.studyMode === "OFFLINE" && s.location) && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-600 font-medium">
                              <MapPin className="h-3.5 w-3.5 text-amber-500" />
                              <span className="truncate">{s.location}</span>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {s.subjectName && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-gray-600">
                                <BookOpen className="h-3 w-3" />
                                {s.subjectName}
                              </span>
                            )}
                            {s.groupName && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-gray-600">
                                <Users className="h-3 w-3" />
                                {s.groupName}
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 bg-white px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRecurrenceModal(false);
                  setResponding(null);
                }}
                disabled={loadingRecurrence}
                className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Quay lại
              </button>

              <button
                type="button"
                onClick={handleRecurrenceRespondSubmit}
                disabled={loadingRecurrence}
                className={`rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-colors ${responding === "ACCEPTED"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-rose-600 hover:bg-rose-700"
                  }`}
              >
                {loadingRecurrence
                  ? "Đang xử lý..."
                  : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  variant = "gray",
}: {
  label: string;
  value: number;
  variant?: "blue" | "green" | "amber" | "rose" | "gray";
}) {
  const styles = {
    blue: "bg-blue-50/50 border-blue-100 text-blue-700",
    green: "bg-emerald-50/50 border-emerald-100 text-emerald-700",
    amber: "bg-amber-50/50 border-amber-100 text-amber-700",
    rose: "bg-rose-50/50 border-rose-100 text-rose-700",
    gray: "bg-gray-50/40 border-gray-100 text-gray-700",
  };

  const labelStyles = {
    blue: "text-blue-500/90",
    green: "text-emerald-500/90",
    amber: "text-amber-500/90",
    rose: "text-rose-500/90",
    gray: "text-gray-400",
  };

  return (
    <div className={`rounded-xl border px-3 py-2.5 text-center transition-all ${styles[variant]}`}>
      <div className={`text-[10px] font-bold uppercase tracking-wider ${labelStyles[variant]}`}>{label}</div>
      <div className="mt-1 text-lg font-extrabold leading-none">{value}</div>
    </div>
  );
}
