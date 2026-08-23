import {
  User,
  MapPin,
  Target,
  BookOpen,
  CalendarDays,
  BarChart3,
  CircleCheckBig,
  Shield,
  NotebookPen,
  Rocket,
  Handshake,
  TrendingUp,
  Zap,
  Sprout,
  Sunrise,
  Sun,
  MoonStar,
} from "lucide-react";
import {
  Cohort,
  DayConfig,
  DayId,
  FreeTime,
  GoalConfig,
  ModeConfig,
  SlotConfig,
  StepMeta,
  StudyGoal,
  StudyMode,
  Subject,
  StudyPlan,
  ModuleSlotConflict,
  FreeTimeConflict,
} from "./types";

export const LEARNING_LEVELS: GoalConfig[] = [
  {
    key: "Survivor",
    icon: Shield,
    title: "Cần nắm lại kiến thức cơ bản",
    desc: "Bạn muốn tập trung hiểu lại những phần quan trọng của môn học và cần sự hỗ trợ khi gặp khó khăn.",
    ring: "ring-accent",
    bg: "bg-white",
    border: "border-accent",
    text: "text-gray-700",
    badge: "border-accent text-accent",
  },
  {
    key: "Passive Learner",
    icon: BookOpen,
    title: "Học ở mức vừa phải",
    desc: "Bạn muốn học ổn định theo tiến độ và cần thêm động lực để duy trì thói quen học tập.",
    ring: "ring-accent",
    bg: "bg-white",
    border: "border-accent",
    text: "text-gray-700",
    badge: "border-accent text-accent",
  },
  {
    key: "Standard Learner",
    icon: NotebookPen,
    title: "Học chắc và tiến bộ",
    desc: "Bạn muốn hiểu bài vững hơn, học đều đặn và cải thiện kết quả qua việc ôn tập và trao đổi.",
    ring: "ring-accent",
    bg: "bg-white",
    border: "border-accent",
    text: "text-gray-700",
    badge: "border-accent text-accent",
  },
  {
    key: "High Achiever",
    icon: Rocket,
    title: "Đặt mục tiêu điểm cao",
    desc: "Bạn muốn học tốt hơn, chủ động đặt mục tiêu cao và phát triển tối đa khả năng của mình.",
    ring: "ring-accent",
    bg: "bg-white",
    border: "border-accent",
    text: "text-gray-700",
    badge: "border-accent text-accent",
  },
];

export const VALID_MODES: Record<StudyGoal, StudyMode[]> = {
  Survivor: ["mutual_support", "peer_support", "challenge"],
  "Passive Learner": ["mutual_support", "peer_support", "challenge"],
  "Standard Learner": ["mutual_support", "peer_support", "support"],
  "High Achiever": ["mutual_support", "support"],
};

export const MODES: Record<StudyMode, ModeConfig> = {
  mutual_support: {
    icon: Handshake,
    label: "Học cùng người ngang mức",
    desc: "Bạn sẽ học với những người có mục tiêu và trình độ tương tự để dễ trao đổi, cùng ôn tập và tiến bộ từng bước.",
    bg: "bg-white",
    border: "border-accent",
    text: "text-gray-700",
  },

  peer_support: {
    icon: TrendingUp,
    label: "Học với người khá hơn",
    desc: "Bạn sẽ học với những người tốt hơn một chút để được hướng dẫn và cải thiện kết quả học tập.",
    bg: "bg-white",
    border: "border-accent",
    text: "text-gray-700",
  },

  challenge: {
    icon: Zap,
    label: "Học với người rất giỏi",
    desc: "Bạn sẽ học cùng những người học tốt để tạo động lực, thử thách bản thân và phát triển nhanh hơn.",
    bg: "bg-white",
    border: "border-accent",
    text: "text-gray-700",
  },

  support: {
    icon: Sprout,
    label: "Hỗ trợ người khác",
    desc: "Bạn sẽ giúp đỡ những người cần hỗ trợ, qua đó ôn lại kiến thức và hiểu bài sâu hơn.",
    bg: "bg-white",
    border: "border-accent",
    text: "text-gray-700",
  },
};

export const DAYS: DayConfig[] = [
  { id: 0, label: "Thứ Hai", short: "T2" },
  { id: 1, label: "Thứ Ba", short: "T3" },
  { id: 2, label: "Thứ Tư", short: "T4" },
  { id: 3, label: "Thứ Năm", short: "T5" },
  { id: 4, label: "Thứ Sáu", short: "T6" },
  { id: 5, label: "Thứ Bảy", short: "T7" },
  { id: 6, label: "Chủ Nhật", short: "CN" },
];

export const SLOTS: SlotConfig[] = [
  { id: "ca1", label: "Ca 1", time: "7h00–9h15", icon: Sunrise },
  { id: "ca2", label: "Ca 2", time: "9h30–11h45", icon: Sunrise },
  { id: "ca3", label: "Ca 3", time: "12h15–14h30", icon: Sun },
  { id: "ca4", label: "Ca 4", time: "14h50–17h05", icon: Sun },
  { id: "ca5", label: "Ca 5", time: "17h30–19h45", icon: MoonStar },
  { id: "ca6", label: "Ca 6", time: "20h00–21h45", icon: MoonStar },
];

