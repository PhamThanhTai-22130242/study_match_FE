import { FormData } from "./types";
import { FieldLabel, TInput } from "./Shared";

interface Step6Props {
  data: FormData;
  update: (key: keyof FormData, value: FormData[keyof FormData]) => void;
}

function getScoreLabel(score: number): string {
  if (score < 5.0) return "Yếu";
  if (score < 6.5) return "Trung bình";
  if (score < 8.0) return "Khá";
  if (score < 9.0) return "Giỏi";
  return "Xuất sắc";
}

export function Step6({ data, update }: Step6Props) {
  const score = data.avgScore;
  const rawCredits = String(data.studiedCredits || "").trim();
  const creditsNum = Number(rawCredits);
  const isInvalidCredits =
    rawCredits !== "" &&
    (!Number.isInteger(creditsNum) || creditsNum < 1 || creditsNum > 200);

  return (
    <div className="space-y-6">
      <div>
        <FieldLabel>Điểm trung bình hiện tại</FieldLabel>

        <div className="flex items-center gap-4 mt-3">
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={score}
            onChange={(e) => update("avgScore", Number(e.target.value))}
            className="flex-1 accent-accent"
          />

          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-gray-800">
              {score.toFixed(1)}
            </div>
            <div className="text-xs font-semibold text-gray-500">
              {getScoreLabel(score)}
            </div>
          </div>
        </div>
      </div>

      <div>
        <FieldLabel>Số tín chỉ đã tích lũy (1 – 200)</FieldLabel>
        <TInput
          value={data.studiedCredits}
          onChange={(v) => update("studiedCredits", v)}
          placeholder="Ví dụ: 60 (từ 1 đến 200)"
          type="number"
          min={1}
          max={200}
          error={isInvalidCredits}
        />
        {isInvalidCredits ? (
          <p className="text-xs text-red-500 mt-1.5 font-medium">
            Số tín chỉ tích lũy phải là số nguyên nằm trong khoảng từ 1 đến 200.
          </p>
        ) : (
          <p className="text-xs text-gray-400 mt-1.5">
            Nhập tổng số tín chỉ bạn đã hoàn thành (giá trị từ 1 đến 200).
          </p>
        )}
      </div>
    </div>
  );
}
