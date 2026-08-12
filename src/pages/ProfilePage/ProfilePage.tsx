import CloseIcon from "@mui/icons-material/Close";
import ImageIcon from "@mui/icons-material/Image";
import LockIcon from "@mui/icons-material/Lock";
import PeopleIcon from "@mui/icons-material/People";
import PublicIcon from "@mui/icons-material/Public";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SchoolIcon from "@mui/icons-material/School";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import LocalLibraryIcon from "@mui/icons-material/LocalLibrary";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import SearchIcon from "@mui/icons-material/Search";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SendIcon from "@mui/icons-material/Send";
import ChatBubbleIcon from "@mui/icons-material/ChatBubble";
import ReplyIcon from "@mui/icons-material/Reply";
import { toast } from "react-toastify";
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Skeleton,
  InputAdornment,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ReportModal from "../../components/modal/ReportModal";
import EditProfileModal from "../../components/modal/user/EditProfileModal";
import { ProfileStatus } from "../../enum/Profile";
import { SocketEvent } from "../../enum/SocketEvent";
import { UserProfile } from "../../model/UserModel";
import { RootState } from "../../redux/store";
import { getProfileByUserId } from "../../services/ProfileService";
import { ProfileApiResponse } from "../MyProfile/types";

import {
  FriendUser,
  loadFriendListService,
  loadFriendRequestsService,
  loadProfileService,
  requestFriendService,
  unfriendService,
  updateFriendRequestStatusService,
} from "../../services/FriendService";
import PostReactionsModal from "../../components/modal/user/PostReactionsModal";
import { matchingItemApi } from "../../services/matchingItemApi";
import {
  Achievement,
  loadAchievements,
  loadProfilePosts,
  loadProfileSocialStats,
  ProfileSocialStats,
  SocialPost,
  PostComment,
  loadPostComments,
  togglePostLike,
  addPostComment,
} from "../../services/SocialPostService";
import Post, { PostSkeleton } from "../../components/post/Post";
import CreatePostDialog, { parsePostContent } from "../../components/modal/user/CreatePostDialog";
import PostMediaModal from "../../components/modal/user/PostMediaModal";
import noPostImg from "../../assets/img/no-post.png";
import noFriendImg from "../../assets/img/no-friend.png";
import noImgImg from "../../assets/img/no-img.png";
import noVideoImg from "../../assets/img/no-video.png";
import WebSocketManager from "../../socket/WebSocketManager";
type RecommendationState = {
  fromRecommendation?: boolean;
  finalScore?: number;
  reasonText?: string;
};

type PendingProfileFriendRequest = {
  id: number;
  direction: "sent" | "received";
} | null;

const isImageUrl = (url: string) => {
  const lower = url.toLowerCase();
  return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") ||
    lower.endsWith(".gif") || lower.endsWith(".webp") || lower.endsWith(".svg") ||
    lower.endsWith(".bmp") || lower.endsWith(".tiff");
};

