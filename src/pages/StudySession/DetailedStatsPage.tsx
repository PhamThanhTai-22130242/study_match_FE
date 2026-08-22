import React, { useEffect, useState } from "react";
import {
  Clock,
  Award,
  TrendingUp,
  BookOpen,
  PieChart as PieIcon,
  Calendar,
  Loader2,
  AlertCircle
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { getDetailedUserStats } from "../../services/StudySessionService";
import type { DetailedUserStatsResponse } from "./types";
import stastiticStudyImg from "../../assets/img/stastitic-study.png";

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0 phút";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  return `${minutes} phút`;
}

export default function DetailedStatsPage() {
  const [data, setData] = useState<DetailedUserStatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    async function fetchStats() {
      const userId = Number(localStorage.getItem("userId"));
      if (!userId) {
        setError("Không tìm thấy thông tin đăng nhập. Vui lòng đăng nhập lại.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await getDetailedUserStats(userId);
        if (!mounted) return;
        if (res.data) {
          setData(res.data);
        } else {
          setError("Không thể tải dữ liệu thống kê.");
        }
      } catch (err) {
        if (mounted) {
          setError("Có lỗi xảy ra khi kết nối máy chủ.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    fetchStats();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-blue-50/30 px-6 py-8">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-md animate-pulse">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm font-medium text-gray-600">
            Đang tổng hợp dữ liệu học tập...
          </span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-blue-50/30 px-6 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto w-full max-w-7xl">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error || "Không có dữ liệu thống kê để hiển thị."}
          </div>
        </div>
      </div>
    );
  }

  const pieData = [
    { name: "Đã tham gia", value: data.joinedCount, color: "#10b981" },
    { name: "Vắng mặt", value: data.absentCount, color: "#64748b" },
    { name: "Đã từ chối", value: data.declinedCount, color: "#f43f5e" },
    { name: "Chờ phản hồi", value: data.pendingCount, color: "#3b82f6" },
  ].filter((item) => item.value > 0);

  const lineData = data.dailyTrends.map((trend) => ({
    dateStr: new Date(trend.date).toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "numeric",
    }),
    "Số phút học": Math.round(trend.durationSeconds / 60),
    "Số buổi": trend.sessionCount,
  }));

  const barData = data.subjectStats.map((sub) => ({
    subject: sub.subjectName,
    "Số phút": Math.round(sub.durationSeconds / 60),
    "Số buổi": sub.sessionCount,
  }));

  const totalSessions =
    data.joinedCount + data.absentCount + data.declinedCount + data.pendingCount;

  return (
    <main className="min-h-screen bg-blue-50/30 px-6 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-7xl flex flex-col gap-5">
        {/* Page Header */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <img
                src={stastiticStudyImg}
                alt="Thống kê học tập"
                className="h-28 w-auto object-contain mix-blend-multiply"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-800">Thống kê hoạt động học tập</h1>
                <p className="text-sm text-gray-500">
                  Phân tích thời gian tích lũy, tỷ lệ chuyên cần và cơ cấu môn học học tập của bạn
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Summary Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="text-xs text-gray-500 block font-medium">Thời gian học tích lũy</span>
            <span className="text-lg font-bold text-gray-800 mt-1 block">
              {formatDuration(data.totalStudyDurationSeconds)}
            </span>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="text-xs text-gray-500 block font-medium">Tỷ lệ chuyên cần</span>
            <span className="text-lg font-bold text-gray-800 mt-1 block">
              {data.attendanceRate}%
              <span className="text-xs text-gray-400 font-normal ml-1">(Có mặt/Vắng)</span>
            </span>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <span className="text-xs text-gray-500 block font-medium">Tổng số buổi học</span>
            <span className="text-lg font-bold text-gray-800 mt-1 block">
              {totalSessions} buổi học
            </span>
          </div>
        </div>


        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Charts Col 1: Attendance Breakdown */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-5 flex flex-col justify-between">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              Cơ cấu Trạng thái Tham gia
            </h3>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center text-xs text-gray-400 py-10 my-auto">
                Chưa có dữ liệu buổi học nào hoàn thành
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2 my-auto">
                <div className="h-48 w-48 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value) => `${value} buổi`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-gray-800">{data.joinedCount}</span>
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">Tham gia</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full max-w-[200px]">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-gray-600 font-medium">{item.name}</span>
                      </div>
                      <span className="text-gray-800 font-bold">{item.value} buổi</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Charts Col 2: 30-Day Trend */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-7 flex flex-col justify-between">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              Thời gian học tập 30 ngày qua
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="dateStr" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <RechartsTooltip
                    formatter={(value, name) => [
                      name === "Số phút học" ? `${value} phút` : `${value} buổi`,
                      name,
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="Số phút học"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMinutes)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>


      </div>
    </main>
  );
}
