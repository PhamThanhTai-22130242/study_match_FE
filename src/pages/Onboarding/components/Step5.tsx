import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { DayId, FormData, SlotId } from "./types";
import {
  DAYS,
  SLOTS,
  getOccupiedStudySlots,
  getFreeTimeConflictList,
} from "./constants";

interface Step5Props {
  data: FormData;
  update: (key: keyof FormData, value: FormData[keyof FormData]) => void;
}

export function Step5({ data, update }: Step5Props) {
  const selectedModules = useMemo(
    () => [data.mainModule, ...data.enrolledModules].filter(Boolean),
    [data.mainModule, data.enrolledModules],
  );

  const occupiedStudySlots = useMemo(
    () => getOccupiedStudySlots(data.moduleSlots, selectedModules),
    [data.moduleSlots, selectedModules],
  );

  const freeTimeConflicts = useMemo(
    () =>
      getFreeTimeConflictList(
        data.moduleSlots,
        selectedModules,
        data.freeTime,
      ),
    [data.moduleSlots, selectedModules, data.freeTime],
  );

  const hasConflicts = freeTimeConflicts.length > 0;

  const toggle = (dayId: DayId, slotId: SlotId): void => {
    update("freeTime", {
      ...data.freeTime,
      [dayId]: {
        ...data.freeTime[dayId],
        [slotId]: !data.freeTime[dayId][slotId],
      },
    });
  };

  const selectAll = (slotId: SlotId): void => {
    const allOn = DAYS.every((d) => data.freeTime[d.id][slotId]);
    const updated = { ...data.freeTime };
    DAYS.forEach((d) => {
      const isOccupied = Boolean(occupiedStudySlots[`${d.id}-${slotId}`]);
      if (allOn) {
        updated[d.id] = { ...updated[d.id], [slotId]: false };
      } else {
        if (!isOccupied) {
          updated[d.id] = { ...updated[d.id], [slotId]: true };
        }
      }
    });
    update("freeTime", updated);
  };

  const totalSelected = DAYS.reduce(
    (acc, d) => acc + Object.values(data.freeTime[d.id]).filter(Boolean).length,
    0,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Chọn các khung giờ rảnh trong tuần để hệ thống ghép bạn học cùng lịch.
        </p>
        {totalSelected > 0 && (
          <span className="text-xs font-semibold text-accent border border-accent px-2 py-1 rounded-full whitespace-nowrap bg-white">
            {totalSelected} slot đã chọn
          </span>
        )}
      </div>

      {hasConflicts && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 space-y-2">
          <div className="flex items-center gap-2 font-bold text-red-800">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Thời gian rảnh đang bị trùng với ca học:</span>
          </div>
          <ul className="space-y-1 pl-6 list-disc">
            {freeTimeConflicts.map((c) => (
              <li key={`free-conflict-${c.dayId}-${c.slotId}`}>
                <span className="font-semibold">
                  {c.dayLabel} ({c.slotLabel})
                </span>
                : Đã có lịch học môn{" "}
                <span className="font-bold text-red-800">
                  {c.moduleCodes.join(", ")}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-red-600 font-medium">
            Vui lòng bỏ chọn các khung giờ bị trùng lịch học để có thể tiếp tục.
          </p>
        </div>
      )}

      <div className="overflow-x-auto -mx-1">
        <table className="w-full min-w-max">
          <thead>
            <tr>
              <th className="w-16 pb-3"></th>
              {SLOTS.map((s) => (
                <th key={s.id} className="pb-3 text-center px-2">
                  <button
                    type="button"
                    onClick={() => selectAll(s.id)}
                    className="flex flex-col items-center gap-1 mx-auto group"
                    title={`Chọn tất cả các ô còn trống ở ${s.label}`}
                  >
                    <span className="text-xs font-semibold text-gray-700 group-hover:text-accent">
                      {s.label}
                    </span>
                    <span className="text-xs text-gray-400">{s.time}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((d, di) => {
              const daySlots = data.freeTime[d.id];
              const dayCount = Object.values(daySlots).filter(Boolean).length;
              return (
                <tr
                  key={d.id}
                  className={di % 2 === 0 ? "bg-gray-50 rounded-xl" : ""}
                >
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-gray-700">
                        {d.short}
                      </span>
                      {dayCount > 0 && (
                        <span className="w-4 h-4 rounded-full border border-accent text-accent text-xs flex items-center justify-center font-bold bg-white">
                          {dayCount}
                        </span>
                      )}
                    </div>
                  </td>
                  {SLOTS.map((s) => {
                    const active = daySlots[s.id];
                    const occupiedCodes =
                      occupiedStudySlots[`${d.id}-${s.id}`];
                    const hasStudyClass = Boolean(
                      occupiedCodes && occupiedCodes.length > 0,
                    );
                    const isConflict = active && hasStudyClass;

                    return (
                      <td key={s.id} className="py-2 px-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggle(d.id, s.id)}
                          title={
                            isConflict
                              ? `Trùng lịch học môn ${occupiedCodes.join(", ")}`
                              : hasStudyClass
                                ? `Đã có ca học môn ${occupiedCodes.join(", ")}`
                                : undefined
                          }
                          className={`w-full py-2.5 rounded-xl border-2 text-xs font-semibold transition-all duration-100 min-h-[42px] flex items-center justify-center ${
                            isConflict
                              ? "border-red-500 bg-red-50 text-red-600 font-bold hover:bg-red-100 ring-2 ring-red-200"
                              : active
                                ? "border-accent text-accent bg-white shadow-sm"
                                : hasStudyClass
                                  ? "border-dashed border-gray-300 bg-gray-100/70 text-gray-500 hover:border-gray-400"
                                  : "border-gray-200 text-gray-300 hover:border-accent/40 bg-white"
                          }`}
                        >
                          {isConflict ? (
                            <span className="flex flex-col items-center justify-center leading-tight">
                              <span>✕ Trùng</span>
                              <span className="text-[9px] font-normal text-red-500 truncate max-w-[65px]">
                                {occupiedCodes.join(", ")}
                              </span>
                            </span>
                          ) : active ? (
                            "✓"
                          ) : hasStudyClass ? (
                            <span className="flex flex-col items-center justify-center leading-tight">
                              <span className="text-[10px] text-gray-500 font-medium truncate max-w-[65px]">
                                Lịch học
                              </span>
                              <span className="text-[9px] text-gray-400 font-normal truncate max-w-[65px]">
                                {occupiedCodes.join(", ")}
                              </span>
                            </span>
                          ) : (
                            "—"
                          )}
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

      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md border-2 border-accent bg-white" />
          <span>Thời gian rảnh</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md border-2 border-dashed border-gray-300 bg-gray-100/70" />
          <span>Ca học môn đã chọn</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md border-2 border-red-500 bg-red-50" />
          <span className="text-red-600 font-medium">Trùng ca học (cần bỏ chọn)</span>
        </div>
      </div>
    </div>
  );
}
