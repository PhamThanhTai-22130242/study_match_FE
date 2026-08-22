import { FormData, Cohort } from "./types";
import { getCohortLabel } from "./constants";
import { FieldLabel, TInput } from "./Shared";

interface Step1Props {
  data: FormData;
  update: (key: keyof FormData, value: FormData[keyof FormData]) => void;
  cohorts: Cohort[];
  cohortsLoading: boolean;
  cohortsError: string;
  onRetry: () => void;
  studentIdError?: string;
  studentIdChecking?: boolean;
}

export function Step1({
  data,
  update,
  cohorts,
  cohortsLoading,
  cohortsError,
  onRetry,
  studentIdError,
  studentIdChecking,
}: Step1Props) {
  const sortedCohorts = [...cohorts].sort(
    (a, b) =>
      b.startAcademicYear - a.startAcademicYear ||
      Number(b.cohortCode) - Number(a.cohortCode),
  );

  return (
    <div className="space-y-5">
      <div>
        <FieldLabel>Mã số sinh viên</FieldLabel>
        <TInput
          value={data.studentId}
          onChange={(v) => update("studentId", v.replace(/\D/g, ""))}
          placeholder="2151..."
          type="tel"
          inputMode="numeric"
          error={!!studentIdError}
        />
        {studentIdChecking && (
          <p className="text-xs text-blue-500 font-medium mt-1.5 flex items-center gap-1">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            Đang kiểm tra mã sinh viên...
          </p>
        )}
        {!studentIdChecking && studentIdError && (
          <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1">
            {studentIdError}
          </p>
        )}
      </div>

      <div>
        <FieldLabel>Khóa hiện tại</FieldLabel>

        {cohortsLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
            Đang tải danh sách khóa học...
          </div>
        ) : cohortsError ? (
          <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">{cohortsError}</p>
            <button
              type="button"
              onClick={onRetry}
              className="text-xs font-semibold text-red-700 underline underline-offset-2"
            >
              Thử tải lại
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {sortedCohorts.map((cohort) => {
              const active = data.cohortCode === String(cohort.cohortCode);
              return (
                <button
                  key={cohort.cohortId}
                  type="button"
                  onClick={() =>
                    update("cohortCode", String(cohort.cohortCode))
                  }
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-150 bg-white ${
                    active
                      ? "border-accent"
                      : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-700">
                          {getCohortLabel(cohort)}
                        </span>
                        {active && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-accent text-accent">
                            Đã chọn
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                        Mã khóa: {cohort.cohortCode}
                      </p>
                    </div>
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
        )}
      </div>
    </div>
  );
}
