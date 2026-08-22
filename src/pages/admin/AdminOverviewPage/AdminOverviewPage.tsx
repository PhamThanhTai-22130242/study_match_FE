import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import { RefreshCw } from "lucide-react";
import WebSocketManager from "../../../socket/WebSocketManager";
import {
  getAdminOverviewData,
  AdminOverviewResponse,
} from "../../../services/AdminOverviewService";
import emptyMessageImage from "../../../assets/img/no-mess.png";
import emptyFriendImage from "../../../assets/img/no-friend.png";
import emptyPostImage from "../../../assets/img/no-post.png";
import emptyGroupImage from "../../../assets/img/group.png";
import emptyReportImage from "../../../assets/img/report.png";

function OverviewEmptyState({
  title,
  image,
}: {
  title: string;
  image: string;
}) {
  return (
    <div className="flex h-64 flex-col items-center justify-center px-4 text-center">
      <img src={image} alt="" className="h-28 w-auto object-contain" />
      <p className="mt-3 text-sm font-semibold text-slate-700">{title}</p>
    </div>
  );
}

const CHART_COLORS = {
  primary: "#3b82f6",
  secondary: "#64748b",
  teal: "#0d9488",
  indigo: "#4f46e5",
  amber: "#d97706",
  rose: "#e11d48",
  emerald: "#059669",
};

