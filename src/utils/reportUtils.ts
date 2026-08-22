import type { ReportResponse } from "../services/reportApi";

const dynamicTargetTypes: Record<string, string> = {};
const dynamicReasons: Record<string, string> = {};

export function updateReportMetadataCache(
  targetTypesList: { value: string; title: string }[],
  reasonsList: { value: string; title: string }[],
) {
  targetTypesList.forEach((item) => {
    dynamicTargetTypes[item.value] = item.title;
  });
  reasonsList.forEach((item) => {
    dynamicReasons[item.value] = item.title;
  });
}


type ReportStatusLabelVariant = "admin" | "user";

const readValue = (
  report: ReportResponse | null | undefined,
  keys: string[],
): unknown => {
  if (!report) return null;

  return keys.reduce<unknown>((found, key) => {
    if (found !== null && found !== undefined && found !== "") return found;

    const value = report[key];
    if (value !== null && value !== undefined && value !== "") return value;

    return null;
  }, null);
};

const readNestedValue = (value: unknown, keys: string[]): unknown => {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;

  return keys.reduce<unknown>((found, key) => {
    if (found !== null && found !== undefined && found !== "") return found;

    const nested = record[key];
    if (nested !== null && nested !== undefined && nested !== "") return nested;

    return null;
  }, null);
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const toText = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
};

export function getReportNumericId(
  report: ReportResponse | null | undefined,
): number | null {
  return toNumber(readValue(report, ["id", "reportId", "report_id"]));
}

export function getReportDisplayId(
  report: ReportResponse | null | undefined,
): string {
  const id = getReportNumericId(report);
  return id === null ? "--" : `#${id}`;
}

export function getReporterUserId(
  report: ReportResponse | null | undefined,
): number | null {
  const direct = toNumber(
    readValue(report, [
      "reporterUserId",
      "reporter_user_id",
      "reportedByUserId",
      "reported_by_user_id",
    ]),
  );

  if (direct !== null) return direct;

  const reporter = readValue(report, ["reporter", "reportedBy", "reporterInfo"]);
  return toNumber(readNestedValue(reporter, ["userId", "id", "user_id"]));
}

export function getReporterDisplay(
  report: ReportResponse | null | undefined,
): string {
  const rootReporterName = toText(readValue(report, ["reporterName", "reporter_name"]));
  if (rootReporterName) return rootReporterName;

  const reporter = readValue(report, ["reporter", "reportedBy", "reporterInfo"]);
  const reporterName = toText(
    readNestedValue(reporter, ["fullName", "name", "displayName", "username"]),
  );

  if (reporterName) return reporterName;

  const reporterUserId = getReporterUserId(report);
  return reporterUserId === null ? "--" : `User #${reporterUserId}`;
}

export function getTargetTypeValue(
  report: ReportResponse | null | undefined,
): string | null {
  return toText(readValue(report, ["targetType", "target_type"]));
}

export function getTargetIdValue(
  report: ReportResponse | null | undefined,
): number | null {
  return toNumber(readValue(report, ["targetId", "target_id"]));
}

export function getReasonValue(
  report: ReportResponse | null | undefined,
): string | null {
  return toText(readValue(report, ["reason"]));
}

export function getStatusValue(
  report: ReportResponse | null | undefined,
): string | null {
  return toText(readValue(report, ["status"]));
}

export function getDescriptionValue(
  report: ReportResponse | null | undefined,
): string {
  return toText(readValue(report, ["description"])) || "--";
}

export function getAdminNoteValue(
  report: ReportResponse | null | undefined,
): string {
  return (
    toText(readValue(report, ["adminNote", "admin_note", "reviewNote"])) ||
    "--"
  );
}

export function getCreatedAtValue(
  report: ReportResponse | null | undefined,
): string | null {
  return toText(readValue(report, ["createdAt", "created_at"]));
}

export function getUpdatedAtValue(
  report: ReportResponse | null | undefined,
): string | null {
  return toText(readValue(report, ["updatedAt", "updated_at"]));
}

export function getReportStatusLabel(
  status?: string | null,
  variant: ReportStatusLabelVariant = "admin",
): string {
  switch (status) {
    case "PENDING":
      return variant === "user" ? "Đang chờ xử lý" : "Chờ xử lý";
    case "REVIEWING":
      return "Đang xem xét";
    case "RESOLVED":
      return "Đã xử lý";
    case "REJECTED":
      return variant === "user" ? "Không vi phạm" : "Từ chối";
    case "CLOSED":
      return "Đã đóng";
    default:
      return status?.trim() || "--";
  }
}

export function getTargetTypeLabel(targetType?: string | null): string {
  if (targetType && dynamicTargetTypes[targetType] !== undefined) {
    return dynamicTargetTypes[targetType];
  }
  switch (targetType) {
    case "USER":
      return "";
    case "POST":
      return "Bài viết";
    case "GROUP":
      return "Nhóm";
    case "DOCUMENT":
      return "Tài liệu học tập";
    default:
      return targetType?.trim() || "--";
  }
}

