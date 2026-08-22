import SearchIcon from "@mui/icons-material/Search";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import MarkEmailUnreadRoundedIcon from "@mui/icons-material/MarkEmailUnreadRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import { Avatar, Badge, Box, Button, CircularProgress, InputAdornment, Skeleton, TextField, Typography } from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom";
import { SocketEvent } from "../../enum/SocketEvent";
import { RootState } from "../../redux/store";
import { updateCurrentConverId, setUnreads, upsertGroupMemberProfiles } from "../../redux/ChatReducer";
import { loadAcceptedDirectConversations, loadConversation, loadGroupConversation, loadGroupConversationPins, loadMessageRequests, MessageRequestItem } from "../../services/ChatService";
import { FriendUser, loadAllFriendsService, loadFriendOnlineStatusesService, loadFriendProfilesService } from "../../services/FriendService";
import { getGroupAvatarUrl, getGroupsByUserId, StudyGroupDetailResponse } from "../../services/GroupService";
import noFriendImg from "../../assets/img/no-friend-2.png";
import noMessImg from "../../assets/img/no-mess.png";

type GroupConversationItem = StudyGroupDetailResponse & {
    conversationId?: number | null;
    isPinned?: boolean;
    lastMessage?: any;
};

const getLastMessageTime = (conversation: MessageRequestItem) => {
    const time = conversation.lastMessage?.createdAt
        ? new Date(conversation.lastMessage.createdAt).getTime()
        : 0;
    return Number.isFinite(time) ? time : 0;
};

const sortByLatestMessage = <T extends MessageRequestItem>(conversations: T[]) => {
    return [...conversations].sort((a, b) => getLastMessageTime(b) - getLastMessageTime(a));
};

const formatCallPreview = (lastMessage: NonNullable<MessageRequestItem["lastMessage"]>) => {
    const callType = lastMessage.type === "CALL_AUDIO" ? "thoại" : "video";
    let detail: { status?: string; durationSeconds?: number } = {};

    try {
        detail = lastMessage.content ? JSON.parse(lastMessage.content) : {};
    } catch {
        detail = {};
    }

    if (detail.status === "MISSED") {
        return `Đã nhỡ cuộc gọi ${callType}`;
    }

    const duration = Math.max(0, Number(detail.durationSeconds || 0));
    const durationText = duration < 60 ? `${duration} giây` : `${Math.ceil(duration / 60)} phút`;
    return `Cuộc gọi ${callType} · ${durationText}`;
};

const getLastMessagePreview = (
    request: any,
    isGroup = false,
    currentUserId?: number,
    groupMemberProfiles?: any
) => {
    const lastMessage = request?.lastMessage;
    if (!lastMessage) return "";
    if (lastMessage.isDeleted) return "Tin nhắn đã được thu hồi";

    let prefix = "";
    const effectiveUserId = currentUserId ?? Number(localStorage.getItem("userId"));
    const isOwnMessage = Number(lastMessage.senderId) === effectiveUserId;

    if (isGroup && lastMessage.senderId) {
        if (isOwnMessage) {
            prefix = "Bạn: ";
        } else {
            const senderId = Number(lastMessage.senderId);
            const memberProfile = groupMemberProfiles?.[senderId];
            const senderName = memberProfile?.fullName || memberProfile?.username || `User ${senderId}`;
            prefix = `${senderName}: `;
        }
    } else if (!isGroup && isOwnMessage) {
        // Chat 1-1: tin mình gửi → "Bạn: <nội dung>"
        prefix = "Bạn: ";
    }

    if (lastMessage.moderationStatus === "HATE" || lastMessage.moderation_status === "HATE") {
        return `${prefix}Tin nhắn bị vi phạm chính sách`;
    }
    if (lastMessage.moderationStatus === "OFFENSIVE" || lastMessage.moderation_status === "OFFENSIVE") {
        return `${prefix}Nội dung có thể gây khó chịu`;
    }

    let body = "";
    if (lastMessage.type === "CALL_AUDIO" || lastMessage.type === "CALL_VIDEO") {
        body = formatCallPreview(lastMessage);
    } else if (typeof lastMessage.content === "string" && lastMessage.content.trim()) {
        body = lastMessage.content.trim();
    } else if (lastMessage.type?.startsWith("image/")) {
        body = "Đã gửi một ảnh";
    } else if (lastMessage.type?.startsWith("video/")) {
        body = "Đã gửi một video";
    } else if (lastMessage.type?.startsWith("audio/")) {
        body = "Đã gửi một âm thanh";
    } else if (lastMessage.fileName) {
        body = lastMessage.fileName;
    } else {
        body = "Đã gửi một tệp";
    }
    return `${prefix}${body}`;
};

const SidebarSkeleton = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, p: 0.5 }}>
        {[1, 2, 3, 4, 5, 6].map((item) => (
            <Box
                key={item}
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    py: 1.5,
                    px: 1,
                    borderRadius: "8px",
                }}
            >
                <Skeleton
                    variant="circular"
                    width={45}
                    height={45}
                    animation="wave"
                    sx={{ bgcolor: "rgba(15, 23, 42, 0.06)", flexShrink: 0 }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Skeleton
                        variant="rectangular"
                        width="70%"
                        height={16}
                        animation="wave"
                        sx={{ borderRadius: "4px", bgcolor: "rgba(15, 23, 42, 0.06)", mb: 1 }}
                    />
                    <Skeleton
                        variant="rectangular"
                        width="50%"
                        height={12}
                        animation="wave"
                        sx={{ borderRadius: "4px", bgcolor: "rgba(15, 23, 42, 0.04)" }}
                    />
                </Box>
            </Box>
        ))}
    </Box>
);

interface ListFriendsProps {
    onBootstrapStateChange?: (state: { ready: boolean; hasConversations: boolean }) => void;
}

