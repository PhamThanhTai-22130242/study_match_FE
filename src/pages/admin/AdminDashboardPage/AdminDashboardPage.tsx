import { type FormEvent, useEffect, useMemo, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useConfirm } from "../../../components/modal/ConfirmModal";
import {
  AlertTriangle,
  Ban,
  BarChart3,
  Clock3,
  X,
  Flag,
  Gavel,
  MessageSquareWarning,
  Search,
  ShieldAlert,
  UsersRound
} from "lucide-react";

import {
  getAdminChatDashboard,
  kickAdminChatUserFromGroup,
  searchAdminChatUserViolations,
  type AdminChatDashboardResponse,
  type AdminChatGroupRisk,
  type AdminChatMemberRisk,
  type AdminChatUserViolation,
} from "../../../services/AdminChatDashboardService";
import {
  getAdminGroupDetail,
  getAdminGroups,
  updateAdminGroupStatus,
  type AdminGroupDetailResponse,
  type AdminGroupRowResponse,
  type AdminGroupStatus,
  type PageResponse,
} from "../../../services/GroupService";
import emptyChatImage from "../../../assets/img/no-mess.png";
import emptyFriendImage from "../../../assets/img/no-friend.png";
import emptyPostImage from "../../../assets/img/no-post.png";
import emptyGroupImage from "../../../assets/img/group.png";

const emptyDashboard: AdminChatDashboardResponse = {
  summary: {
    totalMessages: 0,
    totalViolations: 0,
    offensiveMessages: 0,
    hateMessages: 0,
    groupsWithViolations: 0,
    violatingMembers: 0,
  },
  topGroups: [],
  topMembers: [],
  reviewQueue: [],
  trend: [],
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatDateTime(value: string | null) {
  if (!value) return "Chưa có dữ liệu";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return value;
  }
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatReviewReason(reason?: string): string {
  if (!reason) return "";
  return reason
    .replace(/v[ÃAÂa][^\s]*\s+/gi, "và ")
    .replace(/v\?+\s+/g, "và ")
    .replace(/\s+v[ÃAÂa]\s+/gi, " và ");
}

function formatReviewSuggestion(suggestion?: string): string {
  if (!suggestion) return "";
  const lower = suggestion.toLowerCase();
  if (lower.includes("kick")) return "Đề xuất kick khỏi nhóm";
  if (lower.includes("mute")) return "Đề xuất mute 24 giờ và review";
  if (
    lower.includes("báo") ||
    lower.includes("b\u00e1o") ||
    lower.includes("cảnh") ||
    lower.includes("c\u1ea3nh")
  ) {
    return "Cảnh báo lần 1";
  }
  return suggestion;
}

function UserAvatar({
  name,
  avatarUrl,
}: {
  name?: string | null;
  avatarUrl?: string | null;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || "User"}
        className="h-10 w-10 rounded-full object-cover ring-1 ring-sand-200"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
      {getInitials(name)}
    </div>
  );
}

function EmptyState({
  title,
  image,
  compact = false,
}: {
  title: string;
  image: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-3" : "py-6"}`}>
      <img
        src={image}
        alt=""
        className={`${compact ? "h-20" : "h-28"} w-auto object-contain`}
      />
      <p className="mt-3 text-sm font-semibold text-slate-700">{title}</p>
    </div>
  );
}

function getViolationCount(row: {
  offensiveMessages: number;
  hateMessages: number;
}) {
  return row.offensiveMessages + row.hateMessages;
}

function getViolationRate(violations: number, total: number) {
  if (total === 0) return 0;
  return Math.round((violations / total) * 1000) / 10;
}

