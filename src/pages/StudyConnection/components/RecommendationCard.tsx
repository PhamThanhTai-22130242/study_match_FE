import React from "react";
import {
  Check,
  Clock,
  Eye,
  LoaderCircle,
  Send,
  ShieldX,
  UserPlus,
  Users,
  MapPin,
} from "lucide-react";
import { getGroupAvatarUrl } from "../../../services/GroupService";
import {
  FriendRequestVm,
  RecommendationCardVm,
  RecommendationSecondaryAction,
} from "../types";

interface RecommendationCardProps {
  recommendation: RecommendationCardVm;
  onViewProfile?: (recommendation: RecommendationCardVm) => void;
  onConnect?: (id: number) => void;
  onAccept?: (request: FriendRequestVm) => void;
  onSecondaryAction?: (
    recommendation: RecommendationCardVm,
    action: RecommendationSecondaryAction,
  ) => void;
  isConnecting?: boolean;
  isAccepting?: boolean;
  isRejecting?: boolean;
  currentUserId?: number;
}

const AVATAR_COLORS = [
  "bg-blue-400",
  "bg-rose-400",
  "bg-blue-500",
  "bg-lime-500",
  "bg-pink-400",
  "bg-red-400",
  "bg-yellow-500",
  "bg-emerald-500",
];

function getAvatarColor(userId: number) {
  return AVATAR_COLORS[userId % AVATAR_COLORS.length];
}

function getInitials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0][0]?.toUpperCase() ?? "?";
}