export default function AdminOverviewPage() {

  const [timePreset, setTimePreset] = useState<"THIS_WEEK" | "THIS_MONTH" | "ALL_TIME" | "CUSTOM">("THIS_WEEK");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [onlineCount, setOnlineCount] = useState<number>(0);

  const [apiData, setApiData] = useState<AdminOverviewResponse | null>(null);

  const formatDateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const selectCustomTimePreset = () => {
    const today = new Date();
    const sixMonthsAgo = new Date(
      today.getFullYear(),
      today.getMonth() - 6,
      1
    );
    const lastDayOfTargetMonth = new Date(
      sixMonthsAgo.getFullYear(),
      sixMonthsAgo.getMonth() + 1,
      0
    ).getDate();
    sixMonthsAgo.setDate(Math.min(today.getDate(), lastDayOfTargetMonth));

    setStartDate(formatDateInput(sixMonthsAgo));
    setEndDate(formatDateInput(today));
    setTimePreset("CUSTOM");
  };

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);

    getAdminOverviewData({
      timePreset,
      startDate: timePreset === "CUSTOM" ? startDate : undefined,
      endDate: timePreset === "CUSTOM" ? endDate : undefined,
    })
      .then((res) => {
        if (res.success && res.data) {
          setApiData(res.data);
          if (typeof res.data.onlineUsers === "number") {
            setOnlineCount(res.data.onlineUsers);
          }
        } else {
          setError(res.message || "Không thể lấy dữ liệu thống kê từ hệ thống backend.");
        }
      })
      .catch((err: any) => {
        console.error("API error in AdminOverviewPage:", err);
        setError(err?.message || "Lỗi kết nối máy chủ backend. Vui lòng kiểm tra lại dịch vụ.");
      })
      .finally(() => {
        setLoading(false);
        setIsRefreshing(false);
      });
  }, [timePreset, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let ws = WebSocketManager.getInstance();
    let isSubscribed = true;

    ws.connect()
      .then(() => {
        if (!isSubscribed) return;

        ws.onMessage("/topic/online-users", (msg: string) => {
          if (!isSubscribed) return;
          try {
            const data = JSON.parse(msg);
            if (typeof data.onlineCount === "number") {
              setOnlineCount(data.onlineCount);
            } else if (typeof data.count === "number") {
              setOnlineCount(data.count);
            } else if (Array.isArray(data.onlineUserIds)) {
              setOnlineCount(data.onlineUserIds.length);
            } else if (typeof data === "number") {
              setOnlineCount(data);
            }
          } catch {
            const parsed = Number(msg);
            if (!isNaN(parsed)) {
              setOnlineCount(parsed);
            }
          }
        });
      })
      .catch((err) => {
        console.warn("Realtime admin socket connection error:", err);
      });

    return () => {
      isSubscribed = false;
    };
  }, []);

  const totalUsers = apiData?.totalUsers ?? 0;
  const pendingReportsCount = apiData?.pendingReportsCount ?? 0;

  const [subjectVisibilityFilter, setSubjectVisibilityFilter] = useState<"ALL" | "PUBLIC_ONLY" | "PRIVATE_ONLY">("ALL");
  const [subjectSortBy, setSubjectSortBy] = useState<"TOTAL_DESC" | "TOTAL_ASC" | "NAME_ASC" | "MEMBERS_DESC">("TOTAL_DESC");
  const [subjectSearch, setSubjectSearch] = useState("");

  const processedTopSubjects = useMemo(() => {
    if (!apiData?.topSubjects) return [];
    let list = [...apiData.topSubjects];

    if (subjectSearch.trim()) {
      list = list.filter((item) => item.subjectName.toLowerCase().includes(subjectSearch.toLowerCase()));
    }

    list.sort((a, b) => {
      if (subjectSortBy === "TOTAL_DESC") return b.totalGroups - a.totalGroups;
      if (subjectSortBy === "TOTAL_ASC") return a.totalGroups - b.totalGroups;
      if (subjectSortBy === "NAME_ASC") return a.subjectName.localeCompare(b.subjectName);
      if (subjectSortBy === "MEMBERS_DESC") return b.totalMembers - a.totalMembers;
      return 0;
    });

    return list;
  }, [apiData, subjectSearch, subjectSortBy]);

  const [reportTargetFilter, setReportTargetFilter] = useState<string>("ALL");
  const [reportSortBy, setReportSortBy] = useState<"TOTAL_DESC" | "PENDING_DESC" | "NAME_ASC">("TOTAL_DESC");

  const TARGET_NAME_MAP: Record<string, string> = {
    USER: "Người dùng",
    User: "Người dùng",
    "Người dùng": "Người dùng",
    GROUP: "Nhóm",
    Group: "Nhóm",
    "Nhóm": "Nhóm",
    "Nhóm học tập": "Nhóm",
    POST: "Bài viết",
    Post: "Bài viết",
    "Bài viết": "Bài viết",
    DOCUMENT: "Tài liệu",
    Document: "Tài liệu",
    "Tài liệu": "Tài liệu",
  };

  const STATUS_NAME_MAP: Record<string, string> = {
    "Đang chờ (PENDING)": "Đang chờ",
    PENDING: "Đang chờ",
    "Đang xem xét (REVIEWING)": "Đang xem xét",
    REVIEWING: "Đang xem xét",
    "Đã xử lý (RESOLVED)": "Đã xử lý",
    RESOLVED: "Đã xử lý",
    "Từ chối (REJECTED)": "Từ chối",
    REJECTED: "Từ chối",
  };

  const processedReportsData = useMemo(() => {
    if (!apiData?.reportsByTarget) return [];
    let list = apiData.reportsByTarget.map((item) => ({
      ...item,
      name: TARGET_NAME_MAP[item.name] || item.name,
    }));

    if (reportTargetFilter !== "ALL") {
      const filterLabel = TARGET_NAME_MAP[reportTargetFilter] || reportTargetFilter;
      list = list.filter((item) => item.name === filterLabel);
    }

    list.sort((a, b) => {
      if (reportSortBy === "TOTAL_DESC") return b.total - a.total;
      if (reportSortBy === "PENDING_DESC") return b.pending - a.pending;
      if (reportSortBy === "NAME_ASC") return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }, [apiData, reportTargetFilter, reportSortBy]);

  const reportsPieData = useMemo(() => {
    if (!apiData?.reportsPie) return [];
    return apiData.reportsPie.map((item) => ({
      ...item,
      name: STATUS_NAME_MAP[item.name] || item.name.replace(/\s*\([A-Z]+\)/g, ""),
    }));
  }, [apiData]);

  const [messageSortBy, setMessageSortBy] = useState<"CHRONO" | "TOTAL_DESC" | "TOTAL_ASC">("CHRONO");

  const processedMessagesData = useMemo(() => {
    if (!apiData?.messagesTimeline) return [];
    let list = [...apiData.messagesTimeline];

    if (messageSortBy === "TOTAL_DESC") {
      list.sort((a, b) => b.total - a.total);
    } else if (messageSortBy === "TOTAL_ASC") {
      list.sort((a, b) => a.total - b.total);
    }

    return list;
  }, [apiData, messageSortBy]);

  const [userSortBy, setUserSortBy] = useState<"CHRONO" | "NEW_DESC" | "NEW_ASC">("CHRONO");

  const processedNewUsersData = useMemo(() => {
    if (!apiData?.newUsersTimeline) return [];
    let list = [...apiData.newUsersTimeline];

    if (userSortBy === "NEW_DESC") {
      list.sort((a, b) => b.newUsers - a.newUsers);
    } else if (userSortBy === "NEW_ASC") {
      list.sort((a, b) => a.newUsers - b.newUsers);
    }

    return list;
  }, [apiData, userSortBy]);

  const [studySortBy, setStudySortBy] = useState<"CHRONO" | "HOURS_DESC" | "HOURS_ASC">("CHRONO");

  const processedStudyData = useMemo(() => {
    if (!apiData?.studyDurationTimeline) return [];
    let list = [...apiData.studyDurationTimeline];

    if (studySortBy === "HOURS_DESC") {
      list.sort((a, b) => b.totalHours - a.totalHours);
    } else if (studySortBy === "HOURS_ASC") {
      list.sort((a, b) => a.totalHours - b.totalHours);
    }

    return list;
  }, [apiData, studySortBy]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  return (
    <div className="space-y-6 pb-12 text-slate-800">

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Thống kê hệ thống
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Tổng quan dữ liệu thực tế người dùng, môn học, báo cáo và thời lượng học tập.
          </p>
        </div>

        <div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            title="Làm mới dữ liệu"
            aria-label="Làm mới dữ liệu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={isRefreshing || loading ? "animate-spin" : ""}
            />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-red-700 uppercase tracking-wider">Lỗi hệ thống:</span>
            <span>{error}</span>
          </div>
          <button
            onClick={fetchData}
            className="shrink-0 rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Khoảng thời gian thống kê
          </h3>

          <div className="text-xs font-medium text-slate-600">
            <span className="bg-slate-100 px-2.5 py-1 rounded-md">
              {timePreset === "THIS_WEEK" && "Chỉ Tuần này"}
              {timePreset === "THIS_MONTH" && "Tháng này"}
              {timePreset === "ALL_TIME" && "Tất cả từ trước đến nay"}
              {timePreset === "CUSTOM" && (startDate && endDate ? `Từ ${startDate} đến ${endDate}` : "Tùy chỉnh khoảng thời gian")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex flex-wrap items-center rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-medium text-slate-600 gap-1">
            <button
              onClick={() => setTimePreset("THIS_WEEK")}
              className={`rounded-md px-3 py-1.5 transition-colors ${timePreset === "THIS_WEEK" ? "bg-[#3b82f6] text-white font-medium" : "hover:bg-white"
                }`}
            >
              Chỉ Tuần này
            </button>

            <button
              onClick={() => setTimePreset("THIS_MONTH")}
              className={`rounded-md px-3 py-1.5 transition-colors ${timePreset === "THIS_MONTH" ? "bg-[#3b82f6] text-white font-medium" : "hover:bg-white"
                }`}
            >
              Tháng này
            </button>

            <button
              onClick={() => setTimePreset("ALL_TIME")}
              className={`rounded-md px-3 py-1.5 transition-colors ${timePreset === "ALL_TIME" ? "bg-[#3b82f6] text-white font-medium" : "hover:bg-white"
                }`}
            >
              Từ trước đến nay (Tất cả)
            </button>

            <button
              onClick={selectCustomTimePreset}
              className={`rounded-md px-3 py-1.5 transition-colors ${timePreset === "CUSTOM" ? "bg-[#3b82f6] text-white font-medium" : "hover:bg-white"
                }`}
            >
              Tùy chỉnh khoảng thời gian
            </button>
          </div>

          {timePreset === "CUSTOM" && (
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-500 font-medium">Từ:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-700 focus:border-slate-400 focus:outline-none"
              />
              <span className="text-slate-500 font-medium">Đến:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-700 focus:border-slate-400 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {loading && !apiData ? (
        <div className="space-y-6">

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="h-28 rounded-xl border border-slate-200 bg-slate-100 animate-pulse p-5 space-y-3">
                <div className="h-3 w-1/3 bg-slate-200 rounded" />
                <div className="h-8 w-1/2 bg-slate-300 rounded" />
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="h-80 rounded-xl border border-slate-200 bg-slate-100 animate-pulse p-5 space-y-4">
                <div className="h-4 w-1/2 bg-slate-200 rounded" />
                <div className="h-56 w-full bg-slate-200/60 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Tổng số người dùng
              </p>
              <h3 className="text-3xl font-bold text-slate-900">
                {totalUsers.toLocaleString("vi-VN")}
              </h3>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Đang Online
                </p>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <h3 className="text-3xl font-bold text-slate-900">
                {onlineCount.toLocaleString("vi-VN")}
              </h3>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 sm:col-span-2 lg:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Báo cáo chờ xử lý
              </p>
              <h3 className="text-3xl font-bold text-slate-900">
                {pendingReportsCount}
              </h3>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">

            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">
                    Top Môn Học
                  </h2>

                </div>
                <p className="text-xs text-slate-500">
                  Thống kê môn học theo số lượng nhóm.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                <div className="flex-1 min-w-[130px]">
                  <input
                    type="text"
                    placeholder="Tìm môn học..."
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
                  />
                </div>

                <select
                  value={subjectVisibilityFilter}
                  onChange={(e) => setSubjectVisibilityFilter(e.target.value as any)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
                >
                  <option value="ALL">Tất cả</option>
                  <option value="PUBLIC_ONLY">Nhóm Công khai</option>
                  <option value="PRIVATE_ONLY">Nhóm Riêng tư</option>
                </select>

                <select
                  value={subjectSortBy}
                  onChange={(e) => setSubjectSortBy(e.target.value as any)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
                >
                  <option value="TOTAL_DESC">Tổng nhóm (Cao → Thấp)</option>
                  <option value="TOTAL_ASC">Tổng nhóm (Thấp → Cao)</option>
                  <option value="MEMBERS_DESC">Số thành viên (Nhiều nhất)</option>
                  <option value="NAME_ASC">Tên môn học (A → Z)</option>
                </select>
              </div>

              {processedTopSubjects.length === 0 ? (
                <OverviewEmptyState
                  title="Chưa có dữ liệu môn học"
                  image={emptyGroupImage}
                />
              ) : (
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 text-xs">
                  {processedTopSubjects.map((item, index) => {
                    const maxGroups = Math.max(...processedTopSubjects.map((s) => s.totalGroups), 1);
                    const publicPct = item.totalGroups > 0 ? Math.round((item.publicCount / item.totalGroups) * 100) : 0;
                    const privatePct = 100 - publicPct;

                    return (
                      <div
                        key={item.subjectName}
                        className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 hover:bg-white hover:border-slate-200 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                              {index + 1}
                            </span>
                            <h4 className="font-semibold text-slate-900 truncate text-xs">
                              {item.subjectName}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-[11px]">
                            <span className="font-bold text-slate-900">{item.totalGroups} nhóm</span>
                            <span className="text-slate-400">({item.totalMembers} học viên)</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 flex">
                            {subjectVisibilityFilter !== "PRIVATE_ONLY" && (
                              <div
                                className="bg-blue-500 h-full transition-all duration-300"
                                style={{ width: `${(item.publicCount / maxGroups) * 100}%` }}
                                title={`Công khai: ${item.publicCount} nhóm`}
                              />
                            )}
                            {subjectVisibilityFilter !== "PUBLIC_ONLY" && (
                              <div
                                className="bg-slate-600 h-full transition-all duration-300"
                                style={{ width: `${(item.privateCount / maxGroups) * 100}%` }}
                                title={`Riêng tư: ${item.privateCount} nhóm`}
                              />
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Công khai: <strong className="text-slate-800">{item.publicCount}</strong> ({publicPct}%)</span>
                            <span>Riêng tư: <strong className="text-slate-800">{item.privateCount}</strong> ({privatePct}%)</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-bold text-slate-900">
                  Phân tích Báo cáo Vi phạm
                </h2>
                <p className="text-xs text-slate-500">
                  Phân loại trạng thái và đối tượng báo cáo.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                <select
                  value={reportTargetFilter}
                  onChange={(e) => setReportTargetFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
                >
                  <option value="ALL">Tất cả đối tượng</option>
                  <option value="USER">Người dùng</option>
                  <option value="POST">Bài viết</option>
                  <option value="GROUP">Nhóm</option>
                  <option value="DOCUMENT">Tài liệu</option>
                </select>

                <select
                  value={reportSortBy}
                  onChange={(e) => setReportSortBy(e.target.value as any)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
                >
                  <option value="TOTAL_DESC">Tổng vi phạm (Nhiều nhất)</option>
                  <option value="PENDING_DESC">Đang chờ xử lý (Ưu tiên)</option>
                  <option value="NAME_ASC">Tên đối tượng (A → Z)</option>
                </select>
              </div>

              {reportsPieData.length === 0 && processedReportsData.length === 0 ? (
                <OverviewEmptyState
                  title="Chưa có dữ liệu báo cáo"
                  image={emptyReportImage}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-2">
                  <div className="flex flex-col items-center w-full">
                    <p className="text-center text-xs font-semibold text-slate-600 mb-1">Trạng thái Báo cáo</p>
                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reportsPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="48%"
                            innerRadius={45}
                            outerRadius={68}
                            paddingAngle={3}
                          >
                            {reportsPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(val: any) => [`${val} báo cáo`, "Số lượng"]}
                            contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", borderColor: "#e2e8f0" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 w-full pt-2 border-t border-slate-100 text-xs">
                      {reportsPieData.map((item) => (
                        <div key={item.name} className="flex items-center gap-2 bg-slate-50 px-2 py-1.5 rounded">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-500 truncate">{item.name}</p>
                            <p className="text-xs font-bold text-slate-900">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="w-full">
                    <p className="text-center text-xs font-semibold text-slate-600 mb-1">Đối tượng bị Báo cáo</p>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processedReportsData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" style={{ fontSize: "10px" }} tickLine={false} />
                          <YAxis style={{ fontSize: "10px" }} tickLine={false} axisLine={false} />
                          <Tooltip
                            formatter={(val: any, name: any) => [`${val} báo cáo`, name]}
                            contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", borderColor: "#e2e8f0" }}
                          />
                          <Bar dataKey="pending" name="Đang chờ" stackId="a" fill="#d97706" />
                          <Bar dataKey="reviewing" name="Đang xem xét" stackId="a" fill="#2563eb" />
                          <Bar dataKey="resolved" name="Đã xử lý" stackId="a" fill="#059669" />
                          <Bar dataKey="rejected" name="Từ chối" stackId="a" fill="#dc2626" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">
                    Lượng Tin Nhắn (Nhóm vs Cá nhân)
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Xu hướng tổng số tin nhắn trao đổi trong khoảng thời gian đã chọn.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                <select
                  value={messageSortBy}
                  onChange={(e) => setMessageSortBy(e.target.value as any)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
                >
                  <option value="CHRONO">Sắp xếp: Theo mốc thời gian</option>
                  <option value="TOTAL_DESC">Tổng tin nhắn (Nhiều nhất)</option>
                  <option value="TOTAL_ASC">Tổng tin nhắn (Ít nhất)</option>
                </select>
              </div>

              {processedMessagesData.length === 0 ? (
                <OverviewEmptyState
                  title="Chưa có dữ liệu tin nhắn"
                  image={emptyMessageImage}
                />
              ) : (
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={processedMessagesData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorGroupMsg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorPrivateMsg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.teal} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.teal} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" style={{ fontSize: "10px" }} tickLine={false} />
                      <YAxis style={{ fontSize: "10px" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", borderColor: "#e2e8f0" }} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Area
                        type="monotone"
                        dataKey="groupMessages"
                        name="Tin nhắn Nhóm"
                        stroke={CHART_COLORS.primary}
                        fillOpacity={1}
                        fill="url(#colorGroupMsg)"
                      />
                      <Area
                        type="monotone"
                        dataKey="privateMessages"
                        name="Tin nhắn Cá nhân"
                        stroke={CHART_COLORS.teal}
                        fillOpacity={1}
                        fill="url(#colorPrivateMsg)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">
                    Người Dùng Đăng Ký Mới
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Số lượng tài khoản mới mở và xác thực email theo thời gian.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                <select
                  value={userSortBy}
                  onChange={(e) => setUserSortBy(e.target.value as any)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
                >
                  <option value="CHRONO">Sắp xếp: Theo mốc thời gian</option>
                  <option value="NEW_DESC">Đăng ký mới (Nhiều nhất)</option>
                  <option value="NEW_ASC">Đăng ký mới (Ít nhất)</option>
                </select>
              </div>

              {processedNewUsersData.length === 0 ? (
                <OverviewEmptyState
                  title="Chưa có người dùng mới"
                  image={emptyFriendImage}
                />
              ) : (
                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={processedNewUsersData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" style={{ fontSize: "10px" }} tickLine={false} />
                      <YAxis style={{ fontSize: "10px" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", borderColor: "#e2e8f0" }} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Line
                        type="monotone"
                        dataKey="newUsers"
                        name="Tài khoản mới (Đã xác thực email)"
                        stroke={CHART_COLORS.indigo}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: CHART_COLORS.indigo }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 lg:col-span-2">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">
                    Thống kê Thời Lượng Học Tập
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Tổng thời gian học của toàn bộ học viên.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                <select
                  value={studySortBy}
                  onChange={(e) => setStudySortBy(e.target.value as any)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
                >
                  <option value="CHRONO">Sắp xếp: Theo mốc thời gian</option>
                  <option value="HOURS_DESC">Thời lượng học (Nhiều nhất)</option>
                  <option value="HOURS_ASC">Thời lượng học (Ít nhất)</option>
                </select>
              </div>

              {processedStudyData.length === 0 ? (
                <OverviewEmptyState
                  title="Chưa có dữ liệu học tập"
                  image={emptyPostImage}
                />
              ) : (
                <div className="h-80 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processedStudyData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" style={{ fontSize: "10px" }} tickLine={false} />
                      <YAxis style={{ fontSize: "10px" }} tickLine={false} axisLine={false} />
                      <Tooltip
                        formatter={(val: any) => [`${val} giờ`, "Thời lượng học"]}
                        contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", borderColor: "#e2e8f0" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="onlineSessions" name="Học Online (Video Call)" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="offlineSessions" name="Học Tự Học/Offline" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
