import { FormData, StudyMode, StudyPlan } from "./types";
import { DAYS, LEARNING_LEVELS, MODES, SLOTS, getSubjectLabel } from "./constants";

interface Step7Props {
  data: FormData;
  studyPlan: StudyPlan | null;
}

export function Step7({ data, studyPlan }: Step7Props) {
  const goalObj = LEARNING_LEVELS.find((g) => g.key === data.studyGoal);
  const modeObj = data.studyMode ? MODES[data.studyMode as StudyMode] : null;
  const allMods = [data.mainModule, ...data.enrolledModules].filter(Boolean);

  const selectedModules = [data.mainModule, ...data.enrolledModules].filter(
    Boolean,
  );
  const moduleScheduleSummary = selectedModules
    .map((code) => {
      const moduleSchedule = data.moduleSlots[code];
      if (!moduleSchedule) return null;

      const daySummaries = DAYS.map((day) => {
        const pickedSlots = SLOTS.filter(
          (slot) => moduleSchedule[day.id][slot.id],
        ).map((slot) => slot.label);

        if (pickedSlots.length === 0) return null;
        return `${day.short}: ${pickedSlots.join(", ")}`;
      }).filter((line): line is string => Boolean(line));

      return { code, daySummaries };
    })
    .filter((item): item is { code: string; daySummaries: string[] } =>
      Boolean(item),
    );

  const selectedMainSubject = studyPlan?.subjects?.find(
    (subject) => subject.subjectCode === data.mainModule,
  );

  const topDays = DAYS.filter((d) =>
    Object.values(data.freeTime[d.id]).some(Boolean),
  );

  const reviewRows: [string, string][] = [
    [
      "Giới tính",
      data.gender === "M" ? "Nam" : data.gender === "F" ? "Nữ" : "—",
    ],
    ["Khu vực", data.region || "—"],
    ["Khóa hiện tại", data.cohortCode || "—"],
    [
      "Môn chính",
      data.mainModule
        ? selectedMainSubject
          ? getSubjectLabel(selectedMainSubject)
          : data.mainModule
        : "—",
    ],
    ["Điểm TB", `${data.avgScore}/10`],
    [
      "Tín chỉ tích lũy",
      data.studiedCredits ? `${data.studiedCredits} tín chỉ` : "—",
    ],
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-accent bg-white p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 truncate">
              {data.fullName || "—"}
            </p>
            <p className="text-xs text-gray-500">
              MSSV: {data.studentId || "—"}
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-semibold px-2 py-1 rounded-lg border border-accent text-accent">
              {goalObj?.title}
            </span>
            {modeObj && (
              <p className="text-xs text-gray-500 mt-1">{modeObj.label}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0 text-sm border-t border-gray-100 pt-3">
          {reviewRows.map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between py-1.5 border-b border-gray-50 gap-2"
            >
              <span className="text-gray-500 shrink-0">{k}</span>
              <span className="font-medium text-right truncate text-gray-700">
                {v}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border-2 border-gray-100 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Môn đang học
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.mainModule && (
              <span className="text-xs font-bold text-accent border border-accent px-2 py-0.5 rounded-md">
                ★ {data.mainModule}
              </span>
            )}
            {data.enrolledModules.map((m) => (
              <span
                key={m}
                className="text-xs font-medium text-gray-700 border border-gray-200 px-2 py-0.5 rounded-md"
              >
                {m}
              </span>
            ))}
            {allMods.length === 0 && (
              <span className="text-xs text-gray-400">Chưa chọn</span>
            )}
          </div>
          {studyPlan?.termFullName && (
            <p className="text-[11px] text-gray-500 mt-2">
              {studyPlan.termFullName}
            </p>
          )}

          {moduleScheduleSummary.length > 0 && (
            <div className="mt-3 space-y-1">
              {moduleScheduleSummary.slice(0, 3).map((item) => (
                <p key={item.code} className="text-[11px] text-gray-600">
                  {item.code}: {item.daySummaries.join(" | ") || "Chưa chọn"}
                </p>
              ))}
              {moduleScheduleSummary.length > 3 && (
                <p className="text-[11px] text-gray-400">
                  +{moduleScheduleSummary.length - 3} môn khác
                </p>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border-2 border-gray-100 rounded-xl p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Thời gian rảnh
          </p>
          {topDays.slice(0, 5).map((d) => {
            const ft = data.freeTime[d.id];
            const labels = [
              ft.ca1 || ft.ca2 ? "Sáng" : null,
              ft.ca3 || ft.ca4 ? "Chiều" : null,
              ft.ca5 || ft.ca6 ? "Tối" : null,
            ].filter(Boolean);
            return (
              <div key={d.id} className="flex items-center gap-1.5 mb-1">
                <span className="text-xs font-medium text-gray-600 w-6">
                  {d.short}
                </span>
                <span className="text-xs text-gray-500">{labels.join(", ")}</span>
              </div>
            );
          })}
          {topDays.length > 5 && (
            <p className="text-xs text-gray-400">+{topDays.length - 5} ngày khác</p>
          )}
          {topDays.length === 0 && (
            <p className="text-xs text-gray-400">Chưa chọn</p>
          )}
        </div>
      </div>
    </div>
  );
}