export default function ListFriends({ onBootstrapStateChange }: ListFriendsProps) {
    const navigate = useNavigate();
    const autoRedirectedRef = React.useRef(false);
    const location = useLocation();
    const dispatch = useDispatch();
    const [friends, setFriends] = useState<FriendUser[]>([]);
    const [groups, setGroups] = useState<GroupConversationItem[]>([]);
    const [searchText, setSearchText] = useState("");
    const [loading, setLoading] = useState(true);
    const [messageRequests, setMessageRequests] = useState<MessageRequestItem[]>([]);
    const [requestProfiles, setRequestProfiles] = useState<Record<number, FriendUser>>({});
    const [acceptedDirectConversations, setAcceptedDirectConversations] = useState<MessageRequestItem[]>([]);
    const [directProfiles, setDirectProfiles] = useState<Record<number, FriendUser>>({});
    const [requestLoading, setRequestLoading] = useState(false);
    const [activeView, setActiveView] = useState<"main" | "requests">("main");
    const [error, setError] = useState("");
    const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);

    const socketEvent = useSelector((state: RootState) => state.chat.newMess?.event);
    const socketData = useSelector((state: RootState) => state.chat.newMess?.data);
    const unreadByConversation = useSelector((state: RootState) => state.chat.unreadByConversation) ?? {};
    const groupMemberProfiles = useSelector((state: RootState) => state.chat.groupMemberProfiles) ?? {};

    const currentUserId = Number(localStorage.getItem("userId"));
    const friendIdsKey = useMemo(() => friends.map((friend) => friend.userId).join(","), [friends]);
    const friendIdSet = useMemo(
        () => new Set(friends.map((friend) => Number(friend.userId)).filter((id) => Number.isFinite(id) && id > 0)),
        [friends],
    );
    const groupConversationIdSet = useMemo(
        () => new Set(
            groups
                .map((group) => Number(group.conversationId))
                .filter((id) => Number.isFinite(id) && id > 0),
        ),
        [groups],
    );
    const groupConversationIdsRef = React.useRef<Set<number>>(new Set());

    useEffect(() => {
        groupConversationIdsRef.current = groupConversationIdSet;
    }, [groupConversationIdSet]);

    const loadProfilesByRequests = useCallback(async (
        requests: MessageRequestItem[],
        setter: React.Dispatch<React.SetStateAction<Record<number, FriendUser>>>
    ) => {
        const otherUserIds = Array.from(new Set(
            requests
                .map((request) => Number(request.otherUserId))
                .filter((userId) => Number.isFinite(userId) && userId > 0)
        ));
        if (otherUserIds.length === 0) {
            setter({});
            return;
        }

        const profiles = await loadFriendProfilesService(otherUserIds);
        setter(profiles.reduce<Record<number, FriendUser>>((acc, profile) => {
            acc[profile.userId] = profile;
            return acc;
        }, {}));
    }, []);

    // Load tin nhắn chờ (chưa là bạn bè / chưa reply) + accepted direct
    const fetchMessageRequestLists = useCallback(async (options?: {
        showLoading?: boolean;
        finalGroups?: GroupConversationItem[];
        replaceAll?: boolean;
    }) => {
        if (!Number.isFinite(currentUserId) || currentUserId <= 0) return;
        const showLoading = options?.showLoading ?? false;
        const replaceAll = options?.replaceAll ?? true;
        if (showLoading) setRequestLoading(true);

        try {
            const [requests, acceptedDirect] = await Promise.all([
                loadMessageRequests(currentUserId),
                loadAcceptedDirectConversations(currentUserId),
            ]);

            if (replaceAll) {
                setMessageRequests(Array.isArray(requests) ? requests : []);
            } else {
                setMessageRequests((prev) => {
                    const byId = new Map<number, MessageRequestItem>();
                    (Array.isArray(requests) ? requests : []).forEach((item) => {
                        const id = Number(item.conversationId);
                        if (Number.isFinite(id) && id > 0) byId.set(id, item);
                    });
                    prev.forEach((item) => {
                        const id = Number(item.conversationId);
                        if (!Number.isFinite(id) || id <= 0 || byId.has(id)) return;
                        const accepted = acceptedDirect.some((c) => Number(c.conversationId) === id);
                        if (!accepted) byId.set(id, item);
                    });
                    return Array.from(byId.values());
                });
            }
            setAcceptedDirectConversations(Array.isArray(acceptedDirect) ? acceptedDirect : []);

            const unreads: Record<number, number> = {};
            (Array.isArray(acceptedDirect) ? acceptedDirect : []).forEach((c) => {
                if (c.conversationId && typeof c.unreadCount === "number") {
                    unreads[c.conversationId] = c.unreadCount;
                }
            });
            (Array.isArray(requests) ? requests : []).forEach((r) => {
                if (r.conversationId && typeof r.unreadCount === "number") {
                    unreads[r.conversationId] = r.unreadCount;
                }
            });
            (options?.finalGroups || []).forEach((g) => {
                if (g.conversationId && typeof (g as any).unreadCount === "number") {
                    unreads[g.conversationId] = (g as any).unreadCount;
                }
            });
            if (Object.keys(unreads).length > 0) {
                dispatch(setUnreads(unreads));
            }

            await Promise.all([
                loadProfilesByRequests(Array.isArray(requests) ? requests : [], setRequestProfiles),
                loadProfilesByRequests(Array.isArray(acceptedDirect) ? acceptedDirect : [], setDirectProfiles),
            ]);
        } catch (err) {
            console.error(err);
            if (replaceAll) {
                setMessageRequests([]);
                setRequestProfiles({});
            }
        } finally {
            if (showLoading) setRequestLoading(false);
        }
    }, [currentUserId, dispatch, loadProfilesByRequests]);

    useEffect(() => {
        let mounted = true;

        const loadSidebarData = async () => {
            try {
                setLoading(true);
                setError("");
                const currentUserId = Number(localStorage.getItem("userId"));
                const shouldLoadGroups = Number.isFinite(currentUserId) && currentUserId > 0;
                const [friendResult, groupResult] = await Promise.allSettled([
                    loadAllFriendsService(),
                    shouldLoadGroups
                        ? getGroupsByUserId(currentUserId)
                        : Promise.resolve({ success: false, data: [] as StudyGroupDetailResponse[] }),
                ]);

                if (!mounted) return;

                if (friendResult.status === "fulfilled") {
                    setFriends(friendResult.value);
                } else {
                    console.error(friendResult.reason);
                    setFriends([]);
                }

                let finalGroups: GroupConversationItem[] = [];
                if (groupResult.status === "fulfilled") {
                    const groupResponse = groupResult.value;
                    const loadedGroups = groupResponse.success && Array.isArray(groupResponse.data)
                        ? groupResponse.data
                        : [];
                    if (loadedGroups.length > 0 && shouldLoadGroups) {
                        const pins = await loadGroupConversationPins(
                            currentUserId,
                            loadedGroups.map((group) => group.id),
                        );
                        const pinByGroupId = new Map<number, any>(pins.map((pin: any) => [pin.groupId, pin]));
                        finalGroups = loadedGroups.map((group) => {
                            const pin = pinByGroupId.get(group.id);
                            return {
                                ...group,
                                conversationId: pin?.conversationId ?? null,
                                isPinned: Boolean(pin?.pinned),
                                lastMessage: pin?.lastMessage ?? null,
                                unreadCount: pin?.unreadCount ?? 0,
                            };
                        });
                        setGroups(finalGroups);

                        // Fetch sender profiles of group last messages to prevent displaying "User X"
                        const lastMessageSenderIds = finalGroups
                            .map((g) => g.lastMessage?.senderId)
                            .filter(Boolean)
                            .map(Number);
                        const uniqueSenderIds = Array.from(new Set(lastMessageSenderIds));
                        if (uniqueSenderIds.length > 0) {
                            try {
                                const senderProfiles = await loadFriendProfilesService(uniqueSenderIds);
                                dispatch(upsertGroupMemberProfiles(senderProfiles as any));
                            } catch (err) {
                                console.error("Failed to load sender profiles for group last messages", err);
                            }
                        }
                    } else {
                        finalGroups = loadedGroups;
                        setGroups(loadedGroups);
                    }
                } else {
                    console.warn("Cannot load groups for conversation sidebar", groupResult.reason);
                    setGroups([]);
                }

                if (shouldLoadGroups && mounted) {
                    await fetchMessageRequestLists({
                        showLoading: true,
                        finalGroups,
                        replaceAll: true,
                    });
                }

                if (friendResult.status === "rejected" || groupResult.status === "rejected") {
                    setError("Không tải được danh sách bạn bè và nhóm");
                }
            } catch (err) {
                console.error(err);
                if (mounted) {
                    setError("Không tải được danh sách bạn bè và nhóm");
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        void loadSidebarData();

        const handleGroupListUpdate = () => {
            if (mounted) void loadSidebarData();
        };
        window.addEventListener("group_list_updated", handleGroupListUpdate);

        return () => {
            mounted = false;
            window.removeEventListener("group_list_updated", handleGroupListUpdate);
        };
    }, [dispatch, fetchMessageRequestLists]);

    // Mỗi lần mở tab Tin nhắn chờ → call API message-requests
    useEffect(() => {
        const refreshAfterFriendStatusChange = async () => {
            try {
                const nextFriends = await loadAllFriendsService();
                setFriends(nextFriends);
                await fetchMessageRequestLists({ showLoading: false, replaceAll: true });
            } catch (error) {
                console.error("Cannot refresh conversations after friend status update", error);
            }
        };

        window.addEventListener("friend_status_updated", refreshAfterFriendStatusChange);
        return () => {
            window.removeEventListener("friend_status_updated", refreshAfterFriendStatusChange);
        };
    }, [fetchMessageRequestLists]);

    useEffect(() => {
        if (activeView !== "requests") return;
        if (!Number.isFinite(currentUserId) || currentUserId <= 0) return;
        void fetchMessageRequestLists({ showLoading: true, replaceAll: true });
    }, [activeView, currentUserId, fetchMessageRequestLists]);

    useEffect(() => {
        if (!friendIdsKey) return;
        let mounted = true;

        const refreshStatuses = async () => {
            try {
                const friendIds = friendIdsKey.split(",").map(Number).filter(Boolean);
                const statuses = await loadFriendOnlineStatusesService(friendIds);
                if (!mounted) return;
                setFriends((prev) =>
                    prev.map((friend) => ({
                        ...friend,
                        online: Boolean(statuses[String(friend.userId)]),
                    }))
                );
            } catch (err) {
                console.error(err);
            }
        };

        void refreshStatuses();
        const intervalId = window.setInterval(() => void refreshStatuses(), 10000);
        return () => {
            mounted = false;
            window.clearInterval(intervalId);
        };
    }, [friendIdsKey]);

    useEffect(() => {
        if (socketEvent !== SocketEvent.USER_PRESENCE || !socketData || typeof socketData !== "object") {
            return;
        }
        const presence = socketData as { userId?: number; online?: boolean };
        if (!presence.userId) return;
        setFriends((prev) =>
            prev.map((friend) =>
                friend.userId === Number(presence.userId)
                    ? { ...friend, online: Boolean(presence.online) }
                    : friend
            )
        );
    }, [socketEvent, socketData]);

    useEffect(() => {
        if (
            socketEvent !== SocketEvent.NEW_MESSAGE &&
            socketEvent !== SocketEvent.MESSAGE_ACK &&
            socketEvent !== SocketEvent.MESSAGE_RECALL
        ) {
            return;
        }

        const socketPayload = socketData as {
            conversationId?: number;
            message?: any;
            otherUserId?: number;
        } | null;
        if (socketPayload?.conversationId && socketPayload?.message) {
            const convId = Number(socketPayload.conversationId);
            const msg = socketPayload.message;
            const senderId = Number(msg?.senderId);
            const isOwnMessage = senderId === currentUserId;
            const isGroupMessage = groupConversationIdsRef.current.has(convId);

            setGroups((prev) =>
                prev.map((g) =>
                    g.conversationId === convId
                        ? { ...g, lastMessage: msg, updatedAt: msg.createdAt }
                        : g
                )
            );

            // Tin nhóm chỉ cập nhật item nhóm; không được tạo thêm tin nhắn chờ
            // theo senderId của thành viên trong nhóm.
            if (isGroupMessage) return;

            // Khi mình reply tin nhắn chờ → chuyển sang tab Bạn bè ngay
            if (isOwnMessage) {
                setMessageRequests((prev) => {
                    const matched = prev.find((r) => Number(r.conversationId) === convId);
                    if (matched) {
                        setAcceptedDirectConversations((acceptedPrev) => {
                            const exists = acceptedPrev.some((c) => Number(c.conversationId) === convId);
                            if (exists) {
                                return acceptedPrev.map((c) =>
                                    Number(c.conversationId) === convId ? { ...c, lastMessage: msg } : c
                                );
                            }
                            return [{ ...matched, lastMessage: msg }, ...acceptedPrev];
                        });
                        return prev.filter((r) => Number(r.conversationId) !== convId);
                    }
                    return prev.map((r) =>
                        Number(r.conversationId) === convId ? { ...r, lastMessage: msg } : r
                    );
                });
                setAcceptedDirectConversations((prev) =>
                    prev.map((c) =>
                        Number(c.conversationId) === convId ? { ...c, lastMessage: msg } : c
                    )
                );
            } else if (Number.isFinite(senderId) && senderId > 0) {
                // Tin đến: update accepted-direct, hoặc đưa vào Tin nhắn chờ nếu chưa phải bạn bè
                setAcceptedDirectConversations((acceptedPrev) => {
                    const inAccepted = acceptedPrev.some((c) => Number(c.conversationId) === convId);
                    if (inAccepted) {
                        return acceptedPrev.map((c) =>
                            Number(c.conversationId) === convId ? { ...c, lastMessage: msg } : c
                        );
                    }
                    return acceptedPrev;
                });

                setFriends((currentFriends) => {
                    const isFriend = currentFriends.some((f) => Number(f.userId) === senderId);
                    setMessageRequests((requestPrev) => {
                        const exists = requestPrev.some((r) => Number(r.conversationId) === convId);
                        if (exists) {
                            return requestPrev.map((r) =>
                                Number(r.conversationId) === convId
                                    ? {
                                        ...r,
                                        lastMessage: msg,
                                        unreadCount: Math.max(1, Number(r.unreadCount || 0) + 1),
                                    }
                                    : r
                            );
                        }
                        // Chỉ tạo request mới nếu chưa là bạn bè (tin nhắn chờ)
                        if (isFriend) return requestPrev;

                        void loadFriendProfilesService([senderId])
                            .then((profiles) => {
                                if (!profiles?.length) return;
                                setRequestProfiles((prevProfiles) => ({
                                    ...prevProfiles,
                                    [senderId]: profiles[0],
                                }));
                            })
                            .catch(() => undefined);

                        return [
                            {
                                conversationId: convId,
                                otherUserId: senderId,
                                unreadCount: 1,
                                lastMessage: msg,
                            },
                            ...requestPrev,
                        ];
                    });
                    return currentFriends;
                });
            }
        }

        if (!Number.isFinite(currentUserId) || currentUserId <= 0) return;
        void fetchMessageRequestLists({ showLoading: false, replaceAll: false });
    }, [socketEvent, socketData, currentUserId, fetchMessageRequestLists]);

    const visibleFriends = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        if (!keyword) return friends;
        return friends.filter((friend) =>
            `${friend.fullName ?? ""} ${friend.email ?? ""}`.toLowerCase().includes(keyword)
        );
    }, [friends, searchText]);

    const visibleGroups = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        const filteredGroups = keyword
            ? groups.filter((group) =>
                `${group.name ?? ""} ${group.subjectName ?? ""}`.toLowerCase().includes(keyword)
            )
            : groups;
        return [...filteredGroups].sort((a, b) => {
            if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
                return a.isPinned ? -1 : 1;
            }
            return (a.name || "").localeCompare(b.name || "", "vi");
        });
    }, [groups, searchText]);

    // Tin nhắn chờ: chỉ request chưa được reply/accept (theo API message-requests)
    const visibleMessageRequests = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        const acceptedUserIds = new Set(
            acceptedDirectConversations
                .map((c) => Number(c.otherUserId))
                .filter((id) => Number.isFinite(id) && id > 0),
        );
        const requests = messageRequests
            // Nếu đã nằm ở accepted-direct (đã reply) thì không còn ở tin nhắn chờ
            .filter((request) => {
                const otherUserId = Number(request.otherUserId);
                const conversationId = Number(request.conversationId);
                return (
                    !acceptedUserIds.has(otherUserId) &&
                    !friendIdSet.has(otherUserId) &&
                    !groupConversationIdSet.has(conversationId)
                );
            })
            .map((request) => {
                const profile = requestProfiles[request.otherUserId] || directProfiles[request.otherUserId];
                return {
                    ...request,
                    profile,
                    displayName: profile?.fullName || profile?.email || `User ${request.otherUserId}`,
                };
            });
        const filteredRequests = keyword
            ? requests.filter((request) =>
            `${request.displayName} ${request.profile?.email ?? ""} ${request.lastMessage?.content ?? ""}`.toLowerCase().includes(keyword)
            )
            : requests;
        return sortByLatestMessage(filteredRequests);
    }, [
        messageRequests,
        acceptedDirectConversations,
        requestProfiles,
        directProfiles,
        friendIdSet,
        groupConversationIdSet,
        searchText,
    ]);

    // Tab Bạn bè: conversation đã accept/reply + bạn bè
    const visibleAcceptedDirectForMain = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();
        const conversations = acceptedDirectConversations.map((conversation) => {
            const profile = directProfiles[conversation.otherUserId];
            return {
                ...conversation,
                profile,
                displayName: profile?.fullName || profile?.email || `User ${conversation.otherUserId}`,
            };
        });
        const filteredConversations = keyword
            ? conversations.filter((conversation) =>
            `${conversation.displayName} ${conversation.profile?.email ?? ""} ${conversation.lastMessage?.content ?? ""}`.toLowerCase().includes(keyword)
            )
            : conversations;
        return sortByLatestMessage(filteredConversations);
    }, [acceptedDirectConversations, directProfiles, searchText]);

    const unifiedConversations = useMemo(() => {
        const directList = visibleAcceptedDirectForMain.map((conv) => {
            const lastMsgTime = getLastMessageTime(conv);
            const friendObj = friends.find((f) => Number(f.userId) === Number(conv.otherUserId));
            const isOnline = friendObj ? Boolean(friendObj.online) : Boolean(conv.profile?.online);

            return {
                id: `direct-${conv.conversationId}`,
                type: "PRIVATE" as const,
                displayName: conv.displayName,
                avatarUrl: conv.profile?.avatarUrl ?? undefined,
                lastMessagePreview: getLastMessagePreview(conv, false, currentUserId),
                time: lastMsgTime,
                isOnline: isOnline,
                original: conv,
            };
        });

        const activeChatUserIds = new Set(
            visibleAcceptedDirectForMain.map((c) => Number(c.otherUserId)).filter(Boolean)
        );

        const inactiveFriendsList = visibleFriends
            .filter((friend) => !activeChatUserIds.has(Number(friend.userId)))
            .map((friend) => ({
                id: `friend-${friend.userId}`,
                type: "FRIEND" as const,
                displayName: friend.fullName || friend.email || `User ${friend.userId}`,
                avatarUrl: friend.avatarUrl ?? undefined,
                lastMessagePreview: "",
                time: 0,
                isOnline: Boolean(friend.online),
                original: friend,
            }));

        const groupList = visibleGroups.map((group) => {
            const lastMsgTime = getLastMessageTime(group as any);
            const fallbackTime = new Date(group.updatedAt || group.createdAt).getTime();
            const groupTime = lastMsgTime > 0 ? lastMsgTime : (Number.isFinite(fallbackTime) ? fallbackTime : 0);

            return {
                id: `group-${group.id}`,
                type: "GROUP" as const,
                displayName: group.name || `Nhóm ${group.id}`,
                avatarUrl: getGroupAvatarUrl(group),
                lastMessagePreview: getLastMessagePreview(group as any, true, currentUserId, groupMemberProfiles),
                time: groupTime,
                isOnline: false,
                original: group,
            };
        });

        return [...directList, ...groupList, ...inactiveFriendsList].sort((a, b) => b.time - a.time);
    }, [visibleAcceptedDirectForMain, visibleFriends, visibleGroups, friends, groupMemberProfiles, currentUserId]);

    const openConversation = (friend: FriendUser) => {
        const currentUserId = Number(localStorage.getItem("userId"));
        const conversationKey = `private:${friend.userId}:${Date.now()}`;
        navigate("/conversation", {
            state: {
                conversationKind: "PRIVATE",
                targetUserId: friend.userId,
                fullName: friend.fullName,
                avatar: friend.avatarUrl,
                conversationKey,
            },
        });

        if (Number.isFinite(currentUserId)) {
            void loadConversation(currentUserId, friend.userId, 0)
                .then((response) => {
                    const conversationId = response?.data?.conversationId;
                    if (conversationId) {
                        dispatch(updateCurrentConverId({ currentConversationId: Number(conversationId) }));
                    }
                })
                .catch((error) => {
                    console.error(error);
                });
        }
    };

    const openGroupConversation = async (group: StudyGroupDetailResponse) => {
        const currentUserId = Number(localStorage.getItem("userId"));
        const conversationKey = `group:${group.id}:${Date.now()}`;
        navigate("/conversation", {
            state: {
                conversationKind: "GROUP",
                groupId: group.id,
                groupName: group.name,
                conversationType: 0,
                targetUserId: null,
                fullName: null,
                avatar: getGroupAvatarUrl(group),
                conversationKey,
                groupVisibility: group.visibility,
            },
        });

        try {
            if (Number.isFinite(currentUserId)) {
                const response = await loadGroupConversation(currentUserId, group.id, 0);
                const conversationId = response?.data?.conversationId;
                const latestMessage = Array.isArray(response?.data?.listMess)
                    ? response.data.listMess[0] ?? null
                    : null;
                if (conversationId) {
                    dispatch(updateCurrentConverId({ currentConversationId: Number(conversationId) }));
                    setGroups((previousGroups) =>
                        previousGroups.map((currentGroup) =>
                            currentGroup.id === group.id
                                ? {
                                    ...currentGroup,
                                    conversationId: Number(conversationId),
                                    lastMessage: latestMessage,
                                    updatedAt: latestMessage?.createdAt || currentGroup.updatedAt,
                                }
                                : currentGroup
                        )
                    );
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const openMessageRequest = (request: MessageRequestItem) => {
        const profile = requestProfiles[request.otherUserId] || directProfiles[request.otherUserId];
        const conversationId = Number(request.conversationId);
        const conversationKey = `private:${request.otherUserId}:${conversationId}:${Date.now()}`;
        if (Number.isFinite(conversationId) && conversationId > 0) {
            dispatch(updateCurrentConverId({ currentConversationId: conversationId }));
        }
        navigate("/conversation", {
            state: {
                conversationKind: "PRIVATE",
                targetUserId: request.otherUserId,
                conversationId: Number.isFinite(conversationId) ? conversationId : undefined,
                fullName: profile?.fullName || `User ${request.otherUserId}`,
                avatar: profile?.avatarUrl || null,
                conversationKey,
            },
            replace: false,
        });
    };

    const openAcceptedDirectConversation = (conversation: MessageRequestItem) => {
        const profile = directProfiles[conversation.otherUserId];
        const conversationId = Number(conversation.conversationId);
        const conversationKey = `private:${conversation.otherUserId}:${conversationId}:${Date.now()}`;
        if (Number.isFinite(conversationId) && conversationId > 0) {
            dispatch(updateCurrentConverId({ currentConversationId: conversationId }));
        }
        navigate("/conversation", {
            state: {
                conversationKind: "PRIVATE",
                targetUserId: conversation.otherUserId,
                conversationId: Number.isFinite(conversationId) ? conversationId : undefined,
                fullName: profile?.fullName || `User ${conversation.otherUserId}`,
                avatar: profile?.avatarUrl || null,
                conversationKey,
            },
            replace: false,
        });
    };

    const routeState = location.state as { targetUserId?: any; groupId?: any; conversationKey?: any } | null;
    const hasActiveChat = Boolean(routeState?.targetUserId || routeState?.groupId || routeState?.conversationKey);

    useEffect(() => {
        onBootstrapStateChange?.({
            ready: !loading,
            hasConversations: unifiedConversations.length > 0,
        });
    }, [loading, onBootstrapStateChange, unifiedConversations.length]);

    useEffect(() => {
        if (location.pathname !== "/conversation") {
            autoRedirectedRef.current = false;
            return;
        }

        const isMobile = window.matchMedia("(max-width: 768px)").matches;
        if (isMobile) {
            return;
        }

        // Chỉ auto-open 1 lần khi vào trang và chưa chọn conversation nào
        if (!loading && !hasActiveChat && unifiedConversations.length > 0 && !autoRedirectedRef.current) {
            autoRedirectedRef.current = true;
            const firstConv = unifiedConversations[0];
            setSelectedItemKey(firstConv.id);
            if (firstConv.type === "PRIVATE") {
                openAcceptedDirectConversation(firstConv.original);
            } else if (firstConv.type === "GROUP") {
                void openGroupConversation(firstConv.original);
            } else if (firstConv.type === "FRIEND") {
                openConversation(firstConv.original);
            }
        }
    }, [loading, hasActiveChat, unifiedConversations, location.pathname]);

    useEffect(() => {
        if (routeState) {
            if (routeState.groupId) {
                setSelectedItemKey(`group-${routeState.groupId}`);
            } else if (routeState.targetUserId) {
                const activeDirect = visibleAcceptedDirectForMain.find(
                    (c) => Number(c.otherUserId) === Number(routeState.targetUserId)
                );
                if (activeDirect) {
                    setSelectedItemKey(`direct-${activeDirect.conversationId}`);
                } else {
                    setSelectedItemKey(`friend-${routeState.targetUserId}`);
                }
            }
        }
    }, [routeState, visibleAcceptedDirectForMain]);

    return (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <Box sx={{ px: 1, mt: 1, mb: 1, flexShrink: 0 }}>
                <TextField
                    fullWidth
                    placeholder="Tìm kiếm bạn bè"
                    variant="outlined"
                    size="small"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: "#94a3b8", fontSize: 17 }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            height: 36,
                            borderRadius: "999px",
                            bgcolor: "#fff",
                            border: "1px solid #e2e8f0",
                            boxShadow: "none",
                            transition: "all 0.2s ease",
                            "& fieldset": { border: "none" },
                            "&:hover": {
                                bgcolor: "#fff",
                                borderColor: "#cbd5e1",
                            },
                            "&.Mui-focused": {
                                bgcolor: "#fff",
                                borderColor: "#3b82f6",
                                boxShadow: "0 0 0 3px rgba(59,130,246,0.12)",
                            },
                        },
                        "& .MuiOutlinedInput-input": {
                            py: 0,
                            px: 0,
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#1e293b",
                        },
                        "& .MuiOutlinedInput-input::placeholder": {
                            color: "#94a3b8",
                            opacity: 1,
                            fontWeight: 500,
                        },
                    }}
                />
            </Box>

            <Box
                sx={{
                    mx: 1,
                    mb: 1,
                    p: 0.35,
                    display: "flex",
                    gap: 0.35,
                    flexShrink: 0,
                    bgcolor: "#f1f5f9",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    overflow: "visible",
                }}
            >
                {(() => {
                    const getUnreadForConversation = (conversationId?: number | null, fallback?: number) => {
                        const convId = Number(conversationId);
                        if (Number.isFinite(convId) && convId > 0) {
                            const unread = Number(unreadByConversation[convId] ?? fallback ?? 0);
                            return Number.isFinite(unread) && unread > 0 ? unread : 0;
                        }
                        const fallbackUnread = Number(fallback ?? 0);
                        return Number.isFinite(fallbackUnread) && fallbackUnread > 0 ? fallbackUnread : 0;
                    };

                    const friendConversationIds = new Set(
                        [
                            ...visibleAcceptedDirectForMain.map((c) => Number(c.conversationId)),
                            ...visibleGroups.map((g) => Number(g.conversationId)),
                        ].filter((id) => Number.isFinite(id) && id > 0),
                    );

                    const friendsUnreadTotal = [
                        ...visibleAcceptedDirectForMain.map((c) =>
                            getUnreadForConversation(c.conversationId, c.unreadCount),
                        ),
                        ...visibleGroups.map((g) =>
                            getUnreadForConversation(g.conversationId, (g as any).unreadCount),
                        ),
                    ].reduce((sum, n) => sum + n, 0);

                    // Badge Tin nhắn chờ: chỉ theo danh sách request thực tế
                    const requestsUnreadTotal = visibleMessageRequests.reduce((sum, request) => {
                        return sum + getUnreadForConversation(request.conversationId, request.unreadCount);
                    }, 0);
                    const requestsBadgeTotal =
                        requestsUnreadTotal > 0
                            ? requestsUnreadTotal
                            : visibleMessageRequests.length;

                    const friendsBadgeLabel =
                        friendsUnreadTotal > 99 ? "99+" : friendsUnreadTotal;
                    const requestsBadgeLabel =
                        requestsBadgeTotal > 99 ? "99+" : requestsBadgeTotal;

                    const badgeSx = {
                        flex: 1,
                        width: "100%",
                        "& .MuiBadge-badge": {
                            right: 6,
                            top: 2,
                            minWidth: 16,
                            height: 16,
                            fontSize: 9,
                            fontWeight: 700,
                            bgcolor: "#ef4444",
                            color: "#fff",
                        },
                    } as const;

                    return (
                        <>
                            <Badge
                                color="error"
                                badgeContent={friendsUnreadTotal > 0 ? friendsBadgeLabel : 0}
                                invisible={friendsUnreadTotal <= 0}
                                overlap="rectangular"
                                sx={badgeSx}
                            >
                                <Button
                                    fullWidth
                                    size="small"
                                    disableElevation
                                    startIcon={<PeopleAltRoundedIcon sx={{ fontSize: "15px !important" }} />}
                                    onClick={() => setActiveView("main")}
                                    sx={{
                                        minHeight: 32,
                                        px: 1,
                                        borderRadius: "8px",
                                        textTransform: "none",
                                        fontWeight: 700,
                                        fontSize: 12.5,
                                        boxShadow: "none",
                                        border: "none",
                                        color: activeView === "main" ? "#fff" : "#64748b",
                                        bgcolor: activeView === "main" ? "#2563eb" : "transparent",
                                        "&:hover": {
                                            bgcolor: activeView === "main" ? "#1d4ed8" : "rgba(255,255,255,0.7)",
                                            boxShadow: "none",
                                        },
                                        "& .MuiButton-startIcon": { mr: 0.5 },
                                    }}
                                >
                                    Bạn bè
                                </Button>
                            </Badge>

                            <Badge
                                color="error"
                                badgeContent={requestsBadgeTotal > 0 ? requestsBadgeLabel : 0}
                                invisible={requestsBadgeTotal <= 0}
                                overlap="rectangular"
                                sx={badgeSx}
                            >
                                <Button
                                    fullWidth
                                    size="small"
                                    disableElevation
                                    startIcon={<MarkEmailUnreadRoundedIcon sx={{ fontSize: "15px !important" }} />}
                                    onClick={() => setActiveView("requests")}
                                    sx={{
                                        minHeight: 32,
                                        px: 1,
                                        borderRadius: "8px",
                                        textTransform: "none",
                                        fontWeight: 700,
                                        fontSize: 12.5,
                                        whiteSpace: "nowrap",
                                        boxShadow: "none",
                                        border: "none",
                                        color: activeView === "requests" ? "#fff" : "#64748b",
                                        bgcolor: activeView === "requests" ? "#2563eb" : "transparent",
                                        "&:hover": {
                                            bgcolor: activeView === "requests" ? "#1d4ed8" : "rgba(255,255,255,0.7)",
                                            boxShadow: "none",
                                        },
                                        "& .MuiButton-startIcon": { mr: 0.5 },
                                    }}
                                >
                                    Tin nhắn chờ
                                </Button>
                            </Badge>
                        </>
                    );
                })()}
            </Box>

            <Box
                sx={{
                    flex: 1,
                    overflowY: "auto",
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {(activeView === "main" ? loading : requestLoading) && (
                    <SidebarSkeleton />
                )}

                {activeView === "main" && !loading && error && (
                    <Typography sx={{ px: 1, py: 2, color: "#d32f2f", fontSize: 13 }}>{error}</Typography>
                )}

                {activeView === "requests" && !requestLoading && visibleMessageRequests.length === 0 && (
                    <Box
                        sx={{
                            flex: 1,
                            width: "100%",
                            px: 2,
                            py: 4,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            gap: 2.5,
                            bgcolor: "#fff",
                            borderRadius: "12px",
                        }}
                    >
                        <Box
                            component="img"
                            src={noMessImg}
                            alt="Không có tin nhắn đang chờ"
                            sx={{
                                width: "min(260px, 90%)",
                                maxHeight: 280,
                                objectFit: "contain",
                            }}
                        />
                        <Typography
                            sx={{
                                color: "#64748b",
                                fontSize: 14,
                                fontWeight: 600,
                            }}
                        >
                            Không có tin nhắn đang chờ
                        </Typography>
                    </Box>
                )}

                {activeView === "requests" && !requestLoading && visibleMessageRequests.map((request) => {
                    const convId = Number(request.conversationId);
                    const unreadCount = Number(
                        (Number.isFinite(convId) && convId > 0
                            ? unreadByConversation[convId]
                            : undefined) ?? request.unreadCount ?? 0,
                    );
                    const isUnread = Number.isFinite(unreadCount) && unreadCount > 0;
                    const unreadLabel = unreadCount > 5 ? "5+" : String(unreadCount);

                    return (
                    <Box
                        key={`request-${request.conversationId}`}
                        onClick={() => openMessageRequest(request)}
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            py: 1.5,
                            px: 1,
                            borderRadius: "8px",
                            bgcolor: isUnread ? "rgba(37, 99, 235, 0.04)" : "transparent",
                            "&:hover": { bgcolor: "#f0f2f8", cursor: "pointer" },
                        }}
                    >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flex: 1 }}>
                            <Avatar src={request.profile?.avatarUrl ?? undefined} sx={{ width: 45, height: 45 }}>
                                {request.displayName?.charAt(0)?.toUpperCase()}
                            </Avatar>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Typography sx={{
                                    fontSize: 15,
                                    fontWeight: isUnread ? 700 : 600,
                                    color: "#1f2a44",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}>
                                    {request.displayName}
                                </Typography>
                                <Typography sx={{
                                    fontSize: 13,
                                    color: isUnread ? "#2563eb" : "#8d8fa3",
                                    fontWeight: isUnread ? 600 : 400,
                                    mt: "2px",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}>
                                    {getLastMessagePreview(request)}
                                </Typography>
                            </Box>
                        </Box>
                        {isUnread && (
                            <Box
                                sx={{
                                    minWidth: 18,
                                    height: 18,
                                    px: unreadCount > 5 ? 0.5 : 0,
                                    borderRadius: "999px",
                                    bgcolor: "#ef4444",
                                    color: "#fff",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    ml: 1,
                                    flexShrink: 0,
                                }}
                            >
                                {unreadLabel}
                            </Box>
                        )}
                    </Box>
                    );
                })}

                {activeView === "main" && !loading && !error && unifiedConversations.length === 0 && (
                    <Box
                        sx={{
                            flex: 1,
                            width: "100%",
                            px: 2,
                            py: 4,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            gap: 2.5,
                            bgcolor: "#fff",
                            borderRadius: "12px",
                        }}
                    >
                        <Box
                            component="img"
                            src={noFriendImg}
                            alt="Không có bạn bè hoặc nhóm"
                            sx={{
                                width: "min(260px, 90%)",
                                maxHeight: 280,
                                objectFit: "contain",
                            }}
                        />
                        <Typography
                            sx={{
                                color: "#64748b",
                                fontSize: 14,
                                fontWeight: 600,
                            }}
                        >
                            Không có bạn bè hoặc nhóm
                        </Typography>
                    </Box>
                )}

                {activeView === "main" && !loading && !error && unifiedConversations.map((item) => {
                    const isSelected = selectedItemKey === item.id;

                    const conversationId = item.type === "GROUP"
                        ? item.original.conversationId
                        : (item.type === "PRIVATE" ? item.original.conversationId : null);

                    const unreadCount = conversationId ? (unreadByConversation[conversationId] || 0) : 0;
                    const isUnread = unreadCount > 0;
                    const unreadLabel = unreadCount > 5 ? "5+" : String(unreadCount);

                    const handleClick = () => {
                        setSelectedItemKey(item.id);
                        if (item.type === "PRIVATE") {
                            openAcceptedDirectConversation(item.original);
                        } else if (item.type === "GROUP") {
                            void openGroupConversation(item.original);
                        } else if (item.type === "FRIEND") {
                            openConversation(item.original);
                        }
                    };

                    return (
                        <Box
                            key={item.id}
                            onClick={handleClick}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                py: 1.5,
                                px: 1,
                                borderRadius: "8px",
                                bgcolor: isSelected ? "#e2e8f0" : "transparent",
                                "&:hover": { bgcolor: isSelected ? "#cbd5e1" : "#f1f5f9", cursor: "pointer" },
                                transition: "background-color 150ms ease",
                            }}
                        >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flex: 1 }}>
                                <Box sx={{ position: "relative", flexShrink: 0 }}>
                                    {item.type === "GROUP" ? (
                                        <Avatar src={item.avatarUrl ?? undefined} sx={{ width: 45, height: 45, bgcolor: "#4285f4" }}>
                                            <GroupsRoundedIcon sx={{ fontSize: 22 }} />
                                        </Avatar>
                                    ) : (
                                        <>
                                            <Avatar src={item.avatarUrl ?? undefined} sx={{ width: 45, height: 45 }}>
                                                {item.displayName?.charAt(0)?.toUpperCase()}
                                            </Avatar>
                                            <Box
                                                title={item.isOnline ? "Online" : "Offline"}
                                                sx={{
                                                    position: "absolute",
                                                    right: -2,
                                                    bottom: -2,
                                                    width: 14,
                                                    height: 14,
                                                    borderRadius: "50%",
                                                    bgcolor: item.isOnline ? "#48d26d" : "#a7adba",
                                                    border: "2px solid white",
                                                }}
                                            />
                                        </>
                                    )}
                                </Box>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography sx={{ fontSize: 15, fontWeight: isUnread ? 800 : 600, color: isUnread ? "#0f172a" : "#1f2a44", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {item.displayName}
                                    </Typography>
                                    {item.lastMessagePreview && (
                                        <Typography sx={{ fontSize: 13, fontWeight: isUnread ? 700 : 400, color: isUnread ? "#1e293b" : "#8d8fa3", mt: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {item.lastMessagePreview}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                            {isUnread && (
                                <Box
                                    sx={{
                                        minWidth: 16,
                                        height: 16,
                                        borderRadius: "8px",
                                        bgcolor: "#94a3b8",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        px: unreadCount > 5 ? 0.6 : 0,
                                        ml: 1.5,
                                        flexShrink: 0,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            color: "#ffffff",
                                            fontSize: 9,
                                            fontWeight: 700,
                                            lineHeight: 1,
                                        }}
                                    >
                                        {unreadLabel}
                                    </Typography>
                                </Box>
                            )}
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
}
