import { LucideIcon } from "lucide-react";

export interface Cohort {
  cohortId: number | string;
  cohortCode: number | string;
  startAcademicYear: number;
}

export interface Subject {
  subjectId: number | string;
  subjectCode: string;
  subjectName: string;
  recommendedOrder?: number;
}

export interface StudyPlan {
  termId?: number | string;
  curriculumName: string;
  termFullName?: string;
  semesterNo?: number;
  academicYearStart?: number;
  academicYearEnd?: number;
  studyYearNo?: number;
  subjects?: Subject[];
}

export interface StudyYearSemesterOption {
  semesterNo: number;
  displayName: string;
}

export interface StudyYearOption {
  studyYearNo: number;
  displayName: string;
  academicYearLabel: string;
  semesters: StudyYearSemesterOption[];
}

export interface StudyPlanOptions {
  success: boolean;
  cohortCode: string;
  startYear: number;
  curriculumId: number;
  curriculumCode: string;
  curriculumName: string;
  studyYears: StudyYearOption[];
}

export interface TermSelection {
  studyYearNo: number;
  semesterNo: number;
  startYearTerm: number;
  endYearTerm: number;
  displayLabel: string;
}

export type DayId = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type SlotId = "ca1" | "ca2" | "ca3" | "ca4" | "ca5" | "ca6";
export type FreeTime = Record<DayId, Record<SlotId, boolean>>;

export type StudyGoal =
  | "Survivor"
  | "Passive Learner"
  | "Standard Learner"
  | "High Achiever";

export type StudyMode =
  | "mutual_support"
  | "peer_support"
  | "challenge"
  | "support";

export interface FormData {
  fullName: string;
  studentId: string;
  gender: "M" | "F" | "";
  ageGroup: "0-35" | "35-55" | "55<=" | "";
  region: string;
  studyGoal: StudyGoal | "";
  studyMode: StudyMode | "";
  cohortCode: string;
  mainModule: string;
  enrolledModules: string[];
  moduleSlots: Record<string, FreeTime>;
  freeTime: FreeTime;
  avgScore: number;
  prevAttempts: number;
  studiedCredits: string;
}

export interface GoalConfig {
  key: StudyGoal;
  icon: LucideIcon;
  title: string;
  desc: string;
  ring: string;
  bg: string;
  border: string;
  text: string;
  badge: string;
}

export interface ModeConfig {
  icon: LucideIcon;
  label: string;
  desc: string;
  bg: string;
  border: string;
  text: string;
}

export interface DayConfig {
  id: DayId;
  label: string;
  short: string;
}

export interface SlotConfig {
  id: SlotId;
  label: string;
  time: string;
  icon: LucideIcon;
}

export interface StepMeta {
  id: number;
  label: string;
  icon: LucideIcon;
}

export interface ModuleSlotConflict {
  dayId: DayId;
  slotId: SlotId;
  dayLabel: string;
  slotLabel: string;
  moduleCodes: string[];
}

export interface FreeTimeConflict {
  dayId: DayId;
  slotId: SlotId;
  dayLabel: string;
  slotLabel: string;
  moduleCodes: string[];
}
