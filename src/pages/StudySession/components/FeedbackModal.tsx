import { type FormEvent, useState } from "react";
import { CheckCircle2, MessageSquareText, Star, X } from "lucide-react";
import { toast } from "react-toastify";

import { submitStudyFeedback } from "../../../services/StudySessionService";
import type {
  FeedbackEligibilityResponse,
  FeedbackType,
  SubmitStudyFeedbackRequest,
  SubmitStudyFeedbackResponse,
} from "../types";

function getFeedbackTitle(type: FeedbackType | null) {
  if (!type) return "Kết quả buổi học";
  if (type === "SESSION_FEEDBACK") return "Đánh giá buổi học";
  if (type === "REPORT_PROBLEM") return "Báo sự cố";
  if (type === "EARLY_LEAVE_REASON") return "Lý do rời sớm";
  return "Phản hồi buổi học";
}

function getFeedbackHint(type: FeedbackType | null) {
  if (!type) {
    return "Server đã kiểm tra buổi học này và hiện tại bạn không cần gửi đánh giá.";
  }

  if (type === "SESSION_FEEDBACK") {
    return "Chia sẻ cảm nhận của bạn để lần ghép học tiếp theo phù hợp hơn.";
  }

  if (type === "REPORT_PROBLEM") {
    return "Ghi lại vấn đề khiến bạn không thể tham gia buổi học trọn vẹn.";
  }

  if (type === "EARLY_LEAVE_REASON") {
    return "Cho biết lý do rời sớm để trạng thái tham gia được ghi nhận chính xác.";
  }

  return "Gửi phản hồi nhanh cho phần thời gian bạn đã tham gia.";
}

function getFeedbackPlaceholder(type: FeedbackType) {
  if (type === "SESSION_FEEDBACK") {
    return "Buổi học diễn ra thế nào, bạn học trao đổi ra sao, phần nào hiệu quả nhất...";
  }

  if (type === "REPORT_PROBLEM") {
    return "Mô tả sự cố bạn gặp phải trong buổi học";
  }

  if (type === "EARLY_LEAVE_REASON") {
    return "Bổ sung thêm lý do nếu cần";
  }

  return "Phản hồi nhanh về phần bạn đã tham gia";
}

function getReasonLabel(reason: string) {
  if (reason === "network") return "Mất kết nối";
  if (reason === "schedule") return "Có việc đột xuất";
  if (reason === "technical") return "Lỗi kỹ thuật";
  if (reason === "other") return "Lý do khác";
  return "";
}

