import { useEffect, useState, useMemo } from "react";
import { X } from "lucide-react";
import type { ReportResponse } from "../../../services/reportApi";
import { getPostById, SocialPost } from "../../../services/SocialPostService";
import {
  formatDateTime,
  getAdminNoteValue,
  getCreatedAtValue,
  getDescriptionValue,
  getMyReportStatusLabel,
  getReasonLabel,
  getReasonValue,
  getReportDisplayId,
  getStatusBadgeClass,
  getStatusValue,
  getTargetIdValue,
  getTargetTypeLabel,
  getTargetTypeValue,
  getUpdatedAtValue,
  parseReportTargetData,
  type ParsedReportTargetData,
} from "../utils";

type MyReportDetailModalProps = {
  open: boolean;
  report: ReportResponse | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
};

export function MyReportDetailModal({
  open,
  report,
  loading,
  error,
  onClose,
}: MyReportDetailModalProps) {
  const [fetchedPost, setFetchedPost] = useState<SocialPost | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  const targetType = getTargetTypeValue(report);
  const targetId = getTargetIdValue(report);

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

  const status = getStatusValue(report);
  const adminNote = getAdminNoteValue(report);
  const reason = getReasonValue(report);
  const createdAt = getCreatedAtValue(report);
  const updatedAt = getUpdatedAtValue(report);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết báo cáo"
    >
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4 bg-slate-50/50">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900 leading-snug">
              Chi tiết báo cáo {getReportDisplayId(report)}
            </h3>
            {!loading && !error && report ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(
                    status,
                  )}`}
                >
                  {getMyReportStatusLabel(status)}
                </span>
                <span className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  {getTargetTypeLabel(targetType)} {targetId ? `#${targetId}` : ""}
                </span>
                <span className="inline-flex items-center rounded-md border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  {getReasonLabel(reason)}
                </span>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Đóng modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/30">
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
                className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Đóng
              </button>
            </div>
          ) : !report ? (
            <div className="flex min-h-[280px] items-center justify-center text-center text-sm font-medium text-gray-500">
              Không có dữ liệu báo cáo.
            </div>
          ) : (
            <>
              {/* SECTION 1: TARGET PREVIEW */}
              <ReportedTargetPreview
                targetType={targetType}
                targetId={targetId}
                parsed={mergedParsedTarget}
              />

              {/* SECTION 2: REPORT DETAILS */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Lý do báo cáo
                  </p>
                  <p className="mt-1.5 text-sm font-bold text-gray-900">
                    {getReasonLabel(reason)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Trạng thái: {getMyReportStatusLabel(status)}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    Thời gian gửi
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-gray-800">
                    {formatDateTime(createdAt)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Cập nhật: {formatDateTime(updatedAt)}
                  </p>
                </div>
              </div>

              {/* SECTION 3: DESCRIPTION */}
              <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Nội dung mô tả đã gửi
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {getDescriptionValue(report)}
                </p>
              </div>

              {/* SECTION 4: ADMIN NOTE */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Phản hồi từ Ban quản trị
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {adminNote === "--"
                    ? "Chưa có phản hồi từ Ban quản trị. Báo cáo đang được xử lý theo quy định."
                    : adminNote}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 shadow-sm"
              >
                Đóng
              </button>
            </>
          )}
        </div>
      </div>
    </div>
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
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
          Nội dung đối tượng bị báo cáo ({getTargetTypeLabel(targetType)} {targetId ? `#${targetId}` : ""})
        </span>
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
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap leading-relaxed select-text">
                {parsed.text || parsed.rawString || "(Bài viết không có nội dung văn bản)"}
              </p>
            </div>
          )}

          {/* Media / Images */}
          {parsed.media && parsed.media.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
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
                      className="group relative overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
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
                          className="block h-48 w-full overflow-hidden bg-gray-100 cursor-pointer"
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
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-gray-600 font-medium">
                <span>
                  Bài viết được chia sẻ từ:{" "}
                  <strong className="text-gray-900 font-semibold">
                    {parsed.sharedPost.authorName || `Người dùng #${parsed.sharedPost.id || ""}`}
                  </strong>
                </span>
                {parsed.sharedPost.id && (
                  <span className="text-[11px] text-gray-500">#{parsed.sharedPost.id}</span>
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
                <p className="text-xs font-medium text-gray-800 whitespace-pre-wrap leading-relaxed select-text bg-white/80 p-2.5 rounded-lg border border-gray-200">
                  {parsed.sharedPost.text}
                </p>
              ) : null}

              {/* Shared post media */}
              {parsed.sharedPost.media && parsed.sharedPost.media.length > 0 && (
                <div className="pt-1 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
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
                          className="group relative overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
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
                              className="block h-44 w-full overflow-hidden bg-gray-100 cursor-pointer"
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
            <div className="text-xs text-gray-500 pt-1">
              <span>Tác giả bài viết: </span>
              <span className="font-semibold text-gray-700">{parsed.authorName}</span>
            </div>
          )}
        </div>
      ) : isUser ? (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-gray-900">
              {parsed.name || `Người dùng #${targetId}`}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              ID người dùng: #{targetId}
            </div>
          </div>
        </div>
      ) : isGroup ? (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-gray-900">
              {parsed.name || `Nhóm học tập #${targetId}`}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {parsed.description || `Mã nhóm: #${targetId}`}
            </div>
          </div>
        </div>
      ) : isDocument ? (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-gray-900">
              {parsed.title || parsed.name || `Tài liệu #${targetId}`}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              ID tài liệu: #{targetId}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
          <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap leading-relaxed select-text">
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
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="h-4 w-36 rounded bg-gray-200 mb-3" />
        <div className="h-16 w-full rounded-xl bg-gray-100" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-gray-200 bg-white p-3.5">
            <div className="h-3 w-20 rounded bg-gray-150" />
            <div className="mt-2 h-4 w-32 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="h-3 w-28 rounded bg-gray-150 mb-2" />
        <div className="h-12 w-full rounded bg-gray-100" />
      </div>
    </div>
  );
}