export function getReasonLabel(reason?: string | null): string {
  if (reason && dynamicReasons[reason] !== undefined) {
    return dynamicReasons[reason];
  }
  switch (reason) {
    case "SPAM":
      return "Spam";
    case "HARASSMENT":
      return "Quấy rối";
    case "INAPPROPRIATE_CONTENT":
      return "Nội dung không phù hợp";
    case "FAKE_INFORMATION":
      return "Giả mạo thông tin";
    case "SCAM":
      return "Lừa đảo";
    case "CHEATING":
      return "Gian lận học tập";
    case "OTHER":
      return "Khác";
    default:
      return reason?.trim() || "--";
  }
}

export function getStatusBadgeClass(status?: string | null): string {
  switch (status) {
    case "PENDING":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "REVIEWING":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "RESOLVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "REJECTED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "CLOSED":
      return "border-sand-200 bg-sand-100 text-sand-700";
    default:
      return "border-gray-200 bg-gray-50 text-gray-600";
  }
}

export function getTargetTypeBadgeClass(targetType?: string | null): string {
  switch (targetType) {
    case "USER":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "POST":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "GROUP":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-gray-200 bg-gray-50 text-gray-600";
  }
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export interface ParsedReportTargetData {
  text?: string;
  backgroundId?: string;
  backgroundStyle?: { background: string; color: string };
  name?: string;
  title?: string;
  description?: string;
  authorName?: string;
  authorAvatarUrl?: string | null;
  media?: Array<{ mediaUrl: string; mediaType: string }>;
  sharedPost?: {
    id?: number;
    authorName?: string;
    authorAvatarUrl?: string | null;
    text?: string;
    backgroundStyle?: { background: string; color: string };
    media?: Array<{ mediaUrl: string; mediaType: string }>;
  };
  isJson: boolean;
  rawString: string;
}

export const REPORT_POST_BG_STYLES: Record<string, { background: string; color: string }> = {
  "bg-sky": { background: "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)", color: "#0369a1" },
  "bg-lavender": { background: "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)", color: "#6b21a8" },
  "bg-rose": { background: "linear-gradient(135deg, #fff1f2 0%, #fecdd3 100%)", color: "#be123c" },
  "bg-mint": { background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)", color: "#047857" },
  "bg-lemon": { background: "linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)", color: "#a16207" },
  "bg-clay": { background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)", color: "#1d4ed8" },
  "bg-sunset": { background: "linear-gradient(135deg, #a21caf 0%, #3b82f6 100%)", color: "white" },
  "bg-violet-pink": { background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)", color: "white" },
  "bg-blue-yellow": { background: "linear-gradient(135deg, #2563eb 0%, #facc15 100%)", color: "white" },
  "bg-purple": { background: "linear-gradient(135deg, #d904e9 0%, #70027a 100%)", color: "white" },
  "bg-red": { background: "linear-gradient(135deg, #e11d48 0%, #9f1239 100%)", color: "white" },
  "bg-black": { background: "linear-gradient(135deg, #0f172a 0%, #020617 100%)", color: "white" },
};

export function parseReportTargetData(targetName?: unknown): ParsedReportTargetData {
  if (!targetName) {
    return { isJson: false, rawString: "" };
  }

  const raw = String(targetName).trim();
  if (!raw) {
    return { isJson: false, rawString: "" };
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      let bgId = typeof parsed.background === "string" ? parsed.background : undefined;
      let text: string | undefined = undefined;

      // Handle nested JSON content (e.g. post with background style)
      if (typeof parsed.content === "string") {
        const innerContent = parsed.content.trim();
        if (innerContent.startsWith("{") && innerContent.includes('"text"')) {
          try {
            const innerParsed = JSON.parse(innerContent);
            if (innerParsed && typeof innerParsed === "object") {
              text = innerParsed.text ?? innerParsed.content ?? innerParsed.caption;
              if (!bgId && typeof innerParsed.background === "string") {
                bgId = innerParsed.background;
              }
            }
          } catch {
            const match = innerContent.match(/"(?:text|content)"\s*:\s*"((?:[^"\\]|\\.)*)"?/);
            text = match ? match[1].replace(/\\"/g, '"').replace(/\\n/g, "\n") : innerContent;
          }
        } else {
          const bgMatch = innerContent.match(/^\[BG:([^\]]+)\](.*)$/s);
          if (bgMatch) {
            bgId = bgId || bgMatch[1];
            text = bgMatch[2];
          } else {
            text = innerContent;
          }
        }
      } else if (typeof parsed.text === "string") {
        text = parsed.text;
      } else if (typeof parsed.caption === "string") {
        text = parsed.caption;
      } else if (typeof parsed.message === "string") {
        text = parsed.message;
      }

      const bgStyle = bgId && REPORT_POST_BG_STYLES[bgId] ? REPORT_POST_BG_STYLES[bgId] : undefined;

      // Extract media items (images, videos)
      let mediaList: Array<{ mediaUrl: string; mediaType: string }> | undefined = undefined;
      if (Array.isArray(parsed.media) && parsed.media.length > 0) {
        mediaList = parsed.media
          .map((m: any) => ({
            mediaUrl: typeof m === "string" ? m : m.mediaUrl || m.url || m.fileUrl || "",
            mediaType: (typeof m === "object" ? m.mediaType || m.type : undefined) || "IMAGE",
          }))
          .filter((m: any) => Boolean(m.mediaUrl));
      } else if (parsed.mediaUrl || parsed.imageUrl) {
        mediaList = [
          {
            mediaUrl: parsed.mediaUrl || parsed.imageUrl,
            mediaType: parsed.mediaType || "IMAGE",
          },
        ];
      }

      // Extract shared post if present
      let sharedPostData: ParsedReportTargetData["sharedPost"] = undefined;
      if (parsed.sharedPost && typeof parsed.sharedPost === "object") {
        const sp = parsed.sharedPost;
        const spParsed = typeof sp.content === "string" ? parseReportTargetData(sp.content) : undefined;
        let spMediaList: Array<{ mediaUrl: string; mediaType: string }> | undefined = undefined;
        if (Array.isArray(sp.media) && sp.media.length > 0) {
          spMediaList = sp.media
            .map((m: any) => ({
              mediaUrl: typeof m === "string" ? m : m.mediaUrl || m.url || m.fileUrl || "",
              mediaType: (typeof m === "object" ? m.mediaType || m.type : undefined) || "IMAGE",
            }))
            .filter((m: any) => Boolean(m.mediaUrl));
        } else if (sp.mediaUrl || sp.imageUrl) {
          spMediaList = [{ mediaUrl: sp.mediaUrl || sp.imageUrl, mediaType: sp.mediaType || "IMAGE" }];
        }

        sharedPostData = {
          id: sp.id,
          authorName: sp.authorName || sp.author?.fullName || sp.author?.name,
          authorAvatarUrl: sp.authorAvatarUrl || sp.author?.avatarUrl,
          text: spParsed?.text || (typeof sp.content === "string" ? sp.content : undefined) || sp.text,
          backgroundStyle: spParsed?.backgroundStyle,
          media: spMediaList || spParsed?.media,
        };
      }

      return {
        text: text ? String(text) : undefined,
        backgroundId: bgId,
        backgroundStyle: bgStyle,
        name: parsed.name ?? parsed.fullName ?? parsed.groupName ?? parsed.username,
        title: parsed.title ?? parsed.documentTitle,
        description: parsed.description ?? parsed.bio,
        authorName: parsed.authorName ?? parsed.author?.fullName ?? parsed.author?.name,
        authorAvatarUrl: parsed.authorAvatarUrl ?? parsed.author?.avatarUrl,
        media: mediaList && mediaList.length > 0 ? mediaList : undefined,
        sharedPost: sharedPostData,
        isJson: true,
        rawString: raw,
      };
    }
  } catch {
    // Not strictly valid JSON (e.g. truncated JSON string like {"text":"...","background"...)
    const textMatch = raw.match(/"(?:text|content|caption|message)"\s*:\s*"((?:[^"\\]|\\.)*)"?/);
    const bgMatch = raw.match(/"(?:background|backgroundId)"\s*:\s*"([^"]+)"?/);
    const authorMatch = raw.match(/"(?:authorName|author)"\s*:\s*"([^"]+)"?/);
    const titleMatch = raw.match(/"(?:title|name)"\s*:\s*"([^"]+)"?/);

    if (textMatch || bgMatch || titleMatch) {
      const extractedText = textMatch
        ? textMatch[1].replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\")
        : undefined;
      const bgId = bgMatch ? bgMatch[1] : undefined;
      const bgStyle = bgId && REPORT_POST_BG_STYLES[bgId] ? REPORT_POST_BG_STYLES[bgId] : undefined;

      return {
        text: extractedText,
        backgroundId: bgId,
        backgroundStyle: bgStyle,
        title: titleMatch ? titleMatch[1] : undefined,
        name: titleMatch ? titleMatch[1] : undefined,
        authorName: authorMatch ? authorMatch[1] : undefined,
        isJson: true,
        rawString: raw,
      };
    }
  }

  const bgMatch = raw.match(/^\[BG:([^\]]+)\](.*)$/s);
  if (bgMatch) {
    const bgId = bgMatch[1];
    const text = bgMatch[2];
    const bgStyle = REPORT_POST_BG_STYLES[bgId] ? REPORT_POST_BG_STYLES[bgId] : undefined;
    return {
      text,
      backgroundId: bgId,
      backgroundStyle: bgStyle,
      isJson: false,
      rawString: raw,
    };
  }

  return {
    text: raw,
    name: raw,
    isJson: false,
    rawString: raw,
  };
}

