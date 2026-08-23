import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  FormData,
  StudyPlan,
  StudyPlanOptions,
  TermSelection,
  Subject,
  DayConfig,
  SlotConfig,
  DayId,
  SlotId,
  FreeTime,
} from "./types";
import {
  DAYS,
  SLOTS,
  getSortedSubjects,
  getStudyPlanTitle,
  normalizeModuleSchedule,
  getModuleConflictList,
} from "./constants";

interface Step4Props {
  data: FormData;
  update: (key: keyof FormData, value: FormData[keyof FormData]) => void;
  studyPlan: StudyPlan | null;
  studyPlanLoading: boolean;
  studyPlanError: string;
  studyPlanOptions: StudyPlanOptions | null;
  studyPlanOptionsLoading: boolean;
  studyPlanOptionsError: string;
  mainTermSelection: TermSelection | null;
  enrolledTermSelection: TermSelection | null;
  setMainTermSelection: (value: TermSelection | null) => void;
  setEnrolledTermSelection: (value: TermSelection | null) => void;
  mainTermStudyPlan: StudyPlan | null;
  mainTermStudyPlanLoading: boolean;
  mainTermStudyPlanError: string;
  enrolledTermStudyPlan: StudyPlan | null;
  enrolledTermStudyPlanLoading: boolean;
  enrolledTermStudyPlanError: string;
}