export default function FeedbackSubmitSheet({
  eligibility,
  onClose,
  onSuccess,
}: {
  eligibility: FeedbackEligibilityResponse;
  onClose: () => void;
  onSuccess?: (response: SubmitStudyFeedbackResponse) => void;
}) {
  const type = eligibility.feedbackType;
  const [rating, setRating] = useState(5);
  const [matchedQualityScore, setMatchedQualityScore] = useState(5);
  const [communicationScore, setCommunicationScore] = useState(5);
  const [studyEffectivenessScore, setStudyEffectivenessScore] = useState(5);
  const [reason, setReason] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isFullFeedback = type === "SESSION_FEEDBACK";
  const isPartialFeedback = type === "PARTIAL_FEEDBACK";
  const canRate = isFullFeedback || isPartialFeedback;
  const canSubmit = eligibility.canSubmitFeedback && !!type;
  const durationMinutes = Math.round(eligibility.totalDurationSeconds / 60);
  const requiredMinutes = Math.round(
    eligibility.minRequiredDurationSeconds / 60,
  );

  const buildContent = () => {
    const trimmedContent = content.trim();

    if (type !== "EARLY_LEAVE_REASON") {
      return trimmedContent;
    }

    const reasonLabel = getReasonLabel(reason);

    return [reasonLabel ? `Lý do: ${reasonLabel}` : "", trimmedContent]
      .filter(Boolean)
      .join("\n");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit || submitted || !type) return;

    const feedbackContent = buildContent();

    if (type === "EARLY_LEAVE_REASON" && !reason) {
      setSubmitError("Vui lòng chọn lý do rời sớm");
      return;
    }

    if (!feedbackContent) {
      setSubmitError("Vui lòng nhập nội dung phản hồi");
      return;
    }

    const payload: SubmitStudyFeedbackRequest = {
      sessionId: eligibility.sessionId,
      userId: eligibility.userId,
      targetUserId: eligibility.targetUserId,
      groupId: eligibility.groupId,
      sessionType: eligibility.sessionType,
      feedbackType: type,
      content: feedbackContent,
      eligibleForModel: eligibility.eligibleForModel,
      ...(canRate ? { rating } : {}),
      ...(isFullFeedback
        ? {
            matchedQualityScore,
            communicationScore,
            studyEffectivenessScore,
          }
        : {}),
      ...(isPartialFeedback ? { studyEffectivenessScore } : {}),
    };

    try {
      setSubmitting(true);
      setSubmitError("");
      const res = await submitStudyFeedback(payload);
      const feedbackData: SubmitStudyFeedbackResponse = (res as any)?.data?.data || res?.data || {
        sessionId: payload.sessionId,
        userId: payload.userId,
        rating: payload.rating,
        comment: payload.content,
        content: payload.content,
        feedbackType: payload.feedbackType,
        createdAt: new Date().toISOString(),
        eligibleForModel: payload.eligibleForModel,
      };
      setSubmitted(true);
      onSuccess?.(feedbackData);
    } catch {
      setSubmitError("Không thể gửi phản hồi. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900/40 p-4">
      <section className="flex w-full max-w-md max-h-[90vh] flex-col bg-white shadow-2xl rounded-xl overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {getFeedbackTitle(type)}
              </h3>
              <p className="mt-1 text-sm leading-5 text-gray-500">
                {getFeedbackHint(type)}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <InfoPill label="Tham gia" value={`${durationMinutes} phút`} />
            <InfoPill label="Yêu cầu" value={`${requiredMinutes} phút`} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {!canSubmit ? (
            <EmptyState text="Hiện tại bạn chưa thể gửi phản hồi cho buổi học này." />
          ) : submitted ? (
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-6 text-center space-y-4">
              <CheckCircle2 className="mx-auto text-emerald-500" size={36} />
              <div>
                <div className="text-sm font-bold text-gray-900">
                  Cảm ơn bạn đã gửi đánh giá
                </div>
                <p className="mt-1 text-sm leading-5 text-gray-500">
                  Phản hồi của bạn đã được ghi nhận thành công.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-sm shadow-blue-600/10"
              >
                Hoàn tất
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {canRate && (
                <StarRating
                  label={
                    isFullFeedback
                      ? "Mức độ hài lòng chung"
                      : "Đánh giá phần đã tham gia"
                  }
                  value={rating}
                  onChange={setRating}
                />
              )}

              {isFullFeedback && (
                <div className="space-y-3">
                  <StarRating
                    label="Chất lượng ghép học"
                    value={matchedQualityScore}
                    onChange={setMatchedQualityScore}
                    compact
                  />
                  <StarRating
                    label="Giao tiếp"
                    value={communicationScore}
                    onChange={setCommunicationScore}
                    compact
                  />
                  <StarRating
                    label="Hiệu quả học"
                    value={studyEffectivenessScore}
                    onChange={setStudyEffectivenessScore}
                    compact
                  />
                </div>
              )}

              {isPartialFeedback && (
                <StarRating
                  label="Hiệu quả phần đã học"
                  value={studyEffectivenessScore}
                  onChange={setStudyEffectivenessScore}
                  compact
                />
              )}

              {type === "EARLY_LEAVE_REASON" && (
                <select
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Chọn lý do rời sớm</option>
                  <option value="network">Mất kết nối</option>
                  <option value="schedule">Có việc đột xuất</option>
                  <option value="technical">Lỗi kỹ thuật</option>
                  <option value="other">Lý do khác</option>
                </select>
              )}

              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={isFullFeedback ? 5 : 4}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm leading-6 text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                placeholder={type ? getFeedbackPlaceholder(type) : ""}
              />

              {submitError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className="mt-0.5 text-sm font-bold text-gray-800">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-5 text-sm font-semibold text-gray-500">
      {text}
    </div>
  );
}

function StarRating({
  label,
  value,
  onChange,
  compact = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "rounded-xl border border-gray-100 bg-white px-3 py-3"
          : "rounded-xl border border-amber-100/70 bg-amber-50/20 px-4 py-4"
      }
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-gray-700">{label}</span>
        <span className="text-xs font-bold text-gray-500">{value}/5</span>
      </div>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((score) => {
          const active = score <= value;

          return (
            <button
              key={score}
              type="button"
              onClick={() => onChange(score)}
              aria-label={`${score} sao`}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                active
                  ? "bg-amber-100 text-amber-500"
                  : "bg-gray-100 text-gray-300 hover:bg-amber-50 hover:text-amber-400"
              }`}
            >
              <Star
                size={20}
                fill={active ? "currentColor" : "none"}
                strokeWidth={2}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