export const STEPS_META: StepMeta[] = [
  { id: 1, label: "Thông tin cơ bản", icon: User },
  { id: 2, label: "Nhân khẩu học", icon: MapPin },
  { id: 3, label: "Mục tiêu học tập", icon: Target },
  { id: 4, label: "Môn đang học", icon: BookOpen },
  { id: 5, label: "Thời gian rảnh", icon: CalendarDays },
  { id: 6, label: "Kết quả học tập", icon: BarChart3 },
  { id: 7, label: "Xác nhận", icon: CircleCheckBig },
];

export const initFreeTime = (): FreeTime =>
  Object.fromEntries(
    DAYS.map((d) => [
      d.id,
      Object.fromEntries(SLOTS.map((slot) => [slot.id, false])),
    ]),
  ) as FreeTime;

export function normalizeModuleSchedule(existing?: FreeTime): FreeTime {
  const normalized = initFreeTime();
  if (!existing) return normalized;

  DAYS.forEach((day) => {
    normalized[day.id] = {
      ...normalized[day.id],
      ...(existing[day.id] || {}),
    };
  });

  return normalized;
}

export function syncModuleSlots(
  currentSlots: Record<string, FreeTime>,
  selectedModuleCodes: string[],
): Record<string, FreeTime> {
  return Object.fromEntries(
    selectedModuleCodes.map((code) => {
      const existing = currentSlots[code];
      return [code, normalizeModuleSchedule(existing)];
    }),
  );
}

export function getSortedSubjects(subjects: Subject[] = []): Subject[] {
  return [...subjects].sort((a, b) => {
    const orderDiff = (a.recommendedOrder ?? 0) - (b.recommendedOrder ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return String(a.subjectCode).localeCompare(String(b.subjectCode));
  });
}

export function getSubjectLabel(subject: Subject | undefined): string {
  if (!subject) return "";
  return `${subject.subjectCode} - ${subject.subjectName}`;
}

export function getCohortLabel(cohort: Cohort): string {
  if (!cohort) return "";
  return `Khóa ${cohort.cohortCode} • Bắt đầu ${cohort.startAcademicYear}`;
}

export function getStudyPlanTitle(plan: StudyPlan): string {
  if (!plan) return "";
  return (
    plan.termFullName ||
    `Học kỳ ${plan.semesterNo} - Năm học ${plan.academicYearStart} - ${plan.academicYearEnd}`
  );
}

export function getModuleConflictList(
  moduleSlots: Record<string, FreeTime> = {},
  selectedModuleCodes: string[] = [],
): ModuleSlotConflict[] {
  const conflicts: ModuleSlotConflict[] = [];
  const validCodes = selectedModuleCodes.filter(Boolean);

  DAYS.forEach((day) => {
    SLOTS.forEach((slot) => {
      const activeModules = validCodes.filter((code) => {
        return Boolean(moduleSlots[code]?.[day.id]?.[slot.id]);
      });

      if (activeModules.length > 1) {
        conflicts.push({
          dayId: day.id,
          slotId: slot.id,
          dayLabel: day.label,
          slotLabel: slot.label,
          moduleCodes: activeModules,
        });
      }
    });
  });

  return conflicts;
}

export function getOccupiedStudySlots(
  moduleSlots: Record<string, FreeTime> = {},
  selectedModuleCodes: string[] = [],
): Record<string, string[]> {
  const occupied: Record<string, string[]> = {};
  const validCodes = selectedModuleCodes.filter(Boolean);

  DAYS.forEach((day) => {
    SLOTS.forEach((slot) => {
      const key = `${day.id}-${slot.id}`;
      const activeModules = validCodes.filter((code) => {
        return Boolean(moduleSlots[code]?.[day.id]?.[slot.id]);
      });
      if (activeModules.length > 0) {
        occupied[key] = activeModules;
      }
    });
  });

  return occupied;
}

export function getFreeTimeConflictList(
  moduleSlots: Record<string, FreeTime> = {},
  selectedModuleCodes: string[] = [],
  freeTime?: FreeTime,
): FreeTimeConflict[] {
  if (!freeTime) return [];
  const conflicts: FreeTimeConflict[] = [];
  const validCodes = selectedModuleCodes.filter(Boolean);

  DAYS.forEach((day) => {
    SLOTS.forEach((slot) => {
      const isFree = Boolean(freeTime[day.id]?.[slot.id]);
      if (!isFree) return;

      const activeModules = validCodes.filter((code) => {
        return Boolean(moduleSlots[code]?.[day.id]?.[slot.id]);
      });

      if (activeModules.length > 0) {
        conflicts.push({
          dayId: day.id,
          slotId: slot.id,
          dayLabel: day.label,
          slotLabel: slot.label,
          moduleCodes: activeModules,
        });
      }
    });
  });

  return conflicts;
}
