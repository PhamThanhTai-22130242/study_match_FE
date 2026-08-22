import { useState, useEffect, useCallback, ReactNode } from "react";
import { Check, AlertCircle, Loader } from "lucide-react";
import {
  Cohort,
  FormData,
  StudyPlan,
  StudyPlanOptions,
  TermSelection,
  DAYS,
  STEPS_META,
  initFreeTime,
  syncModuleSlots,
  Step1,
  Step2,
  Step3Goal,
  Step3Mode,
  Step4CurrentPlan,
  Step5,
  Step6,
  Step7,
} from "./components";
import {
  submitOnboardingForm,
  transformFormDataToPayload,
  createSubjectCodeToIdMap,
  setIsOnboardingCompleted,
  checkStudentCodeAvailability,
} from "../../services/OnboardingService";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../config/apiClient";
import { useConfirm } from "../../components/modal/ConfirmModal";

import { BASE_URL } from "../../config/BaseConfig";

const API_BASE_URL = BASE_URL + "/api";

export default function OnboardingFlow() {
  const confirm = useConfirm();
  const [step, setStep] = useState<number>(1);
  const [goalSub, setGoalSub] = useState<number>(1);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submissionLoading, setSubmissionLoading] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string>("");
  const [submissionResult, setSubmissionResult] = useState<unknown>(null);
  const [studentIdError, setStudentIdError] = useState<string>("");
  const [studentIdChecking, setStudentIdChecking] = useState<boolean>(false);
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

  const [data, setData] = useState<FormData>({
    fullName: "",
    studentId: "",
    gender: "",
    ageGroup: "",
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
          : "Không tải được danh sách khóa học",
      );
    } finally {
      setCohortsLoading(false);
    }
  }, []);

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
      setData((prev) => ({
        ...prev,
        mainModule: "",
        enrolledModules: [],
        moduleSlots: {},
      }));
    } catch (error) {
      setStudyPlan(null);
      setData((prev) => ({
        ...prev,
        mainModule: "",
        enrolledModules: [],
        moduleSlots: {},
      }));
      setStudyPlanError(
        error instanceof Error ? error.message : "Không tải được môn học hiện tại",
      );
    } finally {
      setStudyPlanLoading(false);
    }
  }, []);

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
    loadCohorts();
  }, [loadCohorts]);

  useEffect(() => {
    loadStudyPlan(data.cohortCode);
  }, [data.cohortCode, loadStudyPlan]);

  useEffect(() => {
    loadStudyPlanOptions(data.cohortCode);
  }, [data.cohortCode, loadStudyPlanOptions]);

  useEffect(() => {
    if (!data.cohortCode || !mainTermSelection) {
      setMainTermStudyPlan(null);
      setMainTermStudyPlanLoading(false);
      setMainTermStudyPlanError("");
      return;
    }

    setMainTermStudyPlanLoading(true);
    setMainTermStudyPlanError("");
    loadStudyPlanByTerm(data.cohortCode, mainTermSelection)
      .then((plan) => {
        setMainTermStudyPlan(plan);
      })
      .catch((error) => {
        setMainTermStudyPlan(null);
        setMainTermStudyPlanError(
          error instanceof Error
            ? error.message
            : "Không tải được môn chính theo học kỳ đã chọn",
        );
      })
      .finally(() => {
        setMainTermStudyPlanLoading(false);
      });
  }, [data.cohortCode, mainTermSelection, loadStudyPlanByTerm]);

  useEffect(() => {
    if (!data.cohortCode || !enrolledTermSelection) {
      setEnrolledTermStudyPlan(null);
      setEnrolledTermStudyPlanLoading(false);
      setEnrolledTermStudyPlanError("");
      return;
    }

    setEnrolledTermStudyPlanLoading(true);
    setEnrolledTermStudyPlanError("");
    loadStudyPlanByTerm(data.cohortCode, enrolledTermSelection)
      .then((plan) => {
        setEnrolledTermStudyPlan(plan);
      })
      .catch((error) => {
        setEnrolledTermStudyPlan(null);
        setEnrolledTermStudyPlanError(
          error instanceof Error
            ? error.message
            : "Không tải được môn phụ theo học kỳ đã chọn",
        );
      })
      .finally(() => {
        setEnrolledTermStudyPlanLoading(false);
      });
  }, [data.cohortCode, enrolledTermSelection, loadStudyPlanByTerm]);

  const update = useCallback(
    (key: keyof FormData, value: FormData[keyof FormData]): void =>
      setData((p) => {
        if (key === "cohortCode") {
          setMainTermSelection(null);
          setEnrolledTermSelection(null);
          setMainTermStudyPlan(null);
          setMainTermStudyPlanError("");
          setEnrolledTermStudyPlan(null);
          setEnrolledTermStudyPlanError("");
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
      }),
    [],
  );

  useEffect(() => {
    if (!data.studentId || !data.studentId.trim()) {
      setStudentIdError("");
      setStudentIdChecking(false);
      return;
    }

    const timer = setTimeout(async () => {
      setStudentIdChecking(true);
      const res = await checkStudentCodeAvailability(data.studentId);
      setStudentIdChecking(false);
      if (res.exists) {
        setStudentIdError(res.message || "Mã sinh viên này đã tồn tại trong hệ thống.");
      } else {
        setStudentIdError("");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [data.studentId]);

  const canProceed = (): boolean => {
    if (step === 1) {
      return !!(
        data.studentId.trim() &&
        !studentIdError &&
        !studentIdChecking &&
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
      return selectedModules.every((moduleCode) =>
        DAYS.some((day) =>
          Object.values(data.moduleSlots[moduleCode]?.[day.id] ?? {}).some(
            Boolean,
          ),
        ),
      );
    }
    if (step === 5) {
      return DAYS.some((d) => Object.values(data.freeTime[d.id]).some(Boolean));
    }
    if (step === 6) return data.studiedCredits !== "";
    return true;
  };

  const navigate = useNavigate();

  const handleNext = async (): Promise<void> => {
    if (step === 1) {
      if (studentIdError) return;
      setStudentIdChecking(true);
      try {
        const res = await checkStudentCodeAvailability(data.studentId);
        setStudentIdChecking(false);
        if (res.exists) {
          setStudentIdError(res.message || "Mã sinh viên này đã tồn tại trong hệ thống.");
          return;
        }
        setStudentIdError("");
        setStep(2);
      } catch {
        setStudentIdChecking(false);
        setStep(2);
      }
      return;
    }
    if (step === 3) {
      if (goalSub === 1) return setGoalSub(2);
      setGoalSub(1);
      return setStep(4);
    }
    if (step === 4) return setStep(5);
    if (step === 7) {
      setSubmissionLoading(true);
      setSubmissionError("");
      setSubmissionResult(null);

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

        submitOnboardingForm(payload).then(async (result) => {
          setSubmissionLoading(false);
          if (result.success) {
            setSubmissionResult(result.data);
            setSubmitted(true);
            const response = await setIsOnboardingCompleted(
              Number(localStorage.getItem("userId")),
            );
            if (response.success) {
              navigate("/home");
            } else {
              console.error(
                "Error setting onboarding completed:",
                response.message || "Unknown error",
              );
            }
          } else {
            setSubmissionError(
              result.error || "Lỗi không xác định khi gửi dữ liệu",
            );
          }
        });
      } catch (error) {
        setSubmissionLoading(false);
        setSubmissionError(
          error instanceof Error
            ? error.message
            : "Lỗi không xác định khi gửi dữ liệu",
        );
      }
      return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = async (): Promise<void> => {
    if (step === 1 && goalSub === 1) {
      const confirmed = await confirm({
        title: "Xác nhận thoát",
        message: "Bạn có chắc muốn thoát? Dữ liệu đã nhập sẽ không được lưu.",
        type: "warning",
        confirmText: "Thoát",
        cancelText: "Hủy",
      });
      if (confirmed) {
        navigate("/login", { replace: true });
      }

      return;
    }
    if (step === 3 && goalSub === 2) return setGoalSub(1);
    if (step === 4) return setStep(3);
    if (step > 1) setStep((s) => s - 1);
  };

  const isBackDisabled = step === 1 && goalSub === 1;

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

  const subStepLabel = (): string | null => {
    if (step !== 3) return null;
    return goalSub === 1
      ? "Bước 1/2 – Chọn trình độ"
      : "Bước 2/2 – Chọn phương thức";
  };

  const renderContent = (): ReactNode => {
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
            studentIdError={studentIdError}
            studentIdChecking={studentIdChecking}
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
    3: goalSub === 1 ? "Thiết lập mục tiêu học tập" : "Lựa chọn phương thức ghép nhóm",
    4: "Kế hoạch học tập & Môn học học kỳ này",
    5: "Thời gian rảnh của bạn trong tuần",
    6: "Điểm trung bình tích lũy & Số tín chỉ",
    7: "Xem lại tất cả thông tin",
  };

  if (submissionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <div className="bg-white rounded-3xl p-10 max-w-sm w-full mx-4 text-center shadow-xl border border-gray-100 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <div>
            <h2 className="text-lg font-bold text-gray-800">Đang gửi dữ liệu...</h2>
            <p className="text-xs text-gray-500 mt-1">Vui lòng đợi trong khi chúng tôi xử lý hồ sơ của bạn</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 md:p-6 relative overflow-hidden bg-[#f7f5f0]"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            #1a3557 0px,
            #1a3557 1px,
            transparent 1px,
            transparent 12px
          )`,
        }}
      />

      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/20 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-400/10 blur-[130px] pointer-events-none z-0" />
      <div className="absolute top-[40%] right-[20%] w-[350px] h-[350px] rounded-full bg-indigo-300/15 blur-[100px] pointer-events-none z-0" />

      <div className="w-full max-w-3xl bg-white/80 backdrop-blur-md rounded-[24px] border border-white/60 shadow-2xl flex flex-col overflow-hidden max-h-[90vh] relative z-10">
        <div className="flex items-center justify-between border-b border-gray-100 bg-white/90 px-6 py-4 shrink-0 relative">
          <h2 className="text-lg font-bold text-gray-800">Thiết lập hồ sơ ban đầu</h2>
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
                const clickable = s.id <= step;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!clickable || submissionLoading}
                    onClick={() => {
                      if (!clickable || submissionLoading) return;
                      setStep(s.id);
                      if (s.id === 3) setGoalSub(1);
                    }}
                    className={`flex flex-col items-center gap-1 ${
                      clickable && !submissionLoading
                        ? "cursor-pointer"
                        : "cursor-default"
                    } disabled:cursor-not-allowed`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${active
                          ? "bg-blue-500 text-white scale-105 shadow-sm ring-4 ring-blue-100"
                          : completed
                            ? "bg-blue-100 text-blue-600 font-bold hover:bg-blue-200"
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
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-white/90 border-b border-gray-100 flex items-center justify-between shrink-0">
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

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {submissionError && (
            <div className="flex items-center gap-2.5 p-4 mb-4 text-sm text-red-800 border border-red-200 rounded-2xl bg-red-50 font-medium">
              <span>{submissionError}</span>
            </div>
          )}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
            {renderContent()}
          </div>
          {step < 7 && (
            <p className="text-center text-xs text-gray-400 mt-4">
              Dữ liệu bạn nhập giúp mô hình gợi ý bạn học chính xác hơn
            </p>
          )}
        </div>

        <div className="px-6 pt-5 pb-6 border-t border-gray-150 flex items-center justify-between bg-white/90 shrink-0">
          <button
            type="button"
            onClick={handleBack}
            disabled={submissionLoading}
            className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all"
          >
            {isBackDisabled ? "Thoát" : "Quay lại"}
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed() || submissionLoading}
            className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-sm transition-all flex items-center gap-2 ${!canProceed() || submissionLoading
                ? "bg-blue-200 text-white cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
              }`}
          >
            {submissionLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang gửi...
              </span>
            ) : step === 7 ? (
              "Hoàn tất & Tìm bạn học"
            ) : (
              "Tiếp theo"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
