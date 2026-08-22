import type {
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from "../../../services/reportApi";
import { getReportStatusLabel } from "../../../utils/reportUtils";

export {
  formatDateTime,
  getAdminNoteValue,
  getCreatedAtValue,
  getDescriptionValue,
  getReasonLabel,
  getReasonValue,
  getReportDisplayId,
  getReportNumericId,
  getReporterDisplay,
  getReporterUserId,
  getStatusBadgeClass,
  getStatusValue,
  getTargetIdValue,
  getTargetTypeBadgeClass,
  getTargetTypeLabel,
  getTargetTypeValue,
  getUpdatedAtValue,
  parseReportTargetData,
  REPORT_POST_BG_STYLES,
} from "../../../utils/reportUtils";
export type { ParsedReportTargetData } from "../../../utils/reportUtils";

export const ADMIN_REPORT_PAGE_SIZE = 10;

export const REPORT_STATUS_FILTER_OPTIONS: Array<{
  label: string;
  value: ReportStatus | null;
}> = [
  { label: "Tất cả", value: null },
  { label: "PENDING", value: "PENDING" },
  { label: "REVIEWING", value: "REVIEWING" },
  { label: "RESOLVED", value: "RESOLVED" },
  { label: "REJECTED", value: "REJECTED" },
];

export const REPORT_TARGET_TYPE_FILTER_OPTIONS: Array<{
  label: string;
  value: ReportTargetType | null;
}> = [
  { label: "Tất cả", value: null },
  { label: "USER", value: "USER" },
  { label: "POST", value: "POST" },
  { label: "GROUP", value: "GROUP" },
];

export const REPORT_REASON_FILTER_OPTIONS: Array<{
  label: string;
  value: ReportReason | null;
}> = [
  { label: "Tất cả", value: null },
  { label: "SPAM", value: "SPAM" },
  { label: "HARASSMENT", value: "HARASSMENT" },
  {
    label: "INAPPROPRIATE_CONTENT",
    value: "INAPPROPRIATE_CONTENT",
  },
  { label: "FAKE_INFORMATION", value: "FAKE_INFORMATION" },
  { label: "SCAM", value: "SCAM" },
  { label: "CHEATING", value: "CHEATING" },
  { label: "OTHER", value: "OTHER" },
];

export const REPORT_UPDATE_STATUS_OPTIONS: Array<{
  label: string;
  value: ReportStatus;
}> = [
  { label: "REVIEWING", value: "REVIEWING" },
  { label: "RESOLVED", value: "RESOLVED" },
  { label: "REJECTED", value: "REJECTED" },
];

export function getStatusLabel(status?: string | null): string {
  return getReportStatusLabel(status, "admin");
}

export function getDefaultUpdateStatus(status?: string | null): ReportStatus {
  if (
    status === "REVIEWING" ||
    status === "RESOLVED" ||
    status === "REJECTED"
  ) {
    return status;
  }

  return "REVIEWING";
}
