import { useState, useEffect, useCallback } from "react";
import { Dialog } from "@mui/material";
import { X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { loadProfileByUserId } from "../../../redux/ProfileReducer";
import { AppDispatch, RootState } from "../../../redux/store";
import { ProfileApiResponse, ProfileViewModel } from "../types";
import {
  FormData,
  Cohort,
  StudyPlan,
  StudyPlanOptions,
  TermSelection,
  FreeTime,
  initFreeTime,
  syncModuleSlots,
  getModuleConflictList,
  getFreeTimeConflictList,
  Step1,
  Step2,
  Step3Goal,
  Step3Mode,
  Step4CurrentPlan,
  Step5,
  Step6,
  Step7,
  DAYS,
} from "../../Onboarding/components";
import {
  transformFormDataToPayload,
  createSubjectCodeToIdMap,
} from "../../../services/OnboardingService";
import { updateProfile } from "../../../services/ProfileService";
import { apiFetch } from "../../../config/apiClient";
import { toast } from "react-toastify";
import { BASE_URL } from "../../../config/BaseConfig";

const API_BASE_URL = BASE_URL + "/api";

function convertFreeTimeFromProfile(profile: ProfileViewModel): FreeTime {
  const freeTime = initFreeTime();

  profile.freeTimeGroups?.forEach((group) => {
    if (freeTime[group.dayId]) {
      group.slots.forEach((slot) => {
        (freeTime[group.dayId] as any)[slot.id] = true;
      });
    }
  });

  return freeTime;
}

function getGenderDefault(profile: ProfileViewModel): "M" | "F" | "" {
  const normalized = profile.gender?.toLowerCase();
  if (normalized === "male" || normalized === "nam") return "M";
  if (normalized === "female" || normalized === "nu" || normalized === "nữ") {
    return "F";
  }
  return "";
}

function getStudyModeDefault(profile: ProfileViewModel): FormData["studyMode"] {
  const normalized = profile.studyModeLabel?.toLowerCase() || "";
  if (normalized.includes("tương đồng") || normalized.includes("mutual")) {
    return "mutual_support";
  }
  if (normalized.includes("đồng") || normalized.includes("peer")) {
    return "peer_support";
  }
  if (normalized.includes("đối kháng") || normalized.includes("challenge")) {
    return "challenge";
  }
  if (normalized.includes("bổ trợ") || normalized.includes("support")) {
    return "support";
  }
  return "";
}

function getStudyGoalDefault(profile: ProfileViewModel): FormData["studyGoal"] {
  const goal = profile.studyGoal || "";
  return goal === "Survivor" ||
    goal === "Passive Learner" ||
    goal === "Standard Learner" ||
    goal === "High Achiever"
    ? goal
    : "";
}

function getCurrentTermSelection(
  profileData: ProfileApiResponse,
): TermSelection | null {
  const termProfile = profileData.termProfiles?.[0];
  if (!termProfile?.term) return null;

  return {
    studyYearNo: termProfile.studyYearNo,
    semesterNo: termProfile.semesterNo,
    startYearTerm: termProfile.term.academicYearStart,
    endYearTerm: termProfile.term.academicYearEnd,
    displayLabel: termProfile.term.fullName,
  };
}

function convertModuleSlotsFromProfile(
  profile: ProfileViewModel,
): Record<string, FreeTime> {
  const moduleSlots: Record<string, FreeTime> = {};

  const allModules = Array.from(
    new Set([
      ...(profile.scheduleRows || []).flatMap((row) =>
        row.cells.flatMap((cell) =>
          cell.classes.map((scheduleClass) => scheduleClass.subjectCode),
        ),
      ),
      ...(profile.enrolledSubjects || []).map((subject) => subject.subjectCode),
    ]),
  ).filter(Boolean);

  allModules.forEach((moduleCode) => {
    moduleSlots[moduleCode] = initFreeTime();
  });

  profile.scheduleRows?.forEach((row) => {
    row.cells?.forEach((cell) => {
      if (cell.classes && cell.classes.length > 0) {
        cell.classes.forEach((scheduleClass) => {
          if (moduleSlots[scheduleClass.subjectCode]) {
            (moduleSlots[scheduleClass.subjectCode][cell.dayId] as any)[
              row.slot.id
            ] = true;
          }
        });
      }
    });
  });

  return moduleSlots;
}

interface UpdateProfileDialogProps {
  open: boolean;
  onClose: () => void;
  profile: ProfileViewModel;
  preventClose?: boolean;
}

export default function UpdateProfileDialog({
  open,
  onClose,
  profile,
  preventClose = false,
}: UpdateProfileDialogProps) {
  const dispatch = useDispatch<AppDispatch>();
  const profileData = useSelector(
    (state: RootState) => state.profile.profileData,
  );
  const [step, setStep] = useState<number>(1);
  const [goalSub, setGoalSub] = useState<number>(1);

  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohortsLoading, setCohortsLoading] = useState<boolean>(false);
  const [cohortsError, setCohortsError] = useState<string>("");

  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [studyPlanLoading, setStudyPlanLoading] = useState<boolean>(false);
  const [studyPlanError, setStudyPlanError] = useState<string>("");

  const [studyPlanOptions, setStudyPlanOptions] =
    useState<StudyPlanOptions | null>(null);
  const [studyPlanOptionsLoading, setStudyPlanOptionsLoading] =
    useState<boolean>(false);
  const [studyPlanOptionsError, setStudyPlanOptionsError] =
    useState<string>("");

  const [mainTermSelection, setMainTermSelection] =
    useState<TermSelection | null>(null);
  const [enrolledTermSelection, setEnrolledTermSelection] =
    useState<TermSelection | null>(null);

  const [mainTermStudyPlan, setMainTermStudyPlan] = useState<StudyPlan | null>(
    null,
  );
  const [mainTermStudyPlanLoading, setMainTermStudyPlanLoading] =
    useState<boolean>(false);
  const [mainTermStudyPlanError, setMainTermStudyPlanError] =
    useState<string>("");

  const [enrolledTermStudyPlan, setEnrolledTermStudyPlan] =
    useState<StudyPlan | null>(null);
  const [enrolledTermStudyPlanLoading, setEnrolledTermStudyPlanLoading] =
    useState<boolean>(false);
  const [enrolledTermStudyPlanError, setEnrolledTermStudyPlanError] =
    useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>("");

  const [data, setData] = useState<FormData>({
    fullName: "",
    studentId: "",
    gender: "" as "M" | "F" | "",
    ageGroup: "" as "0-35" | "35-55" | "55<=" | "",
    region: "",
    studyGoal: "",
    studyMode: "",
    cohortCode: "",
    mainModule: "",
    enrolledModules: [],
    moduleSlots: {},
    freeTime: initFreeTime(),
    avgScore: 8.0,
    prevAttempts: 0,
    studiedCredits: "",
  });

  useEffect(() => {
    if (!open) return;

    const dataSource = profileData;
    if (!dataSource) {
      if (!profile) return;

      setData({
        fullName: profile.fullName || "",
        studentId: profile.studentCode || "",
        gender: getGenderDefault(profile),
        ageGroup: (profile.ageGroup as "0-35" | "35-55" | "55<=" | "") || "",
        region: profile.region || "",
        studyGoal: getStudyGoalDefault(profile),
        studyMode: getStudyModeDefault(profile),
        cohortCode: "",
        mainModule: String(profile.mainSubjectId || ""),
        enrolledModules:
          profile.enrolledSubjects?.map((s) => s.subjectCode) || [],
        moduleSlots: convertModuleSlotsFromProfile(profile),
        freeTime: convertFreeTimeFromProfile(profile),
        avgScore: profile.avgScore ?? 8.0,
        prevAttempts: 0,
        studiedCredits: String(profile.studiedCredits ?? ""),
      });

      setStep(1);
      setGoalSub(1);
      return;
    }

    const profileVm = profile;
    const currentTerm = dataSource.termProfiles?.[0];
    const mainSubjectCode =
      dataSource.scheduleSlots?.find(
        (slot) => slot.scheduleType === "MAIN_SUBJECT",
      )?.subject.subjectCode ||
      String(currentTerm?.mainSubjectId || profileVm.mainSubjectId || "");
    const enrolledSubjectCodes = Array.from(
      new Set(
        dataSource.scheduleSlots
          ?.filter((slot) => slot.scheduleType === "CURRENT_TERM")
          .map((slot) => slot.subject.subjectCode)
          .concat(
            dataSource.enrollments?.map((item) => item.subject.subjectCode) ||
            [],
          ) || [],
      ),
    ).filter((code) => code && code !== mainSubjectCode);

    const profileForSchedule: ProfileViewModel = {
      ...profileVm,
      gender: dataSource.profile.gender,
      cohortLabel: `Khoa ${dataSource.profile.cohort.cohortCode} (${dataSource.profile.cohort.startAcademicYear})`,
      studyGoal: currentTerm?.studyGoal || profileVm.studyGoal,
      studyModeLabel: currentTerm?.studyMode || profileVm.studyModeLabel,
      mainSubjectId: currentTerm?.mainSubjectId || profileVm.mainSubjectId,
      mainSubjectName:
        currentTerm?.mainSubjectName || profileVm.mainSubjectName,
      enrolledSubjects: dataSource.enrollments.map((item) => item.subject),
      freeTimeGroups: profileVm.freeTimeGroups,
      scheduleRows: profileVm.scheduleRows,
      dayHeaders: profileVm.dayHeaders,
      avgScore: currentTerm?.avgScore || profileVm.avgScore,
      studiedCredits: currentTerm?.studiedCredits || profileVm.studiedCredits,
      studyYearNo: currentTerm?.studyYearNo || profileVm.studyYearNo,
      semesterNo: currentTerm?.semesterNo || profileVm.semesterNo,
    };

    const currentTermSelection = getCurrentTermSelection(dataSource);

    setData({
      fullName: dataSource.profile.fullName || profileVm.fullName || "",
      studentId: dataSource.profile.studentCode || profileVm.studentCode || "",
      gender: getGenderDefault(profileForSchedule),
      ageGroup:
        (dataSource.profile.ageGroup as "0-35" | "35-55" | "55<=" | "") ||
        (profileVm.ageGroup as "0-35" | "35-55" | "55<=" | "") ||
        "",
      region: dataSource.profile.region || profileVm.region || "",
      studyGoal: getStudyGoalDefault(profileForSchedule),
      studyMode: getStudyModeDefault(profileForSchedule),
      cohortCode: String(dataSource.profile.cohort.cohortCode || ""),
      mainModule: mainSubjectCode,
      enrolledModules: enrolledSubjectCodes,
      moduleSlots: convertModuleSlotsFromProfile(profileForSchedule),
      freeTime: convertFreeTimeFromProfile(profileForSchedule),
      avgScore: currentTerm?.avgScore ?? profileVm.avgScore ?? 8.0,
      prevAttempts: 0,
      studiedCredits: String(
        currentTerm?.studiedCredits ?? profileVm.studiedCredits ?? "",
      ),
    });

    setMainTermSelection(currentTermSelection);
    setEnrolledTermSelection(currentTermSelection);

    setStep(1);
    setGoalSub(1);
  }, [open, profile, profileData]);

  const loadCohorts = useCallback(async () => {
    setCohortsLoading(true);
    setCohortsError("");
    try {
      const res = await apiFetch<Cohort[]>("/cohorts", { method: "GET" }, API_BASE_URL);
      const isRawArray = Array.isArray(res);
      const success = isRawArray ? true : res.success;
      const cohortsData = isRawArray ? (res as any) : res.data;
      if (!success) throw new Error((res as any).message || "Failed to load cohorts");
      setCohorts(Array.isArray(cohortsData) ? cohortsData : []);
    } catch (error) {
      setCohorts([]);
      setCohortsError(
        error instanceof Error
          ? error.message
          : "Không tải được danh sách khóa",
      );
    } finally {
      setCohortsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    loadCohorts();
  }, [open, loadCohorts]);

  const loadStudyPlan = useCallback(async (cohortCode: string) => {
    if (!cohortCode) {
      setStudyPlan(null);
      return;
    }

    setStudyPlanLoading(true);
    setStudyPlanError("");
    try {
      const res = await apiFetch<StudyPlan>(
        `/cohorts/${cohortCode}/study-plan/current`,
        { method: "GET" },
        API_BASE_URL
      );
      const isRawObject = res && (res as any).success === undefined;
      const success = isRawObject ? true : res.success;
      const planData = (isRawObject ? res : res.data) as StudyPlan;
      if (!success) throw new Error((res as any).message || "Failed to load study plan");
      setStudyPlan(planData);
    } catch (error) {
      setStudyPlan(null);
      setStudyPlanError(
        error instanceof Error ? error.message : "Không tải được môn học",
      );
    } finally {
      setStudyPlanLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudyPlan(data.cohortCode);
  }, [data.cohortCode, loadStudyPlan]);

  const loadStudyPlanOptions = useCallback(async (cohortCode: string) => {
    if (!cohortCode) {
      setStudyPlanOptions(null);
      return;
    }

    setStudyPlanOptionsLoading(true);
    setStudyPlanOptionsError("");
    try {
      const res = await apiFetch<StudyPlanOptions>(
        `/cohorts/${cohortCode}/study-plan-options`,
        { method: "GET" },
        API_BASE_URL
      );
      const success = res ? res.success : false;
      const optionsData = (res && (res as any).data !== undefined ? (res as any).data : res) as StudyPlanOptions;
      if (!success) throw new Error((res as any).message || "Failed to load options");
      setStudyPlanOptions(optionsData);
    } catch (error) {
      setStudyPlanOptions(null);
      setStudyPlanOptionsError(
        error instanceof Error
          ? error.message
          : "Không tải được danh sách học kỳ",
      );
    } finally {
      setStudyPlanOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudyPlanOptions(data.cohortCode);
  }, [data.cohortCode, loadStudyPlanOptions]);

  const loadStudyPlanByTerm = useCallback(
    async (
      cohortCode: string,
      selection: TermSelection,
    ): Promise<StudyPlan> => {
      const params = new URLSearchParams({
        studyYearNo: String(selection.studyYearNo),
        semesterNo: String(selection.semesterNo),
        startYearTerm: String(selection.startYearTerm),
        endYearTerm: String(selection.endYearTerm),
      });

      const res = await apiFetch<StudyPlan>(
        `/cohorts/${cohortCode}/study-plan-options/subject?${params.toString()}`,
        { method: "GET" },
        API_BASE_URL
      );
      const isRawObject = res && (res as any).success === undefined;
      const success = isRawObject ? true : res.success;
      const planData = (isRawObject ? res : res.data) as StudyPlan;
      if (!success) throw new Error((res as any).message || "Failed to load subjects");
      return planData;
    },
    [],
  );

  useEffect(() => {
    if (!data.cohortCode || !mainTermSelection) {
      setMainTermStudyPlan(null);
      return;
    }

    setMainTermStudyPlanLoading(true);
    setMainTermStudyPlanError("");
    loadStudyPlanByTerm(data.cohortCode, mainTermSelection)
      .then((plan) => setMainTermStudyPlan(plan))
      .catch((error) => {
        setMainTermStudyPlan(null);
        setMainTermStudyPlanError(
          error instanceof Error ? error.message : "Không tải được môn chính",
        );
      })
      .finally(() => setMainTermStudyPlanLoading(false));
  }, [data.cohortCode, mainTermSelection, loadStudyPlanByTerm]);

  useEffect(() => {
    if (!data.cohortCode || !enrolledTermSelection) {
      setEnrolledTermStudyPlan(null);
      return;
    }

    setEnrolledTermStudyPlanLoading(true);
    setEnrolledTermStudyPlanError("");
    loadStudyPlanByTerm(data.cohortCode, enrolledTermSelection)
      .then((plan) => setEnrolledTermStudyPlan(plan))
      .catch((error) => {
        setEnrolledTermStudyPlan(null);
        setEnrolledTermStudyPlanError(
          error instanceof Error ? error.message : "Không tải được môn phụ",
        );
      })
      .finally(() => setEnrolledTermStudyPlanLoading(false));
  }, [data.cohortCode, enrolledTermSelection, loadStudyPlanByTerm]);

  const update = useCallback(
    (key: keyof FormData, value: FormData[keyof FormData]) => {
      setData((p) => {
        if (key === "cohortCode") {
          setMainTermSelection(null);
          setEnrolledTermSelection(null);
          setMainTermStudyPlan(null);
          setEnrolledTermStudyPlan(null);
          return {
            ...p,
            cohortCode: value as string,
            mainModule: "",
            enrolledModules: [],
            moduleSlots: {},
          };
        }

        if (key === "mainModule") {
          const nextMainModule = value as string;
          const nextSelectedModules = [
            nextMainModule,
            ...(p.enrolledModules as string[]).filter(
              (code) => code !== nextMainModule,
            ),
          ].filter(Boolean);

          return {
            ...p,
            mainModule: nextMainModule,
            enrolledModules: (p.enrolledModules as string[]).filter(
              (code) => code !== nextMainModule,
            ),
            moduleSlots: syncModuleSlots(p.moduleSlots, nextSelectedModules),
          };
        }

        if (key === "enrolledModules") {
          const normalizedEnrolledModules = Array.isArray(value)
            ? value.filter(
              (moduleCode): moduleCode is string =>
                typeof moduleCode === "string",
            )
            : [];

          const nextSelectedModules = [
            p.mainModule,
            ...normalizedEnrolledModules.filter(
              (code) => code !== p.mainModule,
            ),
          ].filter(Boolean);

          return {
            ...p,
            enrolledModules: normalizedEnrolledModules.filter(
              (code) => code !== p.mainModule,
            ),
            moduleSlots: syncModuleSlots(p.moduleSlots, nextSelectedModules),
          };
        }

        return { ...p, [key]: value };
      });
    },
    [],
  );

  const canProceed = (): boolean => {
    if (step === 1) {
      return !!(
        data.fullName.trim() &&
        data.studentId.trim() &&
        data.cohortCode
      );
    }
    if (step === 2) return !!(data.gender && data.region);
    if (step === 3) return goalSub === 1 ? !!data.studyGoal : !!data.studyMode;
    if (step === 4) {
      if (!(data.mainModule && studyPlan)) return false;
      const selectedModules = [data.mainModule, ...data.enrolledModules].filter(
        Boolean,
      );
      const allModulesHaveSlots = selectedModules.every((moduleCode) =>
        DAYS.some((day) =>
          Object.values(data.moduleSlots[moduleCode]?.[day.id] ?? {}).some(
            Boolean,
          ),
        ),
      );
      if (!allModulesHaveSlots) return false;

      const moduleConflicts = getModuleConflictList(
        data.moduleSlots,
        selectedModules,
      );
      if (moduleConflicts.length > 0) return false;

      return true;
    }
    if (step === 5) {
      const hasFreeTime = DAYS.some((d) =>
        Object.values(data.freeTime[d.id]).some(Boolean),
      );
      if (!hasFreeTime) return false;

      const selectedModules = [data.mainModule, ...data.enrolledModules].filter(
        Boolean,
      );
      const freeTimeConflicts = getFreeTimeConflictList(
        data.moduleSlots,
        selectedModules,
        data.freeTime,
      );
      if (freeTimeConflicts.length > 0) return false;

      return true;
    }
    if (step === 6) {
      const rawCredits = String(data.studiedCredits || "").trim();
      if (rawCredits === "") return false;
      const creditsNum = Number(rawCredits);
      return (
        Number.isInteger(creditsNum) && creditsNum >= 1 && creditsNum <= 200
      );
    }
    return true;
  };

  const handleNext = async () => {
    if (step === 3) {
      if (goalSub === 1) return setGoalSub(2);
      setGoalSub(1);
      return setStep(4);
    }
    if (step === 4) return setStep(5);
    if (step === 7) {
      setSubmitting(true);
      setSubmitError("");

      try {
        const subjectCodeToIdMap = createSubjectCodeToIdMap([
          studyPlan,
          mainTermStudyPlan,
          enrolledTermStudyPlan,
        ]);
        const payload = transformFormDataToPayload(
          data,
          cohorts,
          studyPlan,
          subjectCodeToIdMap,
        );

        const result = await updateProfile(payload);
        setSubmitting(false);

        if (result.success) {
          const userId = Number(localStorage.getItem("userId"));
          dispatch(loadProfileByUserId(userId));
          onClose();
        } else {
          setSubmitError(result.error || "Lỗi khi lưu dữ liệu");
          toast.error(result.error || "Lỗi khi lưu dữ liệu");
        }
      } catch (error) {
        setSubmitting(false);
        setSubmitError(
          error instanceof Error ? error.message : "Lỗi khi lưu dữ liệu",
        );
      }
      return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step === 3 && goalSub === 2) return setGoalSub(1);
    if (step === 4) return setStep(3);
    if (step > 1) setStep((s) => s - 1);
  };

  const renderContent = () => {
    switch (step) {
      case 1:
        return (
          <Step1
            data={data}
            update={update}
            cohorts={cohorts}
            cohortsLoading={cohortsLoading}
            cohortsError={cohortsError}
            onRetry={loadCohorts}
          />
        );
      case 2:
        return <Step2 data={data} update={update} />;
      case 3:
        return goalSub === 1 ? (
          <Step3Goal data={data} update={update} />
        ) : (
          <Step3Mode data={data} update={update} />
        );
      case 4:
        return (
          <Step4CurrentPlan
            data={data}
            update={update}
            studyPlan={studyPlan}
            studyPlanLoading={studyPlanLoading}
            studyPlanError={studyPlanError}
            studyPlanOptions={studyPlanOptions}
            studyPlanOptionsLoading={studyPlanOptionsLoading}
            studyPlanOptionsError={studyPlanOptionsError}
            mainTermSelection={mainTermSelection}
            enrolledTermSelection={enrolledTermSelection}
            setMainTermSelection={setMainTermSelection}
            setEnrolledTermSelection={setEnrolledTermSelection}
            mainTermStudyPlan={mainTermStudyPlan}
            mainTermStudyPlanLoading={mainTermStudyPlanLoading}
            mainTermStudyPlanError={mainTermStudyPlanError}
            enrolledTermStudyPlan={enrolledTermStudyPlan}
            enrolledTermStudyPlanLoading={enrolledTermStudyPlanLoading}
            enrolledTermStudyPlanError={enrolledTermStudyPlanError}
          />
        );
      case 5:
        return <Step5 data={data} update={update} />;
      case 6:
        return <Step6 data={data} update={update} />;
      case 7:
        return <Step7 data={data} studyPlan={studyPlan} />;
      default:
        return null;
    }
  };

  const stepTitle = (): string => {
    if (step === 3) {
      return goalSub === 1
        ? "Trình độ học tập của bạn?"
        : "Cách bạn muốn học cùng người khác?";
    }

    return (
      (
        {
          1: "Xin chào! Hãy bắt đầu nào",
          2: "Thông tin cá nhân",
          4: "Khóa hiện tại và môn học của bạn",
          5: "Thời gian rảnh của bạn",
          6: "Kết quả học tập",
          7: "Xem lại hồ sơ của bạn",
        } as Record<number, string>
      )[step] ?? ""
    );
  };

  const DIALOG_STEPS = [
    { id: 1, name: "Bắt đầu" },
    { id: 2, name: "Cá nhân" },
    { id: 3, name: "Mục tiêu" },
    { id: 4, name: "Môn học" },
    { id: 5, name: "Lịch học" },
    { id: 6, name: "Kết quả" },
    { id: 7, name: "Xem lại" },
  ];

  const stepSubtitles: Record<number, string> = {
    1: "Bắt đầu cập nhật hồ sơ",
    2: "Thông tin cá nhân cơ bản",
    3: goalSub === 1 ? "Thiết lập mục tiêu học tập" : "Lựa chọn phương thức ghép cặp",
    4: "Kế hoạch học tập & Môn học học kỳ này",
    5: "Thời gian rảnh của bạn trong tuần",
    6: "Điểm trung bình tích lũy & Số tín chỉ",
    7: "Xem lại tất cả thông tin",
  };

  return (
    <Dialog
      open={open}
      onClose={preventClose ? undefined : onClose}
      fullWidth
      maxWidth="md"
      disableEscapeKeyDown={preventClose}
      PaperProps={{
        sx: {
          borderRadius: "24px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
        },
      }}
    >
      <div className="flex flex-col max-h-[90vh] bg-slate-50/50">
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4 shrink-0 relative">
          <h2 className="text-lg font-bold text-gray-800">Cập nhật hồ sơ học tập</h2>
          {!preventClose && (
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-xl transition-all"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="border-b border-gray-100 bg-gray-50/50 py-3 shrink-0 select-none">
          <div className="mx-auto max-w-xl px-10 relative">
            <div className="absolute top-[14px] left-[40px] right-[40px] h-0.5 bg-gray-200 z-0" />
            <div
              className="absolute top-[14px] left-[40px] h-0.5 bg-blue-500 transition-all duration-300 z-0"
              style={{
                width: `calc(${(step - 1) / 6} * (100% - 80px))`,
              }}
            />

            <div className="flex justify-between items-center relative z-10">
              {DIALOG_STEPS.map((s) => {
                const active = step === s.id;
                const completed = step > s.id;
                return (
                  <div key={s.id} className="flex flex-col items-center gap-1">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${active
                        ? "bg-blue-500 text-white scale-105 shadow-sm ring-4 ring-blue-100"
                        : completed
                          ? "bg-blue-100 text-blue-600 font-bold"
                          : "bg-white border border-gray-300 text-gray-400"
                        }`}
                    >
                      {s.id}
                    </span>
                    <span
                      className={`text-[10px] font-semibold transition-colors duration-300 ${active
                        ? "text-blue-600 font-bold"
                        : completed
                          ? "text-gray-600"
                          : "text-gray-400"
                        }`}
                    >
                      {s.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              {step === 3 && goalSub === 2 ? "Bước 3 - Phần 2 / 7" : `Bước ${step} / 7`}
            </span>
            <h3 className="text-sm font-bold text-gray-700 mt-0.5">
              {stepTitle()}
            </h3>
          </div>
          <div className="text-[11px] text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1 rounded-xl font-medium">
            {stepSubtitles[step]}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 min-h-[350px]">
          {submitting && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-sm font-semibold text-gray-500">Đang xử lý hồ sơ...</span>
            </div>
          )}
          {submitError && (
            <div className="flex items-center gap-2.5 p-4 mb-4 text-sm text-red-800 border border-red-200 rounded-2xl bg-red-50 font-medium">
              <span>{submitError}</span>
            </div>
          )}
          {!submitting && (
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
              <div className="text-sm text-gray-800">{renderContent()}</div>
            </div>
          )}
        </div>

        <div className="px-6 pt-5 pb-6 border-t border-gray-150 flex items-center justify-between bg-white shrink-0">
          {preventClose ? (
            <div />
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all"
            >
              Huỷ
            </button>
          )}
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={submitting}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-xl transition-all"
              >
                Quay lại
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed() || submitting}
              className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm transition-all flex items-center gap-2 ${!canProceed() || submitting
                ? "bg-blue-200 text-white cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
              {step === 7 ? "Lưu thay đổi" : "Tiếp theo"}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