function StudentAvatar({
  url,
  fullName,
  initials,
  bgClass,
}: {
  url?: string | null;
  fullName: string;
  initials: string;
  bgClass: string;
}) {
  const [error, setError] = React.useState(false);
  if (url && !error) {
    return (
      <img
        src={url}
        alt={fullName}
        className="h-11 w-11 shrink-0 rounded-full object-cover border border-gray-100"
        onError={() => setError(true)}
      />
    );
  }
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${bgClass} text-sm font-bold text-white`}
    >
      {initials}
    </div>
  );
}

function getMatchColor(match: number) {
  if (match >= 70) {
    return {
      text: "text-emerald-600",
      bg: "bg-emerald-500",
      track: "bg-emerald-100",
    };
  }

  if (match >= 50) {
    return {
      text: "text-blue-600",
      bg: "bg-blue-500",
      track: "bg-blue-100",
    };
  }

  return {
    text: "text-blue-600",
    bg: "bg-blue-500",
    track: "bg-blue-100",
  };
}

export default function RecommendationCard({
  recommendation,
  onViewProfile,
  onConnect,
  onAccept,
  onSecondaryAction,
  isConnecting = false,
  isAccepting = false,
  isRejecting = false,
  currentUserId,
}: RecommendationCardProps) {
  const match = Number(recommendation.matchPercentage.toFixed(1));
  const safeMatch = Math.min(100, Math.max(0, match));
  const color = getMatchColor(match);
  const friendRequest = recommendation.friendRequest;
  const initials = getInitials(recommendation.fullName);
  const avatarBg = getAvatarColor(recommendation.userId);

  const status = friendRequest?.status;
  const isAccepted = status === "ACCEPTED";
  const isFriendRequestSent = status === "FRIEND_REQUEST_SENT" || status === "PENDING";
  const isSentByCurrentUser =
    friendRequest?.senderId != null &&
    currentUserId !== undefined &&
    friendRequest.senderId === currentUserId;
  const isReceivedByCurrentUser =
    friendRequest?.receiverId != null &&
    currentUserId !== undefined &&
    friendRequest.receiverId === currentUserId;

  const canSendFriendRequest =
    !friendRequest || status === "NONE" || status === "REJECTED" || status === "SKIPPED" || status === "VIEWED";
  const canAcceptFriendRequest = isFriendRequestSent && isReceivedByCurrentUser;

  const actionButton = (() => {
    if (isAccepted) {
      return {
        label: "Đã kết bạn",
        icon: <Check size={15} />,
        disabled: true,
        className:
          "border border-emerald-200 bg-emerald-50 text-emerald-600",
      };
    }

    if (isFriendRequestSent && isSentByCurrentUser) {
      return {
        label: "Đã gửi",
        icon: <Clock size={15} />,
        disabled: true,
        className: "border border-blue-200 bg-blue-50 text-blue-600",
      };
    }

    if (isFriendRequestSent && isReceivedByCurrentUser) {
      return {
        label: isAccepting ? "Đang xử lý..." : "Chấp nhận",
        icon: <Check size={15} />,
        disabled: isAccepting,
        className:
          "bg-emerald-500 text-white transition-colors hover:bg-emerald-600",
      };
    }

    return {
      label: isConnecting ? "Đang gửi..." : "Kết bạn",
      icon: isConnecting ? (
        <Send size={15} className="animate-pulse" />
      ) : (
        <UserPlus size={15} />
      ),
      disabled:
        isConnecting || (!canSendFriendRequest && !canAcceptFriendRequest),
      className:
        "bg-blue-500 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50",
    };
  })();

  const secondaryButton = (() => {
    if (isAccepted) return null;

    if (isFriendRequestSent && isReceivedByCurrentUser) {
      return {
        action: "REJECTED" as const,
        label: isRejecting ? "Đang xử lý..." : "Từ chối",
      };
    }

    if (canSendFriendRequest) {
      return {
        action: "SKIPPED" as const,
        label: isRejecting ? "Đang gửi..." : "Bỏ qua",
      };
    }

    return null;
  })();

  return (
    <article className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <StudentAvatar
              url={recommendation.avatarUrl}
              fullName={recommendation.fullName ?? "Không xác định"}
              initials={initials}
              bgClass={avatarBg}
            />
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          </div>
          <div className="min-w-0">
            <h3 className="flex items-center gap-1 text-sm font-bold text-gray-800">
              <span className="truncate max-w-[120px]" title={recommendation.fullName}>
                {recommendation.fullName ?? "Không xác định"}
              </span>
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                <Check size={8} className="stroke-[3.5px]" />
              </span>
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[150px]" title={recommendation.region}>
              {recommendation.region || "Đại học Công nghệ"}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[150px]" title={recommendation.mainSubjectName}>
              {recommendation.mainSubjectName || "Khoa Công nghệ Thông tin"}
            </p>
          </div>
        </div>
        <span className={`rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 shrink-0`}>
          Phù hợp {match}%
        </span>
      </div>

      <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-3.5 text-xs py-4 border-t border-b border-gray-100 my-4">
        <span className="font-bold text-gray-700">Đang học</span>
        <div className="flex flex-wrap gap-1.5">
          {recommendation.mainSubjectName && (
            <span className="rounded-md bg-gray-50 border border-gray-200 px-2 py-0.5 font-medium text-gray-600">
              {recommendation.mainSubjectName}
            </span>
          )}
        </div>

        <span className="font-bold text-gray-700">Khu vực</span>
        <div className="flex items-center gap-1 text-gray-500 font-medium">
          <MapPin size={12} className="text-blue-500" />
          <span>{recommendation.region || "Chưa cập nhật"}</span>
        </div>

        <span className="font-bold text-gray-700">Nhóm học chung ({recommendation.commonGroups?.length || 0})</span>
        <div className="flex flex-wrap gap-1.5 items-center">
          {recommendation.commonGroups?.slice(0, 2).map((group) => {
            const groupAvatarUrl = getGroupAvatarUrl(group);
            return (
              <div key={group.id} className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2 py-0.5 border border-gray-100">
                {groupAvatarUrl ? (
                  <img src={groupAvatarUrl} alt={group.name} className="h-4 w-4 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#4285f4] text-white shrink-0">
                    <Users size={10} strokeWidth={2.4} />
                  </div>
                )}
                <span className="text-[10px] text-gray-600 truncate max-w-[80px]" title={group.name}>{group.name}</span>
              </div>
            );
          })}
          {recommendation.commonGroups && recommendation.commonGroups.length > 2 && (
            <span className="rounded-lg bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600">
              +{recommendation.commonGroups.length - 2}
            </span>
          )}
        </div>
      </div>

      <div className="mt-auto grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onViewProfile?.(recommendation)}
          className={`flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 ${
            !secondaryButton ? "col-span-2" : ""
          }`}
        >
          Xem hồ sơ
        </button>

        {secondaryButton && (
          <button
            type="button"
            onClick={() => onSecondaryAction?.(recommendation, secondaryButton.action)}
            disabled={isRejecting || isConnecting || isAccepting}
            className="flex h-10 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 text-[10px] font-semibold text-rose-600 transition-colors hover:bg-rose-100"
          >
            {isRejecting ? (
              <LoaderCircle size={12} className="animate-spin shrink-0" />
            ) : (
              <ShieldX size={12} className="shrink-0" />
            )}
            <span className="truncate">{secondaryButton.label}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            if (canAcceptFriendRequest && friendRequest?.id) {
              onAccept?.(friendRequest);
              return;
            }

            if (canSendFriendRequest) {
              onConnect?.(recommendation.userId);
            }
          }}
          disabled={actionButton.disabled || isRejecting}
          className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold ${actionButton.className}`}
        >
          {actionButton.icon}
          {actionButton.label}
        </button>
      </div>
    </article>
  );
}
