import CallIcon from "@mui/icons-material/Call";
import PaletteIcon from "@mui/icons-material/Palette";
import VideocamIcon from "@mui/icons-material/Videocam";
import MicIcon from "@mui/icons-material/Mic";
import ImageIcon from "@mui/icons-material/Image";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import SentimentSatisfiedAltIcon from "@mui/icons-material/SentimentSatisfiedAlt";
import SendIcon from "@mui/icons-material/Send";
import CancelPresentationIcon from "@mui/icons-material/CancelPresentation";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import PushPinIcon from "@mui/icons-material/PushPin";
import InfoIcon from "@mui/icons-material/Info";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { toast } from "react-toastify";
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputBase,
  Paper,
  Typography,
  Skeleton,
  useMediaQuery,
} from "@mui/material";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { useDispatch, useSelector } from "react-redux";
import WelcomeConversation from "../../components/conversation/WelcomeConversion";
import ListFriends from "../../components/conversation/ListFriends";
import ListMess from "../../components/conversation/ListMess";
import ForwardMessageModal from "../../components/conversation/ForwardMessageModal";
import ReplyMessage from "../../components/conversation/ReplyMessage";
import { MessageInterface } from "../../model/Conversation";
import { APIResponse } from "../../model/APIResponse";
import { MessageStatusData, SocketData } from "../../model/SocketResponse";
import ColorPickerModal from "./components/ColorPickerModal";
import MediaFilesModal from "./components/MediaFilesModal";
import { getThemeById } from "../../theme/ConversationThemes";
import { ReactionData, ReactionDTO } from "../../model/Reaction";
import {
  loadConversation,
  loadConversationById,
  loadGroupConversation,
  recallMess,
  replyText,
  sendFirstMessage,
  sendSeen,
  sendText,
  setMessagePinned,
  uploadMedia,
  updateConversationColor,
  updateConversationFont,
} from "../../services/ChatService";
import { getActiveGroupMemberIds, getGroupAvatarUrl, getGroupById } from "../../services/GroupService";
import { FriendUser, loadFriendProfilesService, normalizeAvatarUrl, loadFriendOnlineStatusesService } from "../../services/FriendService";
import { getGroupStudySessions } from "../../services/StudySessionService";
import { useCall } from "../../features/call/CallProvider";
import VideoCallModal from "../../components/conversation/VideoCallModal";
import { VideoCallInfo } from "../../model/VideoCall";
import { rejectVideoCall, startVideoCall } from "../../services/VideoCallService";
import ringbackSound from "../../assets/audio/ringback tone sound effect.mp3";
import busyToneSound from "../../assets/audio/busy tone sound effect.mp3";

import { StudySessionResponse } from "../StudySession/types";
import { SocketEvent } from "../../enum/SocketEvent";
import { RootState } from "../../redux/store";
import {
  clearUnread,
  increaseUnread,
  updateCurrentConverId,
  upsertGroupMemberProfiles,
} from "../../redux/ChatReducer";
import { badWords } from "@vnphu/vn-badwords";
const MESSAGE_PAGE_SIZE = 25;
const MESSAGE_LOADING_MIN_MS = 250;
const MESSAGE_TEXT_CHUNK_LIMIT = 2000;
const FRIENDS_PANEL_MIN_WIDTH = 280;
const FRIENDS_PANEL_MAX_WIDTH = 620;
const CHAT_PANEL_MIN_WIDTH = 420;

const waitForMinLoading = async (startedAt: number) => {
  const remainingTime = MESSAGE_LOADING_MIN_MS - (Date.now() - startedAt);
  if (remainingTime > 0) {
    await new Promise((resolve) => setTimeout(resolve, remainingTime));
  }
};

const ConversationSkeleton = () => (
  <Box
    sx={{
      flex: 1,
      minHeight: 0,
      width: "100%",
      p: 3,
      display: "flex",
      flexDirection: "column-reverse",
      gap: 2.25,
      overflow: "hidden",
      background: "transparent",
    }}
  >
    {[1, 2, 3, 4, 5].map((item, idx) => {
      const isOutgoing = idx % 2 === 0;
      return (
        <Box
          key={item}
          sx={{
            display: "flex",
            justifyContent: isOutgoing ? "flex-end" : "flex-start",
            alignItems: "flex-end",
            gap: 1.5,
            width: "100%",
          }}
        >
          {!isOutgoing && (
            <Skeleton
              variant="circular"
              width={36}
              height={36}
              animation="wave"
              sx={{ bgcolor: "rgba(15, 23, 42, 0.06)", flexShrink: 0 }}
            />
          )}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: isOutgoing ? "flex-end" : "flex-start",
              gap: 0.5,
              maxWidth: "60%",
              width: "100%",
            }}
          >
            <Skeleton
              variant="rectangular"
              height={idx === 2 ? 56 : 36}
              animation="wave"
              sx={{
                width: idx === 0 ? "55%" : idx === 1 ? "75%" : idx === 2 ? "90%" : idx === 3 ? "45%" : "65%",
                borderRadius: isOutgoing ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                bgcolor: isOutgoing ? "rgba(59, 130, 246, 0.08)" : "rgba(15, 23, 42, 0.04)",
              }}
            />
            {idx === 2 && (
              <Skeleton
                variant="rectangular"
                height={32}
                animation="wave"
                sx={{
                  width: "60%",
                  borderRadius: isOutgoing ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  bgcolor: isOutgoing ? "rgba(59, 130, 246, 0.08)" : "rgba(15, 23, 42, 0.04)",
                }}
              />
            )}
          </Box>
        </Box>
      );
    })}
  </Box>
);

type RouteState = {
  conversationKind?: "PRIVATE" | "GROUP";
  conversationType?: number;
  targetUserId?: number | null;
  groupId?: number | null;
  avatar?: string | null;
  fullName?: string | null;
  groupName?: string | null;
  conversationKey?: string | null;
  groupVisibility?: string | null;
} | null;

const isSocketData = (data: unknown): data is SocketData => {
  return !!data && typeof data === "object" && "conversationId" in data && "message" in data;
};

const isMessageStatusData = (data: unknown): data is MessageStatusData => {
  return !!data && typeof data === "object" && "conversationId" in data && "messageIds" in data && "status" in data;
};

const isReactionData = (data: unknown): data is ReactionData => {
  return !!data && typeof data === "object" && "conversationId" in data && "message" in data;
};

function hasBadWords(text: string) {
  return badWords(text, { validate: true });
}

const shouldApplyStatus = (
  currentStatus: MessageInterface["status"],
  nextStatus: MessageInterface["status"],
) => {
  if (!nextStatus) return false;
  const order = {
    SENDING: 0,
    SENT: 1,
    DELIVERED: 2,
    SEEN: 3,
  };
  return (order[nextStatus] ?? 0) >= (currentStatus ? order[currentStatus] : -1);
};

type GroupInfoTab = "schedule" | "pinned";

const getProfileDisplayName = (
  profile?: {
    fullName?: string | null;
    full_name?: string | null;
    name?: string | null;
    username?: string | null;
  },
) => {
  return profile?.fullName || profile?.full_name || profile?.name || profile?.username || null;
};

const sessionStatusLabel: Record<string, string> = {
  SCHEDULED: "Đã lên lịch",
  ONGOING: "Đang diễn ra",
  COMPLETED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
};

