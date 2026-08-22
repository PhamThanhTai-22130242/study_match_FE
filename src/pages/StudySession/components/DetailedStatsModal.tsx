import React, { useEffect, useState } from "react";
import {
  X,
  Clock,
  Award,
  TrendingUp,
  BookOpen,
  PieChart as PieIcon,
  Calendar,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { getDetailedUserStats } from "../../../services/StudySessionService";
import type { DetailedUserStatsResponse } from "../types";

interface DetailedStatsModalProps {
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0 phút";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  return `${minutes} phút`;
}

export default function DetailedStatsModal({ onClose }: DetailedStatsModalProps) {
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
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-950/40 backdrop-blur-sm px-4">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white px-8 py-6 shadow-2xl">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm font-semibold text-gray-700">
            Đang tổng hợp dữ liệu học tập...
          </span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-950/40 backdrop-blur-sm px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4 border-b border-gray-150 pb-3">
            <h3 className="text-md font-bold text-gray-800">Thống Kê Học Tập</h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-700 font-medium">
            {error || "Có lỗi xảy ra khi tải dữ liệu."}
          </div>
        </div>
      </div>
    );
  }

  // Chuẩn bị dữ liệu biểu đồ tròn (Trạng thái tham gia)
  const pieData = [
    { name: "Đã tham gia", value: data.joinedCount, color: "#10b981" },
    { name: "Vắng mặt", value: data.absentCount, color: "#64748b" },
    { name: "Đã từ chối", value: data.declinedCount, color: "#f43f5e" },
    { name: "Chờ phản hồi", value: data.pendingCount, color: "#3b82f6" },
  ].filter((item) => item.value > 0);

  // Chuẩn bị dữ liệu xu hướng học 30 ngày qua (quy đổi ra phút)
  const lineData = data.dailyTrends.map((trend) => ({
    dateStr: new Date(trend.date).toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "numeric",
    }),
    "Số phút học": Math.round(trend.durationSeconds / 60),
    "Số buổi": trend.sessionCount,
  }));

  // Chuẩn bị dữ liệu phân bố theo môn học (quy đổi ra phút)
  const barData = data.subjectStats.map((sub) => ({
    subject: sub.subjectName,
    "Số phút": Math.round(sub.durationSeconds / 60),
    "Số buổi": sub.sessionCount,
  }));

  const totalSessions =
    data.joinedCount + data.absentCount + data.declinedCount + data.pendingCount;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-950/40 backdrop-blur-sm px-4 py-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl flex flex-col max-h-[90vh] bg-slate-50 rounded-2xl border border-gray-100 shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-snug flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Báo Cáo Học Tập Chi Tiết
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Thống kê tổng quan dựa trên lịch sử học tập cá nhân và nhóm của bạn
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Total Duration */}
            <div className="rounded-xl border border-gray-150 bg-white p-5 shadow-sm">
              <span className="text-xs text-gray-500 block font-medium">Thời gian học tích lũy</span>
              <span className="text-lg font-bold text-gray-800 mt-1 block">
                {formatDuration(data.totalStudyDurationSeconds)}
              </span>
            </div>

            {/* Attendance Rate */}
            <div className="rounded-xl border border-gray-150 bg-white p-5 shadow-sm">
              <span className="text-xs text-gray-500 block font-medium">Tỷ lệ chuyên cần</span>
              <span className="text-lg font-bold text-gray-800 mt-1 block flex items-baseline gap-1">
                {data.attendanceRate}%
                <span className="text-[10px] text-gray-400 font-normal">
                  (Có mặt/Vắng)
                </span>
              </span>
            </div>

            {/* Total sessions */}
            <div className="rounded-xl border border-gray-150 bg-white p-5 shadow-sm">
              <span className="text-xs text-gray-500 block font-medium">Tổng số buổi học</span>
              <span className="text-lg font-bold text-gray-800 mt-1 block">
                {totalSessions} buổi học
              </span>
            </div>
          </div>


          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Section 1: Attendance breakdown */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-5 flex flex-col justify-between">
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-emerald-600" />
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
                          innerRadius={50}
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
                      <span className="text-2xl font-black text-gray-800">
                        {data.joinedCount}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold">
                        Tham gia
                      </span>
                    </div>
                  </div>
                  {/* Legend Custom */}
                  <div className="flex flex-col gap-2 w-full max-w-[200px]">
                    {pieData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-gray-600 font-medium">{item.name}</span>
                        </div>
                        <span className="text-gray-800 font-bold">{item.value} buổi</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: 30-Day Trend */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-7 flex flex-col justify-between">
              <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                Thời gian học tập 30 ngày qua (Phút)
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

        <div className="sticky bottom-0 z-10 border-t border-gray-100 bg-white px-6 py-4 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="rounded-xl bg-gray-100 hover:bg-gray-200 px-5 py-2 text-xs font-bold text-gray-600 transition-colors"
          >
            Đóng báo cáo
          </button>
        </div>
      </div>
    </div>
  );
}
