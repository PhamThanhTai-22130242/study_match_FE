import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { ReportResponse, ReportStatus } from "../../../../services/reportApi";
import { getPostById, SocialPost } from "../../../../services/SocialPostService";
import { REPORT_UPDATE_STATUS_OPTIONS } from "../utils";
import {
  formatDateTime,
  getAdminNoteValue,
  getCreatedAtValue,
  getDefaultUpdateStatus,
  getDescriptionValue,
  getReasonLabel,
  getReasonValue,
  getReportDisplayId,
  getReporterDisplay,
  getReporterUserId,
  getStatusBadgeClass,
  getStatusLabel,
  getStatusValue,
  getTargetIdValue,
  getTargetTypeLabel,
  getTargetTypeValue,
  getUpdatedAtValue,
  parseReportTargetData,
  type ParsedReportTargetData,
} from "../utils";

type AdminReportDetailModalProps = {
  open: boolean;
  report: ReportResponse | null;
  loading: boolean;
  error: string | null;
  updateLoading: boolean;
  nextStatus: ReportStatus;
  adminNote: string;
  onClose: () => void;
  onStatusChange: (value: ReportStatus) => void;
  onAdminNoteChange: (value: string) => void;
  onSubmit: () => void;
};

export function AdminReportDetailModal({
  open,
  report,
  loading,
  error,
  updateLoading,
  nextStatus,
  adminNote,
  onClose,
  onStatusChange,
  onAdminNoteChange,
  onSubmit,
}: AdminReportDetailModalProps) {
  const [fetchedPost, setFetchedPost] = useState<SocialPost | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !updateLoading) onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, updateLoading]);

  const targetId = getTargetIdValue(report);
  const targetType = getTargetTypeValue(report);

  useEffect(() => {
    if (!open || targetType !== "POST" || !targetId) {
      setFetchedPost(null);
      return;
    }

    let isMounted = true;
    getPostById(targetId).then((data) => {
      if (isMounted && data) {
        setFetchedPost(data);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [open, targetType, targetId]);

  const parsedTarget = parseReportTargetData(report?.target_name);

  const mergedParsedTarget: ParsedReportTargetData = useMemo(() => {
    if (!fetchedPost) return parsedTarget;

    const postParsed = parseReportTargetData(fetchedPost.content);

    let sharedPostData: ParsedReportTargetData["sharedPost"] = undefined;
    if (fetchedPost.sharedPost) {
      const spParsed = parseReportTargetData(fetchedPost.sharedPost.content);
      const spMedia =
        fetchedPost.sharedPost.media && fetchedPost.sharedPost.media.length > 0
          ? fetchedPost.sharedPost.media
          : spParsed.media;

      sharedPostData = {
        id: fetchedPost.sharedPost.id,
        authorName: fetchedPost.sharedPost.authorName || undefined,
        authorAvatarUrl: fetchedPost.sharedPost.authorAvatarUrl || undefined,
        text: spParsed.text || fetchedPost.sharedPost.content || undefined,
        backgroundStyle: spParsed.backgroundStyle,
        media: spMedia,
      };
    }

    return {
      text: postParsed.text || fetchedPost.content || parsedTarget.text,
      backgroundId: postParsed.backgroundId || parsedTarget.backgroundId,
      backgroundStyle: postParsed.backgroundStyle || parsedTarget.backgroundStyle,
      authorName: fetchedPost.authorName || parsedTarget.authorName,
      authorAvatarUrl: fetchedPost.authorAvatarUrl || parsedTarget.authorAvatarUrl || undefined,
      media:
        fetchedPost.media && fetchedPost.media.length > 0
          ? fetchedPost.media
          : parsedTarget.media,
      sharedPost: sharedPostData || parsedTarget.sharedPost,
      isJson: true,
      rawString: parsedTarget.rawString,
    };
  }, [fetchedPost, parsedTarget]);

  if (!open) return null;

  const currentStatus = getStatusValue(report);
  const currentAdminNote = getAdminNoteValue(report);
  const reporterUserId = getReporterUserId(report);
  const createdAt = getCreatedAtValue(report);
  const updatedAt = getUpdatedAtValue(report);
  const reason = getReasonValue(report);

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết báo cáo"
    >
      <button
        type="button"
        aria-label="Đóng"
        onClick={updateLoading ? undefined : onClose}
        className="absolute inset-0 bg-black/30"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-sand-200 bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between border-b border-sand-200 px-5 py-4 bg-sand-50/50">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-sand-900 leading-snug">
              Chi tiết báo cáo {getReportDisplayId(report)}
            </h3>
            {!loading && !error && report ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(
                    currentStatus,
                  )}`}
                >
                  {getStatusLabel(currentStatus)}
                </span>
                <span className="inline-flex items-center rounded-md border border-sand-200 bg-white px-2.5 py-0.5 text-xs font-medium text-sand-700">
                  {getTargetTypeLabel(targetType)} {targetId ? `#${targetId}` : ""}
                </span>
                <span className="inline-flex items-center rounded-md border border-sand-200 bg-white px-2.5 py-0.5 text-xs font-medium text-sand-700">
                  {getReasonLabel(reason)}
                </span>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={updateLoading ? undefined : onClose}
            className="rounded-lg p-1.5 text-sand-400 transition-colors hover:bg-sand-100 hover:text-sand-600"
            aria-label="Đóng modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-sand-50/20">
          {loading ? (
            <DetailSkeleton />
          ) : error ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-medium text-rose-700">
                {error}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-10 w-full rounded-xl border border-sand-300 bg-white px-3 text-sm font-medium text-sand-700 transition-all hover:bg-sand-50"
              >
                Đóng
              </button>
            </div>
          ) : !report ? (
            <div className="flex min-h-[320px] items-center justify-center text-center text-sm font-medium text-sand-500">
              Không có dữ liệu báo cáo.
            </div>
          ) : (
            <>
              {/* SECTION 1: REPORTED TARGET DETAILS */}
              <ReportedTargetPreview
                targetType={targetType}
                targetId={targetId}
                parsed={mergedParsedTarget}
              />

              {/* SECTION 2: REPORT INFO & REPORTER */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-sand-200 bg-white p-3.5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-sand-500">
                    Người gửi báo cáo
                  </p>
                  <p className="mt-1.5 text-sm font-bold text-sand-900">
                    {getReporterDisplay(report)}
                  </p>
                  {reporterUserId !== null && (
                    <p className="text-xs text-sand-500 mt-0.5">
                      User ID: #{reporterUserId}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-sand-200 bg-white p-3.5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-sand-500">
                    Lý do vi phạm
                  </p>
                  <p className="mt-1.5 text-sm font-bold text-sand-900">
                    {getReasonLabel(reason)}
                  </p>
                  <p className="text-xs text-sand-500 mt-0.5">
                    Gửi lúc: {formatDateTime(createdAt)}
                  </p>
                </div>
              </div>

              {/* SECTION 3: REPORTER DESCRIPTION */}
              <div className="rounded-xl border border-sand-200 bg-white p-3.5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-sand-500 mb-1.5">
                  Mô tả chi tiết từ người báo cáo
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-sand-800 bg-sand-50 p-3 rounded-lg border border-sand-200">
                  {getDescriptionValue(report)}
                </p>
              </div>

              {/* SECTION 4: DATES */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-sand-200 bg-white p-3.5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-sand-500">
                    Thời gian gửi
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-sand-800">
                    {formatDateTime(createdAt)}
                  </p>
                </div>
                <div className="rounded-xl border border-sand-200 bg-white p-3.5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-sand-500">
                    Cập nhật gần nhất
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-sand-800">
                    {formatDateTime(updatedAt)}
                  </p>
                </div>
              </div>

              {/* SECTION 5: ADMIN RESOLUTION AREA */}
              <div className="rounded-xl border border-sand-200 bg-white p-4 shadow-sm space-y-4">
                <div className="border-b border-sand-100 pb-2.5">
                  <h4 className="text-sm font-bold text-sand-900">
                    Khu vực xử lý báo cáo
                  </h4>
                  <p className="mt-0.5 text-xs text-sand-500">
                    Cập nhật trạng thái xử lý và ghi chú phản hồi cho báo cáo này
                  </p>
                </div>

                <div className="rounded-lg bg-sand-50 p-3 border border-sand-200">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sand-500 block mb-1">
                    Ghi chú xử lý hiện tại:
                  </span>
                  <p className="text-xs font-medium text-sand-700 whitespace-pre-wrap">
                    {currentAdminNote === "--" ? "Chưa có ghi chú xử lý." : currentAdminNote}
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-sand-600">
                      Trạng thái mới
                    </span>
                    <select
                      value={nextStatus || getDefaultUpdateStatus(currentStatus)}
                      onChange={(event) =>
                        onStatusChange(event.target.value as ReportStatus)
                      }
                      disabled={updateLoading}
                      className="h-10 w-full rounded-lg border border-sand-300 bg-white px-3 text-sm font-medium text-sand-700 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {REPORT_UPDATE_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} ({getStatusLabel(option.value)})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-sand-600">
                      Ghi chú xử lý mới
                    </span>
                    <textarea
                      value={adminNote}
                      onChange={(event) => onAdminNoteChange(event.target.value)}
                      placeholder="Nhập ghi chú xử lý..."
                      disabled={updateLoading}
                      rows={4}
                      className="w-full resize-none rounded-lg border border-sand-300 bg-white px-3 py-2.5 text-sm text-sand-800 outline-none transition-colors placeholder:text-sand-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={updateLoading}
                      className="h-10 flex-1 rounded-lg border border-sand-300 bg-white px-3 text-xs font-bold text-sand-700 transition-all hover:bg-sand-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Đóng
                    </button>
                    <button
                      type="button"
                      onClick={onSubmit}
                      disabled={updateLoading}
                      className="h-10 flex-1 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition-all hover:bg-blue-700 shadow-md shadow-blue-600/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updateLoading ? "Đang cập nhật..." : "Cập nhật trạng thái"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function ReportedTargetPreview({
  targetType,
  targetId,
  parsed,
}: {
  targetType: string | null;
  targetId: number | null;
  parsed: ParsedReportTargetData;
}) {
  const isPost = targetType === "POST";
  const isUser = targetType === "USER";
  const isGroup = targetType === "GROUP";
  const isDocument = targetType === "DOCUMENT";

  return (
    <div className="rounded-xl border border-sand-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2 border-b border-sand-100 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-sand-600">
          Nội dung đối tượng bị báo cáo ({getTargetTypeLabel(targetType)} {targetId ? `#${targetId}` : ""})
        </span>

        {targetId !== null && (
          <div>
            {isUser && (
              <a
                href="/admin/users"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Quản lý người dùng
              </a>
            )}
            {isGroup && (
              <a
                href="/admin/groups"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Quản lý nhóm
              </a>
            )}
            {isDocument && (
              <a
                href="/admin/documents"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Quản lý tài liệu
              </a>
            )}
          </div>
        )}
      </div>

      {isPost ? (
        <div className="space-y-3">
          {parsed.backgroundStyle ? (
            <div
              className="rounded-xl p-5 text-center font-bold text-base shadow-sm min-h-[100px] flex items-center justify-center break-words select-text"
              style={{
                background: parsed.backgroundStyle.background,
                color: parsed.backgroundStyle.color,
              }}
            >
              {parsed.text || "(Bài viết không có nội dung văn bản)"}
            </div>
          ) : (
            <div className="rounded-lg bg-sand-50 p-3 border border-sand-200">
              <p className="text-sm font-medium text-sand-800 whitespace-pre-wrap leading-relaxed select-text">
                {parsed.text || parsed.rawString || "(Bài viết không có nội dung văn bản)"}
              </p>
            </div>
          )}

          {/* Media / Images of reported post */}
          {parsed.media && parsed.media.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sand-500 block">
                Hình ảnh / Tệp đính kèm ({parsed.media.length}):
              </span>
              <div
                className={`grid gap-2 ${
                  parsed.media.length === 1
                    ? "grid-cols-1"
                    : parsed.media.length === 2
                    ? "grid-cols-2"
                    : "grid-cols-2 sm:grid-cols-3"
                }`}
              >
                {parsed.media.map((item, idx) => {
                  const isVideo =
                    item.mediaType === "VIDEO" ||
                    item.mediaUrl.toLowerCase().endsWith(".mp4") ||
                    item.mediaUrl.toLowerCase().endsWith(".webm");

                  return (
                    <div
                      key={idx}
                      className="group relative overflow-hidden rounded-lg border border-sand-200 bg-sand-100"
                    >
                      {isVideo ? (
                        <video
                          src={item.mediaUrl}
                          controls
                          className="h-48 w-full object-cover rounded-lg"
                        />
                      ) : (
                        <a
                          href={item.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block h-48 w-full overflow-hidden bg-sand-100 cursor-pointer"
                        >
                          <img
                            src={item.mediaUrl}
                            alt={`Hình ảnh bài viết #${idx + 1}`}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            loading="lazy"
                          />
                        </a>
                      )}
                    </div>
                  );
                })}
                  </div>
                </div>
              )}
          {/* Render Shared Post if this is a shared post */}
          {parsed.sharedPost && (
            <div className="rounded-xl border border-sand-200 bg-sand-50/70 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-sand-600 font-medium">
                <span>
                  Bài viết được chia sẻ từ:{" "}
                  <strong className="text-sand-900 font-semibold">
                    {parsed.sharedPost.authorName || `Người dùng #${parsed.sharedPost.id || ""}`}
                  </strong>
                </span>
                {parsed.sharedPost.id && (
                  <span className="text-[11px] text-sand-500">#{parsed.sharedPost.id}</span>
                )}
              </div>

              {parsed.sharedPost.backgroundStyle ? (
                <div
                  className="rounded-lg p-4 text-center font-bold text-sm shadow-sm min-h-[80px] flex items-center justify-center break-words select-text"
                  style={{
                    background: parsed.sharedPost.backgroundStyle.background,
                    color: parsed.sharedPost.backgroundStyle.color,
                  }}
                >
                  {parsed.sharedPost.text || "(Bài viết không có nội dung văn bản)"}
                </div>
              ) : parsed.sharedPost.text ? (
                <p className="text-xs font-medium text-sand-800 whitespace-pre-wrap leading-relaxed select-text bg-white/80 p-2.5 rounded-lg border border-sand-200">
                  {parsed.sharedPost.text}
                </p>
              ) : null}

              {/* Shared post media */}
              {parsed.sharedPost.media && parsed.sharedPost.media.length > 0 && (
                <div className="pt-1 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sand-500 block">
                    Hình ảnh bài viết gốc ({parsed.sharedPost.media.length}):
                  </span>
                  <div
                    className={`grid gap-2 ${
                      parsed.sharedPost.media.length === 1
                        ? "grid-cols-1"
                        : parsed.sharedPost.media.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-2 sm:grid-cols-3"
                    }`}
                  >
                    {parsed.sharedPost.media.map((item, idx) => {
                      const isVideo =
                        item.mediaType === "VIDEO" ||
                        item.mediaUrl.toLowerCase().endsWith(".mp4") ||
                        item.mediaUrl.toLowerCase().endsWith(".webm");

                      return (
                        <div
                          key={idx}
                          className="group relative overflow-hidden rounded-lg border border-sand-200 bg-sand-100"
                        >
                          {isVideo ? (
                            <video
                              src={item.mediaUrl}
                              controls
                              className="h-44 w-full object-cover rounded-lg"
                            />
                          ) : (
                            <a
                              href={item.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block h-44 w-full overflow-hidden bg-sand-100 cursor-pointer"
                            >
                              <img
                                src={item.mediaUrl}
                                alt={`Hình ảnh bài viết gốc #${idx + 1}`}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                loading="lazy"
                              />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {parsed.authorName && (
            <div className="text-xs text-sand-500 pt-1">
              <span>Tác giả bài viết: </span>
              <span className="font-semibold text-sand-700">{parsed.authorName}</span>
            </div>
          )}
        </div>
      ) : isUser ? (
        <div className="rounded-lg bg-sand-50 p-3 border border-sand-200 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-sand-900">
              {parsed.name || `Người dùng #${targetId}`}
            </div>
            <div className="text-xs text-sand-500 mt-0.5">
              ID người dùng: #{targetId}
            </div>
          </div>
          <a
            href="/admin/users"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-sand-300 bg-white px-2.5 py-1 text-xs font-medium text-sand-700 hover:bg-sand-100 transition-colors"
          >
            Đến trang người dùng
          </a>
        </div>
      ) : isGroup ? (
        <div className="rounded-lg bg-sand-50 p-3 border border-sand-200 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-sand-900">
              {parsed.name || `Nhóm học tập #${targetId}`}
            </div>
            <div className="text-xs text-sand-500 mt-0.5">
              {parsed.description || `Mã nhóm: #${targetId}`}
            </div>
          </div>
          <a
            href="/admin/groups"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-sand-300 bg-white px-2.5 py-1 text-xs font-medium text-sand-700 hover:bg-sand-100 transition-colors"
          >
            Đến trang nhóm
          </a>
        </div>
      ) : isDocument ? (
        <div className="rounded-lg bg-sand-50 p-3 border border-sand-200 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-sand-900">
              {parsed.title || parsed.name || `Tài liệu #${targetId}`}
            </div>
            <div className="text-xs text-sand-500 mt-0.5">
              ID tài liệu: #{targetId}
            </div>
          </div>
          <a
            href="/admin/documents"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-sand-300 bg-white px-2.5 py-1 text-xs font-medium text-sand-700 hover:bg-sand-100 transition-colors"
          >
            Đến trang tài liệu
          </a>
        </div>
      ) : (
        <div className="rounded-lg bg-sand-50 p-3 border border-sand-200">
          <p className="text-sm font-medium text-sand-800 whitespace-pre-wrap leading-relaxed select-text">
            {parsed.text || parsed.name || parsed.rawString || "--"}
          </p>
        </div>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-xl border border-sand-200 bg-white p-4">
        <div className="h-4 w-40 rounded bg-sand-200 mb-3" />
        <div className="h-16 w-full rounded-lg bg-sand-100" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-sand-200 bg-white p-3.5"
          >
            <div className="h-3 w-24 rounded bg-sand-100" />
            <div className="mt-3 h-4 w-40 rounded bg-sand-200" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-sand-200 bg-white p-4">
        <div className="h-3 w-32 rounded bg-sand-100 mb-2" />
        <div className="h-12 w-full rounded bg-sand-100" />
      </div>

      <div className="rounded-xl border border-sand-200 bg-white p-4">
        <div className="h-4 w-28 rounded bg-sand-200" />
        <div className="mt-4 h-10 w-full rounded bg-sand-100" />
        <div className="mt-4 h-24 w-full rounded bg-sand-100" />
        <div className="mt-4 flex gap-2">
          <div className="h-10 flex-1 rounded bg-sand-100" />
          <div className="h-10 flex-1 rounded bg-sand-200" />
        </div>
      </div>
    </div>
  );
}