function getGroupRisk(row: AdminChatGroupRisk) {
  const rate = getViolationRate(getViolationCount(row), row.totalMessages);

  if (row.hateMessages >= 5 || rate >= 4) {
    return {
      label: "Cần xử lý",
      className: "bg-red-50 text-red-700 ring-red-200",
    };
  }

  if (row.hateMessages > 0 || rate >= 2) {
    return {
      label: "Cần theo dõi",
      className: "bg-blue-50 text-blue-700 ring-blue-200",
    };
  }

  return {
    label: "Ổn định",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
}

function getMemberSuggestion(row: AdminChatMemberRisk) {
  if (row.hateMessages >= 3) return "Đề xuất kick";
  if (row.hateMessages > 0 || row.offensiveMessages >= 5) {
    return "Đề xuất mute";
  }
  return "Cảnh báo";
}

export default function AdminDashboardPage() {
  const confirm = useConfirm();
  const [dashboard, setDashboard] =
    useState<AdminChatDashboardResponse>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userSearchKeyword, setUserSearchKeyword] = useState("");
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState<string | null>(null);
  const [userSearchResults, setUserSearchResults] = useState<
    AdminChatUserViolation[]
  >([]);
  const [userSearchActive, setUserSearchActive] = useState(false);
  const [selectedViolationUser, setSelectedViolationUser] =
    useState<AdminChatUserViolation | null>(null);
  const [selectedKickGroupId, setSelectedKickGroupId] = useState<number | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [kickLoading, setKickLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [selectedGroupRisk, setSelectedGroupRisk] =
    useState<AdminChatGroupRisk | null>(null);
  const [selectedGroupDetail, setSelectedGroupDetail] =
    useState<AdminGroupDetailResponse | null>(null);
  const [groupDetailLoading, setGroupDetailLoading] = useState(false);
  const [groupStatusLoading, setGroupStatusLoading] = useState(false);
  const [groupDeleteLoading, setGroupDeleteLoading] = useState(false);
  const [groupHideLoading, setGroupHideLoading] = useState(false);
  const [groupDetailError, setGroupDetailError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "delete" | "hide" | null;
  }>({ open: false, type: null });

  // Groups table state
  const [groupsTab, setGroupsTab] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [groupsSearch, setGroupsSearch] = useState("");
  const [groupsPage, setGroupsPage] = useState(0);
  const [groupsData, setGroupsData] = useState<PageResponse<AdminGroupRowResponse> | null>(null);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [activeGroupsCount, setActiveGroupsCount] = useState<number>(0);
  const [inactiveGroupsCount, setInactiveGroupsCount] = useState<number>(0);
  const [debouncedGroupsSearch, setDebouncedGroupsSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedGroupsSearch !== groupsSearch) {
        setDebouncedGroupsSearch(groupsSearch);
        setGroupsPage(0);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [groupsSearch, debouncedGroupsSearch]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getAdminChatDashboard({
        groupLimit: 10,
        memberLimit: 10,
      });

      if (!response.success || !response.data) {
        setDashboard(emptyDashboard);
        setError(response.message || "Không thể tải dashboard tin nhắn");
        return;
      }

      setDashboard(response.data);
    } catch {
      setDashboard(emptyDashboard);
      setError("Không thể kết nối chat service");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    let cancelled = false;

    async function loadGroups() {
      try {
        setGroupsLoading(true);
        setGroupsError(null);

        const currentStatus = groupsTab as AdminGroupStatus;
        const otherStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

        const [mainRes, otherRes] = await Promise.all([
          getAdminGroups(
            groupsPage,
            10,
            null,
            currentStatus,
            debouncedGroupsSearch.trim() || null,
          ),
          getAdminGroups(
            0,
            1,
            null,
            otherStatus as AdminGroupStatus,
            debouncedGroupsSearch.trim() || null,
          )
        ]);

        if (cancelled) return;

        if (!mainRes.success || !mainRes.data) {
          setGroupsError(mainRes.message || "Không thể tải danh sách nhóm");
          return;
        }

        setGroupsData(mainRes.data);

        if (currentStatus === "ACTIVE") {
          setActiveGroupsCount(mainRes.data.totalElements);
          setInactiveGroupsCount(otherRes.data?.totalElements || 0);
        } else {
          setInactiveGroupsCount(mainRes.data.totalElements);
          setActiveGroupsCount(otherRes.data?.totalElements || 0);
        }
      } catch {
        if (!cancelled) setGroupsError("Không thể kết nối group service");
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    }

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, [groupsTab, groupsPage, debouncedGroupsSearch]);

  async function handleUserSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = userSearchKeyword.trim();

    if (!keyword) {
      setUserSearchResults([]);
      setUserSearchActive(false);
      setUserSearchError("Nhập tên, email hoặc user id để tìm kiếm");
      return;
    }

    try {
      setUserSearchLoading(true);
      setUserSearchActive(true);
      setUserSearchError(null);

      const response = await searchAdminChatUserViolations({
        keyword,
        limit: 5,
      });

      if (!response.success || !response.data) {
        setUserSearchResults([]);
        setUserSearchError(response.message || "Không thể tìm kiếm user");
        return;
      }

      setUserSearchResults(response.data.users);
      if (response.data.users.length === 0) {
        setUserSearchError("Không tìm thấy user phù hợp");
      }
    } catch {
      setUserSearchResults([]);
      setUserSearchError("Không thể kết nối chat service");
    } finally {
      setUserSearchLoading(false);
    }
  }

  async function openViolationDetail(member: AdminChatMemberRisk) {
    setDetailLoading(true);
    setDetailError(null);
    setSelectedKickGroupId(member.groupId);
    setSelectedViolationUser({
      userId: member.senderId,
      fullName: member.senderName,
      avatarUrl: member.senderAvatarUrl,
      email: member.senderEmail,
      totalJoinedGroups: 0,
      totalMessages: member.totalMessages,
      offensiveMessages: member.offensiveMessages,
      hateMessages: member.hateMessages,
      groups: [
        {
          groupId: member.groupId,
          groupName: member.groupName,
          conversationId: 0,
          totalMessages: member.totalMessages,
          offensiveMessages: member.offensiveMessages,
          hateMessages: member.hateMessages,
          lastViolationAt: member.lastViolationAt,
        },
      ],
    });

    try {
      const response = await searchAdminChatUserViolations({
        keyword: String(member.senderId),
        limit: 1,
      });
      const detail = response.data?.users.find(
        (user) => user.userId === member.senderId,
      );

      if (response.success && detail) {
        setSelectedViolationUser(detail);
        const groupExists = detail.groups.some(
          (group) => group.groupId === member.groupId,
        );
        setSelectedKickGroupId(
          groupExists ? member.groupId : detail.groups[0]?.groupId ?? null,
        );
      } else {
        setDetailError(response.message || "Không thể tải chi tiết user");
      }
    } catch {
      setDetailError("Không thể kết nối chat service");
    } finally {
      setDetailLoading(false);
    }
  }

  async function openGroupDetail(group: AdminChatGroupRisk) {
    setSelectedGroupRisk(group);
    setSelectedGroupDetail(null);
    setGroupDetailError(null);
    setGroupDetailLoading(true);

    try {
      const response = await getAdminGroupDetail(group.groupId);

      if (!response.success || !response.data) {
        setGroupDetailError(response.message || "Không thể tải chi tiết nhóm");
        return;
      }

      setSelectedGroupDetail(response.data);
    } catch {
      setGroupDetailError("Không thể kết nối group service");
    } finally {
      setGroupDetailLoading(false);
    }
  }

  function closeGroupModal() {
    setSelectedGroupRisk(null);
    setSelectedGroupDetail(null);
    setGroupDetailError(null);
    setConfirmDialog({ open: false, type: null });
  }

  async function handleDeleteSelectedGroup() {
    if (!selectedGroupRisk) return;
    setConfirmDialog({ open: false, type: null });

    try {
      setGroupDeleteLoading(true);
      setGroupDetailError(null);

      const response = await updateAdminGroupStatus(
        selectedGroupRisk.groupId,
        "DELETED",
      );

      if (!response.success) {
        setGroupDetailError(response.message || "Không thể xóa nhóm");
        return;
      }

      setDashboard((prev) => ({
        ...prev,
        topGroups: prev.topGroups.filter(
          (group) => group.groupId !== selectedGroupRisk.groupId,
        ),
        topMembers: prev.topMembers.filter(
          (member) => member.groupId !== selectedGroupRisk.groupId,
        ),
        reviewQueue: prev.reviewQueue.filter(
          (item) => !item.id.endsWith(`-${selectedGroupRisk.groupId}`),
        ),
      }));
      closeGroupModal();
      fetchDashboardData();
    } catch {
      setGroupDetailError("Không thể kết nối group service");
    } finally {
      setGroupDeleteLoading(false);
    }
  }

  async function handleHideSelectedGroup() {
    if (!selectedGroupRisk) return;
    setConfirmDialog({ open: false, type: null });

    try {
      setGroupHideLoading(true);
      setGroupDetailError(null);

      const response = await updateAdminGroupStatus(
        selectedGroupRisk.groupId,
        "INACTIVE",
      );

      if (!response.success) {
        setGroupDetailError(response.message || "Không thể ẩn nhóm");
        return;
      }

      // Update local state: update the group status in topGroups list
      setSelectedGroupDetail((prev) =>
        prev ? { ...prev, status: "INACTIVE" } : prev,
      );
      setDashboard((prev) => ({
        ...prev,
        topGroups: prev.topGroups.map((group) =>
          group.groupId === selectedGroupRisk.groupId
            ? { ...group }
            : group,
        ),
      }));
      fetchDashboardData();
    } catch {
      setGroupDetailError("Không thể kết nối group service");
    } finally {
      setGroupHideLoading(false);
    }
  }

  async function handleActivateSelectedGroup() {
    if (!selectedGroupRisk) return;

    try {
      setGroupHideLoading(true);
      setGroupDetailError(null);

      const response = await updateAdminGroupStatus(
        selectedGroupRisk.groupId,
        "ACTIVE",
      );

      if (!response.success) {
        setGroupDetailError(response.message || "Không thể kích hoạt nhóm");
        return;
      }

      // Update local state: update the group status in topGroups list
      setSelectedGroupDetail((prev) =>
        prev ? { ...prev, status: "ACTIVE" } : prev,
      );
      setDashboard((prev) => ({
        ...prev,
        topGroups: prev.topGroups.map((group) =>
          group.groupId === selectedGroupRisk.groupId
            ? { ...group }
            : group,
        ),
      }));
      fetchDashboardData();
    } catch {
      setGroupDetailError("Không thể kết nối group service");
    } finally {
      setGroupHideLoading(false);
    }
  }

  async function handleKickSelectedUser() {
    if (!selectedViolationUser || !selectedKickGroupId) return;

    const currentUserId = selectedViolationUser.userId;
    const currentGroupId = selectedKickGroupId;
    const currentFullName = selectedViolationUser.fullName;
    const currentGroupName = selectedKickGroup?.groupName;

    try {
      setKickLoading(true);
      setDetailError(null);

      const response = await kickAdminChatUserFromGroup({
        userId: currentUserId,
        groupId: currentGroupId,
      });

      if (!response.success) {
        setDetailError(response.message || "Không thể kick user khỏi nhóm");
        return;
      }

      setDashboard((prev) => ({
        ...prev,
        topMembers: prev.topMembers.filter(
          (member) =>
            !(
              member.senderId === currentUserId &&
              member.groupId === currentGroupId
            ),
        ),
        reviewQueue: prev.reviewQueue.filter(
          (item) =>
            item.id !== `case-${currentUserId}-${currentGroupId}` &&
            !(
              item.senderName === currentFullName &&
              item.groupName === currentGroupName
            ),
        ),
      }));
      setSelectedViolationUser((prev) =>
        prev
          ? {
            ...prev,
            groups: prev.groups.filter(
              (group) => group.groupId !== currentGroupId,
            ),
          }
          : prev,
      );
      setSelectedKickGroupId(null);

      // Re-fetch dashboard to guarantee all metrics & queues are in sync with backend
      fetchDashboardData();
    } catch {
      setDetailError("Không thể kết nối chat service");
    } finally {
      setKickLoading(false);
    }
  }

  const summary = dashboard.summary;
  const groupRows = dashboard.topGroups;
  const memberRows = dashboard.topMembers;
  const reviewQueue = dashboard.reviewQueue;
  const trendRows = dashboard.trend;

  const statusRows = useMemo(
    () => [
      {
        label: "NONE",
        value: Math.max(summary.totalMessages - summary.totalViolations, 0),
        color: "bg-emerald-500",
      },
      {
        label: "OFFENSIVE",
        value: summary.offensiveMessages,
        color: "bg-blue-500",
      },
      {
        label: "HATE",
        value: summary.hateMessages,
        color: "bg-red-500",
      },
    ],
    [summary],
  );

  const statCards = [
    {
      title: "Tin nhắn nhóm",
      value: formatNumber(summary.totalMessages),
      helper: "Chỉ tính group conversations",
    },
    {
      title: "Tin vi phạm",
      value: formatNumber(summary.totalViolations),
      helper: `${getViolationRate(
        summary.totalViolations,
        summary.totalMessages,
      )}% trên tổng tin`,
    },
    {
      title: "Nhóm có vi phạm",
      value: formatNumber(summary.groupsWithViolations),
      helper: `${formatNumber(summary.violatingMembers)} thành viên cần theo dõi`,
    },
    {
      title: "HATE",
      value: formatNumber(summary.hateMessages),
      helper: "Ưu tiên xử lý trước",
    },
  ];

  const maxTrendValue = Math.max(
    1,
    ...trendRows.map((row) => row.offensive + row.hate),
  );
  const selectedViolations = selectedViolationUser
    ? getViolationCount(selectedViolationUser)
    : 0;
  const selectedViolationRate = selectedViolationUser
    ? getViolationRate(selectedViolations, selectedViolationUser.totalMessages)
    : 0;
  const selectedKickGroup = selectedViolationUser?.groups.find(
    (group) => group.groupId === selectedKickGroupId,
  );

  return (
    <>
      <main className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-sand-900">
              Dashboard tin nhắn nhóm
            </h1>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            return (
              <div
                key={card.title}
                className="rounded-lg border border-sand-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase text-sand-400">
                      {card.title}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-sand-900">
                      {loading ? (
                        <span className="inline-block h-8 w-24 animate-pulse rounded bg-sand-200" />
                      ) : (
                        card.value
                      )}
                    </p>
                  </div>
                </div>
                {/* {loading ? (
                  <div className="mt-3 h-4 w-32 animate-pulse rounded bg-sand-100" />
                ) : (
                  <p className="mt-3 text-xs text-sand-500">{card.helper}</p>
                )} */}
              </div>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-lg border border-sand-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-sand-900">
                  Top nhóm rủi ro
                </h2>
                <p className="mt-1 text-xs text-sand-500">
                  Sắp xếp theo tổng OFFENSIVE và HATE trong nhóm.
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-sand-200 text-xs uppercase text-sand-400">
                    <th className="py-3 pr-4 font-medium">Nhóm</th>
                    <th className="py-3 pr-4 font-medium">Tin</th>
                    <th className="py-3 pr-4 font-medium">OFF</th>
                    <th className="py-3 pr-4 font-medium">HATE</th>
                    <th className="py-3 pr-4 font-medium">Tỉ lệ</th>
                    <th className="py-3 pr-4 font-medium">Rủi ro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand-100">
                  {!loading && groupRows.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState
                          title="Chưa có nhóm vi phạm"
                          image={emptyGroupImage}
                        />
                      </td>
                    </tr>
                  )}

                  {groupRows.map((group) => {
                    const violations = getViolationCount(group);
                    const rate = getViolationRate(
                      violations,
                      group.totalMessages,
                    );
                    const risk = getGroupRisk(group);

                    return (
                      <tr
                        key={group.groupId}
                        onClick={() => openGroupDetail(group)}
                        className="cursor-pointer align-top transition hover:bg-sky-50/50"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openGroupDetail(group);
                          }
                        }}
                      >
                        <td className="py-3 pr-4">
                          <div className="font-medium text-sand-900">
                            {group.groupName}
                          </div>
                          <div className="mt-0.5 text-xs text-sand-400">
                            Group {group.groupId} · Conversation{" "}
                            {group.conversationId}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-sand-700">
                          {formatNumber(group.totalMessages)}
                          <div className="text-xs text-sand-400">
                            {formatNumber(violations)} vi phạm
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-blue-700">
                          {formatNumber(group.offensiveMessages)}
                        </td>
                        <td className="py-3 pr-4 text-red-700">
                          {formatNumber(group.hateMessages)}
                        </td>
                        <td className="py-3 pr-4 text-sand-700">{rate}%</td>
                        <td className="py-3 pr-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${risk.className}`}
                          >
                            {risk.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-sand-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-sand-900">
                  Phân bố status
                </h2>
                <p className="mt-1 text-xs text-sand-500">
                  Chỉ tính các tin nhắn nhóm.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {statusRows.map((item) => {
                const width = getViolationRate(item.value, summary.totalMessages);

                return (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-sand-700">
                        {item.label}
                      </span>
                      <span className="text-sand-500">
                        {loading ? "..." : formatNumber(item.value)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-sand-100">
                      <div
                        className={`h-2 rounded-full ${item.color}`}
                        style={{ width: `${summary.totalMessages ? Math.max(width, 2) : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase text-sand-400">
                Xu hướng 5 ngày
              </h3>
              <div className="mt-3 flex h-32 items-end gap-3">
                {trendRows.length === 0 && !loading ? (
                  <div className="flex-1 rounded bg-sand-50">
                    <EmptyState
                      compact
                      title="Chưa có xu hướng"
                      image={emptyPostImage}
                    />
                  </div>
                ) : (
                  trendRows.map((row) => {
                    const total = row.offensive + row.hate;
                    const height = Math.max((total / maxTrendValue) * 100, 8);

                    return (
                      <div key={row.label} className="flex flex-1 flex-col gap-2">
                        <div className="flex h-24 items-end rounded bg-sand-50 px-1">
                          <div
                            className="w-full rounded-t bg-blue-400"
                            style={{ height: `${height}%` }}
                          >
                            <div
                              className="w-full rounded-t bg-red-500"
                              style={{
                                height: `${Math.max(
                                  total ? (row.hate / total) * 100 : 0,
                                  row.hate > 0 ? 12 : 0,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-center text-[11px] text-sand-400">
                          {row.label}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-lg border border-sand-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-sand-900">
                  Thành viên vi phạm trong nhóm
                </h2>
                <p className="mt-1 text-xs text-sand-500">
                  Dữ liệu dùng để cảnh báo, mute hoặc kick khỏi nhóm.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleUserSearch}
              className="mt-4 flex flex-col gap-2 sm:flex-row"
            >
              <div className="relative flex-1">
                <input
                  value={userSearchKeyword}
                  onChange={(event) => {
                    const value = event.target.value;
                    setUserSearchKeyword(value);

                    if (!value.trim()) {
                      setUserSearchActive(false);
                      setUserSearchResults([]);
                      setUserSearchError(null);
                    }
                  }}
                  className="h-10 w-full rounded-lg border border-sand-200 bg-white px-3 text-sm text-sand-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  placeholder="Tìm theo tên, email hoặc user id"
                />
              </div>
              <button
                type="submit"
                disabled={userSearchLoading}
                title="Tìm user"
                aria-label="Tìm user"
                className="inline-flex h-10 w-10 items-center justify-center text-[#3b82f6] transition-colors hover:text-[#2563eb] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Search size={17} className={userSearchLoading ? "animate-pulse" : ""} />
              </button>
            </form>

            {userSearchActive && (
              <div className="mt-4 rounded-lg border border-sand-200 bg-sand-50 p-3">
                {userSearchLoading && (
                  <p className="text-sm text-sand-500">Đang tìm kiếm user...</p>
                )}

                {userSearchError && (
                  <p className="text-sm text-sand-500">{userSearchError}</p>
                )}

                {!userSearchLoading && userSearchResults.length > 0 && (
                  <div className="space-y-3">
                    {userSearchResults.map((user) => {
                      const violations = getViolationCount(user);

                      return (
                        <div
                          key={user.userId}
                          className="rounded-lg border border-sand-200 bg-white p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <UserAvatar
                                name={user.fullName}
                                avatarUrl={user.avatarUrl}
                              />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-sand-900">
                                  {user.fullName}
                                </p>
                                <p className="truncate text-xs text-sand-400">
                                  User {user.userId}
                                  {user.email ? ` · ${user.email}` : ""}
                                </p>
                              </div>
                            </div>
                            <div className="text-right text-xs text-sand-500">
                              <p className="font-semibold text-red-700">
                                {formatNumber(violations)} vi phạm
                              </p>
                              <p>{formatNumber(user.totalMessages)} tin nhóm</p>
                            </div>
                          </div>

                          {user.groups.length === 0 ? (
                            <p className="mt-3 text-xs text-sand-500">
                              User này chưa có tin nhắn OFFENSIVE hoặc HATE trong nhóm.
                            </p>
                          ) : (
                            <div className="mt-3 overflow-x-auto">
                              <table className="min-w-full text-left text-xs">
                                <thead className="text-sand-400">
                                  <tr>
                                    <th className="py-2 pr-3 font-medium">Nhóm</th>
                                    <th className="py-2 pr-3 font-medium">Tin</th>
                                    <th className="py-2 pr-3 font-medium">OFF</th>
                                    <th className="py-2 pr-3 font-medium">HATE</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-sand-100">
                                  {user.groups.map((group) => (
                                    <tr key={`${user.userId}-${group.groupId}`}>
                                      <td className="py-2 pr-3 text-sand-700">
                                        {group.groupName}
                                        <div className="text-[11px] text-sand-400">
                                          Group {group.groupId}
                                        </div>
                                      </td>
                                      <td className="py-2 pr-3 text-sand-700">
                                        {formatNumber(group.totalMessages)}
                                      </td>
                                      <td className="py-2 pr-3 text-sand-700">
                                        {formatNumber(group.offensiveMessages)}
                                      </td>
                                      <td className="py-2 pr-3 text-sand-700">
                                        {formatNumber(group.hateMessages)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {!userSearchActive && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {!loading && memberRows.length === 0 && (
                  <div className="rounded-lg border border-sand-200 md:col-span-2">
                    <EmptyState
                      title="Chưa có thành viên vi phạm"
                      image={emptyFriendImage}
                    />
                  </div>
                )}

                {memberRows.map((member) => {
                  const violations = getViolationCount(member);
                  const rate = getViolationRate(violations, member.totalMessages);
                  const suggestion = getMemberSuggestion(member);

                  return (
                    <button
                      type="button"
                      onClick={() => openViolationDetail(member)}
                      key={`${member.groupId}-${member.senderId}`}
                      className="rounded-lg border border-sand-200 p-4 text-left transition hover:border-sky-200 hover:bg-sky-50/40 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-100"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <UserAvatar
                            name={member.senderName}
                            avatarUrl={member.senderAvatarUrl}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-sand-900">
                              {member.senderName}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-sand-400">
                              User {member.senderId} · {member.groupName}
                            </p>
                            {member.senderEmail && (
                              <p className="mt-0.5 truncate text-xs text-sand-400">
                                {member.senderEmail}
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${suggestion.includes("kick")
                            ? "border-rose-100 bg-rose-50 text-rose-700"
                            : suggestion.includes("mute")
                              ? "border-amber-100 bg-amber-50 text-amber-700"
                              : "border-sand-200 bg-sand-50 text-sand-600"
                            }`}
                        >
                          {suggestion}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                        <div className="rounded bg-sand-50 px-2 py-2">
                          <p className="text-sm font-semibold text-sand-800">
                            {formatNumber(member.totalMessages)}
                          </p>
                          <p className="text-[11px] text-sand-400">Tin</p>
                        </div>
                        <div className="rounded bg-sand-50 px-2 py-2">
                          <p className="text-sm font-semibold text-sand-800">
                            {formatNumber(member.offensiveMessages)}
                          </p>
                          <p className="text-[11px] text-sand-400">OFF</p>
                        </div>
                        <div className="rounded bg-sand-50 px-2 py-2">
                          <p className="text-sm font-semibold text-sand-800">
                            {formatNumber(member.hateMessages)}
                          </p>
                          <p className="text-[11px] text-sand-400">HATE</p>
                        </div>
                        <div className="rounded bg-sand-50 px-2 py-2">
                          <p className="text-sm font-semibold text-sand-800">
                            {rate}%
                          </p>
                          <p className="text-[11px] text-sand-400">Tỉ lệ</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-sand-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-sand-900">
                  Cần xử lý
                </h2>
                <p className="mt-1 text-xs text-sand-500">
                  Gợi ý dựa trên OFFENSIVE và HATE.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {!loading && reviewQueue.length === 0 && (
                <div className="rounded-lg border border-sand-200">
                  <EmptyState
                    compact
                    title="Chưa có đề xuất xử lý"
                    image={emptyChatImage}
                  />
                </div>
              )}

              {reviewQueue.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-sand-200 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-sand-900">
                        {item.senderName}
                      </p>
                      <p className="mt-0.5 text-xs text-sand-400">
                        {item.groupName}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${item.priority === "HIGH"
                        ? "bg-red-50 text-red-700"
                        : "bg-blue-50 text-blue-700"
                        }`}
                    >
                      {item.priority}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-sand-600">
                    {formatReviewReason(item.reason)}
                  </p>
                  <p className="mt-2 text-xs font-medium text-sand-900">
                    {formatReviewSuggestion(item.suggestion)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>



      </main>

      {selectedViolationUser && createPortal((
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-sand-900/40 px-4 py-10"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedViolationUser(null);
              setSelectedKickGroupId(null);
              setDetailError(null);
            }
          }}
        >
          <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 rounded-t-lg border-b border-sand-200 bg-white p-5">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar
                  name={selectedViolationUser.fullName}
                  avatarUrl={selectedViolationUser.avatarUrl}
                />
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-sand-900">
                    {selectedViolationUser.fullName}
                  </h2>
                  <p className="mt-0.5 truncate text-sm text-sand-500">
                    User {selectedViolationUser.userId}
                    {selectedViolationUser.email
                      ? ` · ${selectedViolationUser.email}`
                      : ""}
                  </p>
                  {detailLoading && (
                    <p className="mt-1 text-xs text-sand-400">
                      Đang tải chi tiết...
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedViolationUser(null);
                  setSelectedKickGroupId(null);
                  setDetailError(null);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-sand-400 transition hover:bg-sand-100 hover:text-sand-700"
                aria-label="Đóng modal"
              >
                <span aria-hidden="true" className="text-xl leading-none">×</span>
              </button>
            </div>

            <div className="space-y-5 p-5">
              {detailError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {detailError}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-sand-50 p-3">
                  <p className="text-xs font-medium text-sand-400">
                    Tổng nhóm tham gia
                  </p>
                  <p className="mt-1 text-xl font-semibold text-sand-900">
                    {formatNumber(selectedViolationUser.totalJoinedGroups)}
                  </p>
                </div>
                <div className="rounded-lg bg-sand-50 p-3">
                  <p className="text-xs font-medium text-sand-400">
                    Tin nhắn trong nhóm vi phạm
                  </p>
                  <p className="mt-1 text-xl font-semibold text-sand-900">
                    {formatNumber(selectedViolationUser.totalMessages)}
                  </p>
                </div>
                <div className="rounded-lg bg-red-50 p-3">
                  <p className="text-xs font-medium text-red-600">
                    Tổng vi phạm
                  </p>
                  <p className="mt-1 text-xl font-semibold text-red-700">
                    {formatNumber(selectedViolations)}
                  </p>
                </div>
                <div className="rounded-lg bg-sky-50 p-3">
                  <p className="text-xs font-medium text-sky-600">
                    Tỷ lệ vi phạm
                  </p>
                  <p className="mt-1 text-xl font-semibold text-sky-700">
                    {selectedViolationRate}%
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-sand-200 p-3">
                  <p className="text-xs font-medium uppercase text-sand-400">
                    OFFENSIVE
                  </p>
                  <p className="mt-1 text-lg font-semibold text-blue-700">
                    {formatNumber(selectedViolationUser.offensiveMessages)}
                  </p>
                </div>
                <div className="rounded-lg border border-sand-200 p-3">
                  <p className="text-xs font-medium uppercase text-sand-400">
                    HATE
                  </p>
                  <p className="mt-1 text-lg font-semibold text-red-700">
                    {formatNumber(selectedViolationUser.hateMessages)}
                  </p>
                </div>
              </div>

              <div>
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-sand-900">
                      Nhóm có tin nhắn vi phạm
                    </h3>
                    <p className="mt-1 text-xs text-sand-500">
                      Chọn một nhóm bên dưới để kick user khỏi nhóm đó.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={selectedKickGroupId ?? ""}
                      onChange={(event) =>
                        setSelectedKickGroupId(Number(event.target.value))
                      }
                      className="h-10 rounded-lg border border-sand-200 bg-white px-3 text-sm text-sand-700 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                    >
                      <option value="" disabled>
                        Chọn nhóm
                      </option>
                      {selectedViolationUser.groups.map((group) => (
                        <option key={group.groupId} value={group.groupId}>
                          {group.groupName}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleKickSelectedUser}
                      disabled={!selectedKickGroupId || kickLoading}
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {kickLoading ? "Đang kick" : "Kick khỏi nhóm"}
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-sand-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-sand-50 text-xs uppercase text-sand-400">
                      <tr>
                        <th className="px-3 py-3 font-medium">Nhóm</th>
                        <th className="px-3 py-3 font-medium">Tin</th>
                        <th className="px-3 py-3 font-medium">OFF</th>
                        <th className="px-3 py-3 font-medium">HATE</th>
                        <th className="px-3 py-3 font-medium">Tỷ lệ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sand-100">
                      {selectedViolationUser.groups.length === 0 ? (
                        <tr>
                          <td
                            className="px-3 py-5 text-sm text-sand-500"
                            colSpan={5}
                          >
                            Không còn nhóm vi phạm nào cho user này.
                          </td>
                        </tr>
                      ) : (
                        selectedViolationUser.groups.map((group) => {
                          const groupViolations = getViolationCount(group);
                          const groupRate = getViolationRate(
                            groupViolations,
                            group.totalMessages,
                          );

                          return (
                            <tr
                              key={group.groupId}
                              className={
                                selectedKickGroupId === group.groupId
                                  ? "bg-sky-50/60"
                                  : undefined
                              }
                            >
                              <td className="px-3 py-3 text-sand-800">
                                {group.groupName}
                                <div className="text-xs text-sand-400">
                                  Group {group.groupId}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-sand-700">
                                {formatNumber(group.totalMessages)}
                              </td>
                              <td className="px-3 py-3 text-blue-700">
                                {formatNumber(group.offensiveMessages)}
                              </td>
                              <td className="px-3 py-3 text-red-700">
                                {formatNumber(group.hateMessages)}
                              </td>
                              <td className="px-3 py-3 text-sky-700">
                                {groupRate}%
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {selectedKickGroup && (
                  <p className="mt-3 text-xs text-sand-500">
                    Sẽ kick khỏi nhóm: {selectedKickGroup.groupName}.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {selectedGroupRisk && createPortal((
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-10"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeGroupModal();
          }}
        >
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-sand-200 bg-white shadow-xl">

            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-sand-200 px-6 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold text-sand-900">
                    {selectedGroupDetail?.name || selectedGroupRisk.groupName}
                  </h2>
                  {(() => {
                    const s = selectedGroupDetail?.status;
                    if (!s) return null;
                    const cfg: Record<string, string> = {
                      ACTIVE: "border-sage-100 bg-sage-50 text-sage-700",
                      INACTIVE: "border-sand-200 bg-sand-50 text-sand-600",
                      ARCHIVED: "border-sand-200 bg-sand-50 text-sand-600",
                      DELETED: "border-rose-100 bg-rose-50 text-rose-700",
                    };
                    const label: Record<string, string> = {
                      ACTIVE: "Hoạt động",
                      INACTIVE: "Đã ẩn",
                      ARCHIVED: "Lưu trữ",
                      DELETED: "Đã xóa",
                    };
                    return (
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${cfg[s] ?? "border-sand-200 bg-sand-50 text-sand-600"}`}>
                        {label[s] ?? s}
                      </span>
                    );
                  })()}
                </div>
                <p className="mt-1 text-xs text-sand-400">
                  Group {selectedGroupRisk.groupId} · Conversation {selectedGroupRisk.conversationId}
                </p>
                {groupDetailLoading && (
                  <p className="mt-1 text-[11px] text-sand-400">Đang tải thông tin nhóm...</p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {/* Kích hoạt / Ẩn nhóm */}
                {selectedGroupDetail?.status === "INACTIVE" ? (
                  <button
                    type="button"
                    onClick={handleActivateSelectedGroup}
                    disabled={groupHideLoading || groupDeleteLoading}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sage-200 bg-sage-50 px-3 text-sm font-medium text-sage-700 transition hover:bg-sage-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {groupHideLoading ? "Đang xử lý..." : "Kích hoạt nhóm"}
                  </button>
                ) : selectedGroupDetail?.status !== "DELETED" && (
                  <button
                    type="button"
                    onClick={() => setConfirmDialog({ open: true, type: "hide" })}
                    disabled={groupHideLoading || groupDeleteLoading}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-sand-300 bg-white px-3 text-sm font-medium text-sand-700 transition hover:bg-sand-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    {groupHideLoading ? "Đang ẩn..." : "Ẩn nhóm"}
                  </button>
                )}

                {/* Xóa nhóm */}
                <button
                  type="button"
                  onClick={() => setConfirmDialog({ open: true, type: "delete" })}
                  disabled={
                    groupDeleteLoading ||
                    groupHideLoading ||
                    selectedGroupDetail?.status === "DELETED"
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                  {groupDeleteLoading ? "Đang xóa..." : "Xóa nhóm"}
                </button>

                {/* Đóng */}
                <button
                  type="button"
                  onClick={closeGroupModal}
                  className="rounded p-1.5 text-sand-400 transition-colors hover:bg-sand-100 hover:text-sand-600"
                  aria-label="Đóng modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Inline confirm dialog */}
            {confirmDialog.open && (
              <div className={`mx-6 mt-4 flex items-start gap-3 rounded-lg border p-4 ${confirmDialog.type === "delete"
                ? "border-rose-200 bg-rose-50"
                : "border-sand-200 bg-sand-50"
                }`}>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${confirmDialog.type === "delete" ? "text-rose-800" : "text-sand-800"}`}>
                    {confirmDialog.type === "delete"
                      ? `Xác nhận xóa nhóm "${selectedGroupDetail?.name || selectedGroupRisk.groupName}"?`
                      : `Xác nhận ẩn nhóm "${selectedGroupDetail?.name || selectedGroupRisk.groupName}"?`}
                  </p>
                  <p className={`mt-1 text-xs ${confirmDialog.type === "delete" ? "text-rose-600" : "text-sand-600"}`}>
                    {confirmDialog.type === "delete"
                      ? "Hành động này không thể hoàn tác. Nhóm sẽ bị xóa vĩnh viễn."
                      : "Nhóm sẽ bị ẩn và thành viên không thể truy cập. Có thể kích hoạt lại sau."}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDialog({ open: false, type: null })}
                    className="h-8 rounded-lg border border-sand-200 bg-white px-3 text-xs font-medium text-sand-700 transition hover:bg-sand-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={confirmDialog.type === "delete" ? handleDeleteSelectedGroup : handleHideSelectedGroup}
                    className={`h-8 rounded-lg px-3 text-xs font-medium text-white transition ${confirmDialog.type === "delete" ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
                      }`}
                  >
                    {confirmDialog.type === "delete" ? "Xóa" : "Ẩn nhóm"}
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {groupDetailError && (
              <div className="mx-6 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {groupDetailError}
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-sand-200 bg-white p-3.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-sand-400">Tin nhắn</p>
                  <p className="mt-1 text-xl font-bold text-sand-800">{formatNumber(selectedGroupRisk.totalMessages)}</p>
                </div>

                <div className="rounded-lg border border-sand-200 bg-white p-3.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-sand-400">Vi phạm</p>
                  <p className="mt-1 text-xl font-bold text-sand-800">
                    {formatNumber(getViolationCount(selectedGroupRisk))}
                  </p>
                </div>

                <div className="rounded-lg border border-sand-200 bg-white p-3.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-sand-400">Tỷ lệ</p>
                  <p className="mt-1 text-xl font-bold text-sand-800">
                    {getViolationRate(getViolationCount(selectedGroupRisk), selectedGroupRisk.totalMessages)}%
                  </p>
                </div>

                <div className="rounded-lg border border-sand-200 bg-white p-3.5 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-sand-400">TV vi phạm</p>
                  <p className="mt-1 text-xl font-bold text-sand-800">
                    {formatNumber(selectedGroupRisk.violatingMembers)}
                  </p>
                </div>
              </div>

              {/* OFFENSIVE / HATE */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-lg border border-sand-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded border border-sand-200 bg-sand-50 px-1.5 py-0.5 text-[10px] font-bold text-sand-600">
                      OFF
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-sand-400">Offensive</p>
                      <p className="mt-0.5 text-base font-bold text-sand-800">{formatNumber(selectedGroupRisk.offensiveMessages)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-sand-200 bg-white px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded border border-sand-200 bg-sand-50 px-1.5 py-0.5 text-[10px] font-bold text-sand-600">
                      HT
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-sand-400">Hate</p>
                      <p className="mt-0.5 text-base font-bold text-sand-800">{formatNumber(selectedGroupRisk.hateMessages)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-sand-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-medium text-sand-400">Loại nhóm</p>
                  <p className="mt-1 text-sm font-semibold text-sand-800">{selectedGroupDetail?.groupType || "—"}</p>
                </div>
                <div className="rounded-lg border border-sand-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-medium text-sand-400">Trạng thái</p>
                  <div className="mt-1">
                    {(() => {
                      const s = selectedGroupDetail?.status;
                      if (!s) return <p className="text-sm font-semibold text-sand-800">—</p>;
                      const label: Record<string, string> = {
                        ACTIVE: "Hoạt động",
                        INACTIVE: "Đã ẩn",
                        ARCHIVED: "Lưu trữ",
                        DELETED: "Đã xóa",
                      };
                      const colorClass: Record<string, string> = {
                        ACTIVE: "border-sage-100 bg-sage-50 text-sage-700",
                        INACTIVE: "border-sand-200 bg-sand-50 text-sand-600",
                        ARCHIVED: "border-sand-200 bg-sand-50 text-sand-600",
                        DELETED: "border-rose-100 bg-rose-50 text-rose-700",
                      };
                      return (
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${colorClass[s] ?? "border-sand-200 bg-sand-50 text-sand-600"}`}>
                          {label[s] ?? s}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="rounded-lg border border-sand-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-medium text-sand-400">Thành viên hiện tại</p>
                  <p className="mt-1 text-sm font-semibold text-sand-800">
                    {formatNumber(selectedGroupDetail?.memberCount ?? selectedGroupRisk.activeMembers)}
                    {selectedGroupDetail?.maxMembers ? ` / ${formatNumber(selectedGroupDetail.maxMembers)}` : ""}
                  </p>
                </div>
                <div className="rounded-lg border border-sand-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-medium text-sand-400">Môn học</p>
                  <p className="mt-1 text-sm font-semibold text-sand-800">{selectedGroupDetail?.subjectName || "—"}</p>
                </div>
              </div>

              {/* Description */}
              <div className="rounded-lg border border-sand-200 bg-white px-4 py-3">
                <p className="text-[11px] font-medium text-sand-400">Mô tả</p>
                <p className="mt-1.5 text-sm leading-6 text-sand-700">
                  {selectedGroupDetail?.description || "Nhóm chưa có mô tả."}
                </p>
              </div>

              {/* Last violation */}
              <div className="rounded-lg border border-sand-200 bg-white px-4 py-3">
                <p className="text-[11px] font-medium text-sand-400">Lần vi phạm gần nhất</p>
                <p className="mt-1 text-sm font-semibold text-sand-800">
                  {formatDateTime(selectedGroupRisk.lastViolationAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}
    </>
  );
}