export function Step4CurrentPlan({
  data,
  update,
  studyPlan,
  studyPlanLoading,
  studyPlanError,
  studyPlanOptions,
  studyPlanOptionsLoading,
  studyPlanOptionsError,
  mainTermSelection,
  enrolledTermSelection,
  setMainTermSelection,
  setEnrolledTermSelection,
  mainTermStudyPlan,
  mainTermStudyPlanLoading,
  mainTermStudyPlanError,
  enrolledTermStudyPlan,
  enrolledTermStudyPlanLoading,
  enrolledTermStudyPlanError,
}: Step4Props) {
  const [editingModuleCode, setEditingModuleCode] = useState<string | null>(
    null,
  );
  const defaultSubjects = getSortedSubjects(studyPlan?.subjects || []);
  const mainSubjects = getSortedSubjects(
    mainTermSelection
      ? (mainTermStudyPlan?.subjects ?? [])
      : (studyPlan?.subjects ?? []),
  );
  const enrolledSubjects = getSortedSubjects(
    enrolledTermSelection
      ? (enrolledTermStudyPlan?.subjects ?? [])
      : (studyPlan?.subjects ?? []),
  );
  const allSubjects = useMemo(() => {
    const merged = new Map<string, Subject>();
    [...defaultSubjects, ...mainSubjects, ...enrolledSubjects].forEach(
      (subject) => {
        merged.set(String(subject.subjectCode), subject);
      },
    );
    return Array.from(merged.values());
  }, [defaultSubjects, enrolledSubjects, mainSubjects]);
  const selectedModules = [data.mainModule, ...data.enrolledModules].filter(
    Boolean,
  );
  const moduleConflicts = useMemo(
    () => getModuleConflictList(data.moduleSlots, selectedModules),
    [data.moduleSlots, selectedModules],
  );
  const hasModuleConflicts = moduleConflicts.length > 0;

  const otherModulesAtSlot = useMemo(() => {
    if (!editingModuleCode) return {};
    const map: Record<string, string[]> = {};
    selectedModules
      .filter((code) => code !== editingModuleCode)
      .forEach((code) => {
        const sched = data.moduleSlots[code];
        if (!sched) return;
        DAYS.forEach((day) => {
          SLOTS.forEach((slot) => {
            if (sched[day.id]?.[slot.id]) {
              const key = `${day.id}-${slot.id}`;
              map[key] = map[key] ? [...map[key], code] : [code];
            }
          });
        });
      });
    return map;
  }, [editingModuleCode, selectedModules, data.moduleSlots]);

  const currentModuleConflicts = useMemo(() => {
    if (!editingModuleCode) return [];
    return moduleConflicts.filter((c) =>
      c.moduleCodes.includes(editingModuleCode),
    );
  }, [editingModuleCode, moduleConflicts]);

  const hasMissingModuleSlots = selectedModules.some((code) => {
    const schedule = data.moduleSlots[code];
    return (
      !schedule ||
      !DAYS.some((day) => Object.values(schedule[day.id]).some(Boolean))
    );
  });

  const toggleSubject = (subjectCode: string): void => {
    const current = data.enrolledModules;
    update(
      "enrolledModules",
      current.includes(subjectCode)
        ? current.filter((code) => code !== subjectCode)
        : [...current, subjectCode],
    );
  };

  const toggleModuleSlot = (
    moduleCode: string,
    dayId: DayId,
    slotId: SlotId,
  ): void => {
    const currentModuleSchedule =
      data.moduleSlots[moduleCode] ?? normalizeModuleSchedule();

    update("moduleSlots", {
      ...data.moduleSlots,
      [moduleCode]: {
        ...currentModuleSchedule,
        [dayId]: {
          ...currentModuleSchedule[dayId],
          [slotId]: !currentModuleSchedule[dayId][slotId],
        },
      },
    });
  };

  const selectAllModuleSlot = (moduleCode: string, slotId: SlotId): void => {
    const currentModuleSchedule =
      data.moduleSlots[moduleCode] ?? normalizeModuleSchedule();
    const allOn = DAYS.every((day) => currentModuleSchedule[day.id][slotId]);

    const updatedModuleSchedule = { ...currentModuleSchedule };
    DAYS.forEach((day) => {
      updatedModuleSchedule[day.id] = {
        ...updatedModuleSchedule[day.id],
        [slotId]: !allOn,
      };
    });

    update("moduleSlots", {
      ...data.moduleSlots,
      [moduleCode]: updatedModuleSchedule,
    });
  };

  const clearModuleSchedule = (moduleCode: string): void => {
    update("moduleSlots", {
      ...data.moduleSlots,
      [moduleCode]: normalizeModuleSchedule(),
    });
  };

  const getModuleSchedule = (moduleCode: string): FreeTime =>
    data.moduleSlots[moduleCode] ?? normalizeModuleSchedule();

  const getModuleSelectedCount = (moduleCode: string): number => {
    const moduleSchedule = getModuleSchedule(moduleCode);
    return DAYS.reduce(
      (acc, day) =>
        acc + Object.values(moduleSchedule[day.id]).filter(Boolean).length,
      0,
    );
  };

  const getModuleDaySummary = (moduleCode: string): string[] => {
    const moduleSchedule = getModuleSchedule(moduleCode);
    return DAYS.map((day) => {
      const pickedSlots = SLOTS.filter(
        (slot) => moduleSchedule[day.id][slot.id],
      ).map((slot) => slot.label);

      if (pickedSlots.length === 0) return null;
      return `${day.short}: ${pickedSlots.join(", ")}`;
    }).filter((line): line is string => Boolean(line));
  };

  const editingModuleInfo = editingModuleCode
    ? allSubjects.find((s) => s.subjectCode === editingModuleCode)
    : null;

  const parseAcademicYearLabel = (
    label: string,
    fallbackStart: number,
  ): { startYearTerm: number; endYearTerm: number } => {
    const match = label.match(/(\d{4})\D+(\d{4})/);
    if (match) {
      return {
        startYearTerm: Number(match[1]),
        endYearTerm: Number(match[2]),
      };
    }

    return {
      startYearTerm: fallbackStart,
      endYearTerm: fallbackStart + 1,
    };
  };

  const termOptions = useMemo(() => {
    const baseStartYear = studyPlanOptions?.startYear ?? 0;
    return (studyPlanOptions?.studyYears ?? []).flatMap((year) =>
      year.semesters.map((semester) => {
        const fallbackStartYear = baseStartYear
          ? baseStartYear + year.studyYearNo - 1
          : 0;
        const { startYearTerm, endYearTerm } = parseAcademicYearLabel(
          year.academicYearLabel,
          fallbackStartYear,
        );

        return {
          studyYearNo: year.studyYearNo,
          semesterNo: semester.semesterNo,
          startYearTerm,
          endYearTerm,
          displayLabel: `${year.displayName} - ${semester.displayName} (${year.academicYearLabel})`,
        };
      }),
    );
  }, [studyPlanOptions]);

  const getTermOptionKey = (option: TermSelection): string =>
    `${option.studyYearNo}-${option.semesterNo}-${option.startYearTerm}-${option.endYearTerm}`;

  const handleTermSelectionChange = (
    selectedKey: string,
    setter: (value: TermSelection | null) => void,
  ): void => {
    const selected = termOptions.find(
      (option) => getTermOptionKey(option) === selectedKey,
    );
    setter(selected ?? null);
  };

  const mainTermKey = mainTermSelection
    ? getTermOptionKey(mainTermSelection)
    : "current";
  const enrolledTermKey = enrolledTermSelection
    ? getTermOptionKey(enrolledTermSelection)
    : "current";

  const handleMainUseCurrentTerm = (): void => {
    setMainTermSelection(null);
    update("mainModule", "");
  };

  const handleMainUseCustomTerm = (): void => {
    if (!mainTermSelection && termOptions.length > 0) {
      setMainTermSelection(termOptions[0]);
      update("mainModule", "");
    }
  };

  const handleMainTermChange = (selectedKey: string): void => {
    handleTermSelectionChange(selectedKey, setMainTermSelection);
    update("mainModule", "");
  };

  const handleEnrolledUseCurrentTerm = (): void => {
    setEnrolledTermSelection(null);
    update("enrolledModules", []);
  };

  const handleEnrolledUseCustomTerm = (): void => {
    if (!enrolledTermSelection && termOptions.length > 0) {
      setEnrolledTermSelection(termOptions[0]);
      update("enrolledModules", []);
    }
  };

  const handleEnrolledTermChange = (selectedKey: string): void => {
    handleTermSelectionChange(selectedKey, setEnrolledTermSelection);
    update("enrolledModules", []);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {data.cohortCode && (
          <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
            Khóa {data.cohortCode}
          </span>
        )}
        {studyPlan?.termFullName && (
          <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full">
            {studyPlan.termFullName}
          </span>
        )}
        {studyPlan?.studyYearNo ? (
          <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full">
            Năm học {studyPlan.studyYearNo}
          </span>
        ) : null}
      </div>

      {!studyPlanLoading && !studyPlanError && studyPlan && (
        <div className="space-y-4">
          {studyPlanOptionsLoading ? (
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-500">
              Đang tải danh sách học kỳ...
            </div>
          ) : studyPlanOptionsError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-600">
              {studyPlanOptionsError}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Môn muốn học tập</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleMainUseCurrentTerm}
                    className={`text-xs font-semibold px-3.5 py-2 rounded-xl border-2 transition-all bg-white ${
                      !mainTermSelection
                        ? "border-accent text-gray-700"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    Học kỳ hiện tại
                  </button>
                  <button
                    type="button"
                    onClick={handleMainUseCustomTerm}
                    className={`text-xs font-semibold px-3.5 py-2 rounded-xl border-2 transition-all bg-white ${
                      mainTermSelection
                        ? "border-accent text-gray-700"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    Tùy chọn
                  </button>
                </div>
                {mainTermSelection && (
                  <select
                    value={mainTermKey}
                    onChange={(e) => handleMainTermChange(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-700 outline-none focus:border-accent transition-all"
                  >
                    {termOptions.map((option) => (
                      <option
                        key={getTermOptionKey(option)}
                        value={getTermOptionKey(option)}
                      >
                        {option.displayLabel}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Môn học trong học kỳ</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleEnrolledUseCurrentTerm}
                    className={`text-xs font-semibold px-3.5 py-2 rounded-xl border-2 transition-all bg-white ${
                      !enrolledTermSelection
                        ? "border-accent text-gray-700"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    Học kỳ hiện tại
                  </button>
                  <button
                    type="button"
                    onClick={handleEnrolledUseCustomTerm}
                    className={`text-xs font-semibold px-3.5 py-2 rounded-xl border-2 transition-all bg-white ${
                      enrolledTermSelection
                        ? "border-accent text-gray-700"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    Tùy chọn
                  </button>
                </div>
                {enrolledTermSelection && (
                  <select
                    value={enrolledTermKey}
                    onChange={(e) => handleEnrolledTermChange(e.target.value)}
                    className="w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-700 outline-none focus:border-accent transition-all"
                  >
                    {termOptions.map((option) => (
                      <option
                        key={getTermOptionKey(option)}
                        value={getTermOptionKey(option)}
                      >
                        {option.displayLabel}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {(mainTermSelection || enrolledTermSelection) && (
            <p className="text-xs font-medium text-gray-500">
              Đã bật chế độ tùy chọn học kỳ. Danh sách môn phía dưới đang được tải theo học kỳ bạn chọn.
            </p>
          )}
        </div>
      )}

      {studyPlanLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          Đang tải danh sách môn học hiện tại...
        </div>
      ) : studyPlanError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {studyPlanError}
        </div>
      ) : !studyPlan ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          Hãy quay lại step 1 để chọn khóa, sau đó hệ thống sẽ load môn học
          tương ứng.
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {studyPlan.curriculumName}
            </p>
            <p className="text-xs text-gray-500">
              {getStudyPlanTitle(studyPlan)}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Chọn môn muốn học tập
            </p>
            {mainTermStudyPlanLoading && mainTermSelection && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                Đang tải môn chính theo học kỳ đã chọn...
              </div>
            )}
            {mainTermStudyPlanError && mainTermSelection && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {mainTermStudyPlanError}
              </div>
            )}
            {mainSubjects.map((subject) => {
              const active = data.mainModule === subject.subjectCode;
              return (
                <button
                  key={subject.subjectId}
                  type="button"
                  onClick={() =>
                    update("mainModule", String(subject.subjectCode))
                  }
                  className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all flex items-center gap-4 bg-white ${active ? "border-accent" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
                >
                  <span
                    className={`text-xs font-bold w-16 py-1 text-center rounded-lg ${active ? "border border-accent text-accent bg-white" : "bg-gray-100 text-gray-500"}`}
                  >
                    {subject.subjectCode}
                  </span>
                  <span
                    className={`text-sm flex-1 ${active ? "text-gray-800 font-medium" : "text-gray-700"}`}
                  >
                    {subject.subjectName}
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                        active ? "border-accent" : "border-gray-200"
                      }`}
                    >
                      {active && (
                        <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Môn học trong học kỳ
            </p>
            {enrolledTermStudyPlanLoading && enrolledTermSelection && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                Đang tải môn học trong học kỳ đã chọn...              </div>
            )}
            {enrolledTermStudyPlanError && enrolledTermSelection && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                {enrolledTermStudyPlanError}
              </div>
            )}
            {enrolledSubjects
              .filter((subject) => subject.subjectCode !== data.mainModule)
              .map((subject) => {
                const active = data.enrolledModules.includes(
                  subject.subjectCode,
                );
                return (
                  <button
                    key={subject.subjectId}
                    type="button"
                    onClick={() => toggleSubject(String(subject.subjectCode))}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all flex items-center gap-3 bg-white ${active ? "border-accent" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}
                  >
                    <span className="text-xs font-bold w-16 py-1 text-center rounded-lg text-gray-500">
                      {subject.subjectCode}
                    </span>
                    <span
                      className={`text-sm flex-1 ${active ? "text-gray-800 font-medium" : "text-gray-700"}`}
                    >
                      {subject.subjectName}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                        active ? "border-accent" : "border-gray-200"
                      }`}
                    >
                      {active && (
                        <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                      )}
                    </div>
                  </button>
                );
              })}
          </div>

          {data.enrolledModules.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap bg-white border-2 border-accent rounded-xl px-4 py-2.5">
              <span className="text-xs text-accent font-semibold">
                Đã chọn:
              </span>
              {data.enrolledModules.map((code) => (
                <span
                  key={code}
                  className="text-xs font-bold text-accent border border-accent px-2 py-0.5 rounded-md"
                >
                  {code}
                </span>
              ))}
            </div>
          )}

          {selectedModules.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-widest">
                    Ca học theo từng môn
                  </p>
                  <p className="text-xs text-blue-500 mt-1">
                    Chọn ít nhất 1 ô thời gian (thứ + ca) cho mỗi môn.
                  </p>
                </div>
                <span className="text-xs font-semibold text-blue-700 bg-white border border-blue-200 px-2 py-1 rounded-full">
                  {selectedModules.length} môn
                </span>
              </div>

              <div className="space-y-2">
                {selectedModules.map((moduleCode) => {
                  const moduleInfo = allSubjects.find(
                    (s) => s.subjectCode === moduleCode,
                  );
                  const selectedCount = getModuleSelectedCount(moduleCode);
                  const daySummaries = getModuleDaySummary(moduleCode);
                  const moduleHasConflict = moduleConflicts.some((c) =>
                    c.moduleCodes.includes(moduleCode),
                  );

                  return (
                    <div
                      key={moduleCode}
                      className={`bg-white rounded-xl border p-3 transition-all ${
                        moduleHasConflict
                          ? "border-red-200 ring-1 ring-red-100"
                          : "border-blue-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                moduleCode === data.mainModule
                                  ? "bg-blue-600 text-white"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {moduleCode === data.mainModule
                                ? "Môn muốn học"
                                : "Môn trong kỳ"}{" "}
                              · {moduleCode}
                            </span>
                            <span className="text-xs text-gray-700 truncate">
                              {moduleInfo?.subjectName || "Môn đã chọn"}
                            </span>
                            {moduleHasConflict && (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                                <AlertTriangle size={12} />
                                Trùng ca học
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1">
                            {selectedCount > 0
                              ? `Đã chọn ${selectedCount} ô thời gian`
                              : "Chưa chọn thời gian"}
                          </p>
                          {daySummaries.length > 0 && (
                            <p className="text-[11px] text-blue-600 mt-1 line-clamp-2">
                              {daySummaries.join(" | ")}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingModuleCode(moduleCode)}
                          className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                            moduleHasConflict
                              ? "border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
                              : "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                          }`}
                        >
                          {selectedCount > 0
                            ? "Sửa thời gian môn học"
                            : "Thêm thời gian môn học"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasModuleConflicts && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-red-800">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Phát hiện trùng ca học giữa các môn:</span>
                  </div>
                  <ul className="space-y-1 pl-6 list-disc">
                    {moduleConflicts.map((c) => (
                      <li key={`conflict-${c.dayId}-${c.slotId}`}>
                        <span className="font-semibold">
                          {c.dayLabel} ({c.slotLabel})
                        </span>
                        : Trùng ca giữa môn{" "}
                        <span className="font-bold text-red-800">
                          {c.moduleCodes.join(", ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-red-600 font-medium">
                    Vui lòng điều chỉnh lại thời gian để không có 2 môn học trùng cùng một ca trước khi tiếp tục.
                  </p>
                </div>
              )}

              {hasMissingModuleSlots && (
                <p className="text-xs text-red-500">
                  Bạn cần chọn ít nhất 1 ô thời gian (thứ + ca) cho mỗi môn để
                  tiếp tục.
                </p>
              )}
            </div>
          )}

          {editingModuleCode && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setEditingModuleCode(null)}
              ></div>
              <div className="relative w-full max-w-3xl max-h-[85vh] overflow-auto rounded-2xl border border-blue-100 bg-white shadow-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest">
                      Cập nhật thời gian môn học
                    </p>
                    <h3 className="text-base font-bold text-gray-800 mt-1">
                      {editingModuleCode} -{" "}
                      {editingModuleInfo?.subjectName || "Môn đã chọn"}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Chọn lịch chi tiết theo thứ và ca cho môn này.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingModuleCode(null)}
                    className="text-sm font-semibold text-gray-500 hover:text-gray-700"
                  >
                    Đóng
                  </button>
                </div>

                {currentModuleConflicts.length > 0 && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-red-800">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>Môn này đang có ca học bị trùng với môn khác:</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {currentModuleConflicts.map((c) => (
                        <li key={`modal-conflict-${c.dayId}-${c.slotId}`}>
                          <span className="font-semibold">
                            {c.dayLabel} ({c.slotLabel})
                          </span>
                          : Trùng với môn{" "}
                          <span className="font-bold">
                            {c.moduleCodes
                              .filter((code) => code !== editingModuleCode)
                              .join(", ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="overflow-x-auto -mx-1">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr>
                        <th className="w-16 pb-3"></th>
                        {SLOTS.map((slot: SlotConfig) => (
                          <th key={slot.id} className="pb-3 text-center px-2">
                            <button
                              type="button"
                              onClick={() =>
                                selectAllModuleSlot(editingModuleCode, slot.id)
                              }
                              className="flex flex-col items-center gap-1 mx-auto"
                              title={`Chọn tất cả ${slot.label}`}
                            >
                              <span className="text-xs font-semibold text-gray-700">
                                {slot.label}
                              </span>
                              <span className="text-xs text-gray-400">
                                {slot.time}
                              </span>
                            </button>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DAYS.map((day: DayConfig, dayIdx: number) => {
                        const moduleSchedule =
                          getModuleSchedule(editingModuleCode);
                        const daySlots = moduleSchedule[day.id];
                        const dayCount =
                          Object.values(daySlots).filter(Boolean).length;
                        const isWeekend = day.id >= 5;

                        return (
                          <tr
                            key={`modal-${editingModuleCode}-${day.id}`}
                            className={dayIdx % 2 === 0 ? "bg-gray-50" : ""}
                          >
                            <td className="py-2 pr-3">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-sm font-semibold ${isWeekend ? "text-blue-500" : "text-gray-700"}`}
                                >
                                  {day.short}
                                </span>
                                {dayCount > 0 && (
                                  <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                                    {dayCount}
                                  </span>
                                )}
                              </div>
                            </td>
                            {SLOTS.map((slot: SlotConfig) => {
                              const active = daySlots[slot.id];
                              const slotKey = `${day.id}-${slot.id}`;
                              const otherCodes = otherModulesAtSlot[slotKey];
                              const isConflicting =
                                active &&
                                Boolean(otherCodes && otherCodes.length > 0);
                              const otherOccupied =
                                !active &&
                                Boolean(otherCodes && otherCodes.length > 0);

                              return (
                                <td
                                  key={`modal-${editingModuleCode}-${day.id}-${slot.id}`}
                                  className="py-2 px-1 text-center"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleModuleSlot(
                                        editingModuleCode,
                                        day.id,
                                        slot.id,
                                      )
                                    }
                                    title={
                                      isConflicting
                                        ? `Trùng ca với môn ${otherCodes.join(", ")}`
                                        : otherOccupied
                                          ? `Đang chọn ở môn ${otherCodes.join(", ")}`
                                          : undefined
                                    }
                                    className={`w-full rounded-lg border-2 text-xs font-semibold py-2 transition-all ${
                                      isConflicting
                                        ? "border-red-500 bg-red-50 text-red-600 font-bold hover:bg-red-100 ring-2 ring-red-200"
                                        : active
                                          ? "border-accent text-accent bg-white"
                                          : otherOccupied
                                            ? "border-dashed border-amber-300 bg-amber-50/50 text-amber-700 hover:border-amber-400"
                                            : "border-gray-200 text-gray-400 hover:border-accent/40 bg-white"
                                    }`}
                                  >
                                    {isConflicting
                                      ? "✕ Trùng"
                                      : active
                                        ? "✓"
                                        : otherOccupied
                                          ? `[${otherCodes[0]}]`
                                          : "—"}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => clearModuleSchedule(editingModuleCode)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100"
                  >
                    Xóa toàn bộ thời gian môn này
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingModuleCode(null)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    Xong
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400">
            Tổng số môn khả dụng: {allSubjects.length}
          </div>
        </>
      )}
    </div>
  );
}