const studyModeLabel: Record<string, string> = {
  ONLINE: "Online",
  OFFLINE: "Trực tiếp",
  HYBRID: "Kết hợp",
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getMessagePreview = (message: any) => {
  if (message.moderationStatus === "HATE" || message.moderation_status === "HATE") return "Tin nhắn bị vi phạm chính sách";
  if (message.moderationStatus === "OFFENSIVE" || message.moderation_status === "OFFENSIVE") return "Nội dung có thể gây khó chịu";
  if (message.isDeleted) return "Tin nhắn đã được thu hồi";
  if (message.content?.trim()) return message.content;
  if (message.fileName) return message.fileName;
  if (message.mediaURL) {
    if (message.type?.startsWith("audio/")) return "Âm thanh";
    return message.type?.startsWith("video/") ? "Video" : "Hình ảnh";
  }
  return "Tin nhắn";
};

const isMessagePinned = (message: MessageInterface) => {
  const pinned = message.isPinned ?? message.pinned;
  return pinned === true || pinned === "Y";
};

const isPolicyViolationMessage = (message: any) => {
  return message.moderationStatus === "HATE" || message.moderation_status === "HATE" || message.moderationStatus === "OFFENSIVE" || message.moderation_status === "OFFENSIVE";
};

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const splitMessageText = (value: string, limit = MESSAGE_TEXT_CHUNK_LIMIT) => {
  const chunks: string[] = [];
  let remaining = value.trim();

  while (remaining.length > limit) {
    let splitAt = -1;

    for (let index = limit; index > 0; index -= 1) {
      if (/\s/.test(remaining[index])) {
        splitAt = index;
        break;
      }
    }

    if (splitAt <= 0) {
      splitAt = limit;
    }

    const chunk = remaining.slice(0, splitAt).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    remaining = remaining.slice(splitAt).trimStart();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
};

const getSupportedAudioMimeType = () => {
  if (typeof MediaRecorder === "undefined") return "";
  const mimeTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  return mimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || "";
};

const getAudioExtension = (mimeType: string) => {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
};

const formatRecordingTime = (elapsedMs: number) => {
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export default function ConversationPage() {
  const { state: callState, startCall: startManagedCall } = useCall();
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const currentUserId = Number(localStorage.getItem("userId"));
  const currentUser = useSelector((state: RootState) => state.user);
  const currentConversationId = useSelector((state: RootState) => state.chat.currentConversationId);
  const groupMemberProfiles = useSelector((state: RootState) => state.chat.groupMemberProfiles);
  const storeNewMess = useSelector((state: RootState) => state.chat.newMess);
  const storeEvent = useSelector((state: RootState) => state.chat.newMess?.event);

  const routeState = location.state as RouteState & { conversationId?: number | string | null };
  const targetUserIdFromState = Number(routeState?.targetUserId);
  const targetUserId = Number.isFinite(targetUserIdFromState) && targetUserIdFromState > 0
    ? targetUserIdFromState
    : null;
  const groupIdFromState = Number(routeState?.groupId);
  const groupId = Number.isFinite(groupIdFromState) && groupIdFromState > 0 ? groupIdFromState : null;
  const isGroupConversation =
    routeState?.conversationKind === "GROUP" ||
    Number(routeState?.conversationType) === 0 ||
    groupId !== null;
  const conversationIdFromState = Number(routeState?.conversationId);
  const fallbackConversationId = !targetUserId && !isGroupConversation
    ? (
      Number.isFinite(conversationIdFromState) && conversationIdFromState > 0
        ? conversationIdFromState
        : currentConversationId
    )
    : null;
  const routeAvatar = normalizeAvatarUrl(routeState?.avatar || null);
  const groupName = routeState?.groupName || null;
  const baseFullName = isGroupConversation
    ? groupName
    : routeState?.fullName;

  const selectedConversationKey = isGroupConversation
    ? routeState?.conversationKey || (groupId ? `group:${groupId}` : "none")
    : targetUserId
      ? routeState?.conversationKey || `private:${targetUserId}`
      : fallbackConversationId
        ? `conversation:${fallbackConversationId}`
        : "none";

  const [conversation, setConversation] = useState<MessageInterface[]>([]);
  const [messageText, setMessageText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replymess, setReplyMess] = useState<MessageInterface | null>(null);
  const [forwardmess, setForwardMess] = useState<MessageInterface | null>(null);
  const [privateSenderProfiles, setPrivateSenderProfiles] = useState<Record<number, FriendUser>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const hasSelectedConversation = selectedConversationKey !== "none";
  const [loadingConversation, setLoadingConversation] = useState(() => {
    return selectedConversationKey !== "none";
  });
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [waitingVideoCall, setWaitingVideoCall] = useState<VideoCallInfo | null>(null);
  const [rejectedVideoCall, setRejectedVideoCall] = useState(false);
  const [cancelCallLoading, setCancelCallLoading] = useState(false);
  const [videoCallLoading, setVideoCallLoading] = useState(false);

  const outgoingAudioRef = useRef<HTMLAudioElement | null>(null);
  const busyAudioRef = useRef<HTMLAudioElement | null>(null);

  const playBusyTone = () => {
    if (outgoingAudioRef.current) {
      outgoingAudioRef.current.pause();
      outgoingAudioRef.current.currentTime = 0;
    }
    if (!busyAudioRef.current) {
      busyAudioRef.current = new Audio(busyToneSound);
    }
    busyAudioRef.current.currentTime = 0;
    busyAudioRef.current.play().catch((err) => console.error("Error playing busy audio:", err));
    setTimeout(() => {
      if (busyAudioRef.current) {
        busyAudioRef.current.pause();
        busyAudioRef.current.currentTime = 0;
      }
    }, 4000);
  };

  useEffect(() => {
    if (callState.status === "OUTGOING_RINGING") {
      if (!outgoingAudioRef.current) {
        outgoingAudioRef.current = new Audio(ringbackSound);
        outgoingAudioRef.current.loop = true;
      }
      outgoingAudioRef.current.play().catch((err) => console.error("Error playing ringback audio:", err));
    } else {
      if (outgoingAudioRef.current) {
        outgoingAudioRef.current.pause();
        outgoingAudioRef.current.currentTime = 0;
      }
    }
  }, [callState.status]);

  useEffect(() => {
    return () => {
      dispatch(updateCurrentConverId({ currentConversationId: null }));
    };
  }, [dispatch]);

  useEffect(() => {
    if (!routeState) {
      dispatch(updateCurrentConverId({ currentConversationId: null }));
    }
  }, [routeState, dispatch]);

  useEffect(() => {
    if (
      callState.status === "REJECTED" ||
      callState.status === "EXPIRED" ||
      (callState.status === "ENDED" && callState.reason === "REMOTE_ENDED")
    ) {
      playBusyTone();
    }
  }, [callState.status, callState.reason]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [badWordsWarningOpen, setBadWordsWarningOpen] = useState(false);
  const [pinnedMessagesOpen, setPinnedMessagesOpen] = useState(false);
  const [studyScheduleOpen, setStudyScheduleOpen] = useState(false);
  const [groupVisibility, setGroupVisibility] = useState<string | null>(routeState?.groupVisibility || null);
  const isCommunityGroup = groupVisibility?.toUpperCase() === "COMMUNITY" || groupVisibility?.toUpperCase() === "COMUNITY";
  const hasStudySchedule = isGroupConversation && !isCommunityGroup;
  const [groupSessions, setGroupSessions] = useState<StudySessionResponse[]>([]);
  const [groupSessionsLoading, setGroupSessionsLoading] = useState(false);
  const [groupSessionsError, setGroupSessionsError] = useState("");
  const [visibleMessageStatus, setVisibleMessageStatus] = useState<{
    messageId: number;
    status: MessageInterface["status"];
  } | null>(null);
  const [themeId, setThemeId] = useState<string>("default");
  const [fontFamily, setFontFamily] = useState<string>("default");
  const [seenStatuses, setSeenStatuses] = useState<Record<number, number>>({});
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [mediaFilesOpen, setMediaFilesOpen] = useState(false);
  const [groupAvatar, setGroupAvatar] = useState<string | null>(
    isGroupConversation ? routeAvatar : null,
  );
  const [friendsPanelWidth, setFriendsPanelWidth] = useState(420);
  const [conversationListBootstrap, setConversationListBootstrap] = useState({
    ready: false,
    hasConversations: false,
  });
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);

  const conversationLayoutRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioRecordingStartedAtRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const conversationId = useRef<number | null>(null);
  const pendingTempMessageIds = useRef<number[]>([]);
  const nextTempMessageId = useRef(-1);
  const lastSeenMessageIdRef = useRef<number | null>(null);
  const nextMessagePageRef = useRef(1);
  const loadingOlderMessagesRef = useRef(false);
  const hasMoreMessagesRef = useRef(true);
  const activeConversationKeyRef = useRef("none");
  const loadingConversationKeyRef = useRef<string | null>(null);
  const loadedConversationKeyRef = useRef<string | null>(null);
  const conversationHydratedRef = useRef(false);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const loadedPrivateProfileIdsRef = useRef<Set<number>>(new Set());
  const conversationRef = useRef<MessageInterface[]>([]);
  const handleConversationListBootstrap = useCallback((
    state: { ready: boolean; hasConversations: boolean },
  ) => {
    setConversationListBootstrap((previous) => (
      previous.ready === state.ready &&
      previous.hasConversations === state.hasConversations
        ? previous
        : state
    ));
  }, []);

  useLayoutEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  const mergeConversationMessages = useCallback((
    prev: MessageInterface[],
    incoming: MessageInterface[],
  ) => {
    if (!incoming.length) return prev;
    const byId = new Map<number, MessageInterface>();
    [...prev, ...incoming].forEach((message) => {
      const id = Number(message?.messageId);
      if (!Number.isFinite(id)) return;
      const existing = byId.get(id);
      byId.set(id, existing ? { ...existing, ...message } : message);
    });
    return Array.from(byId.values()).sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      if (tb !== ta) return tb - ta;
      return Number(b.messageId) - Number(a.messageId);
    });
  }, []);

  useEffect(() => {
    setGroupAvatar(isGroupConversation ? routeAvatar : null);
  }, [isGroupConversation, routeAvatar, selectedConversationKey]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current !== null) {
        window.clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!isGroupConversation || !groupId) return;
    if (groupVisibility !== null && groupAvatar) return;

    let cancelled = false;
    getGroupById(groupId)
      .then((response) => {
        if (cancelled) return;
        if (response.success && response.data?.visibility) {
          setGroupVisibility(response.data.visibility);
        }
        const nextAvatar = getGroupAvatarUrl(response.data);
        if (nextAvatar) {
          setGroupAvatar(nextAvatar);
        }
      })
      .catch((error) => {
        console.error("[Conversation][load-group-visibility-error]", error);
      });

    return () => {
      cancelled = true;
    };
  }, [groupAvatar, groupId, isGroupConversation, groupVisibility]);

  const privatePeerProfile = targetUserId
    ? privateSenderProfiles[targetUserId]
    : Object.values(privateSenderProfiles).find((profile) => profile.userId !== currentUserId);
  const profileUserId = targetUserId || privatePeerProfile?.userId || null;
  const fullName = isGroupConversation
    ? baseFullName
    : privatePeerProfile?.fullName || baseFullName;
  const displayName = fullName || (isGroupConversation ? "Nhóm học" : "");
  const avatar = isGroupConversation
    ? groupAvatar
    : normalizeAvatarUrl(privatePeerProfile?.avatarUrl || routeAvatar);
  const callTargetName = isGroupConversation ? groupName || "Nhóm hoc" : fullName;
  const displayCallTargetName = callTargetName || displayName;
  const callTargetAvatar = isGroupConversation ? groupAvatar : avatar;
  const canOpenPeerProfile = !isGroupConversation && Boolean(profileUserId);
  const handleOpenPeerProfile = useCallback(() => {
    if (!canOpenPeerProfile || !profileUserId) return;
    navigate(`/profile/${profileUserId}`);
  }, [canOpenPeerProfile, navigate, profileUserId]);
  const pinnedMessages = useMemo(
    () => conversation.filter((message) => isMessagePinned(message) && !message.isDeleted),
    [conversation],
  );
  const isBareConversationRoute =
    !targetUserId &&
    !groupId &&
    !(Number.isFinite(conversationIdFromState) && conversationIdFromState > 0);
  const isConversationBootstrapLoading =
    isBareConversationRoute &&
    (!conversationListBootstrap.ready || conversationListBootstrap.hasConversations);
  const isConversationViewLoading =
    loadingConversation || isConversationBootstrapLoading;

  const [isOnline, setIsOnline] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    if (targetUserId) {
      void loadFriendOnlineStatusesService([targetUserId]).then((statuses) => {
        if (mounted) {
          setIsOnline(Boolean(statuses[String(targetUserId)]));
        }
      }).catch((err) => {
        console.error("Lỗi lấy trạng thái online:", err);
      });
    } else {
      setIsOnline(false);
    }
    return () => {
      mounted = false;
    };
  }, [targetUserId]);

  useEffect(() => {
    if (storeEvent === SocketEvent.USER_PRESENCE && storeNewMess?.data && targetUserId) {
      const presence = storeNewMess.data as { userId?: number; online?: boolean };
      if (Number(presence.userId) === targetUserId) {
        setIsOnline(Boolean(presence.online));
      }
    }
  }, [storeEvent, storeNewMess, targetUserId]);
  const getPinnedSenderName = useCallback((message: MessageInterface) => {
    if (message.senderId === currentUserId) {
      return currentUser.username || "Bạn";
    }

    if (isGroupConversation) {
      const profile = groupMemberProfiles[message.senderId];
      return getProfileDisplayName(profile) || `User ${message.senderId}`;
    }

    const profile = privateSenderProfiles[message.senderId];
    return getProfileDisplayName(profile) || fullName || `User ${message.senderId}`;
  }, [currentUser.username, currentUserId, fullName, groupMemberProfiles, isGroupConversation, privateSenderProfiles]);

  const setVisibleStatusIfNewer = useCallback((
    messageId: number,
    status: MessageInterface["status"],
  ) => {
    if (!status) return;
    setVisibleMessageStatus((prev) => {
      if (!prev || messageId >= prev.messageId || messageId < 0) {
        return { messageId, status };
      }
      return prev;
    });
  }, []);

  const markLatestIncomingSeen = useCallback((messages: MessageInterface[], targetConversationId: number | null) => {
    if (!targetConversationId || document.visibilityState !== "visible") return;

    const incomingMessageIds = messages
      .filter((message) => message.senderId !== currentUserId)
      .filter((message) => message.messageId > 0)
      .map((message) => message.messageId);

    if (incomingMessageIds.length === 0) return;

    const latestIncomingMessageId = Math.max(...incomingMessageIds);
    if (lastSeenMessageIdRef.current !== null && latestIncomingMessageId <= lastSeenMessageIdRef.current) return;

    sendSeen(targetConversationId, [latestIncomingMessageId])
      .then(() => {
        lastSeenMessageIdRef.current = latestIncomingMessageId;
        dispatch(clearUnread({ conversationId: targetConversationId }));
      })
      .catch(() => {
        lastSeenMessageIdRef.current = null;
      });
  }, [currentUserId, dispatch]);

  const handleEmojiClick = (emojiObject: EmojiClickData) => {
    setMessageText((prev) => prev + emojiObject.emoji);
  };

  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!emojiPickerRef.current?.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!isGroupConversation || !groupId || groupVisibility !== null) return;

    let cancelled = false;
    getGroupById(groupId)
      .then((response) => {
        if (cancelled) return;
        if (response.success && response.data?.visibility) {
          setGroupVisibility(response.data.visibility);
        }
        const nextAvatar = getGroupAvatarUrl(response.data);
        if (nextAvatar) {
          setGroupAvatar(nextAvatar);
        }
      })
      .catch((error) => {
        console.error("[Conversation][load-group-visibility-error]", error);
      });

    return () => {
      cancelled = true;
    };
  }, [groupId, isGroupConversation, groupVisibility]);

  useEffect(() => {
    if (!studyScheduleOpen || !hasStudySchedule || !groupId) return;

    let cancelled = false;
    setGroupSessionsLoading(true);
    setGroupSessionsError("");

    getGroupStudySessions(groupId, currentUserId)
      .then((response) => {
        if (cancelled) return;
        if (response.success && Array.isArray(response.data)) {
          setGroupSessions(response.data);
          return;
        }
        setGroupSessions([]);
        setGroupSessionsError(response.message || "Không thể tải lịch học nhóm");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("[Conversation][load-group-sessions-error]", error);
        setGroupSessions([]);
        setGroupSessionsError("Không thể tải lịch học nhóm");
      })
      .finally(() => {
        if (!cancelled) setGroupSessionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUserId, groupId, studyScheduleOpen, hasStudySchedule]);

  useLayoutEffect(() => {
    const loadMess = async () => {
      const loadKey = selectedConversationKey;
      activeConversationKeyRef.current = loadKey;

      if (!isGroupConversation && !targetUserId && !fallbackConversationId) {
        loadingConversationKeyRef.current = null;
        loadedConversationKeyRef.current = null;
        setConversation([]);
        conversationId.current = null;
        setLoadingConversation(false);
        return;
      }
      if (isGroupConversation && !groupId) {
        loadingConversationKeyRef.current = null;
        loadedConversationKeyRef.current = null;
        setConversation([]);
        conversationId.current = null;
        setLoadingConversation(false);
        return;
      }

      // React StrictMode re-runs effects in development. Do not start the same
      // conversation request twice or flash the skeleton for an already loaded chat.
      if (
        loadingConversationKeyRef.current === loadKey ||
        loadedConversationKeyRef.current === loadKey
      ) {
        return;
      }

      loadingConversationKeyRef.current = loadKey;
      const loadingStartedAt = Date.now();
      nextMessagePageRef.current = 1;
      hasMoreMessagesRef.current = true;
      loadingOlderMessagesRef.current = false;
      lastSeenMessageIdRef.current = null;
      conversationId.current = null;
      conversationHydratedRef.current = false;
      pendingTempMessageIds.current = [];
      setHasMoreMessages(true);
      setLoadingOlderMessages(false);
      setVisibleMessageStatus(null);
      setReplyMess(null);
      setForwardMess(null);
      setPinnedMessagesOpen(false);
      setStudyScheduleOpen(false);
      setConversation([]);
      setLoadingConversation(true);

      try {
        // Prefer by-id when conversationId is known (message request / accepted direct)
        let result: APIResponse | null = null;
        if (isGroupConversation) {
          result = await loadGroupConversation(currentUserId, groupId as number, 0);
        } else if (
          Number.isFinite(conversationIdFromState) &&
          conversationIdFromState > 0
        ) {
          result = await loadConversationById(currentUserId, conversationIdFromState, 0);
          // Fallback to peer-based load if by-id empty
          if (!result?.data && targetUserId) {
            result = await loadConversation(currentUserId, targetUserId, 0);
          }
        } else if (targetUserId) {
          result = await loadConversation(currentUserId, targetUserId, 0);
        } else if (fallbackConversationId) {
          result = await loadConversationById(currentUserId, fallbackConversationId as number, 0);
        }

        if (activeConversationKeyRef.current !== loadKey) return;
        if (!result?.data) {
          setConversation([]);
          conversationId.current = null;
          conversationHydratedRef.current = true;
          return;
        }

        if (!isGroupConversation && targetUserId) {
          try {
            const profiles = await loadFriendProfilesService([targetUserId]);
            if (activeConversationKeyRef.current === loadKey && profiles && profiles.length > 0) {
              const peerProfile = profiles[0];
              setPrivateSenderProfiles((prev) => ({
                ...prev,
                [targetUserId]: {
                  ...prev[targetUserId],
                  ...peerProfile,
                  fullName: peerProfile.fullName || `User ${targetUserId}`,
                },
              }));
              loadedPrivateProfileIdsRef.current.add(targetUserId);
            }
          } catch (e) {
            console.error("Failed to pre-load peer profile", e);
          }
        }

        conversationId.current = result.data.conversationId;
        dispatch(updateCurrentConverId({ currentConversationId: result.data.conversationId }));

        const rawSeenStatus = result.data.seenStatus || [];
        const initialSeen: Record<number, number> = {};
        rawSeenStatus.forEach((item: any) => {
          if (item.userId && item.lastSeenMessageId) {
            initialSeen[Number(item.userId)] = Number(item.lastSeenMessageId);
          }
        });
        setSeenStatuses(initialSeen);

        if (result.data?.color) {
          setThemeId(result.data.color);
        } else {
          setThemeId("default");
        }

        if (result.data?.font) {
          setFontFamily(result.data.font);
        } else {
          setFontFamily("default");
        }

        const loadedMessages = (result.data.listMess || []) as MessageInterface[];
        // Merge with any realtime messages that arrived during loading
        setConversation((prev) => mergeConversationMessages(prev, loadedMessages));
        conversationHydratedRef.current = true;
        loadedConversationKeyRef.current = loadKey;

        const hasNextPage = loadedMessages.length === MESSAGE_PAGE_SIZE;
        hasMoreMessagesRef.current = hasNextPage;
        setHasMoreMessages(hasNextPage);

        const latestOutgoingWithStatus = loadedMessages.find(
          (message) => message.senderId === currentUserId && !!message.status && message.messageId > 0,
        );
        setVisibleMessageStatus(latestOutgoingWithStatus?.status
          ? { messageId: latestOutgoingWithStatus.messageId, status: latestOutgoingWithStatus.status }
          : null);
        markLatestIncomingSeen(loadedMessages, result.data.conversationId);
      } catch (error) {
        console.error("[Conversation][load-first-error]", error);
        conversationHydratedRef.current = true;
      } finally {
        await waitForMinLoading(loadingStartedAt);
        if (loadingConversationKeyRef.current === loadKey) {
          loadingConversationKeyRef.current = null;
        }
        if (activeConversationKeyRef.current === loadKey) {
          setLoadingConversation(false);
        }
      }
    };

    loadMess();
  }, [
    selectedConversationKey,
    currentUserId,
    dispatch,
    markLatestIncomingSeen,
    isGroupConversation,
    groupId,
    targetUserId,
    conversationIdFromState,
    fallbackConversationId,
    mergeConversationMessages,
  ]);

  useEffect(() => {
    loadedPrivateProfileIdsRef.current.clear();
    if (!isGroupConversation) {
      setPrivateSenderProfiles({});
    }
  }, [isGroupConversation, selectedConversationKey]);

  useEffect(() => {
    if (!isGroupConversation || !groupId) return;

    let cancelled = false;
    const loadGroupMemberProfiles = async () => {
      const fallbackSenderIds = conversation
        .map((message) => message.senderId)
        .filter((senderId) => senderId !== currentUserId)
        .filter((senderId) => Number.isFinite(senderId) && senderId > 0);

      const seenUserIds = Object.keys(seenStatuses)
        .map(Number)
        .filter((uId) => uId !== currentUserId)
        .filter((uId) => Number.isFinite(uId) && uId > 0);

      let memberIds = [...fallbackSenderIds, ...seenUserIds];
      try {
        const result = await getActiveGroupMemberIds(groupId);
        const activeMemberIds = (result.data || [])
          .map((memberId: number) => Number(memberId))
          .filter((memberId: number) => memberId !== currentUserId)
          .filter((memberId: number) => Number.isFinite(memberId) && memberId > 0);

        memberIds = [...memberIds, ...activeMemberIds];
      } catch (error) {
        console.error("[Conversation][load-group-members-error]", error);
      }

      const uniqueMemberIds = Array.from(new Set(memberIds));
      const missingMemberIds = uniqueMemberIds
        .filter((memberId) => !groupMemberProfiles[memberId]);
      if (missingMemberIds.length === 0 || cancelled) return;

      try {
        const profiles = await loadFriendProfilesService(missingMemberIds);
        if (cancelled) return;
        const foundProfileIds = new Set(profiles.map((profile) => profile.userId));
        const fallbackProfiles = missingMemberIds
          .filter((senderId) => !foundProfileIds.has(senderId))
          .map((senderId) => ({
            userId: senderId,
            fullName: `User ${senderId}`,
            avatarUrl: null,
          }));
        dispatch(upsertGroupMemberProfiles([...profiles, ...fallbackProfiles]));
      } catch (error) {
        console.error("[Conversation][load-sender-profiles-error]", error);
      }
    };

    loadGroupMemberProfiles();
    return () => {
      cancelled = true;
    };
  }, [conversation, currentUserId, dispatch, groupId, groupMemberProfiles, isGroupConversation, seenStatuses]);

  useEffect(() => {
    if (isGroupConversation) {
      setPrivateSenderProfiles({});
      return;
    }

    const routeProfileId = targetUserId || null;
    if (!routeProfileId || (!routeState?.fullName && !routeAvatar)) return;

    setPrivateSenderProfiles((prev) => ({
      ...prev,
      [routeProfileId]: {
        userId: routeProfileId,
        fullName: routeState?.fullName || prev[routeProfileId]?.fullName || `User ${routeProfileId}`,
        avatarUrl: routeAvatar || prev[routeProfileId]?.avatarUrl || null,
      },
    }));
  }, [isGroupConversation, routeAvatar, routeState?.fullName, targetUserId]);

  useEffect(() => {
    if (isGroupConversation) return;

    const senderIds = Array.from(new Set([
      ...(targetUserId ? [targetUserId] : []),
      ...conversation
        .map((message) => message.senderId)
        .filter((senderId) => senderId !== currentUserId)
        .filter((senderId) => Number.isFinite(senderId) && senderId > 0),
    ]));

    const missingSenderIds = senderIds.filter((senderId) => {
      const profile = privateSenderProfiles[senderId];
      return !loadedPrivateProfileIdsRef.current.has(senderId)
        && (!profile || !profile.fullName || !profile.avatarUrl);
    });
    if (missingSenderIds.length === 0) return;

    let cancelled = false;
    const loadPrivateSenderProfiles = async () => {
      try {
        const profiles = await loadFriendProfilesService(missingSenderIds);
        missingSenderIds.forEach((senderId) => loadedPrivateProfileIdsRef.current.add(senderId));
        if (cancelled || profiles.length === 0) return;
        setPrivateSenderProfiles((prev) => {
          const next = { ...prev };
          profiles.forEach((profile) => {
            next[profile.userId] = {
              ...next[profile.userId],
              ...profile,
              avatarUrl: profile.avatarUrl || next[profile.userId]?.avatarUrl || null,
              fullName: profile.fullName || next[profile.userId]?.fullName || `User ${profile.userId}`,
            };
          });
          return next;
        });
      } catch (error) {
        console.error("[Conversation][load-private-sender-profiles-error]", error);
      }
    };

    void loadPrivateSenderProfiles();
    return () => {
      cancelled = true;
    };
  }, [conversation, currentUserId, isGroupConversation, privateSenderProfiles, targetUserId]);

  const loadOlderMessages = useCallback(async () => {
    if (
      (!targetUserId && !fallbackConversationId && !isGroupConversation) ||
      (isGroupConversation && !groupId) ||
      loadingOlderMessagesRef.current ||
      !hasMoreMessagesRef.current
    ) {
      return;
    }

    const pageToLoad = nextMessagePageRef.current;
    const loadKey = selectedConversationKey;
    const loadingStartedAt = Date.now();
    loadingOlderMessagesRef.current = true;
    setLoadingOlderMessages(true);

    try {
      const result: APIResponse = isGroupConversation
        ? await loadGroupConversation(currentUserId, groupId as number, pageToLoad)
        : targetUserId
          ? await loadConversation(currentUserId, targetUserId, pageToLoad)
          : await loadConversationById(currentUserId, fallbackConversationId as number, pageToLoad);
      if (activeConversationKeyRef.current !== loadKey) return;

      const olderMessages = (result.data?.listMess || []) as MessageInterface[];
      setConversation((prev) => {
        const existedMessageIds = new Set(prev.map((message) => message.messageId));
        const uniqueOlderMessages = olderMessages.filter((message) => !existedMessageIds.has(message.messageId));
        return [...prev, ...uniqueOlderMessages];
      });

      nextMessagePageRef.current = pageToLoad + 1;
      const hasNextPage = olderMessages.length === MESSAGE_PAGE_SIZE;
      hasMoreMessagesRef.current = hasNextPage;
      setHasMoreMessages(hasNextPage);
    } catch (error) {
      console.error("[Conversation][load-old-error]", error);
    } finally {
      await waitForMinLoading(loadingStartedAt);
      loadingOlderMessagesRef.current = false;
      setLoadingOlderMessages(false);
    }
  }, [
    currentUserId,
    fallbackConversationId,
    groupId,
    isGroupConversation,
    selectedConversationKey,
    targetUserId,
  ]);

  const updateOutgoingMessageStatus = useCallback((
    messageIds: number[],
    status: MessageInterface["status"],
    shouldResolvePendingIds = false,
  ) => {
    if (!status) return;

    setConversation((prev) => {
      const pendingIds = [...pendingTempMessageIds.current];
      const tempIdToRealId = new Map<number, number>();
      const statusMessageIds = new Set<number>();
      const latestStatusMessageId = messageIds.length > 0 ? Math.max(...messageIds) : null;

      if (shouldResolvePendingIds) {
        messageIds.forEach((messageId) => {
          const alreadyExists = prev.some((message) => message.messageId === messageId);
          if (!alreadyExists && pendingIds.length > 0) {
            const tempMessageId = pendingIds.shift() as number;
            tempIdToRealId.set(tempMessageId, messageId);
            statusMessageIds.add(messageId);
          }
        });
      }

      const next = prev.map((message) => {
        const isOutgoing = message.senderId === currentUserId;
        const isExplicitStatusMessage = messageIds.includes(message.messageId);
        const isSeenBeforeLatest =
          status === "SEEN" &&
          latestStatusMessageId !== null &&
          message.messageId > 0 &&
          message.messageId <= latestStatusMessageId;

        if (isOutgoing && (isExplicitStatusMessage || isSeenBeforeLatest)) {
          statusMessageIds.add(message.messageId);
          return shouldApplyStatus(message.status, status) ? { ...message, status } : message;
        }

        const realMessageId = tempIdToRealId.get(message.messageId);
        if (realMessageId) {
          const nextStatus = shouldApplyStatus(message.status, status) ? status : message.status;
          return { ...message, messageId: realMessageId, status: nextStatus };
        }

        return message;
      });

      pendingTempMessageIds.current = pendingIds;
      const visibleStatusMessageId = statusMessageIds.size > 0
        ? Math.max(...Array.from(statusMessageIds))
        : null;
      if (visibleStatusMessageId !== null) {
        setVisibleStatusIfNewer(visibleStatusMessageId, status);
      }
      return next;
    });
  }, [currentUserId, setVisibleStatusIfNewer]);

  const applyMessageAck = useCallback((savedMessage: MessageInterface) => {
    setConversation((prev) => {
      const existingMessage = prev.some((message) => message.messageId === savedMessage.messageId);
      const pendingMessageId = pendingTempMessageIds.current.find((id) =>
        prev.some((message) => message.messageId === id),
      );
      const matchingTempMessage = prev.find((message) =>
        message.messageId < 0 &&
        message.senderId === savedMessage.senderId &&
        message.type === savedMessage.type &&
        (message.content || "") === (savedMessage.content || ""),
      );
      const tempMessageIdToReplace = pendingMessageId ?? matchingTempMessage?.messageId;

      if (existingMessage) {
        pendingTempMessageIds.current = pendingTempMessageIds.current.filter((id) => id !== tempMessageIdToReplace);
        return prev
          .filter((message) => message.messageId >= 0 || message.messageId !== tempMessageIdToReplace)
          .map((message) => message.messageId === savedMessage.messageId
            ? { ...message, ...savedMessage, status: message.status || "SENT" }
            : message);
      }

      if (tempMessageIdToReplace !== undefined) {
        pendingTempMessageIds.current = pendingTempMessageIds.current.filter((id) => id !== tempMessageIdToReplace);
        setVisibleStatusIfNewer(savedMessage.messageId, "SENT");
        return prev.map((message) => message.messageId === tempMessageIdToReplace
          ? { ...message, ...savedMessage, status: "SENT" }
          : message);
      }

      return [savedMessage, ...prev];
    });
  }, [currentUserId, setVisibleStatusIfNewer]);

  useEffect(() => {
    const latestOutgoingWithStatus = conversation.find(
      (message) => message.senderId === currentUserId && !!message.status,
    );
    if (!latestOutgoingWithStatus?.status) {
      setVisibleMessageStatus(null);
      return;
    }
    setVisibleStatusIfNewer(latestOutgoingWithStatus.messageId, latestOutgoingWithStatus.status);
  }, [conversation, currentUserId, setVisibleStatusIfNewer]);

  useEffect(() => {
    if (!storeNewMess?.data) return;
    // Chưa hydrate history xong thì chỉ nhận tin realtime của conversation đang mở
    // (tránh replay tin cũ trong redux khi vừa vào trang).

    // Allow processing socket events when either the event's conversationId matches
    // the current conversation, OR the payload's message belongs to the current
    // conversation (covers cases where the server may send null/incorrect conversationId).
    const socketConvoId = Number((storeNewMess.data as any).conversationId);
    const socketMessage = (storeNewMess.data as any).message;
    const socketMessageId = Number(socketMessage?.messageId ?? socketMessage?.messageID ?? NaN);
    const isPendingFirstPrivate =
      !conversationId.current &&
      !isGroupConversation &&
      !!targetUserId &&
      Number(socketMessage?.senderId) === currentUserId;
    const belongsToCurrentConversation =
      (conversationId.current != null && socketConvoId === conversationId.current) ||
      (Number.isFinite(socketMessageId) && conversationRef.current.some((m) => m.messageId === socketMessageId)) ||
      isPendingFirstPrivate;
    if (!belongsToCurrentConversation) return;
    if (!conversationHydratedRef.current && !isPendingFirstPrivate) return;

    if (
      Number.isFinite(socketConvoId) &&
      socketConvoId > 0 &&
      !conversationId.current
    ) {
      conversationId.current = socketConvoId;
      dispatch(updateCurrentConverId({ currentConversationId: socketConvoId }));
    }

    if (storeEvent === SocketEvent.MESSAGE_ACK && isSocketData(storeNewMess.data)) {
      applyMessageAck(storeNewMess.data.message);
      setMessageText("");
    }

    if (storeEvent === SocketEvent.MESSAGE_RECALL && isSocketData(storeNewMess.data)) {
      const recalledMessage = storeNewMess.data.message;
      setConversation((prev) =>
        prev.map((item) =>
          item.messageId === recalledMessage.messageId ? recalledMessage : item,
        ),
      );
    }

    if (storeEvent === SocketEvent.MESSAGE_MODERATED && isSocketData(storeNewMess.data)) {
      const moderatedMessage = storeNewMess.data.message as any;
      const moderatedMessageId = Number(moderatedMessage?.messageId ?? moderatedMessage?.messageID ?? NaN);
      console.debug('[Conversation][MESSAGE_MODERATED][recv]', { moderatedMessage, moderatedMessageId, conversationId: conversationId.current });
      setConversation((prev) => {
        let found = false;
        const next = prev.map((item) => {
          if (item.messageId === moderatedMessageId) {
            found = true;
            return {
              ...item,
              ...moderatedMessage,
              moderationStatus: moderatedMessage.moderationStatus,
            };
          }
          return item;
        });
        if (!found) {
          console.debug('[Conversation][MESSAGE_MODERATED][not-found] message not in current conversation', { moderatedMessageId });
        }
        return next;
      });
    }

    if (
      (storeEvent === SocketEvent.MESSAGE_PIN || storeEvent === SocketEvent.MESSAGE_UNPIN) &&
      isSocketData(storeNewMess.data)
    ) {
      const updatedMessage = storeNewMess.data.message;
      setConversation((prev) =>
        prev.map((item) =>
          item.messageId === updatedMessage.messageId
            ? {
              ...item,
              ...updatedMessage,
              isPinned: isMessagePinned(updatedMessage),
              pinned: isMessagePinned(updatedMessage),
            }
            : item,
        ),
      );
    }
  }, [storeNewMess, storeEvent, applyMessageAck]);

  useEffect(() => {
    if (!storeNewMess) return;
    const evt = storeEvent || (storeNewMess as any)?.event;
    if (
      evt === SocketEvent.GROUP_MEMBER_KICKED ||
      evt === SocketEvent.GROUP_STATUS_UPDATED ||
      evt === "GROUP_MEMBER_KICKED" ||
      evt === "GROUP_STATUS_UPDATED"
    ) {
      const data = storeNewMess.data as any;
      const targetGroupId = Number(data?.groupId);
      if (isGroupConversation && groupId && targetGroupId === groupId) {
        setConversation([]);
        dispatch(updateCurrentConverId({ currentConversationId: null }));
        navigate("/conversation", { replace: true });
      }
    }
  }, [storeNewMess, storeEvent, isGroupConversation, groupId, dispatch, navigate]);

  useEffect(() => {
    if (!storeNewMess?.data) return;

    const socketConvoId = Number((storeNewMess.data as any).conversationId);
    const socketMessage = (storeNewMess.data as any).message;
    const socketMessageId = Number(socketMessage?.messageId ?? socketMessage?.messageID ?? NaN);
    const isPendingFirstPrivate =
      !conversationId.current &&
      !isGroupConversation &&
      !!targetUserId &&
      (
        Number(socketMessage?.senderId) === currentUserId ||
        Number(socketMessage?.senderId) === targetUserId
      );
    const belongsToCurrentConversation =
      (conversationId.current != null && socketConvoId === conversationId.current) ||
      (Number.isFinite(socketMessageId) && conversationRef.current.some((m) => m.messageId === socketMessageId)) ||
      isPendingFirstPrivate;
    if (!belongsToCurrentConversation) return;
    // Chỉ append realtime sau khi đã load history (tránh chỉ còn tin mới)
    if (!conversationHydratedRef.current && !isPendingFirstPrivate) return;

    if (
      Number.isFinite(socketConvoId) &&
      socketConvoId > 0 &&
      !conversationId.current
    ) {
      conversationId.current = socketConvoId;
      dispatch(updateCurrentConverId({ currentConversationId: socketConvoId }));
    }

    if (storeEvent === SocketEvent.NEW_MESSAGE && isSocketData(storeNewMess.data)) {
      const incomingMessage = storeNewMess.data.message as any;
      const incomingMessageId = Number(incomingMessage?.messageId ?? incomingMessage?.messageID ?? NaN);
      if (!Number.isFinite(incomingMessageId)) return;
      const normalizedIncoming = { ...incomingMessage, messageId: incomingMessageId } as MessageInterface;
      setConversation((prev) => {
        if (prev.some((item) => Number(item.messageId) === incomingMessageId)) {
          return prev;
        }
        return mergeConversationMessages(prev, [normalizedIncoming]);
      });

      if (incomingMessage.senderId !== currentUserId) {
        if (document.visibilityState === "visible") {
          markLatestIncomingSeen(
            mergeConversationMessages(conversationRef.current, [normalizedIncoming]),
            storeNewMess.data.conversationId,
          );
        } else {
          dispatch(increaseUnread({ conversationId: storeNewMess.data.conversationId }));
        }
      }
    }

    if (
      (
        storeEvent === SocketEvent.MESSAGE_SENT ||
        storeEvent === SocketEvent.MESSAGE_DELIVERED ||
        storeEvent === SocketEvent.MESSAGE_SEEN
      ) &&
      isMessageStatusData(storeNewMess.data)
    ) {
      updateOutgoingMessageStatus(
        storeNewMess.data.messageIds,
        storeNewMess.data.status,
        storeEvent === SocketEvent.MESSAGE_SENT,
      );
      if (storeEvent === SocketEvent.MESSAGE_SEEN) {
        dispatch(clearUnread({ conversationId: storeNewMess.data.conversationId }));
        const seenUserId = Number(storeNewMess.data.userId);
        const maxMessageId = Math.max(...storeNewMess.data.messageIds.map(Number));
        if (Number.isFinite(seenUserId) && Number.isFinite(maxMessageId)) {
          setSeenStatuses((prev) => ({
            ...prev,
            [seenUserId]: Math.max(prev[seenUserId] || 0, maxMessageId),
          }));
        }
      }
    }

    if (
      (storeEvent === SocketEvent.REACTION_ADD || storeEvent === SocketEvent.REACTION_ACK) &&
      isReactionData(storeNewMess.data) &&
      storeNewMess.data.message
    ) {
      const reactionMessageId = Number(storeNewMess.data.message.messageId ?? storeNewMess.data.message.messageID);
      if (Number.isFinite(reactionMessageId) && reactionMessageId > 0) {
        const reaction: ReactionDTO = {
          ...storeNewMess.data.message,
          messageId: reactionMessageId,
        };
        setConversation((prev) => prev.map((message) => {
          if (message.messageId !== reactionMessageId) {
            return message;
          }
          const reactions = message.reactions || [];
          const senderId = reaction.senderId;
          const nextReactions =
            senderId === undefined || senderId === null
              ? [...reactions, reaction]
              : reactions.some((item) => item.senderId === senderId)
                ? reactions.map((item) => item.senderId === senderId ? reaction : item)
                : [...reactions, reaction];
          return { ...message, reactions: nextReactions };
        }));
      }
    }

    if (storeEvent === SocketEvent.CONVERSATION_COLOR_CHANGED) {
      const data = storeNewMess.data as any;
      if (data && data.conversationId === conversationId.current && data.color) {
        setThemeId(data.color);
      }
    }

    if (storeEvent === SocketEvent.CONVERSATION_FONT_CHANGED) {
      const data = storeNewMess.data as any;
      if (data && data.conversationId === conversationId.current && data.font) {
        setFontFamily(data.font);
      }
    }

    if (storeEvent === SocketEvent.VIDEO_CALL_ENDED) {
      setWaitingVideoCall((current) => {
        if (current) {
          playBusyTone();
        }
        return null;
      });
    }

    if (storeEvent === SocketEvent.VIDEO_CALL_ACCEPTED || storeEvent === SocketEvent.VIDEO_CALL_REJECTED) {
      setWaitingVideoCall((current) => {
        if (current && storeEvent === SocketEvent.VIDEO_CALL_REJECTED) {
          playBusyTone();
        }
        return null;
      });
      if (storeEvent === SocketEvent.VIDEO_CALL_REJECTED) {
        setRejectedVideoCall(true);
      }
    }
  }, [storeNewMess, storeEvent, currentUserId, dispatch, markLatestIncomingSeen, updateOutgoingMessageStatus]);

  useEffect(() => {
    const markCurrentConversationSeen = () => {
      markLatestIncomingSeen(conversation, conversationId.current);
    };

    markCurrentConversationSeen();
    document.addEventListener("visibilitychange", markCurrentConversationSeen);
    return () => document.removeEventListener("visibilitychange", markCurrentConversationSeen);
  }, [conversation, markLatestIncomingSeen]);

  const ensureConversationIdBeforeSend = async () => {
    if (conversationId.current) {
      return conversationId.current;
    }

    try {
      let result: APIResponse | null = null;
      if (isGroupConversation) {
        result = await loadGroupConversation(currentUserId, groupId as number, 0);
      } else if (Number.isFinite(conversationIdFromState) && conversationIdFromState > 0) {
        result = await loadConversationById(currentUserId, conversationIdFromState, 0);
        if (!result?.data && targetUserId) {
          result = await loadConversation(currentUserId, targetUserId, 0);
        }
      } else if (targetUserId) {
        result = await loadConversation(currentUserId, targetUserId, 0);
      } else if (fallbackConversationId) {
        result = await loadConversationById(currentUserId, fallbackConversationId, 0);
      }

      const data = result?.data;
      const loadedConversationId = data?.conversationId;
      if (!loadedConversationId || !data) {
        return null;
      }

      conversationId.current = Number(loadedConversationId);
      dispatch(updateCurrentConverId({ currentConversationId: Number(loadedConversationId) }));

      if (data.color) {
        setThemeId(data.color);
      } else {
        setThemeId("default");
      }

      if (data.font) {
        setFontFamily(data.font);
      } else {
        setFontFamily("default");
      }

      if (Array.isArray(data.listMess)) {
        setConversation(data.listMess as MessageInterface[]);
      }

      return conversationId.current;
    } catch (error) {
      console.error("[Conversation][ensure-before-send-error]", error);
      return null;
    }
  };

  const markMessageDeletedLocally = useCallback((messageId: number) => {
    setConversation((prev) => prev.map((message) => {
      if (message.messageId !== messageId) {
        return message;
      }
      return {
        ...message,
        content: "",
        mediaURL: null,
        fileName: null,
        isDeleted: true,
        reactions: [],
      };
    }));
  }, []);

  const handleRecallMessage = useCallback((messageId: number) => {
    if (!conversationId.current) return;

    markMessageDeletedLocally(messageId);
    if (messageId < 0) {
      pendingTempMessageIds.current = pendingTempMessageIds.current.filter((id) => id !== messageId);
      return;
    }

    recallMess(conversationId.current, messageId);
  }, [markMessageDeletedLocally]);

  const updateMessagePinnedLocally = useCallback((messageId: number, pinned: boolean) => {
    setConversation((prev) => prev.map((message) => {
      if (message.messageId !== messageId) {
        return message;
      }
      return {
        ...message,
        isPinned: pinned,
        pinned,
      };
    }));
  }, []);

  const handlePinMessage = useCallback((message: MessageInterface, pinned: boolean) => {
    if (!conversationId.current || message.messageId <= 0) return;

    const previousPinned = isMessagePinned(message);
    updateMessagePinnedLocally(message.messageId, pinned);

    setMessagePinned(conversationId.current, message.messageId, pinned)
      .then((updatedMessage: any) => {
        if (!updatedMessage || typeof updatedMessage !== "object") return;
        const resDto = updatedMessage.data;
        setConversation((prev) => prev.map((item) =>
          item.messageId === message.messageId
            ? {
              ...item,
              pinned: resDto?.pinned ?? pinned,
              isPinned: resDto?.pinned ?? pinned
            }
            : item
        ));
      })
      .catch((error: any) => {
        console.error("[Conversation][pin-message-error]", error);
        updateMessagePinnedLocally(message.messageId, previousPinned);
        toast.error(pinned ? "Không thể ghim tin nhắn" : "Không thể bỏ ghim tin nhắn");
      });
  }, [updateMessagePinnedLocally]);

  const handleOpenFile = () => {
    fileInputRef.current?.click();
  };

  const handleOpenDocument = () => {
    documentInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.warning("Chỉ được chọn ảnh hoặc video");
      return;
    }
    if (file.type.startsWith("video/") && file.size > 50 * 1024 * 1024) {
      toast.warning("Video không được vượt quá 50MB");
      return;
    }

    setPreview(URL.createObjectURL(file));
    setSelectedFile(file);
    event.target.value = "";
  };

  const handleDocumentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.warning("File không được vượt quá 25MB");
      event.target.value = "";
      return;
    }

    setPreview(URL.createObjectURL(file));
    setSelectedFile(file);
    event.target.value = "";
  };

  const stopAudioRecordingResources = () => {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;
    audioRecordingStartedAtRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecordingAudio(false);
    setRecordingElapsedMs(0);
  };

  const sendAudioFile = async (file: File, durationSeconds?: number) => {
    const activeConversationId = await ensureConversationIdBeforeSend();
    if (!activeConversationId) return;

    const tempMessageId = nextTempMessageId.current--;
    const audioUrl = URL.createObjectURL(file);
    pendingTempMessageIds.current.push(tempMessageId);
    setVisibleStatusIfNewer(tempMessageId, "SENDING");
    setConversation((prev) => [{
      messageId: tempMessageId,
      senderId: currentUserId,
      type: file.type || "audio/webm",
      content: "",
      mediaURL: audioUrl,
      fileName: file.name,
      audioDurationSeconds: durationSeconds,
      createdAt: new Date().toISOString(),
      status: "SENDING",
    }, ...prev]);
    uploadMedia(String(activeConversationId), file, "");
  };

  const stopAudioRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.requestData();
    recorder.stop();
  };

  const startAudioRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.warning("Trình duyệt không hỗ trợ ghi âm.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      audioStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordedMimeType = recorder.mimeType || mimeType || "audio/webm";
        const audioBlob = new Blob(audioChunksRef.current, { type: recordedMimeType });
        const extension = getAudioExtension(recordedMimeType);
        const audioFile = new File([audioBlob], `voice-message-${Date.now()}.${extension}`, {
          type: recordedMimeType,
        });
        const durationSeconds = audioRecordingStartedAtRef.current
          ? Math.max(1, Math.round((Date.now() - audioRecordingStartedAtRef.current) / 1000))
          : undefined;
        stopAudioRecordingResources();
        audioChunksRef.current = [];
        if (audioBlob.size > 0) {
          void sendAudioFile(audioFile, durationSeconds);
        }
      };

      recorder.start();
      setIsRecordingAudio(true);
      setRecordingElapsedMs(0);
      const startedAt = Date.now();
      audioRecordingStartedAtRef.current = startedAt;
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingElapsedMs(Date.now() - startedAt);
      }, 250);
    } catch (error) {
      console.error("[Conversation][audio-record-error]", error);
      stopAudioRecordingResources();
      toast.error("Không thể truy cập micro. Vui lòng kiểm tra quyền ghi âm.");
    }
  };

  const handleAudioRecordClick = () => {
    if (isRecordingAudio) {
      stopAudioRecording();
      return;
    }
    void startAudioRecording();
  };

  const getReplyBarText = (message: MessageInterface) => {
    if (isPolicyViolationMessage(message)) return "Tin nhắn bị vi phạm chính sách";
    if (message.isDeleted) return "Tin nhắn đã được thu hồi";
    if (message.content) return message.content;
    if (message.fileName) return message.fileName;
    if (message.mediaURL) {
      if (message.type?.startsWith("audio/")) return "Âm thanh";
      return message.type?.startsWith("video/") ? "Video" : "Hình ảnh";
    }
    return "Tin nhắn";
  };

  const sendMessage = async () => {
    if (messageText.trim().length === 0 && !preview && !selectedFile) return;

    // if (messageText.trim().length > 0 && hasBadWords(messageText)) {
    // if (messageText.trim().length > 0) {
    //   setBadWordsWarningOpen(true);
    //   return;
    // }

    let activeConversationId = conversationId.current || (await ensureConversationIdBeforeSend());

    // First private message: conversation may not exist yet
    if (!activeConversationId && !isGroupConversation && targetUserId && !preview && !selectedFile) {
      const chunks = splitMessageText(messageText);
      if (chunks.length === 0) return;

      const createdAt = new Date().toISOString();
      const optimisticMessages: MessageInterface[] = chunks.map((content) => {
        const tempMessageId = nextTempMessageId.current--;
        pendingTempMessageIds.current.push(tempMessageId);
        return {
          messageId: tempMessageId,
          senderId: currentUserId,
          type: "text",
          content,
          mediaURL: null,
          fileName: null,
          createdAt,
          status: "SENDING" as const,
        };
      });
      setVisibleStatusIfNewer(optimisticMessages[optimisticMessages.length - 1].messageId, "SENDING");
      setConversation((prev) => [...optimisticMessages].reverse().concat(prev));
      setMessageText("");
      setReplyMess(null);

      sendFirstMessage(chunks[0], targetUserId);
      chunks.slice(1).forEach((content) => sendFirstMessage(content, targetUserId));

      // After first message, try to resolve conversation id for subsequent sends
      void (async () => {
        for (let i = 0; i < 5; i++) {
          await new Promise((r) => setTimeout(r, 400));
          const resolved = await ensureConversationIdBeforeSend();
          if (resolved) break;
        }
      })();
      return;
    }

    if (!activeConversationId) {
      toast.error("Không thể gửi tin nhắn. Vui lòng thử lại.");
      return;
    }

    const conversationIdToSend = activeConversationId;

    if (!preview && !selectedFile) {
      const chunks = splitMessageText(messageText);
      if (chunks.length === 0) return;

      const createdAt = new Date().toISOString();
      const optimisticMessages: MessageInterface[] = chunks.map((content, index) => {
        const tempMessageId = nextTempMessageId.current--;
        pendingTempMessageIds.current.push(tempMessageId);
        return {
          messageId: tempMessageId,
          senderId: currentUserId,
          type: "text",
          content,
          mediaURL: null,
          fileName: null,
          createdAt,
          status: "SENDING" as const,
          replyToMessageId: index === 0 ? replymess?.messageId ?? null : null,
          replyToSenderId: index === 0 ? replymess?.senderId ?? null : null,
          replyToType: index === 0 ? replymess?.type ?? null : null,
          replyToContent: index === 0 ? replymess?.content ?? null : null,
          replyToMediaURL: index === 0 ? replymess?.mediaURL ?? null : null,
          replyToFileName: index === 0 ? replymess?.fileName ?? null : null,
          replyToDeleted: index === 0 ? replymess?.isDeleted ?? null : null,
        };
      });
      setVisibleStatusIfNewer(optimisticMessages[optimisticMessages.length - 1].messageId, "SENDING");
      setConversation((prev) => [...optimisticMessages].reverse().concat(prev));
      setMessageText("");

      if (replymess && chunks[0]) {
        replyText(chunks[0], replymess.messageId, "text", conversationIdToSend);
        chunks.slice(1).forEach((content) => sendText(content, conversationIdToSend));
      } else {
        chunks.forEach((content) => sendText(content, conversationIdToSend));
      }
      setReplyMess(null);
      return;
    }

    if (!selectedFile) return;

    const tempMessageId = nextTempMessageId.current--;
    pendingTempMessageIds.current.push(tempMessageId);
    setVisibleStatusIfNewer(tempMessageId, "SENDING");
    setConversation((prev) => [{
      messageId: tempMessageId,
      senderId: currentUserId,
      type: selectedFile.type || "application/octet-stream",
      content: messageText,
      mediaURL: preview,
      fileName: selectedFile.name,
      createdAt: new Date().toISOString(),
      status: "SENDING",
    }, ...prev]);
    setPreview(null);
    setSelectedFile(null);
    setMessageText("");
    uploadMedia(String(conversationIdToSend), selectedFile, messageText);
  };

  const handleSelectTheme = async (newThemeId: string) => {
    if (!conversationId.current) return;
    try {
      await updateConversationColor(conversationId.current, newThemeId);
      setThemeId(newThemeId);
    } catch (error) {
      console.error("Failed to update theme", error);
    }
  };

  const handleSelectFont = async (newFont: string) => {
    if (!conversationId.current) return;
    try {
      await updateConversationFont(conversationId.current, newFont);
      setFontFamily(newFont);
    } catch (error) {
      console.error("Failed to update font", error);
    }
  };

  const handleCancelWaitingCall = async () => {
    if (!waitingVideoCall || cancelCallLoading) return;

    if (outgoingAudioRef.current) {
      outgoingAudioRef.current.pause();
      outgoingAudioRef.current.currentTime = 0;
    }

    setCancelCallLoading(true);
    try {
      await rejectVideoCall(waitingVideoCall.sessionId);
      setWaitingVideoCall(null);
    } catch (error) {
      console.error("[Conversation][cancel-call-error]", error);
      toast.error(error instanceof Error ? error.message : "Không thể huỷ cuộc gọi");
    } finally {
      setCancelCallLoading(false);
    }
  };

  const handleManagedStartCall = useCallback(async (callType: "AUDIO" | "VIDEO") => {
    if (!conversationId.current || callState.status !== "IDLE") return;
    await startManagedCall(conversationId.current, callType, {
      callerName: isGroupConversation
        ? callTargetName || "Nhóm học"
        : currentUser.username || `User ${currentUserId}`,
      callerAvatar: isGroupConversation
        ? callTargetAvatar
        : currentUser.avatar || localStorage.getItem("avatarUrl"),
      peer: {
        userId: targetUserId || 0,
        name: callTargetName || (isGroupConversation ? "Nhóm học" : "Người dùng"),
        avatar: callTargetAvatar,
        isGroupCall: isGroupConversation,
      },
    });
  }, [
    callState.status,
    callTargetAvatar,
    callTargetName,
    currentUser.avatar,
    currentUser.username,
    currentUserId,
    isGroupConversation,
    startManagedCall,
    targetUserId,
  ]);

  const clampFriendsPanelWidth = useCallback((width: number, layoutWidth?: number) => {
    const availableWidth = layoutWidth ?? conversationLayoutRef.current?.getBoundingClientRect().width ?? 0;
    const maxWidthByLayout = availableWidth > 0
      ? Math.max(FRIENDS_PANEL_MIN_WIDTH, availableWidth - CHAT_PANEL_MIN_WIDTH)
      : FRIENDS_PANEL_MAX_WIDTH;
    return Math.min(
      Math.max(width, FRIENDS_PANEL_MIN_WIDTH),
      Math.min(FRIENDS_PANEL_MAX_WIDTH, maxWidthByLayout),
    );
  }, []);

  const handleFriendsPanelResizeStart = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const layout = conversationLayoutRef.current;
    if (!layout) return;

    event.preventDefault();
    const rect = layout.getBoundingClientRect();
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = rect.right - moveEvent.clientX;
      setFriendsPanelWidth(clampFriendsPanelWidth(nextWidth, rect.width));
    };

    const stopResize = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }, [clampFriendsPanelWidth]);

  const handleFriendsPanelResizeKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.shiftKey ? 40 : 16;
    setFriendsPanelWidth((width) => clampFriendsPanelWidth(
      event.key === "ArrowLeft" ? width + delta : width - delta,
    ));
  }, [clampFriendsPanelWidth]);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const currentTheme = getThemeById(themeId);

  return (
    <Box
      ref={conversationLayoutRef}
      sx={{
        display: "flex",
        height: "calc(100vh - 73px)",
        minHeight: 0,
        bgcolor: "#f4f6fb",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: isMobile 
            ? (hasSelectedConversation ? "flex" : "none") 
            : "flex",
          flexDirection: "column",
          minWidth: isMobile ? 0 : CHAT_PANEL_MIN_WIDTH,
          minHeight: 0,
          background: currentTheme.background || "#eef1f8",
          overflow: "hidden",
        }}
      >
        {hasSelectedConversation && (
        <Box
          sx={{
            height: 64,
            flexShrink: 0,
            width: "100%",
            px: 2.25,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            bgcolor: "#fff",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, gap: 0.5 }}>
            {isMobile && (
              <IconButton
                onClick={() => navigate("/conversation", { state: null })}
                sx={{ mr: 0.5, ml: -1.25, color: "rgb(55, 145, 250)" }}
              >
                <ArrowBackIcon sx={{ fontSize: 22 }} />
              </IconButton>
            )}
            <Box
              onClick={canOpenPeerProfile ? handleOpenPeerProfile : undefined}
              onKeyDown={(event) => {
                if (!canOpenPeerProfile) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleOpenPeerProfile();
                }
              }}
              role={canOpenPeerProfile ? "button" : undefined}
              tabIndex={canOpenPeerProfile ? 0 : undefined}
              title={canOpenPeerProfile ? "Xem hồ sơ" : undefined}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                minWidth: 0,
                borderRadius: "10px",
                cursor: canOpenPeerProfile ? "pointer" : "default",
                pr: 0,
                transition: "background-color 0.15s ease, padding-right 0.15s ease",
                "&:hover": canOpenPeerProfile ? { bgcolor: "rgba(15, 23, 42, 0.04)", pr: "20px" } : undefined,
                "&:focus-visible": canOpenPeerProfile
                  ? { outline: "2px solid #2563eb", outlineOffset: 3 }
                  : undefined,
              }}
            >
            {isConversationViewLoading ? (
              <>
                <Skeleton
                  variant="circular"
                  width={44}
                  height={44}
                  animation="wave"
                  sx={{ bgcolor: "rgba(15, 23, 42, 0.06)", flexShrink: 0 }}
                />
                <Box>
                  <Skeleton
                    variant="rectangular"
                    width={120}
                    height={20}
                    animation="wave"
                    sx={{ borderRadius: "4px", bgcolor: "rgba(15, 23, 42, 0.06)" }}
                  />
                </Box>
              </>
            ) : (
              <>
                <Box sx={{ position: "relative", flexShrink: 0 }}>
                  <Avatar
                    src={avatar || undefined}
                    sx={{
                      width: 44,
                      height: 44,
                      bgcolor: isGroupConversation ? "#4285f4" : undefined,
                    }}
                  >
                    {isGroupConversation ? (
                      <GroupsRoundedIcon sx={{ fontSize: 22, color: "#fff" }} />
                    ) : (
                      displayName?.charAt(0)?.toUpperCase()
                    )}
                  </Avatar>
                  {!isGroupConversation && isOnline && (
                    <Box
                      title="Online"
                      sx={{
                        position: "absolute",
                        right: -2,
                        bottom: -2,
                        width: 13,
                        height: 13,
                        borderRadius: "50%",
                        bgcolor: "#48d26d",
                        border: "2px solid white",
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 750, fontSize: 16.5, color: "#111827", lineHeight: 1.25 }} noWrap>
                    {displayName}
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
            <IconButton disabled={callState.status !== "IDLE"} onClick={() => handleManagedStartCall("AUDIO")} sx={{ color: "rgb(55, 145, 250)", p: 0.85 }}>
              <CallIcon sx={{ fontSize: 22 }} />
            </IconButton>
            <IconButton disabled={callState.status !== "IDLE"} onClick={() => handleManagedStartCall("VIDEO")} sx={{ color: "rgb(55, 145, 250)", p: 0.85 }}>
              <VideocamIcon sx={{ fontSize: 23 }} />
            </IconButton>
            <IconButton onClick={() => setIsColorPickerOpen(true)} sx={{ color: "rgb(55, 145, 250)", p: 0.85 }}>
              <PaletteIcon sx={{ fontSize: 22 }} />
            </IconButton>
            {hasStudySchedule && (
              <IconButton
                onClick={() => {
                  setStudyScheduleOpen(true);
                }}
                sx={{ color: "rgb(55, 145, 250)", p: 0.85 }}
                title="Lịch học nhóm"
              >
                <CalendarMonthIcon sx={{ fontSize: 22 }} />
              </IconButton>
            )}
            <IconButton
              onClick={() => setMediaFilesOpen(true)}
              sx={{ color: "rgb(55, 145, 250)", p: 0.85 }}
            >
              <InfoIcon sx={{ fontSize: 23 }} />
            </IconButton>
          </Box>
        </Box>
        )}

        {isConversationViewLoading ? (
          <Box
            sx={{
              height: 44,
              flexShrink: 0,
              width: "100%",
              px: 2.25,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              borderBottom: "1px solid rgba(15,23,42,0.08)",
              bgcolor: "#fbfcff",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, gap: 1, flex: 1 }}>
              <Skeleton
                variant="rectangular"
                width={28}
                height={28}
                animation="wave"
                sx={{ borderRadius: "6px", bgcolor: "rgba(15, 23, 42, 0.06)", flexShrink: 0 }}
              />
              <Box sx={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
                <Skeleton
                  variant="rectangular"
                  width="40%"
                  height={14}
                  animation="wave"
                  sx={{ borderRadius: "4px", bgcolor: "rgba(15, 23, 42, 0.06)" }}
                />
                <Skeleton
                  variant="rectangular"
                  width="20%"
                  height={11}
                  animation="wave"
                  sx={{ borderRadius: "4px", bgcolor: "rgba(15, 23, 42, 0.04)" }}
                />
              </Box>
            </Box>
            <Skeleton
              variant="rectangular"
              width={22}
              height={14}
              animation="wave"
              sx={{ borderRadius: "4px", bgcolor: "rgba(15, 23, 42, 0.06)", flexShrink: 0 }}
            />
          </Box>
        ) : pinnedMessages.length > 0 ? (
          <Box
            component="button"
            type="button"
            onClick={() => {
              setPinnedMessagesOpen(true);
            }}
            sx={{
              height: 44,
              flexShrink: 0,
              width: "100%",
              px: 2.25,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              border: 0,
              borderBottom: "1px solid rgba(15,23,42,0.08)",
              bgcolor: "#fbfcff",
              cursor: "pointer",
              textAlign: "left",
              transition: "background-color 120ms ease, box-shadow 120ms ease",
              "&:hover": {
                bgcolor: "#f3f7ff",
                boxShadow: "inset 3px 0 0 #3b82f6",
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, gap: 1 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "#fff7ed",
                  color: "#f97316",
                  flexShrink: 0,
                }}
              >
                <PushPinIcon sx={{ fontSize: 17 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 750, color: "#1e293b", lineHeight: 1.15 }}>
                  Tin nhắn đã ghim
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.25 }} noWrap>
                  {pinnedMessages.length} tin nhắn đã ghim
                </Typography>
              </Box>
            </Box>
            <MoreHorizIcon sx={{ color: "#475569", fontSize: 22, flexShrink: 0 }} />
          </Box>
        ) : null}

        {isConversationViewLoading ? (
          <ConversationSkeleton />
        ) : conversation.length > 0 ? (
          <ListMess
            theme={currentTheme}
            fontFamily={fontFamily}
            conversation={conversation}
            setReplyMess={setReplyMess}
            visibleMessageStatus={visibleMessageStatus}
            onCallAgain={handleManagedStartCall}
            onLoadOlderMessages={loadOlderMessages}
            loadingOlderMessages={loadingOlderMessages}
            hasMoreMessages={hasMoreMessages}
            onRecallMessage={handleRecallMessage}
            onForwardMessage={setForwardMess}
            onPinMessage={handlePinMessage}
            isGroupConversation={isGroupConversation}
            seenStatuses={seenStatuses}
            senderProfiles={isGroupConversation ? groupMemberProfiles : privateSenderProfiles}
          />
        ) : (
          <WelcomeConversation />
        )}

        {replymess && (
          <ReplyMessage
            fullName={replymess.senderId === currentUserId ? "chính mình" : displayName}
            mess={getReplyBarText(replymess)}
            setReplyMess={setReplyMess}
          />
        )}

        {hasSelectedConversation && (
          <Box sx={{ width: "100%", bgcolor: "#fff", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
            {preview && (
              <Box sx={{ px: 2, pt: 1.5, pb: 1, bgcolor: "#fff" }}>
                <Box
                  sx={{
                    position: "relative",
                    width: selectedFile?.type.startsWith("image/") || selectedFile?.type.startsWith("video/") ? 60 : "min(320px, 100%)",
                    height: selectedFile?.type.startsWith("image/") || selectedFile?.type.startsWith("video/") ? 60 : 56,
                    borderRadius: 2,
                    overflow: "hidden",
                    bgcolor: "#f8fafc",
                    border: "1px solid rgba(0,0,0,0.12)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {selectedFile?.type.startsWith("video/") ? (
                    <Box
                      component="video"
                      src={preview}
                      sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block", bgcolor: "#000" }}
                      preload="metadata"
                      muted
                    />
                  ) : selectedFile?.type.startsWith("image/") ? (
                    <Box
                      component="img"
                      src={preview}
                      alt="preview"
                      sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : selectedFile ? (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0, px: 1.25, pr: 4.5 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1.5,
                          bgcolor: "#f0f7ff",
                          color: "#2563eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <InsertDriveFileIcon sx={{ fontSize: 20 }} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#111827" }} noWrap>
                          {selectedFile.name}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: "#64748b" }}>
                          {formatFileSize(selectedFile.size)}
                        </Typography>
                      </Box>
                    </Box>
                  ) : null}
                  <IconButton
                    sx={{
                      position: "absolute",
                      top: 6,
                      right: 6,
                      width: 26,
                      height: 26,
                      bgcolor: "rgba(0,0,0,0.55)",
                      color: "#fff",
                      "&:hover": { bgcolor: "rgba(0,0,0,0.75)" },
                    }}
                    onClick={() => {
                      setPreview(null);
                      setSelectedFile(null);
                    }}
                  >
                    <CancelPresentationIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Box>
              </Box>
            )}

            <Box
              sx={{
                flexShrink: 0,
                display: "flex",
                alignItems: "flex-end",
                width: "100%",
                gap: 1.5,
                px: 2,
                py: 1,
                bgcolor: "#fff",
                zIndex: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0, pb: 0.15 }}>
                <IconButton
                  aria-label={isRecordingAudio ? "Dừng ghi âm và gửi" : "Ghi âm"}
                  onClick={handleAudioRecordClick}
                  sx={{
                    color: isRecordingAudio ? "#fff" : "#2563eb",
                    bgcolor: isRecordingAudio ? "#ef4444" : "transparent",
                    p: 0.5,
                    "&:hover": {
                      bgcolor: isRecordingAudio ? "#dc2626" : "rgba(37,99,235,0.08)",
                    },
                  }}
                >
                  {isRecordingAudio ? <StopCircleIcon /> : <MicIcon />}
                </IconButton>
                {isRecordingAudio && (
                  <Typography
                    sx={{
                      color: "#dc2626",
                      fontSize: 13,
                      fontWeight: 700,
                      lineHeight: 1,
                      minWidth: 36,
                    }}
                  >
                    {formatRecordingTime(recordingElapsedMs)}
                  </Typography>
                )}
              </Box>

              <IconButton sx={{ color: "#2563eb", p: 0.5 }} onClick={handleOpenFile}>
                <ImageIcon />
              </IconButton>

              <IconButton sx={{ color: "#2563eb", p: 0.5 }} onClick={handleOpenDocument}>
                <AttachFileIcon />
              </IconButton>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />

              <input
                ref={documentInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={handleDocumentChange}
              />

              <Paper
                elevation={0}
                sx={{
                  flex: 1,
                  display: "flex",
                  alignItems: "flex-end",
                  minHeight: 44,
                  maxHeight: 156,
                  borderRadius: "22px",
                  px: 2,
                  py: 0.75,
                  bgcolor: "#f0f7ff",
                  overflow: "visible",
                }}
              >
                <InputBase
                  placeholder="Aa"
                  value={messageText}
                  multiline
                  minRows={1}
                  maxRows={5}
                  onChange={(event) => setMessageText(event.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  sx={{
                    flex: 1,
                    fontSize: 16,
                    color: "#111827",
                    lineHeight: 1.45,
                    py: 0.35,
                    maxHeight: 132,
                    overflowY: "auto",
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgba(100,116,139,0.45) transparent",
                    "&::-webkit-scrollbar": {
                      width: 8,
                    },
                    "&::-webkit-scrollbar-track": {
                      background: "transparent",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      backgroundColor: "rgba(100,116,139,0.38)",
                      borderRadius: "999px",
                      border: "2px solid transparent",
                      backgroundClip: "content-box",
                    },
                    "&::-webkit-scrollbar-thumb:hover": {
                      backgroundColor: "rgba(71,85,105,0.55)",
                    },
                    "&::-webkit-scrollbar-button": {
                      display: "none",
                      width: 0,
                      height: 0,
                    },
                    "& textarea": {
                      overflowY: "auto !important",
                      scrollbarWidth: "thin",
                      scrollbarColor: "rgba(100,116,139,0.45) transparent",
                      "&::-webkit-scrollbar": {
                        width: 8,
                      },
                      "&::-webkit-scrollbar-track": {
                        background: "transparent",
                      },
                      "&::-webkit-scrollbar-thumb": {
                        backgroundColor: "rgba(100,116,139,0.38)",
                        borderRadius: "999px",
                        border: "2px solid transparent",
                        backgroundClip: "content-box",
                      },
                      "&::-webkit-scrollbar-thumb:hover": {
                        backgroundColor: "rgba(71,85,105,0.55)",
                      },
                      "&::-webkit-scrollbar-button": {
                        display: "none",
                        width: 0,
                        height: 0,
                      },
                    },
                  }}
                />

                <Box ref={emojiPickerRef} sx={{ position: "relative", flexShrink: 0 }}>
                  {showEmojiPicker && (
                    <Box
                      sx={{
                        position: "absolute",
                        right: 0,
                        bottom: "calc(100% + 12px)",
                        zIndex: 10,
                        boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <EmojiPicker onEmojiClick={handleEmojiClick} />
                    </Box>
                  )}

                  <IconButton onClick={() => setShowEmojiPicker((prev) => !prev)} sx={{ color: "#2563eb", p: 0.5, mb: 0.15 }}>
                    <SentimentSatisfiedAltIcon />
                  </IconButton>
                </Box>
              </Paper>

              <IconButton
                onClick={sendMessage}
                sx={{
                  bgcolor: "#2563eb",
                  color: "#fff",
                  p: 1.2,
                  "&:hover": { bgcolor: "#1d4ed8" },
                  flexShrink: 0,
                }}
              >
                <SendIcon sx={{ fontSize: 22 }} />
              </IconButton>
            </Box>
          </Box>
        )}
      </Box>

      <Box
        role="separator"
        aria-orientation="vertical"
        aria-label="Kéo để thay đổi độ rộng danh sách bạn bè"
        tabIndex={0}
        onPointerDown={handleFriendsPanelResizeStart}
        onKeyDown={handleFriendsPanelResizeKeyDown}
        sx={{
          display: isMobile ? "none" : "flex",
          width: 8,
          flexShrink: 0,
          cursor: "col-resize",
          position: "relative",
          bgcolor: "#f1f5f9",
          borderLeft: "1px solid rgba(148,163,184,0.35)",
          borderRight: "1px solid rgba(148,163,184,0.35)",
          transition: "background-color 120ms ease",
          outline: "none",
          "&::after": {
            content: '""',
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 3,
            height: 48,
            borderRadius: "999px",
            bgcolor: "rgba(100,116,139,0.38)",
            transform: "translate(-50%, -50%)",
            transition: "background-color 120ms ease, height 120ms ease",
          },
          "&:hover, &:focus-visible": {
            bgcolor: "#e2e8f0",
          },
          "&:hover::after, &:focus-visible::after": {
            bgcolor: "#3b82f6",
            height: 68,
          },
        }}
      />

      <Box
        sx={{
          width: isMobile ? "100%" : friendsPanelWidth,
          minWidth: isMobile ? 0 : FRIENDS_PANEL_MIN_WIDTH,
          maxWidth: isMobile ? "100%" : FRIENDS_PANEL_MAX_WIDTH,
          height: "100%",
          minHeight: 0,
          flexShrink: 0,
          overflow: "hidden",
          bgcolor: "#f4f6fb",
          display: isMobile 
            ? (hasSelectedConversation ? "none" : "block") 
            : "block",
        }}
      >
        <ListFriends onBootstrapStateChange={handleConversationListBootstrap} />
      </Box>
      <ForwardMessageModal
        open={!!forwardmess}
        message={forwardmess}
        currentUserId={currentUserId}
        onClose={() => setForwardMess(null)}
      />
      <VideoCallModal
        open={false}
        mode="outgoing"
        name={displayCallTargetName}
        avatar={callTargetAvatar}
        callType={waitingVideoCall?.callType}
        loading={cancelCallLoading}
        onReject={handleCancelWaitingCall}
      />
      <VideoCallModal
        open={false}
        mode="rejected"
        name={displayCallTargetName}
        avatar={callTargetAvatar}
        callType="AUDIO"
        onReject={() => setRejectedVideoCall(false)}
      />
      {/* Pinned Messages Dialog */}
      <Dialog
        open={pinnedMessagesOpen}
        onClose={() => setPinnedMessagesOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle sx={{ px: 3, py: 2, borderBottom: "1px solid #e2e8f0" }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            Tin nhắn đã ghim
          </Typography>
          <Typography sx={{ fontSize: 13, color: "#64748b", mt: 0.25 }}>
            Tin nhắn đã ghim trong cuộc trò chuyện - {fullName}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, bgcolor: "#fff" }}>
          <Box sx={{ display: "grid", gap: 1.25 }}>
            {pinnedMessages.length === 0 ? (
              <Box sx={{ border: "1px dashed #cbd5e1", borderRadius: 2, p: 3, textAlign: "center", color: "#64748b" }}>
                Chưa có tin nhắn nào được ghim.
              </Box>
            ) : (
              pinnedMessages.map((message) => (
                <Box
                  key={message.messageId}
                  sx={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 2,
                    p: 1.5,
                    display: "flex",
                    gap: 1.25,
                    alignItems: "flex-start",
                  }}
                >
                  <PushPinIcon sx={{ color: "#f97316", fontSize: 19, mt: 0.25 }} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ color: "#0f172a", fontSize: 14, fontWeight: 700 }}>
                      {getMessagePreview(message)}
                    </Typography>
                    <Typography sx={{ color: "#334155", fontSize: 12.5, mt: 0.35, fontWeight: 700 }}>
                      {getPinnedSenderName(message)}
                    </Typography>
                    <Typography sx={{ color: "#64748b", fontSize: 12, mt: 0.35 }}>
                      {message.createdAt ? formatDateTime(message.createdAt) : "Tin nhắn"}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    onClick={() => handlePinMessage(message, false)}
                    sx={{
                      alignSelf: "center",
                      flexShrink: 0,
                      color: "#b91c1c",
                      borderColor: "#fecaca",
                      bgcolor: "#fff",
                      textTransform: "none",
                      fontWeight: 700,
                      "&:hover": {
                        borderColor: "#fca5a5",
                        bgcolor: "#fef2f2",
                      },
                    }}
                    variant="outlined"
                  >
                    Bỏ ghim
                  </Button>
                </Box>
              ))
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e2e8f0" }}>
          <Button
            onClick={() => setPinnedMessagesOpen(false)}
            sx={{ textTransform: "none", fontWeight: 700, color: "#475569" }}
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Study Schedule Dialog */}
      <Dialog
        open={studyScheduleOpen}
        onClose={() => setStudyScheduleOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle sx={{ px: 3, py: 2, borderBottom: "1px solid #e2e8f0" }}>
          <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
            Lịch học nhóm
          </Typography>
          <Typography sx={{ fontSize: 13, color: "#64748b", mt: 0.25 }}>
            Lịch học nhóm của {fullName}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2.5, bgcolor: "#fff" }}>
          <Box sx={{ display: "grid", gap: 1.5 }}>
            {groupSessionsLoading && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress size={32} sx={{ color: "#2563eb" }} />
              </Box>
            )}
            {groupSessionsError && (
              <Box sx={{ border: "1px dashed #fecaca", borderRadius: 2, p: 3, textAlign: "center", color: "#b91c1c", bgcolor: "#fef2f2" }}>
                {groupSessionsError}
              </Box>
            )}
            {!groupSessionsLoading && !groupSessionsError && groupSessions.length === 0 && (
              <Box sx={{ border: "1px dashed #cbd5e1", borderRadius: 2, p: 3, textAlign: "center", color: "#64748b" }}>
                Nhóm chưa có lịch học nào.
              </Box>
            )}
            {!groupSessionsLoading && !groupSessionsError && groupSessions.map((session) => (
              <Box
                key={session.id}
                sx={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 2,
                  p: 2,
                  bgcolor: "#fff",
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, alignItems: "flex-start" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                      {session.title}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: "#64748b", mt: 0.5 }}>
                      {formatDateTime(session.startTime)} - {formatDateTime(session.endTime)}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      px: 1,
                      py: 0.4,
                      borderRadius: 1,
                      bgcolor: session.status === "CANCELLED" ? "#fef2f2" : "#eff6ff",
                      color: session.status === "CANCELLED" ? "#b91c1c" : "#1d4ed8",
                      fontSize: 12,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {sessionStatusLabel[session.status] || session.status}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
                  <Typography sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: "#f1f5f9", color: "#334155", fontSize: 12, fontWeight: 700 }}>
                    {studyModeLabel[session.studyMode] || session.studyMode}
                  </Typography>
                  {session.subjectName && (
                    <Typography sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: "#fff7ed", color: "#c2410c", fontSize: 12, fontWeight: 700 }}>
                      {session.subjectName}
                    </Typography>
                  )}
                  {session.membersCount !== null && session.membersCount !== undefined && (
                    <Typography sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: "#ecfdf5", color: "#047857", fontSize: 12, fontWeight: 700 }}>
                      {session.membersCount} thành viên
                    </Typography>
                  )}
                </Box>

                {(session.location || session.meetingUrl || session.description) && (
                  <Box sx={{ mt: 1.5, color: "#475569", fontSize: 13, lineHeight: 1.6 }}>
                    {session.location && <Typography sx={{ fontSize: 13 }}>Địa điểm: {session.location}</Typography>}
                    {session.meetingUrl && <Typography sx={{ fontSize: 13 }}>Link học: {session.meetingUrl}</Typography>}
                    {session.description && <Typography sx={{ fontSize: 13 }}>Ghi chú: {session.description}</Typography>}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e2e8f0" }}>
          <Button
            onClick={() => setStudyScheduleOpen(false)}
            sx={{ textTransform: "none", fontWeight: 700, color: "#475569" }}
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={badWordsWarningOpen}
        onClose={() => setBadWordsWarningOpen(false)}
        PaperProps={{
          sx: {
            width: "min(420px, calc(100vw - 32px))",
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#a40000" }}>
          Nội dung không phù hợp
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: "#333", lineHeight: 1.6 }}>
            Tin nhắn của bạn có chứa từ ngữ xúc phạm. Vui lòng chỉnh sửa nội dung trước khi gửi.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="contained"
            onClick={() => setBadWordsWarningOpen(false)}
            sx={{
              bgcolor: "#a40000",
              "&:hover": { bgcolor: "#8a0000" },
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Đã hiểu
          </Button>
        </DialogActions>
      </Dialog>
      {isColorPickerOpen && (
        <ColorPickerModal
          open={isColorPickerOpen}
          onClose={() => setIsColorPickerOpen(false)}
          currentThemeId={themeId}
          currentFontId={fontFamily}
          onSelectTheme={handleSelectTheme}
          onSelectFont={handleSelectFont}
        />
      )}
      {mediaFilesOpen && (
        <MediaFilesModal
          open={mediaFilesOpen}
          onClose={() => setMediaFilesOpen(false)}
          fullName={displayName}
          conversationId={conversationId.current}
          currentUserId={currentUserId}
          getPinnedSenderName={getPinnedSenderName}
          formatDateTime={formatDateTime}
          isGroupConversation={isGroupConversation}
          groupId={groupId}
        />
      )}
    </Box>
  );
}