const formatTime = (value: string) => {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ`;
  return date.toLocaleDateString("vi-VN");
};

function ProfilePhotoItem({ url, alt, onClick }: { url: string; alt: string; onClick: () => void }) {
  const [loading, setLoading] = useState(true);
  return (
    <Box
      onClick={onClick}
      sx={{
        position: "relative",
        width: "100%",
        paddingTop: "100%", // 1:1 Aspect Ratio
        borderRadius: "12px",
        overflow: "hidden",
        cursor: "pointer",
        bgcolor: "#f1f5f9",
        border: "1px solid #e2e8f0",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "scale(1.03)",
          boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
          "& .photo-overlay": {
            opacity: 1,
          },
        },
      }}
    >
      {loading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
          }}
        >
          <CircularProgress size={24} />
        </Box>
      )}
      <Box
        component="img"
        src={url}
        alt={alt}
        onLoad={() => setLoading(false)}
        onError={() => setLoading(false)}
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: loading ? "none" : "block",
        }}
      />
      <Box
        className="photo-overlay"
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          bgcolor: "rgba(0,0,0,0.2)",
          opacity: 0,
          transition: "opacity 0.2s",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      />
    </Box>
  );
}

function ProfileVideoItem({ url }: { url: string }) {
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  return (
    <Box
      sx={{
        width: "100%",
        borderRadius: "12px",
        overflow: "hidden",
        border: "1px solid #e2e8f0",
        bgcolor: "#000",
        aspectRatio: "16/9",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        transition: "transform 0.2s, box-shadow 0.2s",
        position: "relative",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 8px 16px rgba(0,0,0,0.12)",
        },
      }}
    >
      {loading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3,
          }}
        >
          <CircularProgress size={28} />
        </Box>
      )}
      {isPlaying ? (
        <video
          src={url}
          controls
          autoPlay
          onLoadedData={() => setLoading(false)}
          onCanPlay={() => setLoading(false)}
          onError={() => setLoading(false)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: loading ? "none" : "block",
          }}
        />
      ) : (
        <Box
          onClick={() => setIsPlaying(true)}
          sx={{
            width: "100%",
            height: "100%",
            position: "relative",
            cursor: "pointer",
          }}
        >
          <video
            src={url}
            onLoadedData={() => setLoading(false)}
            onCanPlay={() => setLoading(false)}
            onError={() => setLoading(false)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: loading ? "none" : "block",
            }}
          />
          {!loading && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "rgba(0,0,0,0.15)",
              }}
            >
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  bgcolor: "rgba(255, 255, 255, 0.9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                }}
              >
                <span style={{ fontSize: "24px", color: "#1e293b", marginLeft: "4px" }}>▶</span>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

function InlineMediaRenderer({ url, isVideo }: { url: string; isVideo: boolean }) {
  const [loading, setLoading] = useState(true);
  return (
    <Box sx={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
      {loading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
          }}
        >
          <CircularProgress size={40} sx={{ color: "white" }} />
        </Box>
      )}
      {isVideo ? (
        <Box
          component="video"
          src={url}
          controls
          autoPlay
          onLoadedData={() => setLoading(false)}
          onCanPlay={() => setLoading(false)}
          onError={() => setLoading(false)}
          sx={{ maxWidth: "100%", maxHeight: "550px", objectFit: "contain", display: loading ? "none" : "block" }}
        />
      ) : (
        <Box
          component="img"
          src={url}
          alt="Fullscreen inline preview"
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
          sx={{ maxWidth: "100%", maxHeight: "550px", objectFit: "contain", display: loading ? "none" : "block" }}
        />
      )}
    </Box>
  );
}

const profileTheme = createTheme({
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
  },
});

export default function ProfilePage() {
  const location = useLocation();
  const recommendation = location.state as RecommendationState | null;

  const [profile, setProfile] = useState<UserProfile | undefined>();
  const [modalEdit, setModalEdit] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // States & handlers for friends action menu
  const [friendAnchorEl, setFriendAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<number | null>(null);

  const handleFriendMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, friendId: number) => {
    event.stopPropagation();
    setFriendAnchorEl(event.currentTarget);
    setSelectedFriendId(friendId);
  };

  const handleFriendMenuClose = () => {
    setFriendAnchorEl(null);
    setSelectedFriendId(null);
  };

  const handleUnfriendFriend = async (friendId: number) => {
    if (!currentUserId) return;
    try {
      await unfriendService(currentUserId, friendId);
      emitFriendCancelSocket(friendId);
      setFriends((prev) => prev.filter((f) => f.userId !== friendId));
      setProfile((prev) => prev ? { ...prev, numberFriend: Math.max(0, (prev.numberFriend ?? 1) - 1) } : prev);
      refreshFriendshipData();
      window.dispatchEvent(new Event("friend_status_updated"));
      handleFriendMenuClose();
    } catch (error) {
      console.error("Failed to unfriend", error);
    }
  };
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [profilePostsPage, setProfilePostsPage] = useState(0);
  const [hasMoreProfilePosts, setHasMoreProfilePosts] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const PROFILE_POSTS_PAGE_SIZE = 5;


  const loadMoreProfilePosts = async () => {
    if (!profileUserId) return;
    const nextPage = profilePostsPage + 1;
    try {
      const res = await loadProfilePosts(profileUserId, nextPage, PROFILE_POSTS_PAGE_SIZE, currentUserId);
      setPosts((prev) => [...prev, ...res.items]);
      setProfilePostsPage(nextPage);
      setHasMoreProfilePosts(res.hasNext);
    } catch (error) {
      console.error("Cannot load more profile posts", error);
    }
  };
  const [stats, setStats] = useState<ProfileSocialStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [unfriendConfirmOpen, setUnfriendConfirmOpen] = useState(false);
  const [reactionsModalOpen, setReactionsModalOpen] = useState(false);
  const [studyProfile, setStudyProfile] = useState<ProfileApiResponse | null>(null);
  const [loadingStudyProfile, setLoadingStudyProfile] = useState(false);
  const [studyProfileError, setStudyProfileError] = useState<string | null>(null);
  const [studyProfileRetry, setStudyProfileRetry] = useState(0);
  const [isPosting, setIsPosting] = useState(false);
  const [pendingProfileFriendRequest, setPendingProfileFriendRequest] =
    useState<PendingProfileFriendRequest>(null);
  const [friendRequestActionLoading, setFriendRequestActionLoading] = useState(false);

  // New States
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendsSearchQuery, setFriendsSearchQuery] = useState("");
  const [mutualFriendsMap, setMutualFriendsMap] = useState<Record<number, number>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);

  // Inline Media Viewer States
  const [activeViewingPost, setActiveViewingPost] = useState<SocialPost | null>(null);
  const [activeViewingMediaIndex, setActiveViewingMediaIndex] = useState<number>(0);
  const [inlineComments, setInlineComments] = useState<PostComment[]>([]);
  const [inlineCommentText, setInlineCommentText] = useState("");
  const [loadingInlineComments, setLoadingInlineComments] = useState(false);
  const [showReactionsPopup, setShowReactionsPopup] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();
  const trackedViewKeyRef = useRef<string | null>(null);
  const socketMessage = useSelector((state: RootState) => state.chat.newMess);

  const currentUserId = Number(localStorage.getItem("userId"));
  const profileUserId = Number(id);
  const isOwnProfile = currentUserId === profileUserId;

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);

  const refreshProfileOverview = useCallback(() => {
    if (!profileUserId) return;
    setLoadingProfile(true);
    setProfileLoadError(null);
    loadProfileService(profileUserId)
      .then((response: UserProfile) => {
        setProfile(response);
        setProfileLoadError(null);
      })
      .catch((error) => {
        console.error("Cannot load profile", error);
        setProfile(undefined);
        setProfileLoadError(
          error instanceof Error && error.message
            ? error.message
            : "Không thể tải hồ sơ. Vui lòng thử lại sau.",
        );
      })
      .finally(() => setLoadingProfile(false));
  }, [profileUserId]);

  const refreshPendingFriendRequest = useCallback(() => {
    if (!currentUserId || !profileUserId || currentUserId === profileUserId) {
      setPendingProfileFriendRequest(null);
      return;
    }

    loadFriendRequestsService(currentUserId)
      .then(({ sent, received }) => {
        const sentRequest = sent.find(
          (request) =>
            request.status === ProfileStatus.PENDING &&
            Number(request.receiverId) === profileUserId,
        );
        if (sentRequest) {
          setPendingProfileFriendRequest({ id: sentRequest.id, direction: "sent" });
          return;
        }

        const receivedRequest = received.find(
          (request) =>
            request.status === ProfileStatus.PENDING &&
            Number(request.senderId) === profileUserId,
        );
        if (receivedRequest) {
          setPendingProfileFriendRequest({ id: receivedRequest.id, direction: "received" });
          return;
        }

        setPendingProfileFriendRequest(null);
      })
      .catch((error) => {
        console.error("Cannot load pending friend request", error);
        setPendingProfileFriendRequest(null);
      });
  }, [currentUserId, profileUserId]);

  const refreshProfileFriends = useCallback(() => {
    if (!profileUserId) {
      setFriends([]);
      return;
    }

    setLoadingFriends(true);
    loadFriendListService(profileUserId)
      .then((data) => {
        setFriends(data);
      })
      .catch((error) => {
        console.error("Cannot load friends list", error);
      })
      .finally(() => {
        setLoadingFriends(false);
      });
  }, [profileUserId]);

  const refreshProfileStats = useCallback(() => {
    if (!profileUserId) return;
    loadProfileSocialStats(profileUserId)
      .then((statData) => setStats(statData))
      .catch((error) => console.error("Cannot load profile social stats", error));
  }, [profileUserId]);

  const refreshFriendshipData = useCallback(() => {
    refreshProfileOverview();
    refreshPendingFriendRequest();
    refreshProfileFriends();
    refreshProfileStats();
  }, [
    refreshPendingFriendRequest,
    refreshProfileFriends,
    refreshProfileOverview,
    refreshProfileStats,
  ]);

  const emitFriendCancelSocket = useCallback((receiverId: number) => {
    if (!currentUserId || !receiverId) return;
    try {
      WebSocketManager.getInstance().sendMessage("/chat/send", {
        event: SocketEvent.FRIEND_REQUEST_CANCEL,
        data: {
          senderId: currentUserId,
          receiverId,
        },
      });
    } catch (socketErr) {
      console.error("Failed to emit FRIEND_REQUEST_CANCEL socket event", socketErr);
    }
  }, [currentUserId]);

  // Extract photos and videos from posts
  const photos = useMemo(() => {
    const list: { post: SocialPost; mediaIndex: number; url: string }[] = [];
    posts.forEach((post) => {
      post.media?.forEach((m, idx) => {
        if (m.mediaType !== "VIDEO" && isImageUrl(m.mediaUrl)) {
          list.push({ post, mediaIndex: idx, url: m.mediaUrl });
        }
      });
    });
    return list;
  }, [posts]);

  const videos = useMemo(() => {
    const list: string[] = [];
    posts.forEach((post) => {
      post.media?.forEach((m) => {
        if (
          m.mediaType === "VIDEO" ||
          m.mediaUrl.toLowerCase().endsWith(".mp4") ||
          m.mediaUrl.toLowerCase().endsWith(".mov") ||
          m.mediaUrl.toLowerCase().endsWith(".webm")
        ) {
          list.push(m.mediaUrl);
        }
      });
    });
    return list;
  }, [posts]);

  useEffect(() => {
    if (!profileUserId) return;
    setActiveTab(0);
    refreshFriendshipData();
  }, [profileUserId, refreshFriendshipData]);

  useEffect(() => {
    if (!profileUserId) {
      setStudyProfile(null);
      setStudyProfileError(null);
      return;
    }
    setLoadingStudyProfile(true);
    setStudyProfileError(null);
    getProfileByUserId(profileUserId)
      .then((data) => {
        setStudyProfile(data);
      })
      .catch((error) => {
        console.error("Cannot load study profile", error);
        setStudyProfile(null);
        setStudyProfileError(
          error instanceof Error && error.message
            ? error.message
            : "Không thể tải hồ sơ học tập. Vui lòng thử lại sau."
        );
      })
      .finally(() => {
        setLoadingStudyProfile(false);
      });
  }, [profileUserId, studyProfileRetry]);

  useEffect(() => {
    refreshProfileFriends();
  }, [refreshProfileFriends]);

  useEffect(() => {
    if (friends.length === 0 || !currentUserId) return;
    const friendsToFetch = friends.slice(0, 30);
    friendsToFetch.forEach((friend) => {
      if (mutualFriendsMap[friend.userId] !== undefined || friend.userId === currentUserId) return;
      loadProfileService(friend.userId)
        .then((res) => {
          if (res && typeof res.mutualFriends === "number") {
            setMutualFriendsMap((prev) => ({
              ...prev,
              [friend.userId]: res.mutualFriends,
            }));
          }
        })
        .catch((err) => {
          console.error(`Failed to load mutual friends count for ${friend.userId}`, err);
        });
    });
  }, [friends, currentUserId]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 150) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (activeViewingPost) {
      void loadInlineComments(activeViewingPost.id);
    }
  }, [activeViewingPost?.id]);

  const loadInlineComments = async (postId: number) => {
    setLoadingInlineComments(true);
    try {
      const list = await loadPostComments(postId);
      setInlineComments(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInlineComments(false);
    }
  };

  const handleToggleInlineLike = async (reactionType?: string) => {
    if (!activeViewingPost || !currentUserId) return;
    try {
      const next = await togglePostLike(activeViewingPost.id, currentUserId, reactionType);
      setActiveViewingPost(next);
      setPosts((prev) => prev.map((p) => (p.id === next.id ? next : p)));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddInlineComment = async () => {
    if (!activeViewingPost || !currentUserId || !inlineCommentText.trim()) return;
    try {
      const comment = await addPostComment(activeViewingPost.id, currentUserId, inlineCommentText.trim());
      setInlineComments((prev) => [...prev, comment]);
      setInlineCommentText("");
      const updatedPost = { ...activeViewingPost, commentCount: activeViewingPost.commentCount + 1 };
      setActiveViewingPost(updatedPost);
      setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {

    if (!currentUserId || !profileUserId) return;
    if (currentUserId === profileUserId) return;
    if (!recommendation?.fromRecommendation) return;
    if (!recommendation.finalScore || recommendation.finalScore <= 0) return;

    const viewKey = `${currentUserId}:${profileUserId}`;
    if (trackedViewKeyRef.current === viewKey) return;
    trackedViewKeyRef.current = viewKey;

    const trackProfileViewed = async () => {
      try {
        await matchingItemApi.recordAction({
          userId: currentUserId,
          recommendedUserId: profileUserId,
          actionStatus: "VIEWED",
          finalScore: recommendation.finalScore,
          reasonText: recommendation.reasonText,
        });
      } catch (error) {
        console.error("Track matching VIEWED failed", error);
      }
    };

    void trackProfileViewed();
  }, [
    currentUserId,
    profileUserId,
    recommendation?.fromRecommendation,
    recommendation?.finalScore,
    recommendation?.reasonText,
  ]);
  useEffect(() => {
    if (!profileUserId) return;
    setProfilePostsPage(0);
    setLoadingPosts(true);
    Promise.all([
      loadProfilePosts(profileUserId, 0, PROFILE_POSTS_PAGE_SIZE, currentUserId),
      loadProfileSocialStats(profileUserId),
      loadAchievements(profileUserId),
    ])
      .then(([postList, statData, achievementList]) => {
        setPosts(postList.items);
        setHasMoreProfilePosts(postList.hasNext);
        setStats(statData);
        setAchievements(achievementList);
      })
      .catch((error) => console.error("Cannot load profile social data", error))
      .finally(() => setLoadingPosts(false));
  }, [profileUserId, currentUserId]);

  useEffect(() => {
    const handleStatusUpdate = () => {
      if (!profileUserId) return;
      refreshFriendshipData();
      setProfilePostsPage(0);
      setLoadingPosts(true);

      Promise.all([
        loadProfilePosts(profileUserId, 0, PROFILE_POSTS_PAGE_SIZE, currentUserId),
        loadProfileSocialStats(profileUserId),
        loadAchievements(profileUserId),
      ])
        .then(([postList, statData, achievementList]) => {
          setPosts(postList.items);
          setHasMoreProfilePosts(postList.hasNext);
          setStats(statData);
          setAchievements(achievementList);
        })
        .catch((error) => console.error("Cannot load profile social data", error))
        .finally(() => setLoadingPosts(false));
    };

    window.addEventListener("friend_status_updated", handleStatusUpdate);
    return () => {
      window.removeEventListener("friend_status_updated", handleStatusUpdate);
    };
  }, [profileUserId, currentUserId, refreshFriendshipData]);



  useEffect(() => {
    const friendEvents = new Set<string | null>([
      SocketEvent.FRIEND_REQUEST_RECEIVE,
      SocketEvent.FRIEND_REQUEST_ACCEPT_RECEIVE,
      SocketEvent.FRIEND_REQUEST_CANCEL_RECEIVE,
    ]);

    if (!socketMessage || !friendEvents.has(socketMessage.event)) return;

    const data = socketMessage.data as {
      senderId?: number | string;
      sender_id?: number | string;
      receiverId?: number | string;
      receiver_id?: number | string;
    } | null;
    const senderId = Number(data?.senderId ?? data?.sender_id);
    const receiverId = Number(data?.receiverId ?? data?.receiver_id);
    const isRelatedToOpenProfile =
      Number.isFinite(profileUserId) &&
      (senderId === profileUserId || receiverId === profileUserId);
    const isRelatedToCurrentUser =
      Number.isFinite(currentUserId) &&
      (senderId === currentUserId || receiverId === currentUserId);

    if (isRelatedToOpenProfile && isRelatedToCurrentUser) {
      refreshFriendshipData();
    }
  }, [currentUserId, profileUserId, refreshFriendshipData, socketMessage]);


  const requestFriend = async () => {
    if (!currentUserId || !profileUserId) return;
    if (currentUserId === profileUserId) return;

    const response = await requestFriendService(profileUserId);
    if (response.code !== "201" && response.code !== 201) {
      toast.error("Gửi lời mời thất bại");
      return;
    }

    try {
      await matchingItemApi.updateStatus({
        userId: currentUserId,
        recommendedUserId: profileUserId,
        actionStatus: "FRIEND_REQUEST_SENT",
      });
    } catch (error) {
      console.error("Track matching FRIEND_REQUEST_SENT failed", error);
    }

    setProfile((prev) => (prev ? { ...prev, statusFriend: ProfileStatus.PENDING } : prev));
    setPendingProfileFriendRequest({
      id: Number((response.data as any)?.id || 0),
      direction: "sent",
    });
    refreshPendingFriendRequest();
  };

  const handleAcceptProfileFriendRequest = async () => {
    if (!pendingProfileFriendRequest || pendingProfileFriendRequest.direction !== "received") return;

    try {
      setFriendRequestActionLoading(true);
      const response = await updateFriendRequestStatusService(
        pendingProfileFriendRequest.id,
        "APPROVED",
      );
      if (response.code && Number(response.code) >= 400) {
        throw new Error(response.message || "Accept request failed");
      }

      try {
        WebSocketManager.getInstance().sendMessage("/chat/send", {
          event: SocketEvent.FRIEND_REQUEST_ACCEPT,
          data: {
            senderId: currentUserId,
            receiverId: profileUserId,
          },
        });
      } catch (socketErr) {
        console.error("Failed to emit FRIEND_REQUEST_ACCEPT socket event", socketErr);
      }

      setPendingProfileFriendRequest(null);
      refreshFriendshipData();
      window.dispatchEvent(new Event("friend_status_updated"));
    } catch (error) {
      console.error(error);
      toast.error("Không thể chấp nhận lời mời kết bạn");
    } finally {
      setFriendRequestActionLoading(false);
    }
  };

  const handleDeclineProfileFriendRequest = async () => {
    if (!pendingProfileFriendRequest || pendingProfileFriendRequest.direction !== "received") return;

    try {
      setFriendRequestActionLoading(true);
      const response = await updateFriendRequestStatusService(
        pendingProfileFriendRequest.id,
        "REJECTED",
      );
      if (response.code && Number(response.code) >= 400) {
        throw new Error(response.message || "Decline request failed");
      }

      emitFriendCancelSocket(profileUserId);
      setPendingProfileFriendRequest(null);
      refreshFriendshipData();
      window.dispatchEvent(new Event("friend_status_updated"));
    } catch (error) {
      console.error(error);
      toast.error("Không thể từ chối lời mời kết bạn");
    } finally {
      setFriendRequestActionLoading(false);
    }
  };

  const handleUnfriend = async () => {
    if (!profileUserId || !currentUserId) return;
    try {
      const response = await unfriendService(currentUserId, profileUserId);
      if (response.code === 200 || response.code === "200") {
        emitFriendCancelSocket(profileUserId);
        setProfile((prev) => prev ? { ...prev, friend: false, statusFriend: undefined } : prev);
        setUnfriendConfirmOpen(false);
        refreshFriendshipData();
        window.dispatchEvent(new Event("friend_status_updated"));
      } else {
        toast.error("Hủy kết bạn thất bại: " + (response.message || "Lỗi không xác định"));
      }
    } catch (error) {
      console.error("Failed to unfriend", error);
      toast.error("Đã xảy ra lỗi khi hủy kết bạn.");
    }
  };


  const sendMess = () => {
    navigate("/conversation", {
      state: {
        conversationKind: "PRIVATE",
        targetUserId: profileUserId,
        avatar: profile?.avatarUrl,
        fullName: profile?.fullName,
      },
    });
  };

  const handleCloseCreatePost = () => {
    setCreatePostOpen(false);
  };

  const renderFeed = () => (
    <>
      {isOwnProfile && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            p: 2,
            mb: 3,
            bgcolor: "#fff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <Avatar
            src={profile?.avatarUrl || undefined}
            sx={{ width: 40, height: 40, border: "1px solid #e2e8f0" }}
          >
            {profile?.fullName?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Box
            onClick={() => setCreatePostOpen(true)}
            sx={{
              flexGrow: 1,
              height: "40px",
              bgcolor: "#f1f5f9",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              px: 2,
              color: "#64748b",
              fontSize: "14px",
              cursor: "pointer",
              transition: "background-color 0.2s ease",
              "&:hover": {
                bgcolor: "#e2e8f0",
              },
            }}
          >
            Bạn đang nghĩ gì?
          </Box>
        </Box>
      )}

      {isPosting && <PostSkeleton />}

      {loadingPosts ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <PostSkeleton />
          <PostSkeleton />
        </Box>
      ) : posts.length === 0 ? (
        !isPosting && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 6, gap: 1.5 }}>
            <Box
              component="img"
              src={noPostImg}
              alt="No posts"
              sx={{
                width: "540px",
                height: "auto",
                opacity: 0.85,
              }}
            />
            <Typography sx={{ color: "#64748b", fontWeight: 600, fontSize: "15px" }}>
              Không có bài viết nào
            </Typography>
          </Box>
        )
      ) : (
        posts.map((post) => (
          <Post
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            onPostChanged={(nextPost) => {
              setPosts((prev) => prev.map((item) => (item.id === nextPost.id ? nextPost : item)));
            }}
            onPostDeleted={(postId) => {
              setPosts((prev) => prev.filter((item) => item.id !== postId));
              setStats((prev) => (prev ? { ...prev, postCount: Math.max(0, prev.postCount - 1) } : prev));
            }}
            onImageClick={(index) => {
              setActiveViewingPost(post);
              setActiveViewingMediaIndex(index);
            }}
            onViewSharedPost={(sharedPost, mediaIndex) => {
              setActiveViewingPost(sharedPost);
              setActiveViewingMediaIndex(mediaIndex);
            }}
          />
        ))
      )}

      {hasMoreProfilePosts && (
        <Box sx={{ display: "flex", justifyContent: "center", pt: 2, pb: 4 }}>
          <Button
            onClick={loadMoreProfilePosts}
            variant="outlined"
            sx={{
              borderRadius: "20px",
              textTransform: "none",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
              borderColor: "#e2e8f0",
              "&:hover": {
                bgcolor: "#f8fafc",
                borderColor: "#cbd5e1",
              },
            }}
          >
            Xem thêm bài viết
          </Button>
        </Box>
      )}
    </>
  );

  const renderFriends = () => {
    const filteredFriends = friends.filter((friend) =>
      friend.fullName.toLowerCase().includes(friendsSearchQuery.toLowerCase())
    );

    return (
      <Box sx={{ mt: 2 }}>
        <TextField
          size="small"
          variant="outlined"
          placeholder="Tìm kiếm bạn bè..."
          value={friendsSearchQuery}
          onChange={(e) => setFriendsSearchQuery(e.target.value)}
          sx={{
            mb: 3,
            width: "300px",
            bgcolor: "#f8fafc",
            borderRadius: "8px",
            "& .MuiOutlinedInput-root": {
              borderRadius: "8px",
              "& fieldset": {
                borderColor: "#e2e8f0",
              },
              "&:hover fieldset": {
                borderColor: "#cbd5e1",
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: "#94a3b8", fontSize: "20px" }} />
              </InputAdornment>
            ),
          }}
        />

        {loadingFriends ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : friends.length === 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 6, gap: 1.5 }}>
            <Box
              component="img"
              src={noFriendImg}
              alt="No friends"
              sx={{
                width: "540px",
                height: "auto",
                opacity: 0.85,
              }}
            />
            <Typography sx={{ color: "#64748b", fontWeight: 600, fontSize: "15px" }}>
              Không có bạn bè
            </Typography>
          </Box>
        ) : filteredFriends.length === 0 ? (
          <Typography sx={{ color: "#6b7280", textAlign: "center", py: 4 }}>
            Không tìm thấy bạn bè nào
          </Typography>
        ) : (
          <Grid container spacing={2}>
            {filteredFriends.map((friend) => {
              const mutualCount = mutualFriendsMap[friend.userId];

              return (
                <Grid size={{ xs: 12, sm: 6 }} key={friend.userId}>
                  <Card
                    onClick={() => navigate(`/profile/${friend.userId}`)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 2,
                      borderRadius: "12px",
                      border: "1px solid #e5e7eb",
                      boxShadow: "none",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        borderColor: "#cbd5e1",
                        backgroundColor: "#f8fafc",
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: 0 }}>
                      <Avatar
                        variant="rounded"
                        src={friend.avatarUrl || undefined}
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          fontSize: "24px",
                          fontWeight: "bold",
                          bgcolor: "#3b82f6",
                        }}
                      >
                        {friend.fullName.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 700,
                            color: "#0f172a",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: "16px",
                            lineHeight: 1.4,
                            "&:hover": {
                              textDecoration: "underline",
                            },
                          }}
                        >
                          {friend.fullName}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: "#64748b", fontSize: "14px", mt: 0.5 }}
                        >
                          {mutualCount !== undefined && mutualCount > 0 ? `${mutualCount} bạn chung` : ""}
                        </Typography>
                      </Box>
                    </Box>

                    <IconButton
                      onClick={(e) => handleFriendMenuOpen(e, friend.userId)}
                      sx={{
                        color: "#64748b",
                        "&:hover": {
                          backgroundColor: "#f1f5f9",
                        },
                      }}
                    >
                      <MoreHorizIcon />
                    </IconButton>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        <Menu
          anchorEl={friendAnchorEl}
          open={Boolean(friendAnchorEl)}
          onClose={handleFriendMenuClose}
          onClick={(e) => e.stopPropagation()}
          PaperProps={{
            elevation: 1,
            sx: {
              borderRadius: "12px",
              minWidth: 150,
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              border: "1px solid #f1f5f9",
            },
          }}
        >
          <MenuItem
            onClick={() => {
              if (selectedFriendId) {
                navigate(`/profile/${selectedFriendId}`);
              }
              handleFriendMenuClose();
            }}
            sx={{ fontSize: "14px", py: 1.2, fontWeight: 500 }}
          >
            Xem trang cá nhân
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedFriendId) {
                handleUnfriendFriend(selectedFriendId);
              }
            }}
            sx={{ fontSize: "14px", py: 1.2, fontWeight: 500, color: "error.main" }}
          >
            Hủy kết bạn
          </MenuItem>
        </Menu>
      </Box>
    );
  };

  const renderPhotos = () => {
    if (photos.length === 0) {
      return (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 6, gap: 1.5 }}>
          <Box
            component="img"
            src={noImgImg}
            alt="No photos"
            sx={{
              width: "540px",
              height: "auto",
              opacity: 0.85,
            }}
          />
          <Typography sx={{ color: "#64748b", fontWeight: 600, fontSize: "15px" }}>
            Không có hình ảnh
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          {photos.map((item, index) => (
            <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
              <ProfilePhotoItem
                url={item.url}
                alt={`Gallery photo ${index + 1}`}
                onClick={() => {
                  setActiveViewingPost(item.post);
                  setActiveViewingMediaIndex(item.mediaIndex);
                }}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  const renderInlinePostDetails = () => {
    if (!activeViewingPost) return null;
    const { content: parsedContent } = parsePostContent(activeViewingPost.content);

    const getReactionUI = (reactionType?: string | null) => {
      if (!reactionType) return { icon: <ThumbUpIcon sx={{ fontSize: 18, color: "#64748b" }} />, text: "Thích", color: "#64748b" };
      switch (reactionType.toUpperCase()) {
        case "LOVE":
          return { icon: <span style={{ fontSize: 18 }}>❤️</span>, text: "Yêu thích", color: "#f43f5e" };
        case "HAHA":
          return { icon: <span style={{ fontSize: 18 }}>😆</span>, text: "Haha", color: "#eab308" };
        case "WOW":
          return { icon: <span style={{ fontSize: 18 }}>😮</span>, text: "Wow", color: "#eab308" };
        case "SAD":
          return { icon: <span style={{ fontSize: 18 }}>😢</span>, text: "Buồn", color: "#3b82f6" };
        case "ANGRY":
          return { icon: <span style={{ fontSize: 18 }}>😡</span>, text: "Phẫn nộ", color: "#2563eb" };
        case "LIKE":
        default:
          return { icon: <ThumbUpIcon sx={{ fontSize: 18, color: "#3b82f6" }} />, text: "Thích", color: "#3b82f6" };
      }
    };

    const getReactionEmoji = (type: string) => {
      switch (type.toUpperCase()) {
        case "LOVE": return "❤️";
        case "HAHA": return "😆";
        case "WOW": return "😮";
        case "SAD": return "😢";
        case "ANGRY": return "😡";
        case "LIKE":
        default:
          return "👍";
      }
    };

    const renderTopReactions = (topReactions?: string[] | null) => {
      if (!topReactions || topReactions.length === 0) return null;
      return (
        <Box
          onClick={() => setReactionsModalOpen(true)}
          sx={{ display: "flex", alignItems: "center", mr: 0.5, cursor: "pointer", "&:hover": { opacity: 0.8 } }}
        >
          {topReactions.map((type, idx) => (
            <Box
              key={type}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                bgcolor: "#f1f5f9",
                border: "1px solid white",
                marginLeft: idx > 0 ? "-4px" : "0",
                zIndex: 2 - idx,
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              {getReactionEmoji(type)}
            </Box>
          ))}
        </Box>
      );
    };

    const rxUI = getReactionUI(activeViewingPost.likedByViewer ? activeViewingPost.reactionType : null);

    return (
      <Box
        sx={{
          bgcolor: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          p: 3,
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
          height: "fit-content",
          maxHeight: "85vh",
        }}
      >
        <Button
          onClick={() => setActiveViewingPost(null)}
          variant="outlined"
          size="small"
          startIcon={<ArrowBackIcon />}
          sx={{ textTransform: "none", fontWeight: 700, borderRadius: "20px", py: 1 }}
          fullWidth
        >
          Quay lại trang cá nhân
        </Button>

        {/* Author info */}
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Avatar
            src={activeViewingPost.authorAvatarUrl || undefined}
            sx={{ width: 42, height: 42, mr: 1.5, border: "1px solid #e2e8f0" }}
          >
            {activeViewingPost.authorName?.charAt(0)?.toUpperCase()}
          </Avatar>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "14.5px", color: "#0f172a" }}>
              {activeViewingPost.authorName}
            </Typography>
            <Typography sx={{ fontSize: "11px", color: "#64748b", mt: 0.25 }}>
              {formatTime(activeViewingPost.createdAt)}
            </Typography>
          </Box>
        </Box>

        {/* Content */}
        {parsedContent && (
          <Typography
            sx={{
              fontSize: "14px",
              color: "#334155",
              lineHeight: 1.5,
              maxHeight: "150px",
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              "&::-webkit-scrollbar": { width: "4px" },
              "&::-webkit-scrollbar-thumb": { bgcolor: "#cbd5e1", borderRadius: "4px" },
            }}
          >
            {parsedContent}
          </Typography>
        )}

        {/* Engagement counts */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", pt: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <ThumbUpIcon sx={{ fontSize: 15, color: activeViewingPost.likedByViewer ? "#3b82f6" : "#64748b" }} />
            <Typography sx={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
              {activeViewingPost.likeCount} lượt thích
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {renderTopReactions(activeViewingPost.topReactions)}
            <Typography sx={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
              {activeViewingPost.commentCount} bình luận
            </Typography>
          </Box>
        </Box>

        {/* Action Buttons Row */}
        <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
          <Box
            onMouseEnter={() => setShowReactionsPopup(true)}
            onMouseLeave={() => setShowReactionsPopup(false)}
            sx={{ position: "relative", flex: 1, display: "flex" }}
          >
            <Button
              sx={{
                flex: 1,
                textTransform: "none",
                fontWeight: 700,
                color: rxUI.color,
                bgcolor: activeViewingPost.likedByViewer ? "#eff6ff" : "transparent",
                borderRadius: "20px",
                py: 0.75,
                fontSize: "13px",
                width: "100%",
                "&:hover": { bgcolor: activeViewingPost.likedByViewer ? "#dbeafe" : "#f1f5f9" },
              }}
              startIcon={rxUI.icon}
              onClick={() => void handleToggleInlineLike()}
            >
              {rxUI.text}
            </Button>

            {showReactionsPopup && (
              <Box
                sx={{
                  position: "absolute",
                  bottom: "85%",
                  left: 0,
                  bgcolor: "white",
                  borderRadius: "30px",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
                  border: "1px solid #e2e8f0",
                  p: "6px 12px",
                  display: "flex",
                  gap: "12px",
                  zIndex: 20,
                  mb: 0,
                  animation: "fadeInUp 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
                  "@keyframes fadeInUp": {
                    from: { opacity: 0, transform: "translateY(10px)" },
                    to: { opacity: 1, transform: "translateY(0)" },
                  },
                }}
              >
                {[
                  { emoji: "👍", name: "LIKE" },
                  { emoji: "❤️", name: "LOVE" },
                  { emoji: "😆", name: "HAHA" },
                  { emoji: "😮", name: "WOW" },
                  { emoji: "😢", name: "SAD" },
                  { emoji: "😡", name: "ANGRY" }
                ].map(({ emoji, name }) => (
                  <Box
                    key={name}
                    onClick={() => {
                      void handleToggleInlineLike(name);
                      setShowReactionsPopup(false);
                    }}
                    sx={{
                      fontSize: "24px",
                      cursor: "pointer",
                      transition: "transform 0.15s ease",
                      "&:hover": {
                        transform: "scale(1.35) translateY(-4px)",
                      },
                    }}
                  >
                    {emoji}
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          <Button
            sx={{
              flex: 1,
              textTransform: "none",
              fontWeight: 700,
              color: "#64748b",
              borderRadius: "20px",
              py: 0.75,
              fontSize: "13px",
              "&:hover": { bgcolor: "#f1f5f9" },
            }}
            startIcon={<ChatBubbleIcon sx={{ fontSize: 18 }} />}
          >
            Bình luận
          </Button>

          <Button
            sx={{
              flex: 1,
              textTransform: "none",
              fontWeight: 700,
              color: "#64748b",
              borderRadius: "20px",
              py: 0.75,
              fontSize: "13px",
              "&:hover": { bgcolor: "#f1f5f9" },
            }}
            startIcon={<ReplyIcon sx={{ fontSize: 18, transform: "scaleX(-1)" }} />}
          >
            Chia sẻ
          </Button>
        </Box>

        {/* Comments Section */}
        <Box
          sx={{
            borderTop: "1px solid #f1f5f9",
            pt: 2,
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            maxHeight: "300px",
            bgcolor: "#f8fafc",
            p: 1.5,
            borderRadius: "12px",
            "&::-webkit-scrollbar": { width: "4px" },
            "&::-webkit-scrollbar-thumb": { bgcolor: "#cbd5e1", borderRadius: "4px" },
          }}
        >
          {loadingInlineComments ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          ) : inlineComments.length === 0 ? (
            <Typography sx={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", py: 2 }}>
              Chưa có bình luận nào
            </Typography>
          ) : (
            inlineComments.map((comment) => (
              <Box key={comment.id} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <Avatar src={comment.authorAvatarUrl || undefined} sx={{ width: 28, height: 28 }}>
                  {comment.authorName?.charAt(0)?.toUpperCase()}
                </Avatar>
                <Box sx={{ bgcolor: "white", p: 1, borderRadius: "8px", maxWidth: "80%", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                  <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#1e293b", mb: 0.25 }}>
                    {comment.authorName}
                  </Typography>
                  {comment.moderationStatus === "HATE" || comment.moderationStatus === "OFFENSIVE" ? (
                    <Typography sx={{ fontSize: "12px", color: "#94a3b8", wordBreak: "break-word", lineHeight: 1.3, fontStyle: "italic" }}>
                      Bình luận đã bị ẩn do vi phạm chính sách cộng đồng
                    </Typography>
                  ) : (
                    <Typography sx={{ fontSize: "12px", color: "#334155", wordBreak: "break-word", lineHeight: 1.3 }}>
                      {comment.content}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))
          )}
        </Box>

        {/* Write comment input */}
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Viết bình luận..."
            value={inlineCommentText}
            onChange={(e) => setInlineCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleAddInlineComment();
              }
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "20px",
                fontSize: "13px",
                bgcolor: "#f1f5f9",
                "& fieldset": { borderColor: "transparent" },
                "&:hover fieldset": { borderColor: "transparent" },
              },
            }}
          />
          <IconButton onClick={handleAddInlineComment} disabled={!inlineCommentText.trim()} color="primary" size="small">
            <SendIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>
    );
  };

  const renderInlineMediaViewer = () => {
    if (!activeViewingPost) return null;
    const mediaList = activeViewingPost.media || [];
    const activeMedia = mediaList[activeViewingMediaIndex];
    if (!activeMedia) return null;

    const isVideo = activeMedia.mediaType === "VIDEO" || activeMedia.mediaUrl.toLowerCase().endsWith(".mp4");

    const handleNext = () => {
      if (activeViewingMediaIndex < mediaList.length - 1) {
        setActiveViewingMediaIndex((prev) => prev + 1);
      }
    };

    const handlePrev = () => {
      if (activeViewingMediaIndex > 0) {
        setActiveViewingMediaIndex((prev) => prev - 1);
      }
    };

    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          bgcolor: "#0f172a",
          borderRadius: "16px",
          minHeight: "480px",
          height: "100%",
          width: "100%",
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        {/* Close Button on Media */}
        <IconButton
          onClick={() => setActiveViewingPost(null)}
          sx={{
            position: "absolute",
            top: 16,
            right: 16,
            color: "white",
            bgcolor: "rgba(0, 0, 0, 0.4)",
            "&:hover": { bgcolor: "rgba(0, 0, 0, 0.7)" },
            zIndex: 10,
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* Media */}
        <InlineMediaRenderer key={activeMedia.mediaUrl} url={activeMedia.mediaUrl} isVideo={isVideo} />

        {/* Navigations */}
        {activeViewingMediaIndex > 0 && (
          <IconButton
            onClick={handlePrev}
            sx={{
              position: "absolute",
              left: 16,
              color: "white",
              bgcolor: "rgba(0, 0, 0, 0.4)",
              "&:hover": { bgcolor: "rgba(0, 0, 0, 0.7)" },
              zIndex: 5,
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
        )}
        {activeViewingMediaIndex < mediaList.length - 1 && (
          <IconButton
            onClick={handleNext}
            sx={{
              position: "absolute",
              right: 16,
              color: "white",
              bgcolor: "rgba(0, 0, 0, 0.4)",
              "&:hover": { bgcolor: "rgba(0, 0, 0, 0.7)" },
              zIndex: 5,
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        )}

        {/* Index counter */}
        {mediaList.length > 1 && (
          <Box
            sx={{
              position: "absolute",
              bottom: 16,
              color: "white",
              bgcolor: "rgba(0,0,0,0.6)",
              px: 2,
              py: 0.5,
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {activeViewingMediaIndex + 1} / {mediaList.length}
          </Box>
        )}
      </Box>
    );
  };

  const renderVideos = () => {
    if (videos.length === 0) {
      return (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 6, gap: 1.5 }}>
          <Box
            component="img"
            src={noVideoImg}
            alt="No videos"
            sx={{
              width: "540px",
              height: "auto",
              opacity: 0.85,
            }}
          />
          <Typography sx={{ color: "#64748b", fontWeight: 600, fontSize: "15px" }}>
            Không có video
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          {videos.map((videoUrl, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
              <ProfileVideoItem url={videoUrl} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  const renderAchievements = () => (
    <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 2 }}>
      {achievements.length === 0 ? (
        <Typography sx={{ color: "#6b7280" }}>Chưa có thành tích</Typography>
      ) : (
        achievements.map((achievement) => (
          <Box key={achievement.code} sx={{ p: 2, bgcolor: "#fff", borderRadius: "8px", boxShadow: "0 8px 20px rgba(0,0,0,0.1)" }}>
            <Typography sx={{ fontWeight: 700, color: achievement.achieved ? "#1d4ed8" : "#374151" }}>
              {achievement.title}
            </Typography>
            <Typography sx={{ fontSize: 14, color: "#6b7280", mt: 0.5 }}>{achievement.description}</Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, (achievement.progress / Math.max(1, achievement.target)) * 100)}
              sx={{ mt: 1.5, height: 8, borderRadius: 8 }}
            />
            <Typography sx={{ fontSize: 13, color: "#6b7280", mt: 0.75 }}>
              {achievement.progress}/{achievement.target}
            </Typography>
          </Box>
        ))
      )}
    </Box>
  );

  const renderStats = () => (
    <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 2 }}>
      {[
        ["Bài viết", stats?.postCount ?? 0],
        ["Lượt thích", stats?.likeCount ?? 0],
        ["Bình luận", stats?.commentCount ?? 0],
        ["Bạn bè", stats?.friendCount ?? 0],
      ].map(([label, value]) => (
        <Box key={label} sx={{ p: 2, bgcolor: "#fff", borderRadius: "8px", boxShadow: "0 8px 20px rgba(0,0,0,0.1)" }}>
          <Typography sx={{ color: "#6b7280" }}>{label}</Typography>
          <Typography sx={{ fontSize: 28, fontWeight: 700 }}>{value}</Typography>
        </Box>
      ))}
    </Box>
  );

  const renderStudyProfile = () => {
    if (loadingStudyProfile) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (studyProfileError) {
      return (
        <Box
          role="alert"
          sx={{
            p: 4,
            mt: 2,
            textAlign: "center",
            bgcolor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "12px",
          }}
        >
          <Typography sx={{ color: "#1d4ed8", fontWeight: 700, mb: 1 }}>
            Không thể tải hồ sơ học tập
          </Typography>
          <Typography sx={{ color: "#1e40af", mb: 2, overflowWrap: "anywhere" }}>
            {studyProfileError}
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => setStudyProfileRetry((value) => value + 1)}
          >
            Thử lại
          </Button>
        </Box>
      );
    }

    if (!studyProfile) {
      return (
        <Box sx={{ p: 4, textAlign: "center", bgcolor: "#f8fafc", borderRadius: "8px", mt: 2 }}>
          <Typography sx={{ color: "#64748b" }}>Không có thông tin hồ sơ học tập</Typography>
        </Box>
      );
    }

    const termProfile = studyProfile.termProfiles?.[0];
    const mainSubject = termProfile?.mainSubjectName || "Chưa cập nhật";
    const rawGoal = termProfile?.studyGoal || "";
    const rawMode = termProfile?.studyMode || "";

    const studyGoalLabels: Record<string, string> = {
      Survivor: "Cần củng cố nền tảng",
      "Passive Learner": "Học ở mức cơ bản",
      "Standard Learner": "Học ổn định",
      "High Achiever": "Học tốt và định hướng điểm cao",
    };

    const studyModeLabels: Record<string, string> = {
      mutual_support: "Học cùng bạn ngang trình độ",
      peer_support: "Học cùng bạn khá hơn",
      challenge: "Học cùng bạn học tốt",
      support: "Hỗ trợ bạn khác",
    };

    const displayGoal = studyGoalLabels[rawGoal] || rawGoal || "Chưa cập nhật";
    const displayMode = studyModeLabels[rawMode] || rawMode || "Chưa cập nhật";

    const enrollments = studyProfile.enrollments || [];
    const freeTimeSlots = studyProfile.freeTimeSlots || [];

    const daysMeta = [
      { id: 0, label: "T2", fullName: "Thứ Hai" },
      { id: 1, label: "T3", fullName: "Thứ Ba" },
      { id: 2, label: "T4", fullName: "Thứ Tư" },
      { id: 3, label: "T5", fullName: "Thứ Năm" },
      { id: 4, label: "T6", fullName: "Thứ Sáu" },
      { id: 5, label: "T7", fullName: "Thứ Bảy" },
      { id: 6, label: "CN", fullName: "Chủ Nhật" },
    ];

    const slotsMap: Record<string, string> = {
      ca1: "Ca 1",
      ca2: "Ca 2",
      ca3: "Ca 3",
      ca4: "Ca 4",
      ca5: "Ca 5",
      ca6: "Ca 6",
    };

    const groupedFreeTime: Record<number, string[]> = {};
    freeTimeSlots.forEach((slot) => {
      if (slot.isAvailable) {
        if (!groupedFreeTime[slot.dayOfWeek]) {
          groupedFreeTime[slot.dayOfWeek] = [];
        }
        groupedFreeTime[slot.dayOfWeek].push(slot.slotCode);
      }
    });

    return (
      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 3 }}>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            bgcolor: "#fff",
            overflow: "hidden",
          }}
        >
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle2" sx={{ color: "#64748b", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>
              Môn học mong muốn
            </Typography>
            <Typography variant="body1" sx={{ color: "#2563eb", fontWeight: 700, fontSize: "15px" }}>
              {mainSubject}
            </Typography>
          </Box>

          <Box
            sx={{
              p: 3,
              borderLeft: { xs: "none", md: "1px solid #e2e8f0" },
              borderTop: { xs: "1px solid #e2e8f0", md: "none" },
            }}
          >
            <Typography variant="subtitle2" sx={{ color: "#64748b", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>
              Mục tiêu học tập
            </Typography>
            <Typography variant="body1" sx={{ color: "#1e293b", fontWeight: 700, fontSize: "15px" }}>
              {displayGoal}
            </Typography>
          </Box>

          <Box
            sx={{
              p: 3,
              borderLeft: { xs: "none", md: "1px solid #e2e8f0" },
              borderTop: { xs: "1px solid #e2e8f0", md: "none" },
            }}
          >
            <Typography variant="subtitle2" sx={{ color: "#64748b", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>
              Mục tiêu học tập với đối tác
            </Typography>
            <Typography variant="body1" sx={{ color: "#1e293b", fontWeight: 700, fontSize: "15px" }}>
              {displayMode}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ p: 3, borderRadius: "12px", border: "1px solid #e2e8f0", bgcolor: "#fff" }}>
          <Typography variant="subtitle2" sx={{ color: "#64748b", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", mb: 2 }}>
            Thời gian học rảnh trong tuần
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            {daysMeta.map((day) => {
              const slots = groupedFreeTime[day.id];
              const hasSlots = slots && slots.length > 0;
              return (
                <Box
                  key={day.id}
                  sx={{
                    flex: "1 1 0px",
                    minWidth: "85px",
                    p: 1.5,
                    borderRadius: "8px",
                    border: "1px solid",
                    borderColor: hasSlots ? "rgba(37, 99, 235, 0.2)" : "#f1f5f9",
                    bgcolor: hasSlots ? "rgba(37, 99, 235, 0.03)" : "#fff",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography sx={{ fontWeight: 700, fontSize: "12px", color: hasSlots ? "#2563eb" : "#94a3b8" }}>
                    {day.fullName}
                  </Typography>
                  {hasSlots ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, width: "100%" }}>
                      {slots.sort().map((slotCode) => (
                        <Chip
                          key={slotCode}
                          label={slotsMap[slotCode] || slotCode}
                          size="small"
                          sx={{
                            fontSize: "10px",
                            height: "18px",
                            bgcolor: "#e0f2fe",
                            color: "#0369a1",
                            fontWeight: 700,
                            borderRadius: "4px",
                          }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography sx={{ fontSize: "11px", color: "#cbd5e1", fontStyle: "italic", mt: 0.5 }}>
                      Bận
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box sx={{ p: 3, borderRadius: "12px", border: "1px solid #e2e8f0", bgcolor: "#fff" }}>
          <Typography variant="subtitle2" sx={{ color: "#64748b", fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", mb: 2 }}>
            Các môn học đang học trong học kì hiện tại
          </Typography>
          {enrollments.length === 0 ? (
            <Typography variant="body2" sx={{ color: "#94a3b8", fontSize: "14px" }}>
              Chưa đăng ký môn học nào khác
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {enrollments.map((enrollment) => (
                <Chip
                  key={enrollment.enrollmentId}
                  label={`${enrollment.subject.subjectCode} - ${enrollment.subject.subjectName}`}
                  variant="outlined"
                  size="small"
                  sx={{
                    fontWeight: 500,
                    fontSize: "12px",
                    borderRadius: "6px",
                    borderColor: "#e2e8f0",
                    bgcolor: "#fff",
                    color: "#475569",
                  }}
                />
              ))}
            </Box>
          )}
        </Box>

      </Box>
    );
  };

  if (loadingProfile && !profile) {
    return (
      <ThemeProvider theme={profileTheme}>
        <Box component="div" sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, mt: "20px", px: { xs: "12px", sm: "16px", lg: "0px" } }}>
          {/* Left Column Skeleton */}
          <Box sx={{ width: { xs: "100%", lg: "30%" }, ml: { xs: "0px", lg: "20px" }, mr: { xs: "0px", lg: "10px" }, mb: { xs: "20px", lg: "0px" }, display: "flex", flexDirection: "column", gap: "16px", position: { xs: "static", lg: "sticky" }, top: "64px", height: "fit-content" }}>
            <Box
              sx={{
                position: "relative",
                height: "fit-content",
                width: "100%",
                padding: "16px",
                borderRadius: "16px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                border: "1px solid #e2e8f0",
                bgcolor: "white",
              }}
            >
              {/* Banner skeleton */}
              <Skeleton variant="rectangular" height={80} sx={{ borderRadius: "12px 12px 0 0", margin: "-16px -16px 0 -16px" }} />

              {/* Avatar skeleton */}
              <Box
                sx={{
                  borderRadius: "50%",
                  width: 100,
                  height: 100,
                  position: "absolute",
                  top: "30px",
                  ml: "8px",
                  backgroundColor: "#fff",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Skeleton variant="circular" width="90%" height="90%" />
              </Box>

              {/* Name skeleton */}
              <Box mt="60px">
                <Skeleton variant="text" width="80%" height={32} />
              </Box>

              {/* Bio skeleton */}
              <Box sx={{ mt: 1.5, p: 1.5 }}>
                <Skeleton variant="rectangular" height={45} sx={{ borderRadius: "8px" }} />
              </Box>

              {/* Stats skeleton */}
              <Box sx={{ display: "flex", justifyContent: "space-around", mt: 2, mb: 2 }}>
                <Box sx={{ textAlign: "center", width: "40%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Skeleton variant="text" width="50%" />
                  <Skeleton variant="text" width="30%" height={24} />
                </Box>
                <Box sx={{ width: "1px", height: "24px", backgroundColor: "#d1d5db" }} />
                <Box sx={{ textAlign: "center", width: "40%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Skeleton variant="text" width="50%" />
                  <Skeleton variant="text" width="30%" height={24} />
                </Box>
              </Box>

              {/* Button skeleton */}
              <Skeleton variant="rectangular" height={36} sx={{ borderRadius: "8px", width: "100%" }} />
            </Box>

            {/* Friends Preview Skeleton Card */}
            <Box
              sx={{
                width: "100%",
                bgcolor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                p: "16px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                <Skeleton variant="text" width="40%" height={24} />
                <Skeleton variant="text" width="30%" height={20} />
              </Box>
              <Skeleton variant="text" width="25%" height={16} sx={{ mb: 2 }} />

              <Grid container spacing={1.5}>
                {Array.from({ length: 9 }).map((_, index) => (
                  <Grid size={{ xs: 4 }} key={index} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <Skeleton variant="rectangular" sx={{ width: "100%", aspectRatio: "1/1", borderRadius: "8px", mb: 0.5 }} />
                    <Skeleton variant="text" width="80%" height={14} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>

          {/* Right Column Skeleton */}
          <Box width={{ xs: "100%", lg: "70%" }} sx={{ px: { xs: "0px", lg: "20px" } }}>
            {/* Tabs skeleton wrapper */}
            <Box sx={{
              position: "sticky",
              top: "64px",
              zIndex: 10,
              bgcolor: "#f8fafc",
              pt: 1,
              pb: 2,
              width: "100%"
            }}>
              <Box sx={{
                display: "inline-flex",
                bgcolor: "#f1f5f9",
                p: "4px",
                borderRadius: "30px",
                border: "1px solid #e2e8f0",
                gap: "4px"
              }}>
                <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: "20px" }} />
                <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: "20px" }} />
                <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: "20px" }} />
                <Skeleton variant="rectangular" width={80} height={32} sx={{ borderRadius: "20px" }} />
                <Skeleton variant="rectangular" width={120} height={32} sx={{ borderRadius: "20px" }} />
              </Box>
            </Box>

            {/* Content skeleton card */}
            <Box sx={{
              bgcolor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              p: 3,
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              minHeight: "450px"
            }}>
              {/* Feed skeleton */}
              <Box sx={{ mt: 1 }}>
                <Box sx={{ p: 3, border: "1px solid #e5e7eb", borderRadius: "12px", mb: 3 }}>
                  <Box display="flex" gap={2} alignItems="center" mb={2}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box flex={1}>
                      <Skeleton variant="text" width="30%" />
                      <Skeleton variant="text" width="20%" />
                    </Box>
                  </Box>
                  <Skeleton variant="rectangular" height={100} sx={{ borderRadius: "8px", mb: 2 }} />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" width="80%" />
                </Box>

                <Box sx={{ p: 3, border: "1px solid #e5e7eb", borderRadius: "12px" }}>
                  <Box display="flex" gap={2} alignItems="center" mb={2}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box flex={1}>
                      <Skeleton variant="text" width="40%" />
                      <Skeleton variant="text" width="15%" />
                    </Box>
                  </Box>
                  <Skeleton variant="rectangular" height={120} sx={{ borderRadius: "8px", mb: 2 }} />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" width="60%" />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  if (!loadingProfile && !profile) {
    return (
      <ThemeProvider theme={profileTheme}>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", px: 2 }}>
          <Box role="alert" sx={{ maxWidth: 480, width: "100%", p: 4, textAlign: "center", bgcolor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px" }}>
            <Typography sx={{ color: "#1d4ed8", fontWeight: 700, mb: 1 }}>Không thể tải hồ sơ</Typography>
            <Typography sx={{ color: "#1e40af", mb: 2, overflowWrap: "anywhere" }}>
              {profileLoadError || "Vui lòng thử lại sau."}
            </Typography>
            <Button variant="outlined" color="primary" onClick={refreshProfileOverview}>
              Thử lại
            </Button>
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  if (profile?.statusFriend === ProfileStatus.BLOCKED) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Typography variant="h4" color="error">
          Bạn đã bị chặn bởi người dùng này
        </Typography>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={profileTheme}>
      <Box component="div" sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, mt: "20px", px: { xs: "12px", sm: "16px", lg: "0px" } }}>
        <Box sx={{ width: { xs: "100%", lg: "30%" }, ml: { xs: "0px", lg: "20px" }, mr: { xs: "0px", lg: "10px" }, mb: { xs: "20px", lg: "0px" }, display: "flex", flexDirection: "column", gap: "16px", position: { xs: "static", lg: "sticky" }, top: "64px", height: "fit-content" }}>
          {activeViewingPost ? (
            renderInlinePostDetails()
          ) : (
            <>
              <Box
                sx={{
                  position: "relative",
                  maxHeight: isCollapsed ? "64px" : "400px",
                  width: "100%",
                  padding: isCollapsed ? "12px 16px" : "16px",
                  borderRadius: "16px",
                  boxShadow: isCollapsed ? "0 2px 8px rgba(0,0,0,0.06)" : "0 4px 20px rgba(0,0,0,0.05)",
                  border: "1px solid #e2e8f0",
                  bgcolor: "white",
                  transition: "max-height 0.5s cubic-bezier(0.25, 1, 0.5, 1), padding 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.5s cubic-bezier(0.25, 1, 0.5, 1)",
                  overflow: "hidden",
                }}
              >
                {/* Collapsed Compact View */}
                <Box
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  sx={{
                    position: "absolute",
                    top: "12px",
                    left: "16px",
                    right: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    height: "40px",
                    cursor: "pointer",
                    opacity: isCollapsed ? 1 : 0,
                    transform: isCollapsed ? "translateY(0)" : "translateY(-8px)",
                    visibility: isCollapsed ? "visible" : "hidden",
                    transition: "opacity 0.4s cubic-bezier(0.25, 1, 0.5, 1), transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), visibility 0.4s ease",
                    zIndex: 2,
                  }}
                >
                  <Avatar
                    src={profile?.avatarUrl || undefined}
                    sx={{
                      width: 40,
                      height: 40,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {profile?.fullName?.charAt(0)?.toUpperCase()}
                  </Avatar>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      color: "#0f172a",
                      fontSize: "15px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {profile?.fullName}
                  </Typography>
                </Box>

                {/* Expanded Full View */}
                <Box
                  sx={{
                    opacity: isCollapsed ? 0 : 1,
                    transform: isCollapsed ? "translateY(8px) scale(0.98)" : "translateY(0) scale(1)",
                    transition: "opacity 0.4s cubic-bezier(0.25, 1, 0.5, 1), transform 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
                    pointerEvents: isCollapsed ? "none" : "auto",
                  }}
                >
                  <Box
                    sx={{
                      backgroundImage: profile?.bannerUrl
                        ? `url(${profile.bannerUrl})`
                        : "linear-gradient(90deg, rgb(225, 193, 169) 0%, rgba(225, 193, 169, 0.314) 100%)",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      height: "80px",
                      borderRadius: "14px 14px 0 0",
                      margin: "-16px -16px 0 -16px",
                      position: "relative",
                    }}
                  >
                    {!isOwnProfile && (
                      <>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProfileMenuAnchor(e.currentTarget);
                          }}
                          sx={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            width: 32,
                            height: 32,
                            bgcolor: "rgba(255,255,255,0.92)",
                            boxShadow: "0 1px 4px rgba(15,23,42,0.12)",
                            color: "#475569",
                            "&:hover": { bgcolor: "#fff", color: "#0f172a" },
                          }}
                        >
                          <MoreHorizIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                        <Menu
                          anchorEl={profileMenuAnchor}
                          open={Boolean(profileMenuAnchor)}
                          onClose={() => setProfileMenuAnchor(null)}
                          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                          transformOrigin={{ vertical: "top", horizontal: "right" }}
                          PaperProps={{
                            sx: {
                              mt: 0.5,
                              minWidth: 180,
                              borderRadius: "10px",
                              boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
                              border: "1px solid #e2e8f0",
                            },
                          }}
                        >
                          <MenuItem
                            onClick={() => {
                              setProfileMenuAnchor(null);
                              setReportModalOpen(true);
                            }}
                            sx={{ fontSize: 14, fontWeight: 600, color: "#dc2626", py: 1.25 }}
                          >
                            Báo cáo
                          </MenuItem>
                        </Menu>
                      </>
                    )}
                  </Box>
                  <Box
                    sx={{
                      borderRadius: "50%",
                      width: 100,
                      height: 100,
                      position: "absolute",
                      top: "30px",
                      ml: "8px",
                      border: "4px solid #fff",
                      overflow: "hidden",
                      backgroundColor: "#fff",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                  >
                    <Box
                      sx={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        overflow: "hidden",
                      }}
                    >
                      <Avatar
                        src={profile?.avatarUrl || undefined}
                        sx={{
                          width: "100%",
                          height: "100%",
                          fontSize: "2.5rem",
                          fontWeight: 700,
                        }}
                      >
                        {profile?.fullName?.charAt(0)?.toUpperCase()}
                      </Avatar>
                    </Box>
                  </Box>

                  <Box sx={{ mt: "60px" }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "1.25rem", color: "#0f172a", lineHeight: 1.2 }}>
                      {profile?.fullName}
                    </Typography>

                    {profile?.bio && (
                      <Box sx={{ mt: 1.5, p: "10px 14px", borderRadius: "8px", backgroundColor: "#f8fafc", color: "#475569", fontSize: "13.5px" }}>
                        {profile.bio}
                      </Box>
                    )}

                    <Box sx={{ display: "flex", justifyContent: "space-around", alignItems: "center", mt: 2, mb: 2 }}>
                      <Box textAlign="center">
                        <Typography color="#64748b" fontSize="12px">Bạn bè</Typography>
                        <Typography fontSize="16px" fontWeight="700" color="#0f172a">{profile?.numberFriend ?? 0}</Typography>
                      </Box>
                      {(profile?.mutualFriend ?? 0) > 0 && (
                        <>
                          <Box sx={{ width: "1px", height: "24px", backgroundColor: "#d1d5db" }} />
                          <Box textAlign="center">
                            <Typography color="#64748b" fontSize="12px">Bạn chung</Typography>
                            <Typography fontSize="16px" fontWeight="700" color="#0f172a">{profile?.mutualFriend}</Typography>
                          </Box>
                        </>
                      )}
                    </Box>

                    {isOwnProfile ? (
                      <Button
                        variant="outlined"
                        fullWidth
                        sx={{ borderRadius: "8px", py: 1, textTransform: "none", fontWeight: "bold", fontSize: "14px" }}
                        onClick={() => setModalEdit(true)}
                      >
                        Chỉnh sửa hồ sơ
                      </Button>
                    ) : (
                      <>
                        <Box display="flex" mt="20px">
                          {profile?.friend && (
                            <Button
                              variant="outlined"
                              color="error"
                              sx={{
                                borderRadius: "8px",
                                py: 1,
                                textTransform: "none",
                                fontWeight: "bold",
                                width: "50%",
                                mr: 2,
                                fontSize: "14px",
                                borderColor: "error.main",
                                "&:hover": {
                                  backgroundColor: "rgba(211, 47, 47, 0.04)",
                                  borderColor: "error.dark",
                                }
                              }}
                              onClick={() => setUnfriendConfirmOpen(true)}
                            >
                              Hủy kết bạn
                            </Button>
                          )}
                          {!profile?.friend &&
                            profile?.statusFriend === ProfileStatus.PENDING &&
                            pendingProfileFriendRequest?.direction === "received" && (
                              <>
                                <Button
                                  variant="outlined"
                                  color="error"
                                  disabled={friendRequestActionLoading}
                                  sx={{ borderRadius: "8px", py: 1, textTransform: "none", fontWeight: "bold", flex: 1, mr: 2, fontSize: "14px" }}
                                  onClick={handleDeclineProfileFriendRequest}
                                >
                                  Từ chối
                                </Button>
                                <Button
                                  variant="contained"
                                  disabled={friendRequestActionLoading}
                                  sx={{
                                    borderRadius: "8px",
                                    py: 1,
                                    textTransform: "none",
                                    fontWeight: "bold",
                                    background: "linear-gradient(90deg, #4f8dfd, #3b82f6)",
                                    color: "white",
                                    flex: 1,
                                    fontSize: "14px",
                                    "&:hover": {
                                      background: "linear-gradient(90deg, #3b82f6, #2563eb)",
                                    },
                                  }}
                                  onClick={handleAcceptProfileFriendRequest}
                                >
                                  Chấp nhận
                                </Button>
                              </>
                            )}
                          {!profile?.friend && profile?.statusFriend !== ProfileStatus.PENDING && (
                            <Button
                              sx={{
                                borderRadius: "8px",
                                py: 1,
                                textTransform: "none",
                                fontWeight: "bold",
                                background: "linear-gradient(90deg, #4f8dfd, #3b82f6)",
                                color: "white",
                                width: "50%",
                                mr: 2,
                                fontSize: "14px",
                              }}
                              onClick={requestFriend}
                            >
                              Kết bạn
                            </Button>
                          )}
                          {!profile?.friend &&
                            profile?.statusFriend === ProfileStatus.PENDING &&
                            pendingProfileFriendRequest?.direction === "sent" && (
                              <Button disabled sx={{ borderRadius: "8px", py: 1, textTransform: "none", fontWeight: "bold", width: "50%", mr: 2, fontSize: "14px" }}>
                                Đã gửi lời mời
                              </Button>
                            )}
                          {pendingProfileFriendRequest?.direction !== "received" && (
                            <Button
                              variant="outlined"
                              sx={{ borderRadius: "8px", py: 1, textTransform: "none", fontWeight: "bold", width: "50%", fontSize: "14px" }}
                              onClick={sendMess}
                            >
                              Nhắn tin
                            </Button>
                          )}
                        </Box>
                      </>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Friends Preview Card */}
              {profile && (
                <Box
                  sx={{
                    width: "100%",
                    bgcolor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    p: "16px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "16px", color: "#0f172a" }}>
                      Bạn bè
                    </Typography>
                    <Typography
                      onClick={() => setActiveTab(1)}
                      sx={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#2563eb",
                        cursor: "pointer",
                        "&:hover": {
                          textDecoration: "underline",
                        },
                      }}
                    >
                      Xem tất cả bạn bè
                    </Typography>
                  </Box>
                  <Typography sx={{ color: "#64748b", fontSize: "13px", mb: 2 }}>
                    {profile.numberFriend ?? 0} người bạn
                  </Typography>

                  {friends.length === 0 ? (
                    <Typography sx={{ color: "#94a3b8", fontSize: "13px", textAlign: "center", py: 2 }}>
                      Chưa có bạn bè nào
                    </Typography>
                  ) : (
                    <Grid container spacing={1.5}>
                      {friends.slice(0, 9).map((friend) => {
                        const mutualCount = mutualFriendsMap[friend.userId];
                        const showMutual = mutualCount !== undefined && mutualCount > 0 && !isOwnProfile;

                        return (
                          <Grid size={{ xs: 4 }} key={friend.userId} sx={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }} onClick={() => navigate(`/profile/${friend.userId}`)}>
                            <Box
                              sx={{
                                width: "100%",
                                aspectRatio: "1/1",
                                borderRadius: "8px",
                                overflow: "hidden",
                                border: "1px solid #f1f5f9",
                                bgcolor: "#f8fafc",
                                mb: 0.5,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              <Avatar
                                variant="rounded"
                                src={friend.avatarUrl || undefined}
                                sx={{
                                  width: "100%",
                                  height: "100%",
                                  borderRadius: "8px",
                                  bgcolor: "#3b82f6",
                                  fontSize: "28px",
                                  fontWeight: "bold"
                                }}
                              >
                                {friend.fullName ? friend.fullName.charAt(0).toUpperCase() : ""}
                              </Avatar>
                            </Box>
                            <Typography
                              sx={{
                                fontWeight: 700,
                                fontSize: "13px",
                                color: "#1e293b",
                                width: "100%",
                                textAlign: "center",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {friend.fullName}
                            </Typography>
                            {showMutual && (
                              <Typography
                                sx={{
                                  fontSize: "11px",
                                  color: "#64748b",
                                  width: "100%",
                                  textAlign: "center",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {mutualCount} bạn chung
                              </Typography>
                            )}
                          </Grid>
                        );
                      })}
                    </Grid>
                  )}
                </Box>
              )}
            </>
          )}
        </Box>

        <Box width={{ xs: "100%", lg: "70%" }} sx={{ px: { xs: "0px", lg: "20px" } }}>
          {/* Sticky Tabs wrapper */}
          <Box sx={{
            position: "sticky",
            top: "64px",
            zIndex: 10,
            bgcolor: "#f8fafc",
            pt: 1,
            pb: 2,
            width: "100%"
          }}>
            <Box sx={{
              display: "inline-flex",
              backgroundColor: "#f1f5f9",
              borderRadius: "30px",
              p: "4px",
              border: "1px solid #e2e8f0",
              maxWidth: "100%",
              overflowX: "auto"
            }}>
              <Tabs
                value={activeTab}
                onChange={(_, value) => setActiveTab(value)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  minHeight: "auto",
                  "& .MuiTabs-indicator": {
                    display: "none",
                  },
                  "& .MuiTabs-flexContainer": {
                    gap: "4px",
                  },
                  "& .MuiTab-root": {
                    fontSize: "13.5px",
                    fontWeight: 600,
                    textTransform: "none",
                    color: "#64748b",
                    minWidth: "auto",
                    minHeight: "auto",
                    px: 2.5,
                    py: 1,
                    borderRadius: "20px",
                    transition: "all 0.2s ease",
                    "&.Mui-selected": {
                      color: "#2563eb",
                      backgroundColor: "#ffffff",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
                    },
                    "&:hover:not(.Mui-selected)": {
                      color: "#1e293b",
                      backgroundColor: "rgba(255,255,255,0.4)",
                    },
                  },
                }}
              >
                <Tab label="Bài viết" />
                <Tab label="Bạn bè" />
                <Tab label="Ảnh" />
                <Tab label="Video" />
                <Tab label="Hồ sơ học tập" />
              </Tabs>
            </Box>
          </Box>
          <Box sx={{
            bgcolor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            p: 3,
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            minHeight: "450px"
          }}>
            {activeViewingPost ? (
              renderInlineMediaViewer()
            ) : (
              <>
                {activeTab === 0 && renderFeed()}
                {activeTab === 1 && renderFriends()}
                {activeTab === 2 && renderPhotos()}
                {activeTab === 3 && renderVideos()}
                {activeTab === 4 && renderStudyProfile()}
              </>
            )}
          </Box>
        </Box>
      </Box>

      <CreatePostDialog
        open={createPostOpen}
        onClose={handleCloseCreatePost}
        currentUserId={currentUserId}
        authorName={profile?.fullName}
        authorAvatarUrl={profile?.avatarUrl}
        onPostCreated={(post) => {
          setPosts((prev) => [post, ...prev]);
          setStats((prev) => (prev ? { ...prev, postCount: prev.postCount + 1 } : prev));
        }}
        onPostingChange={setIsPosting}
      />

      <EditProfileModal
        stateModal={modalEdit}
        setModalEdit={setModalEdit}
        profile={profile}
        onProfileUpdated={(updatedProfile) => {
          setProfile((prev) => (prev ? { ...prev, ...updatedProfile } : updatedProfile));
          setPosts((prev) =>
            prev.map((post) =>
              post.authorId === currentUserId
                ? {
                  ...post,
                  authorName: updatedProfile.fullName,
                  authorAvatarUrl: updatedProfile.avatarUrl,
                }
                : post,
            ),
          );
        }}
      />

      <Dialog
        open={unfriendConfirmOpen}
        onClose={() => setUnfriendConfirmOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: "15px",
            padding: "10px",
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: "bold", textAlign: "center" }}>
          Hủy kết bạn
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ textAlign: "center", mb: 2 }}>
            Bạn có chắc chắn muốn hủy kết bạn với <strong>{profile?.fullName}</strong> không?
          </Typography>
          <Box display="flex" justifyContent="center" gap={2} mt={2}>
            <Button
              variant="outlined"
              onClick={() => setUnfriendConfirmOpen(false)}
              sx={{ borderRadius: "20px", px: 4, textTransform: "none" }}
            >
              Hủy bỏ
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleUnfriend}
              sx={{ borderRadius: "20px", px: 4, textTransform: "none" }}
            >
              Đồng ý
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      <PostReactionsModal
        open={reactionsModalOpen}
        onClose={() => setReactionsModalOpen(false)}
        postId={activeViewingPost?.id || 0}
        currentUserId={currentUserId}
      />

      <ReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        targetType="USER"
        targetId={profileUserId}
        targetName={profile?.fullName}
      />
    </ThemeProvider>
  );
}

