import { getReportStatusLabel } from "../../utils/reportUtils";

export {
  formatDateTime,
  getAdminNoteValue,
  getCreatedAtValue,
  getDescriptionValue,
  getReasonLabel,
  getReasonValue,
  getReportDisplayId,
  getReportNumericId,
  getStatusBadgeClass,
  getStatusValue,
  getTargetIdValue,
  getTargetTypeBadgeClass,
  getTargetTypeLabel,
  getTargetTypeValue,
  getUpdatedAtValue,
  parseReportTargetData,
} from "../../utils/reportUtils";
export type { ParsedReportTargetData } from "../../utils/reportUtils";

export const MY_REPORTS_PAGE_SIZE = 10;

export function getMyReportStatusLabel(status?: string | null): string {
  return getReportStatusLabel(status, "user");
}
