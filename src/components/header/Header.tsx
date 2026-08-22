import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
  Popover,
  Dialog,
} from "@mui/material";
import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import SignInModal from "../modal/auth/SignInModal";
import { RootState } from "../../redux/store";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import TextsmsIcon from "@mui/icons-material/Textsms";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import { logout } from "../../services/AuthService";
import { useNavigate } from "react-router-dom";
import WebSocketManager from "../../socket/WebSocketManager";

import {
  loadFriendRequestsService,
  loadFriendProfilesService,
  updateFriendRequestStatusService,
  FriendUser,
  FriendRequestDto
} from "../../services/FriendService";
import { toast } from "react-toastify";
import {
  getUserStudySessions,
  respondToStudySession,
  respondToMultipleStudySessions
} from "../../services/StudySessionService";
import { X, Clock, MapPin, Video, BookOpen, Users, AlertCircle } from "lucide-react";
import { StudySessionResponse } from "../../pages/StudySession/types";
import {
  getPendingGroupInvitations,
  acceptGroupInvitation,
  rejectGroupInvitation,
  GroupInvitationResponse,
  getReceivedPendingGroupJoinRequests
} from "../../services/GroupService";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSessionTimeRange(startTimeStr: string, endTimeStr: string) {
  const start = new Date(startTimeStr);
  const end = new Date(endTimeStr);

  const timeStr = `${start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
  const dateStr = start.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

  return { timeStr, dateStr };
}

function getStudyModeBadge(mode: string) {
  if (mode === "ONLINE") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white text-gray-700 border border-gray-200">Online</span>;
  }
  if (mode === "OFFLINE") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white text-gray-700 border border-gray-200">Trực tiếp</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white text-gray-700 border border-gray-200">Kết hợp</span>;
}

const extractErrorMessage = (res: any, fallback: string): string => {
  if (!res) return fallback;
  if (typeof res === "string") return res;
  if (res.message && res.message !== "No message available") return res.message;
  if (res.error && typeof res.error === "string") return res.error;
  if (res.errors && Array.isArray(res.errors) && res.errors.length > 0) {
    const firstErr = res.errors[0];
    if (typeof firstErr === "string") return firstErr;
    if (firstErr.defaultMessage) return firstErr.defaultMessage;
  }
  return fallback;
};

function formatSessionSingleOptionDate(s: StudySessionResponse) {
  const start = new Date(s.startTime);
  const end = new Date(s.endTime);
  const weekday = start.toLocaleDateString("vi-VN", { weekday: "long" });
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const dateStr = start.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = `${start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}–${end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
  return `${capitalizedWeekday}, ${dateStr} · ${timeStr}`;
}

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const [modalSignIn, setModalSignIn] = useState<boolean>(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<null | HTMLElement>(null);
  const [pendingRequests, setPendingRequests] = useState<(FriendRequestDto & { sender?: FriendUser })[]>([]);
  const [pendingGroupInvitations, setPendingGroupInvitations] = useState<GroupInvitationResponse[]>([]);
  const [groupJoinRequests, setGroupJoinRequests] = useState<GroupInvitationResponse[]>([]);
  const [pendingSessions, setPendingSessions] = useState<StudySessionResponse[]>([]);
  const [headerRecurrenceModalOpen, setHeaderRecurrenceModalOpen] = useState(false);
  const [headerRecurrenceSessions, setHeaderRecurrenceSessions] = useState<StudySessionResponse[]>([]);
  const [headerSelectedSessionIds, setHeaderSelectedSessionIds] = useState<number[]>([]);
  const [headerRecurrenceSelectType, setHeaderRecurrenceSelectType] = useState<"SINGLE" | "ALL" | "CUSTOM">("SINGLE");
  const [headerRespondingType, setHeaderRespondingType] = useState<"ACCEPTED" | "DECLINED" | null>(null);
  const [headerSubmittingRecurrence, setHeaderSubmittingRecurrence] = useState(false);
  const [rejectedInvitations, setRejectedInvitations] = useState<{ groupName: string; inviteeName: string; inviteeUserId: number; timestamp: number }[]>([]);
  const [kickModalOpen, setKickModalOpen] = useState(false);
  const [kickGroupName, setKickGroupName] = useState("");
  const [kickNotificationMessage, setKickNotificationMessage] = useState("");
  const user = useSelector((state: RootState) => state.user);
  const newMess = useSelector((state: RootState) => state.chat.newMess);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const isLoggedIn = localStorage.getItem("accessToken") ? true : false;
  const [currentUserProfile, setCurrentUserProfile] = useState<FriendUser | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setCurrentUserProfile(null);
      return;
    }
    const currentUserId = Number(localStorage.getItem("userId"));
    if (Number.isFinite(currentUserId) && currentUserId > 0) {
      loadFriendProfilesService([currentUserId])
        .then((profiles) => {
          const profile = profiles.find((p) => p.userId === currentUserId);
          if (profile) {
            setCurrentUserProfile(profile);
            if (profile.fullName) localStorage.setItem("fullName", profile.fullName);
            if (profile.avatarUrl) localStorage.setItem("avatarUrl", profile.avatarUrl);
          }
        })
        .catch((err) => {
          console.error("Failed to load current user profile in Header", err);
        });
    }
  }, [isLoggedIn]);

  const fetchPendingGroupInvitations = async () => {
    try {
      const res = await getPendingGroupInvitations();
      if (res.success && Array.isArray(res.data)) {
        setPendingGroupInvitations(res.data);
      } else {
        setPendingGroupInvitations([]);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách lời mời nhóm:", error);
    }
  };

  const fetchGroupJoinRequests = async () => {
    const currentUserId = Number(localStorage.getItem("userId"));
    if (!currentUserId) return;
    try {
      const response = await getReceivedPendingGroupJoinRequests();
      if (response.success && Array.isArray(response.data)) {
        setGroupJoinRequests(response.data);
      } else {
        setGroupJoinRequests([]);
      }
    } catch (error) {
      console.error("Lỗi khi tải danh sách yêu cầu tham gia nhóm:", error);
      setGroupJoinRequests([]);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const data = await loadFriendRequestsService();
      const pendingReceived = data.received.filter((req) => req.status === "PENDING");

      if (pendingReceived.length === 0) {
        setPendingRequests([]);
        return;
      }

      const senderIds = Array.from(new Set(pendingReceived.map((req) => req.senderId)));
      const profiles = await loadFriendProfilesService(senderIds);

      const requestsWithProfiles = pendingReceived.map((req) => {
        const senderProfile = profiles.find((p) => p.userId === req.senderId);
        return {
          ...req,
          sender: senderProfile
        };
      });

      setPendingRequests(requestsWithProfiles);
    } catch (error) {
      console.error("Lỗi khi tải danh sách kết bạn:", error);
    }
  };

  const fetchPendingSessions = async () => {
    try {
      const currentUserId = Number(localStorage.getItem("userId"));
      if (!currentUserId) return;
      const res = await getUserStudySessions(currentUserId, { participantStatus: "PENDING" });
      setPendingSessions(res.data?.content || []);
    } catch (error) {
      console.error("Lỗi khi tải lời mời học nhóm:", error);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setPendingRequests([]);
      setPendingGroupInvitations([]);
      setGroupJoinRequests([]);
      return;
    }

    fetchPendingRequests();
    fetchPendingGroupInvitations();
    fetchGroupJoinRequests();
    fetchPendingSessions();

    const interval = setInterval(() => {
      fetchPendingRequests();
      fetchPendingGroupInvitations();
      fetchGroupJoinRequests();
      fetchPendingSessions();
    }, 10000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  useEffect(() => {
    if (newMess) {
      if (newMess.event === "FRIEND_REQUEST_RECEIVE") {
        fetchPendingRequests();
        window.dispatchEvent(new Event("friend_request_received"));
      } else if (newMess.event === "FRIEND_REQUEST_ACCEPT_RECEIVE") {
        window.dispatchEvent(new Event("friend_status_updated"));
      } else if (newMess.event === "FRIEND_REQUEST_CANCEL_RECEIVE") {
        fetchPendingRequests();
        window.dispatchEvent(new Event("friend_status_updated"));
      } else if (newMess.event === "GROUP_INVITATION_RECEIVE") {
        fetchPendingGroupInvitations();
        fetchGroupJoinRequests();
        window.dispatchEvent(new Event("group_invitations_updated"));

        const data = newMess.data as any;
        const inviterName = data?.inviterName || "";
        const groupName = data?.groupName || "nhóm học";
        const inviteeUserId = data?.inviteeUserId ? Number(data.inviteeUserId) : 0;
        const currentUserId = Number(localStorage.getItem("userId"));

        if (inviteeUserId && inviteeUserId === currentUserId) {
          toast.info(
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontWeight: 600 }}>Lời mời vào nhóm mới!</span>
              <span style={{ fontSize: "13px" }}>
                {inviterName} mời bạn tham gia nhóm {groupName}
              </span>
            </div>,
            {
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            }
          );
        } else {

        }
      } else if (newMess.event === "STUDY_SESSION_CREATED") {
        fetchPendingSessions();
        const data = newMess.data as any;
        const groupName = data?.groupName ? data.groupName : "1-1";
        const totalSessions = data?.totalSessions || 1;
        const isRecurring = !!(data?.recurrenceId && totalSessions > 1);

        const firstSession = data?.sessions?.[0];
        const sessionTitle = firstSession?.sessionTitle || "Học nhóm";

        let startTimeStr = "sắp tới";
        if (firstSession?.startTime) {
          startTimeStr = firstSession.startTime;
        }

        toast.info(
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontWeight: 600 }}>
              {isRecurring ? `Bạn có chuỗi lịch học lặp mới (${totalSessions} buổi)!` : "Bạn có lịch học mới!"}
            </span>
            <span style={{ fontSize: "13px" }}>
              {isRecurring
                ? `Lịch học "${sessionTitle}" (${groupName}) lặp gồm ${totalSessions} buổi bắt đầu từ lúc ${startTimeStr}`
                : `Lịch học "${sessionTitle}" (${groupName}) vào lúc ${startTimeStr}`}
            </span>
          </div>,
          {
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          }
        );
      } else if (newMess.event === "GROUP_INVITATION_REJECTED") {
        window.dispatchEvent(new CustomEvent("group_invitation_status_updated", { detail: newMess.data }));
        const d = newMess.data as any;
        const inviteeId = Number(d?.inviteeUserId);
        const groupName = d?.groupName || "học";
        const ts = Date.now();
        
        if (inviteeId) {
          loadFriendProfilesService([inviteeId])
            .then((profiles) => {
              const name = profiles?.[0]?.fullName || `User #${inviteeId}`;
              setRejectedInvitations((prev) => [
                { groupName, inviteeName: name, inviteeUserId: inviteeId, timestamp: ts },
                ...prev,
              ].slice(0, 20));
            })
            .catch(() => {
              setRejectedInvitations((prev) => [
                { groupName, inviteeName: `User #${inviteeId}`, inviteeUserId: inviteeId, timestamp: ts },
                ...prev,
              ].slice(0, 20));
            });
        }
      } else if (newMess.event === "GROUP_MEMBER_KICKED" || newMess.event === "GROUP_STATUS_UPDATED") {
        const d = newMess.data as any;
        const gName = d?.groupName || "nhóm học";
        const status = d?.status;
        let msg = `Bạn đã bị mời ra khỏi nhóm "${gName}" bởi quản trị viên.`;
        if (status === "INACTIVE") {
          msg = `Nhóm "${gName}" đã bị ẩn bởi quản trị viên do vi phạm hoặc tạm ngưng hoạt động.`;
        } else if (status === "DELETED") {
          msg = `Nhóm "${gName}" đã bị xóa bởi quản trị viên.`;
        }
        setKickGroupName(gName);
        setKickNotificationMessage(msg);
        setKickModalOpen(true);
        window.dispatchEvent(new Event("group_list_updated"));
        if (window.location.pathname.includes("/conversation")) {
          navigate("/conversation", { replace: true });
        }
      } else if (newMess.event === "FORCE_LOGOUT" || newMess.event === "USER_LOCKED") {
        const d = newMess.data as any;
        const reason = d?.reason || "Tài khoản của bạn đã bị khóa hoặc ngừng hoạt động bởi quản trị viên.";
        import("../../config/apiClient").then(({ handleForcedLogout }) => {
          handleForcedLogout(reason);
        });
      }
    }
  }, [newMess]);
  const handleOpenNotifications = (event: React.MouseEvent<HTMLElement>) => {
    setPopoverAnchor(event.currentTarget);
  };

  const handleCloseNotifications = () => {
    setPopoverAnchor(null);
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      const response = await updateFriendRequestStatusService(requestId, "APPROVED");
      const responseCode = Number(response.code);
      if (responseCode >= 200 && responseCode < 300) {
        const req = pendingRequests.find((r) => r.id === requestId);
        const currentUserId = Number(localStorage.getItem("userId"));
        if (req && currentUserId) {
          try {
            WebSocketManager.getInstance().sendMessage("/chat/send", {
              event: "FRIEND_REQUEST_ACCEPT",
              data: {
                senderId: currentUserId,
                receiverId: req.senderId
              }
            });
          } catch (socketErr) {
            console.error("Failed to emit FRIEND_REQUEST_ACCEPT socket event", socketErr);
          }
        }

        fetchPendingRequests();
        window.dispatchEvent(new Event("friend_status_updated"));
      } else {
        toast.error("Thao tác thất bại. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Đã xảy ra lỗi.");
    }
  };

  const handleDeclineRequest = async (requestId: number) => {
    try {
      const response = await updateFriendRequestStatusService(requestId, "REJECTED");
      const responseCode = Number(response.code);
      if (responseCode >= 200 && responseCode < 300) {
        fetchPendingRequests();
        window.dispatchEvent(new Event("friend_status_updated"));
      } else {
        toast.error("Thao tác thất bại. Vui lòng thử lại.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Đã xảy ra lỗi.");
    }
  };

  const handleAcceptSession = async (sessionId: number, recurrenceId?: string | null) => {
    try {
      const currentUserId = Number(localStorage.getItem("userId"));
      if (!currentUserId) return;
      if (recurrenceId) {
        handleCloseNotifications();
        navigate(`/schedule?sessionId=${sessionId}`);
        toast.info("Vui lòng xác nhận tham gia chuỗi lịch lặp này tại trang lịch học.");
        return;
      }
      const res = await respondToStudySession(sessionId, currentUserId, "ACCEPTED");
      if (res.success) {
        fetchPendingSessions();
        window.dispatchEvent(new Event("study_session_updated"));
      } else {
        toast.error(extractErrorMessage(res, "Thao tác thất bại."));
      }
    } catch (error) {
      toast.error("Đã xảy ra lỗi.");
    }
  };

  const handleDeclineSession = async (sessionId: number, recurrenceId?: string | null) => {
    try {
      const currentUserId = Number(localStorage.getItem("userId"));
      if (!currentUserId) return;
      if (recurrenceId) {
        handleCloseNotifications();
        navigate(`/schedule?sessionId=${sessionId}`);
        toast.info("Vui lòng từ chối chuỗi lịch lặp này tại trang lịch học.");
        return;
      }
      const res = await respondToStudySession(sessionId, currentUserId, "DECLINED");
      if (res.success) {
        fetchPendingSessions();
        window.dispatchEvent(new Event("study_session_updated"));
      } else {
        toast.error(extractErrorMessage(res, "Thao tác thất bại."));
      }
    } catch (error) {
      toast.error("Đã xảy ra lỗi.");
    }
  };

  const handleAcceptGroupInvitation = async (invitationId: number) => {
    try {
      const res = await acceptGroupInvitation(invitationId);
      if (res.success) {
        fetchPendingGroupInvitations();
        fetchGroupJoinRequests();
        window.dispatchEvent(new Event("group_list_updated"));
        window.dispatchEvent(new Event("group_invitations_updated"));
      } else {
        console.error(res.message || "Không thể chấp nhận lời mời.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleRejectGroupInvitation = async (invitationId: number) => {
    try {
      const res = await rejectGroupInvitation(invitationId);
      if (res.success) {
        fetchPendingGroupInvitations();
        fetchGroupJoinRequests();
        window.dispatchEvent(new Event("group_invitations_updated"));
      } else {
        console.error(res.message || "Không thể từ chối lời mời.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    WebSocketManager.getInstance().disconnect();
    const response = await logout();

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userId");
    if (response.success) {
      navigate("/login");
    } else {
      toast.error("Đăng xuất thất bại. Vui lòng thử lại");
    }
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
  };

  const handleGoProfile = () => {
    handleCloseMenu();
    const userId = localStorage.getItem("userId");
    if (userId) {
      navigate(`/profile/${userId}`);
    } else {
      navigate("/my-profile");
    }
  };

  const handleGoSettings = () => {
    handleCloseMenu();
    navigate("/my-profile");
  };

  const handleOpenSignIn = () => {
    handleCloseMenu();
    setModalSignIn(true);
  };

  const handleGoRegister = () => {
    handleCloseMenu();
    navigate("/register");
  };

  const hanldeLougout = async () => {
    const response = await logout();

    WebSocketManager.getInstance().disconnect();
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userId");
    if (response.success) {
      navigate("/login");
    }
  };

  const validPendingSessions = pendingSessions.filter(
    (session) => session.endTime && new Date(session.endTime) > new Date()
  );

  const groupedPendingSessions: {
    isRecurring: boolean;
    recurrenceId: string | null;
    sessions: StudySessionResponse[];
  }[] = useMemo(() => {
    const recurringGroups: { [key: string]: StudySessionResponse[] } = {};
    const nonRecurring: StudySessionResponse[] = [];

    validPendingSessions.forEach((session) => {
      const recId = session.recurrenceId;
      const isSessionRecurring = !!(recId && recId !== "null" && recId !== "undefined");
      if (isSessionRecurring) {
        if (!recurringGroups[recId!]) {
          recurringGroups[recId!] = [];
        }
        recurringGroups[recId!].push(session);
      } else {
        nonRecurring.push(session);
      }
    });

    const result: {
      isRecurring: boolean;
      recurrenceId: string | null;
      sessions: StudySessionResponse[];
    }[] = [];

    Object.keys(recurringGroups).forEach((recId) => {
      const list = recurringGroups[recId];
      list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      result.push({
        isRecurring: true,
        recurrenceId: recId,
        sessions: list,
      });
    });

    nonRecurring.forEach((session) => {
      result.push({
        isRecurring: false,
        recurrenceId: null,
        sessions: [session],
      });
    });

    result.sort(
      (a, b) => new Date(b.sessions[0].startTime).getTime() - new Date(a.sessions[0].startTime).getTime()
    );

    return result;
  }, [validPendingSessions]);

  const handleOpenRecurrenceModalFromHeader = (
    sessions: StudySessionResponse[],
    status: "ACCEPTED" | "DECLINED"
  ) => {
    handleCloseNotifications();
    setHeaderRecurrenceSessions(sessions);
    setHeaderSelectedSessionIds(sessions.map((s) => s.id));
    setHeaderRecurrenceSelectType("SINGLE");
    setHeaderRespondingType(status);
    setHeaderRecurrenceModalOpen(true);
  };

  const handleHeaderRecurrenceSubmit = async () => {
    if (!headerRespondingType) return;
    const userIdVal = Number(localStorage.getItem("userId"));
    if (!userIdVal) return;

    let idsToRespond: number[] = [];
    if (headerRecurrenceSelectType === "SINGLE") {
      idsToRespond = headerRecurrenceSessions[0] ? [headerRecurrenceSessions[0].id] : [];
    } else if (headerRecurrenceSelectType === "ALL") {
      idsToRespond = headerRecurrenceSessions.map(s => s.id);
    } else {
      idsToRespond = headerSelectedSessionIds;
    }

    if (idsToRespond.length === 0) {
      toast.warning("Vui lòng chọn ít nhất một buổi học");
      return;
    }

    try {
      setHeaderSubmittingRecurrence(true);
      const res = await respondToMultipleStudySessions(userIdVal, idsToRespond, headerRespondingType);
      if (res.success) {
        toast.success(
          headerRespondingType === "ACCEPTED"
            ? `Đã xác nhận tham gia ${idsToRespond.length} buổi học`
            : `Đã từ chối tham gia ${idsToRespond.length} buổi học`
        );
        setHeaderRecurrenceModalOpen(false);
        fetchPendingSessions();
        window.dispatchEvent(new Event("study_session_updated"));
      } else {
        toast.error(extractErrorMessage(res, "Không thể cập nhật trạng thái chuỗi lịch học"));
      }
    } catch (error) {
      toast.error("Có lỗi xảy ra khi cập nhật trạng thái chuỗi lịch học");
    } finally {
      setHeaderSubmittingRecurrence(false);
    }
  };

  return (
    <>
      <Box
        sx={{
          width: "100%",
          height: "fit-content",
          padding: "10px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #e2e8f0",
          background: "#ffffff",
          position: "sticky",
          top: 0,
          zIndex: 1000,
        }}
      >
        {isLoggedIn ? (
          <>
            <Box
              sx={{ display: "flex", width: "100%", alignItems: "center" }}
            >
              <Box
                sx={{ width: { xs: "auto", md: "75%" }, flexGrow: { xs: 1, md: 0 }, display: "flex", alignItems: "center", gap: { xs: "12px", md: "24px" } }}
              >
                <Typography
                  sx={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#1f2937",
                    letterSpacing: "-0.2px",
                    cursor: "pointer",
                  }}
                  onClick={() => navigate("/home")}
                >
                  
                </Typography>
                
                <TextField
                  placeholder="Tìm kiếm bạn học, nhóm học..."
                  variant="outlined"
                  size="small"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <IconButton onClick={handleSearch} size="small" sx={{ p: 0 }}>
                          <SearchIcon sx={{ color: "#9ca3af", fontSize: "18px" }} />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      width: { xs: "100%", sm: "260px", md: "320px" },
                      height: "36px",
                      borderRadius: "10px",
                      backgroundColor: "#f3f4f6",
                      "& fieldset": { border: "none" },
                      "&:hover fieldset": { border: "none" },
                      "&.Mui-focused": {
                        backgroundColor: "#ffffff",
                        boxShadow: "0 0 0 2px rgba(37, 99, 235, 0.2)",
                        "& fieldset": { border: "1px solid #2563eb" },
                      },
                    },
                    "& .MuiInputBase-input": {
                      fontSize: "13px",
                      color: "#1f2937",
                      padding: "0px",
                    },
                  }}
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "end",
                  width: { xs: "auto", md: "25%" },
                  alignItems: "center",
                  gap: "8px",
                  flexShrink: 0,
                }}
              >
                <Tooltip title="Thông báo">
                  <IconButton
                    onClick={handleOpenNotifications}
                    sx={{
                      bgcolor: "#f0f7ff",
                      "&:hover": { bgcolor: "#e0effe" },
                    }}
                  >
                    <Badge
                      color="error"
                      variant="dot"
                      invisible={pendingRequests.length === 0 && pendingGroupInvitations.length === 0 && groupJoinRequests.length === 0 && rejectedInvitations.length === 0 && groupedPendingSessions.length === 0}
                    >
                      <NotificationsActiveIcon
                        sx={{ color: "#2563eb", fontSize: "20px" }}
                      />
                    </Badge>
                  </IconButton>
                </Tooltip>
                <Button
                  onClick={handleOpenMenu}
                  endIcon={<ExpandMoreIcon sx={{ color: "#9ca3af", display: { xs: "none", md: "inline-flex" } }} />}
                  sx={{
                    textTransform: "none",
                    borderRadius: "10px",
                    padding: { xs: "4px", md: "5px 10px" },
                    background: { xs: "transparent", md: "#fafaf8" },
                    border: { xs: "none", md: "1px solid #e5e0d8" },
                    color: "#1f2937",
                    gap: "6px",
                    minWidth: "auto",
                    "&:hover": {
                      background: { xs: "rgba(0, 0, 0, 0.04)", md: "#f0f7ff" },
                      borderColor: { xs: "transparent", md: "#2563eb" },
                    },
                  }}
                >
                  <Avatar
                    src={(() => {
                      const url = currentUserProfile?.avatarUrl || user?.avatar || localStorage.getItem("avatarUrl");
                      return (url && url !== "null" && url !== "undefined" && url.trim() !== "") ? url : undefined;
                    })()}
                    sx={{ width: 32, height: 32 }}
                  />
                  <Box sx={{ textAlign: "left", display: { xs: "none", md: "block" } }}>
                    <Typography
                      sx={{ fontWeight: 700, fontSize: 13, color: "#1f2937" }}
                    >
                      {currentUserProfile?.fullName || localStorage.getItem("fullName") || user?.username || "StudyMate"}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: "#9ca3af" }}>
                      Học viên
                    </Typography>
                  </Box>
                </Button>
              </Box>
            </Box>
          </>
        ) : (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: "24px" }}>

            </Box>
            <Box>
              <Button
                onClick={handleOpenMenu}
                endIcon={<ExpandMoreIcon sx={{ color: "#9ca3af", display: { xs: "none", md: "inline-flex" } }} />}
                sx={{
                  textTransform: "none",
                  borderRadius: "10px",
                  padding: { xs: "4px", md: "5px 10px" },
                  background: { xs: "transparent", md: "#fafaf8" },
                  border: { xs: "none", md: "1px solid #e5e0d8" },
                  color: "#1f2937",
                  gap: "6px",
                  "&:hover": {
                    background: { xs: "rgba(0, 0, 0, 0.04)", md: "#f0f7ff" },
                    borderColor: { xs: "transparent", md: "#2563eb" },
                  },
                }}
              >
                <Avatar sx={{ width: 30, height: 30, bgcolor: "#f0f7ff" }}>
                  <PersonOutlineIcon sx={{ color: "#2563eb" }} />
                </Avatar>
                <Box sx={{ textAlign: "left", display: { xs: "none", md: "block" } }}>
                  <Typography
                    sx={{ fontWeight: 700, fontSize: 13, color: "#1f2937" }}
                  >
                    Tài khoản
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: "#9ca3af" }}>
                    Đăng nhập để tiếp tục
                  </Typography>
                </Box>
              </Button>
            </Box>
          </>
        )}
      </Box>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: "10px",
            minWidth: 210,
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            border: "1px solid #e2e8f0",
            px: 0.5,
          },
        }}
      >
        {isLoggedIn ? (
          <Box sx={{ px: 1.5, py: 1 }}>
            <Typography
              sx={{ fontWeight: 700, fontSize: 14, color: "#1f2937" }}
            >
              {user?.username}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#9ca3af" }}>
              {user?.email || ""}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ px: 1.5, py: 1 }}>
            <Typography
              sx={{ fontWeight: 700, fontSize: 14, color: "#1f2937" }}
            >
              Chào bạn
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#9ca3af" }}>
              Đăng nhập để kết nối bạn bè
            </Typography>
          </Box>
        )}
        <Divider sx={{ my: 0.5, borderColor: "#e2e8f0" }} />
        {isLoggedIn ? (
          <>
            <MenuItem
              onClick={handleGoProfile}
              sx={{
                borderRadius: "8px",
                fontSize: 13,
                color: "#374151",
                py: 1,
                "&:hover": { bgcolor: "#f0f7ff", color: "#1d4ed8" },
              }}
            >
              <PersonOutlineIcon
                sx={{ fontSize: 17, mr: 1, color: "#9ca3af" }}
              />
              Hồ sơ của tôi
            </MenuItem>
            <MenuItem
              onClick={handleGoSettings}
              sx={{
                borderRadius: "8px",
                fontSize: 13,
                color: "#374151",
                py: 1,
                "&:hover": { bgcolor: "#f0f7ff", color: "#1d4ed8" },
              }}
            >
              <SettingsOutlinedIcon
                sx={{ fontSize: 17, mr: 1, color: "#9ca3af" }}
              />
              Cài đặt tài khoản
            </MenuItem>
            <MenuItem
              onClick={handleCloseMenu}
              sx={{
                borderRadius: "8px",
                fontSize: 13,
                color: "#374151",
                py: 1,
                "&:hover": { bgcolor: "#f0f7ff", color: "#1d4ed8" },
              }}
            >
              <HelpOutlineIcon
                sx={{ fontSize: 17, mr: 1, color: "#9ca3af" }}
              />
              Hỗ trợ
            </MenuItem>
            <Divider sx={{ my: 0.5, borderColor: "#e2e8f0" }} />
            <MenuItem
              onClick={handleLogout}
              sx={{
                borderRadius: "8px",
                fontSize: 13,
                color: "#ef4444",
                py: 1,
                "&:hover": { bgcolor: "#fef2f2" },
              }}
            >
              <LogoutOutlinedIcon
                sx={{ fontSize: 17, mr: 1, color: "#ef4444" }}
              />
              Đăng xuất
            </MenuItem>
          </>
        ) : (
          <>
            <MenuItem
              onClick={handleOpenSignIn}
              sx={{
                borderRadius: "8px",
                fontSize: 13,
                color: "#374151",
                py: 1,
                "&:hover": { bgcolor: "#eff6ff", color: "#2563eb" },
              }}
            >
              <PersonOutlineIcon
                sx={{ fontSize: 17, mr: 1, color: "#9ca3af" }}
              />
              Đăng nhập
            </MenuItem>
            <MenuItem
              onClick={handleGoRegister}
              sx={{
                borderRadius: "8px",
                fontSize: 13,
                color: "#374151",
                py: 1,
                "&:hover": { bgcolor: "#eff6ff", color: "#2563eb" },
              }}
            >
              <SettingsOutlinedIcon
                sx={{ fontSize: 17, mr: 1, color: "#9ca3af" }}
              />
              Tạo tài khoản
            </MenuItem>
            <MenuItem
              onClick={handleCloseMenu}
              sx={{
                borderRadius: "8px",
                fontSize: 13,
                color: "#374151",
                py: 1,
                "&:hover": { bgcolor: "#eff6ff", color: "#2563eb" },
              }}
            >
              <HelpOutlineIcon
                sx={{ fontSize: 17, mr: 1, color: "#9ca3af" }}
              />
              Hỗ trợ
            </MenuItem>
          </>
        )}
      </Menu>
      <SignInModal open={modalSignIn} setModal={setModalSignIn}></SignInModal>

      <Popover
        anchorEl={popoverAnchor}
        open={Boolean(popoverAnchor)}
        onClose={handleCloseNotifications}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            mt: 1,
            width: 320,
            maxWidth: "100%",
            maxHeight: 450,
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            border: "1px solid #e2e8f0",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Box
          sx={{
            mb: 1.5,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "16px",
              color: "#1f2937",
            }}
          >
            Thông báo
          </Typography>
          {(pendingRequests.length + pendingGroupInvitations.length + groupJoinRequests.length + rejectedInvitations.length + groupedPendingSessions.length) > 0 && (
            <Box
              sx={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                borderRadius: '12px',
                padding: '0 8px',
                fontSize: '12px',
                fontWeight: 600,
                height: '22px',
                minWidth: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              {pendingRequests.length + pendingGroupInvitations.length + groupJoinRequests.length + rejectedInvitations.length + groupedPendingSessions.length}
            </Box>
          )}
        </Box>
        <Divider sx={{ mb: 1, borderColor: "#e2e8f0" }} />
        <Box sx={{ flexGrow: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
          {(pendingRequests.length === 0 && pendingGroupInvitations.length === 0 && groupJoinRequests.length === 0 && rejectedInvitations.length === 0 && groupedPendingSessions.length === 0) ? (
            <Box
              sx={{
                py: 4,
                textAlign: "center",
                color: "#9ca3af",
              }}
            >
              <Typography sx={{ fontSize: "13px", fontWeight: 500 }}>
                Không có thông báo mới
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>

              {rejectedInvitations.map((rej, idx) => (
                <Box
                  key={`rej-${idx}-${rej.timestamp}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    backgroundColor: "#fff5f5",
                    border: "1px solid #fee2e2",
                  }}
                >
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: "12.5px",
                        color: "#475569",
                        lineHeight: 1.4,
                      }}
                    >
                      <strong style={{ color: "#0f172a", fontWeight: 700 }}>{rej.inviteeName}</strong> đã từ chối lời mời vào nhóm <strong style={{ color: "#0f172a", fontWeight: 700 }}>{rej.groupName}</strong>
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    onClick={() => setRejectedInvitations((prev) => prev.filter((_, i) => i !== idx))}
                    sx={{ minWidth: "auto", padding: "2px", color: "#9ca3af", fontSize: "11px" }}
                  >
                    ✕
                  </Button>
                </Box>
              ))}

              {pendingRequests.map((req) => (
                <Box
                  key={`fr-${req.id}`}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    padding: "10px",
                    borderRadius: "8px",
                    backgroundColor: "#fafaf8",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Avatar
                      src={req.sender?.avatarUrl || undefined}
                      sx={{ width: 36, height: 36 }}
                    />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: "13px",
                          color: "#1f2937",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {req.sender?.fullName || ""}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "11px",
                          color: "#6b7280",
                        }}
                      >
                        Muốn kết bạn với bạn
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleDeclineRequest(req.id)}
                      sx={{
                        fontSize: "11px",
                        textTransform: "none",
                        color: "#ef4444",
                        borderColor: "#fca5a5",
                        borderRadius: "6px",
                        padding: "2px 8px",
                        minWidth: "60px",
                        "&:hover": {
                          backgroundColor: "#fef2f2",
                          borderColor: "#ef4444",
                        },
                      }}
                    >
                      Từ chối
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleAcceptRequest(req.id)}
                      sx={{
                        fontSize: "11px",
                        textTransform: "none",
                        backgroundColor: "#2563eb",
                        color: "#ffffff",
                        borderRadius: "6px",
                        padding: "2px 8px",
                        minWidth: "60px",
                        boxShadow: "none",
                        "&:hover": {
                          backgroundColor: "#1d4ed8",
                          boxShadow: "none",
                        },
                      }}
                    >
                      Chấp nhận
                    </Button>
                  </Box>
                </Box>
              ))}

              {groupedPendingSessions.length > 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "12px", color: "#6b7280", mb: 0.5 }}>
                    Lời mời học nhóm ({groupedPendingSessions.length})
                  </Typography>
                  {groupedPendingSessions.map((group) => {
                    const firstSession = group.sessions[0];
                    const isRec = group.isRecurring;
                    const sessionCount = group.sessions.length;
                    const displayTitle = isRec
                      ? `${firstSession.title} (Lịch lặp - ${sessionCount} buổi)`
                      : firstSession.title;

                    return (
                      <Box
                        key={isRec ? `rec-${group.recurrenceId}` : `single-${firstSession.id}`}
                        onClick={() => {
                          handleCloseNotifications();
                          navigate(`/schedule?sessionId=${firstSession.id}`);
                        }}
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          padding: "10px",
                          borderRadius: "8px",
                          backgroundColor: "#fafaf8",
                          border: "1px solid #e2e8f0",
                          cursor: "pointer",
                          "&:hover": {
                            backgroundColor: "#f5f5f0",
                          },
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Avatar sx={{ bgcolor: "#f0f7ff", width: 36, height: 36 }}>
                            <NotificationsActiveIcon sx={{ color: "#2563eb", fontSize: 18 }} />
                          </Avatar>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: "13px",
                                color: "#1f2937",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {displayTitle}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "11px",
                                color: "#6b7280",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {firstSession.groupName ? `Nhóm: ${firstSession.groupName}` : "Lịch học 1-1"}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: "10px",
                                color: "#9ca3af",
                              }}
                            >
                              Bắt đầu: {new Date(firstSession.startTime).toLocaleString("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {isRec && " (Chuỗi lịch lặp)"}
                            </Typography>
                          </Box>
                        </Box>
                        <Box
                          sx={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              if (isRec && group.sessions.length > 1) {
                                handleOpenRecurrenceModalFromHeader(group.sessions, "DECLINED");
                              } else {
                                handleDeclineSession(firstSession.id, null);
                              }
                            }}
                            sx={{
                              fontSize: "11px",
                              textTransform: "none",
                              color: "#ef4444",
                              borderColor: "#fca5a5",
                              borderRadius: "6px",
                              padding: "2px 8px",
                              minWidth: "60px",
                              "&:hover": {
                                backgroundColor: "#fef2f2",
                                borderColor: "#ef4444",
                              },
                            }}
                          >
                            Từ chối
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => {
                              if (isRec && group.sessions.length > 1) {
                                handleOpenRecurrenceModalFromHeader(group.sessions, "ACCEPTED");
                              } else {
                                handleAcceptSession(firstSession.id, null);
                              }
                            }}
                            sx={{
                              fontSize: "11px",
                              textTransform: "none",
                              backgroundColor: "#2563eb",
                              color: "#ffffff",
                              borderRadius: "6px",
                              padding: "2px 8px",
                              minWidth: "60px",
                              boxShadow: "none",
                              "&:hover": {
                                backgroundColor: "#1d4ed8",
                                boxShadow: "none",
                              },
                            }}
                          >
                            Chấp nhận
                          </Button>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}

              {pendingGroupInvitations.map((inv) => (
                <Box
                  key={`gi-${inv.invitationId}`}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    padding: "10px",
                    borderRadius: "8px",
                    backgroundColor: "#fafaf8",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Avatar
                      src={inv.inviterAvatar || undefined}
                      sx={{ width: 36, height: 36 }}
                    />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: "13px",
                          color: "#1f2937",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {inv.inviterName}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "11px",
                          color: "#6b7280",
                        }}
                      >
                        Mời bạn vào nhóm <strong>{inv.groupName}</strong>
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleRejectGroupInvitation(inv.invitationId)}
                      sx={{
                        fontSize: "11px",
                        textTransform: "none",
                        color: "#ef4444",
                        borderColor: "#fca5a5",
                        borderRadius: "6px",
                        padding: "2px 8px",
                        minWidth: "60px",
                        "&:hover": {
                          backgroundColor: "#fef2f2",
                          borderColor: "#ef4444",
                        },
                      }}
                    >
                      Từ chối
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleAcceptGroupInvitation(inv.invitationId)}
                      sx={{
                        fontSize: "11px",
                        textTransform: "none",
                        backgroundColor: "#2563eb",
                        color: "#ffffff",
                        borderRadius: "6px",
                        padding: "2px 8px",
                        minWidth: "60px",
                        boxShadow: "none",
                        "&:hover": {
                          backgroundColor: "#1d4ed8",
                          boxShadow: "none",
                        },
                      }}
                    >
                      Đồng ý
                    </Button>
                  </Box>
                </Box>
              ))}

              {groupJoinRequests.map((req) => (
                <Box
                  key={`gjr-${req.invitationId}`}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    padding: "10px",
                    borderRadius: "8px",
                    backgroundColor: "#fafaf8",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Avatar
                      src={req.inviterAvatar || undefined}
                      sx={{ width: 36, height: 36 }}
                    />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontSize: "13px",
                          color: "#1f2937",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {req.inviterName}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "11px",
                          color: "#6b7280",
                        }}
                      >
                        Yêu cầu tham gia nhóm <strong>{req.groupName}</strong>
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleRejectGroupInvitation(req.invitationId)}
                      sx={{
                        fontSize: "11px",
                        textTransform: "none",
                        color: "#ef4444",
                        borderColor: "#fca5a5",
                        borderRadius: "6px",
                        padding: "2px 8px",
                        minWidth: "60px",
                        "&:hover": {
                          backgroundColor: "#fef2f2",
                          borderColor: "#ef4444",
                        },
                      }}
                    >
                      Từ chối
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleAcceptGroupInvitation(req.invitationId)}
                      sx={{
                        fontSize: "11px",
                        textTransform: "none",
                        backgroundColor: "#2563eb",
                        color: "#ffffff",
                        borderRadius: "6px",
                        padding: "2px 8px",
                        minWidth: "60px",
                        boxShadow: "none",
                        "&:hover": {
                          backgroundColor: "#1d4ed8",
                          boxShadow: "none",
                        },
                      }}
                    >
                      Đồng ý
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Popover>

      <Dialog
        open={kickModalOpen}
        onClose={() => {
          setKickModalOpen(false);
          if (window.location.pathname.includes("/conversation")) {
            window.location.href = "/conversation";
          }
        }}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            padding: "24px",
            maxWidth: "420px",
            textAlign: "center",
          },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#dc2626",
            }}
          >
            <AlertCircle size={26} />
          </Box>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: "#111827", fontSize: "17px" }}>
          Thông báo nhóm học
        </Typography>
        <Typography variant="body2" sx={{ color: "#4b5563", mb: 3, lineHeight: 1.6 }}>
          {kickNotificationMessage || `Bạn đã bị mời ra khỏi nhóm "${kickGroupName}" bởi quản trị viên.`}
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Button
            variant="contained"
            onClick={() => {
              setKickModalOpen(false);
              if (window.location.pathname.includes("/conversation")) {
                window.location.href = "/conversation";
              }
            }}
            sx={{
              backgroundColor: "#2563eb",
              color: "#ffffff",
              textTransform: "none",
              borderRadius: "8px",
              fontWeight: 600,
              padding: "8px 28px",
              boxShadow: "none",
              "&:hover": {
                backgroundColor: "#1d4ed8",
                boxShadow: "none",
              },
            }}
          >
            Đã hiểu
          </Button>
        </Box>
      </Dialog>

      <Dialog
        open={headerRecurrenceModalOpen}
        onClose={() => {
          if (!headerSubmittingRecurrence) {
            setHeaderRecurrenceModalOpen(false);
            setHeaderRespondingType(null);
          }
        }}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            width: "100%",
            maxWidth: "500px",
            overflow: "hidden",
            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
            padding: 0,
          },
        }}
      >
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5 shrink-0">
          <h3 className="text-base font-bold text-gray-900 leading-snug">
            {headerRespondingType === "ACCEPTED" ? "Xác nhận tham gia" : "Từ chối lịch học"}
          </h3>
          <button
            type="button"
            onClick={() => {
              setHeaderRecurrenceModalOpen(false);
              setHeaderRespondingType(null);
            }}
            disabled={headerSubmittingRecurrence}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto overflow-x-hidden">
          <p className="text-sm font-semibold text-gray-800">
            Bạn muốn áp dụng cho những buổi nào?
          </p>

          <div className="space-y-3">
            {headerRecurrenceSessions[0] && (
              <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer select-none">
                <input
                  type="radio"
                  name="headerRecurrenceSelectType"
                  checked={headerRecurrenceSelectType === "SINGLE"}
                  onChange={() => setHeaderRecurrenceSelectType("SINGLE")}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-200"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-800">
                    Chỉ buổi này
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    {formatSessionSingleOptionDate(headerRecurrenceSessions[0])}
                  </span>
                </div>
              </label>
            )}

            <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer select-none">
              <input
                type="radio"
                name="headerRecurrenceSelectType"
                checked={headerRecurrenceSelectType === "ALL"}
                onChange={() => setHeaderRecurrenceSelectType("ALL")}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-200"
              />
              <div>
                <span className="text-sm font-semibold text-gray-800">
                  Tất cả {headerRecurrenceSessions.length} buổi chưa phản hồi
                </span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  Áp dụng cho các buổi sắp tới trong chuỗi
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer select-none">
              <input
                type="radio"
                name="headerRecurrenceSelectType"
                checked={headerRecurrenceSelectType === "CUSTOM"}
                onChange={() => setHeaderRecurrenceSelectType("CUSTOM")}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-200"
              />
              <div>
                <span className="text-sm font-semibold text-gray-800">
                  Tự chọn buổi học
                </span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  Chỉ áp dụng cho những buổi được chọn cụ thể dưới đây
                </span>
              </div>
            </label>
          </div>

          {headerRecurrenceSelectType === "CUSTOM" && (
            <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 bg-gray-50/50 max-h-48 overflow-y-auto">
              {headerRecurrenceSessions.map((s) => {
                const isSel = headerSelectedSessionIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className={`flex items-start gap-3 px-4 py-3.5 hover:bg-white cursor-pointer select-none transition-colors ${isSel ? "bg-blue-50/20" : ""
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => {
                        if (isSel) {
                          setHeaderSelectedSessionIds(
                            headerSelectedSessionIds.filter((id) => id !== s.id)
                          );
                        } else {
                          setHeaderSelectedSessionIds([
                            ...headerSelectedSessionIds,
                            s.id,
                          ]);
                        }
                      }}
                      className="mt-1 h-4.5 w-4.5 rounded border-gray-300 text-blue-600 focus:ring-blue-200"
                    />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-bold text-gray-800 truncate">
                          {s.title}
                        </div>
                        {getStudyModeBadge(s.studyMode)}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          {(() => {
                            const { timeStr, dateStr } = formatSessionTimeRange(s.startTime, s.endTime);
                            return (
                              <>
                                <span className="font-semibold text-gray-700">{timeStr}</span>, {dateStr}
                              </>
                            );
                          })()}
                        </span>
                      </div>

                      {(s.studyMode === "ONLINE" && s.meetingUrl) && (
                        <div className="flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                          <Video className="h-3.5 w-3.5 text-blue-500" />
                          <span className="truncate">{s.meetingUrl}</span>
                        </div>
                      )}

                      {(s.studyMode === "OFFLINE" && s.location) && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-600 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-amber-500" />
                          <span className="truncate">{s.location}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {s.subjectName && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-gray-600">
                            <BookOpen className="h-3 w-3" />
                            {s.subjectName}
                          </span>
                        )}
                        {s.groupName && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-gray-600">
                            <Users className="h-3 w-3" />
                            {s.groupName}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 bg-white px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setHeaderRecurrenceModalOpen(false);
              setHeaderRespondingType(null);
            }}
            disabled={headerSubmittingRecurrence}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Quay lại
          </button>

          <button
            type="button"
            onClick={handleHeaderRecurrenceSubmit}
            disabled={headerSubmittingRecurrence}
            className={`rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-colors ${headerRespondingType === "ACCEPTED"
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-rose-600 hover:bg-rose-700"
              }`}
          >
            {headerSubmittingRecurrence
              ? "Đang xử lý..."
              : "Xác nhận"}
          </button>
        </div>
      </Dialog>
    </>
  );
}
