
import CallIcon from '@mui/icons-material/Call'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import PhoneMissedIcon from '@mui/icons-material/PhoneMissed'
import VideocamIcon from '@mui/icons-material/Videocam'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ReplyIcon from '@mui/icons-material/Reply'
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt'
import PushPinIcon from '@mui/icons-material/PushPin'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { Avatar, Box, CircularProgress, Dialog, IconButton, Tooltip, Typography } from '@mui/material'
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageInterface } from '../../model/Conversation'
import { submitReaction } from '../../services/ReactionService'
import { useSelector } from 'react-redux'
import { RootState } from '../../redux/store'
import { SocketEvent } from '../../enum/SocketEvent'
import { ReactionData, ReactionDTO } from '../../model/Reaction'
import { ConversationTheme } from '../../theme/ConversationThemes'
import { normalizeAvatarUrl } from '../../services/FriendService'

type VisibleMessageStatus = {
    messageId: number
    status: MessageInterface["status"]
}

const getFontFamilyValue = (fontId: string | null | undefined): string => {
    switch (fontId) {
        case "inter":
            return '"Inter", sans-serif';
        case "roboto":
            return '"Roboto", sans-serif';
        case "playfair":
            return '"Playfair Display", "Georgia", serif';
        case "montserrat":
            return '"Montserrat", sans-serif';
        case "courier":
            return '"Courier New", monospace';
        default:
            return '"Noto Sans", "Noto Sans JP", "Noto Sans SC", "Inter", "Roboto", "Arial", sans-serif';
    }
};

const ImageWithLoader = ({ src, alt, sx }: { src: string; alt: string; sx: any }) => {
    const [loaded, setLoaded] = useState(false)

    return (
        <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {!loaded && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.03)' }}>
                    <CircularProgress size={24} sx={{ color: '#a40000' }} />
                </Box>
            )}
            <Box
                component="img"
                src={src}
                alt={alt}
                onLoad={() => setLoaded(true)}
                sx={{
                    ...sx,
                    opacity: loaded ? 1 : 0,
                    transition: 'opacity 0.25s ease-in-out',
                }}
            />
        </Box>
    )
}

const ChatVideoPlayer = ({ src }: { src: string }) => {
    const [isPlaying, setIsPlaying] = useState(false);

    return (
        <Box sx={{ width: "100%", height: "100%", position: "relative", bgcolor: "black" }}>
            {isPlaying ? (
                <Box
                    component="video"
                    controls
                    autoPlay
                    src={src}
                    sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                    }}
                />
            ) : (
                <Box sx={{ width: "100%", height: "100%", position: "relative", cursor: "pointer" }} onClick={() => setIsPlaying(true)}>
                    <Box
                        component="video"
                        src={src}
                        sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                        }}
                    />
                    {/* Play button overlay */}
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
                </Box>
            )}
        </Box>
    );
};

const getFormattedMessageTime = (createdAt?: string) => {
    if (!createdAt) return "";
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return "";

    const now = new Date();
    const timeStr = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

    const dateZero = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffTime = nowZero.getTime() - dateZero.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return timeStr;
    } else if (diffDays === 1) {
        return `${timeStr} Hôm qua`;
    } else if (diffDays < 7) {
        const weekdays = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
        return `${timeStr} ${weekdays[date.getDay()]}`;
    } else {
        return `${timeStr} ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }
};

type ListMessProps = {
    theme?: ConversationTheme
    fontFamily?: string
    conversation: MessageInterface[]
    setReplyMess: React.Dispatch<React.SetStateAction<MessageInterface | null>>
    visibleMessageStatus: VisibleMessageStatus | null
    onCallAgain?: (callType: "AUDIO" | "VIDEO") => void
    onLoadOlderMessages?: () => void
    loadingOlderMessages?: boolean
    hasMoreMessages?: boolean
    onRecallMessage?: (messageId: number) => void
    onForwardMessage?: (message: MessageInterface) => void
    onPinMessage?: (message: MessageInterface, pinned: boolean) => void
    isGroupConversation?: boolean
    seenStatuses?: Record<number, number>
    senderProfiles?: Record<number, {
        userId?: number
        user_id?: number
        id?: number
        fullName?: string | null
        full_name?: string | null
        name?: string | null
        username?: string | null
        avatarUrl?: string | null
        avatar_url?: string | null
        avatar?: string | null
    }>
}

function ListMess({ theme, fontFamily, conversation, setReplyMess, visibleMessageStatus, onCallAgain, onLoadOlderMessages, loadingOlderMessages = false, hasMoreMessages = false, onRecallMessage, onForwardMessage, onPinMessage, isGroupConversation = false, seenStatuses = {}, senderProfiles = {} }: ListMessProps) {
    const navigate = useNavigate()
    const appFontFamily = getFontFamilyValue(fontFamily)
    const [activeReactionMessageId, setActiveReactionMessageId] = useState<number | null>(null)
    const [activeMoreMessageId, setActiveMoreMessageId] = useState<number | null>(null)
    const [messageReactions, setMessageReactions] = useState<Record<number, ReactionDTO[]>>({})
    const [previewImage, setPreviewImage] = useState<{ url: string; fileName?: string | null } | null>(null)
    const [revealedOffensiveMessageIds, setRevealedOffensiveMessageIds] = useState<Set<number>>(new Set())
    const moreMenuRef = useRef<HTMLDivElement | null>(null)
    const audioRefs = useRef<Record<number, HTMLAudioElement | null>>({})
    const [playingAudioMessageId, setPlayingAudioMessageId] = useState<number | null>(null)
    const [audioDurations, setAudioDurations] = useState<Record<number, number>>({})
    const [audioCurrentTimes, setAudioCurrentTimes] = useState<Record<number, number>>({})
    const currentUserId = Number(localStorage.getItem("userId"))
    const currentUser = useSelector((state: RootState) => state.user)
    const currentConversationId = useSelector((state: RootState) => state.chat.currentConversationId)
    const scrollContainerRef = useRef<HTMLDivElement | null>(null)
    const previousMessageCountRef = useRef(conversation.length)
    const pendingScrollRestoreRef = useRef<{
        scrollHeight: number
        scrollTop: number
    } | null>(null)
    const oldestThresholdReachedRef = useRef(false)

    useEffect(() => {
        const listeners: Array<{ audio: HTMLAudioElement; name: string; handler: () => void }> = []

        Object.keys(audioRefs.current).forEach((idStr) => {
            const messageId = Number(idStr)
            const audio = audioRefs.current[messageId]
            if (audio) {
                if (Number.isFinite(audio.duration) && audio.duration > 0) {
                    updateAudioDuration(messageId, audio.duration)
                }
                const handleMetadata = () => {
                    updateAudioDuration(messageId, audio.duration)
                }
                audio.addEventListener("loadedmetadata", handleMetadata)
                audio.addEventListener("durationchange", handleMetadata)
                listeners.push({ audio, name: "loadedmetadata", handler: handleMetadata })
                listeners.push({ audio, name: "durationchange", handler: handleMetadata })

                if (audio.readyState < 1) {
                    audio.load()
                }
            }
        })

        return () => {
            listeners.forEach(({ audio, name, handler }) => {
                audio.removeEventListener(name, handler)
            })
        }
    }, [conversation])

    const reactions = ["\u2764\ufe0f", "\ud83d\ude06", "\ud83d\ude2e", "\ud83d\ude22", "\ud83d\ude21", "\ud83d\udc4d"]
    const moreActions = ["Gỡ", "Chuyển tiếp", "Ghim"]
    const currenConverID = useSelector((state: RootState) => state.chat.currentConversationId)
    const latestOutgoingMessageId = conversation.find((message) => message.senderId === currentUserId)?.messageId ?? null

    const getSeenUsersForMessage = (messageId: number) => {
        const users: { userId: number; fullName: string; avatarUrl: string | null }[] = [];
        Object.entries(seenStatuses).forEach(([uIdStr, lastSeenId]) => {
            const uId = Number(uIdStr);
            if (uId === currentUserId) return;
            if (lastSeenId === messageId) {
                const profile = senderProfiles[uId];
                users.push({
                    userId: uId,
                    fullName: profile?.fullName || profile?.name || profile?.username || `User ${uId}`,
                    avatarUrl: profile?.avatarUrl || profile?.avatar_url || profile?.avatar || null,
                });
            }
        });
        return users;
    };

    const getUnseenUsersForLatestMessage = (latestMessageId: number, latestSenderId: number) => {
        const unseenUsers: string[] = [];
        Object.keys(senderProfiles).forEach((uIdStr) => {
            const uId = Number(uIdStr);
            if (uId === currentUserId) return;
            if (uId === latestSenderId) return;
            const lastSeenId = seenStatuses[uId];
            if (!lastSeenId || lastSeenId < latestMessageId) {
                const profile = senderProfiles[uId];
                const name = profile?.fullName || profile?.name || profile?.username || `User ${uId}`;
                unseenUsers.push(name);
            }
        });
        return unseenUsers;
    };

    const renderSeenStatus = (mess: MessageInterface) => {
        if (!isGroupConversation) {
            if (mess.senderId === currentUserId) {
                return renderOutgoingStatus(mess);
            }
            return null;
        }

        const isLatest = conversation.length > 0 && mess.messageId === conversation[0]?.messageId;
        const seenUsers = getSeenUsersForMessage(mess.messageId);
        const unseenNames = isLatest ? getUnseenUsersForLatestMessage(mess.messageId, mess.senderId) : [];
        const showAvatars = seenUsers.length > 0;
        const showUnseen = unseenNames.length > 0;

        if (!showAvatars && !showUnseen) {
            return null;
        }

        const isSentByMe = mess.senderId === currentUserId;
        return (
            <Box sx={{ mt: 0.5, mb: 0.5, display: "flex", flexDirection: "column", alignItems: isSentByMe ? "flex-end" : "flex-start", width: "100%", fontFamily: appFontFamily }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexDirection: "row", justifyContent: isSentByMe ? "flex-end" : "flex-start" }}>
                    {showAvatars && seenUsers.map((user) => (
                        <Tooltip key={user.userId} title={`${user.fullName} đã xem`}>
                            <Avatar src={user.avatarUrl || undefined} sx={{ width: 16, height: 16, fontSize: 8, border: "1px solid #fff", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                                {user.fullName.charAt(0).toUpperCase()}
                            </Avatar>
                        </Tooltip>
                    ))}
                    {showUnseen && (
                        <Tooltip title={`Chưa xem: ${unseenNames.join(", ")}`}>
                            <Typography sx={{ fontSize: 11, color: "#94a3b8", cursor: "pointer", ml: showAvatars ? 1 : 0, '&:hover': { color: '#64748b' } }}>
                                Chưa xem ({unseenNames.length})
                            </Typography>
                        </Tooltip>
                    )}
                </Box>
            </Box>
        );
    };

    const upsertReaction = (current: ReactionDTO[], reaction: ReactionDTO) => {
        const senderId = reaction.senderId
        if (senderId === undefined || senderId === null) {
            return [...current, reaction]
        }
        const exists = current.some((item) => item.senderId === senderId)
        if (!exists) {
            return [...current, reaction]
        }
        return current.map((item) => item.senderId === senderId ? reaction : item)
    }

    const renderReactionBadges = (messageId: number) => {
        const reactionItems = messageReactions[messageId] || []
        const uniqueEmojis = Array.from(new Set(reactionItems.map((reaction) => reaction.emoji).filter(Boolean)))
        return uniqueEmojis
    }

    const getSenderProfile = (senderId: number) => senderProfiles[senderId]

    const getSenderName = (senderId: number) => {
        const profile = getSenderProfile(senderId)
        return profile?.fullName || profile?.full_name || profile?.name || profile?.username || `User ${senderId}`
    }

    const getSenderAvatar = (senderId: number) => {
        const profile = getSenderProfile(senderId)
        return normalizeAvatarUrl(profile?.avatarUrl || profile?.avatar_url || profile?.avatar || null) || undefined
    }

    const isMessagePinned = (message: MessageInterface) => {
        const pinned = message.isPinned ?? message.pinned
        return pinned === true || pinned === "Y"
    }

    const getFiniteAudioTime = (value?: number) => {
        return Number.isFinite(value) && (value || 0) > 0 ? Math.floor(value || 0) : 0
    }

    const formatAudioTime = (value?: number) => {
        if (!Number.isFinite(value) || !value) return "0:00"
        const totalSeconds = Math.max(0, getFiniteAudioTime(value))
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        return `${minutes}:${String(seconds).padStart(2, "0")}`
    }

    const getAudioDurationFromMessage = (mess: MessageInterface) => {
        const duration = Number(mess.audioDurationSeconds ?? mess.durationSeconds ?? 0)
        return Number.isFinite(duration) && duration > 0 ? duration : 0
    }

    const updateAudioDuration = (messageId: number, duration?: number) => {
        const nextDuration = getFiniteAudioTime(duration)
        if (!nextDuration) return

        setAudioDurations((prev) => {
            if (prev[messageId] === nextDuration) return prev
            return {
                ...prev,
                [messageId]: nextDuration,
            }
        })
    }

    const syncAudioDuration = (messageId: number) => {
        const audio = audioRefs.current[messageId]
        if (!audio) return

        updateAudioDuration(messageId, audio.duration)
    }

    const toggleAudioPlayback = (messageId: number) => {
        const audio = audioRefs.current[messageId]
        if (!audio) return

        if (playingAudioMessageId === messageId) {
            audio.pause()
            setPlayingAudioMessageId(null)
            return
        }

        if (playingAudioMessageId !== null) {
            audioRefs.current[playingAudioMessageId]?.pause()
        }

        syncAudioDuration(messageId)

        audio.play()
            .then(() => {
                syncAudioDuration(messageId)
                setPlayingAudioMessageId(messageId)
            })
            .catch((error) => {
                console.error("[Conversation][audio-play-error]", error)
            })
    }

    const getReactionSenderName = (senderId?: number) => {
        if (!senderId) return "Ng\u01b0\u1eddi d\u00f9ng"
        if (senderId === currentUserId) return currentUser.username || "B\u1ea1n"
        return getSenderName(senderId)
    }

    const renderReactionBadge = (messageId: number, horizontal: "left" | "right") => {
        const badgeEmojis = renderReactionBadges(messageId)
        if (badgeEmojis.length === 0) return null

        const reactionItems = messageReactions[messageId] || []
        const badge = (
            <Box
                sx={{
                    position: "absolute",
                    [horizontal]: -8,
                    bottom: -12,
                    minWidth: 22,
                    height: 22,
                    px: 0.4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "#fff",
                    color: "#202124",
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: "50%",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.16)",
                    fontSize: 13,
                    lineHeight: 1,
                    cursor: isGroupConversation ? "default" : "inherit",
                }}
            >
                {badgeEmojis.join("")}
            </Box>
        )

        if (!isGroupConversation) return badge

        return (
            <Tooltip
                arrow
                placement="top"
                title={
                    <Box sx={{ py: 0.25, fontFamily: '"Inter", "Roboto", "Arial", sans-serif' }}>
                        {reactionItems.map((reaction, index) => (
                            <Box
                                key={`${reaction.senderId ?? "unknown"}-${reaction.emoji}-${index}`}
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 1.5,
                                    minWidth: 130,
                                    fontSize: 13,
                                    lineHeight: 1.5,
                                }}
                            >
                                <Box component="span">{getReactionSenderName(reaction.senderId)}</Box>
                                <Box component="span">{reaction.emoji}</Box>
                            </Box>
                        ))}
                    </Box>
                }
            >
                {badge}
            </Tooltip>
        )
    }

    useEffect(() => {
        const loadedReactions: Record<number, ReactionDTO[]> = {}
        conversation.forEach((message) => {
            if (message.messageId > 0 && message.reactions && message.reactions.length > 0) {
                loadedReactions[message.messageId] = message.reactions
            }
        })
        setMessageReactions((prev) => {
            const currentMessageIds = new Set(conversation.map((message) => message.messageId))
            const next: Record<number, ReactionDTO[]> = {}
            Object.entries(prev).forEach(([messageId, reactions]) => {
                const numericMessageId = Number(messageId)
                if (currentMessageIds.has(numericMessageId)) {
                    next[numericMessageId] = reactions
                }
            })
            Object.entries(loadedReactions).forEach(([messageId, reactions]) => {
                const numericMessageId = Number(messageId)
                next[numericMessageId] = reactions.reduce(
                    (current, reaction) => upsertReaction(current, reaction),
                    next[numericMessageId] || []
                )
            })
            return next
        })
    }, [conversation])

    useLayoutEffect(() => {
        const previousMessageCount = previousMessageCountRef.current
        previousMessageCountRef.current = conversation.length

        const pendingScrollRestore = pendingScrollRestoreRef.current
        const element = scrollContainerRef.current
        if (!pendingScrollRestore || !element || conversation.length <= previousMessageCount) {
            return
        }

        const heightDelta = element.scrollHeight - pendingScrollRestore.scrollHeight
        const nextScrollTop = pendingScrollRestore.scrollTop < 0
            ? pendingScrollRestore.scrollTop
            : pendingScrollRestore.scrollTop + heightDelta
        element.scrollTop = nextScrollTop
        window.requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = nextScrollTop
            }
            pendingScrollRestoreRef.current = null
        })
    }, [conversation.length])

    useEffect(() => {
        if (activeMoreMessageId === null && activeReactionMessageId === null) {
            return
        }
        const handleClickOutside = (event: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setActiveMoreMessageId(null)
                setActiveReactionMessageId(null)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [activeMoreMessageId, activeReactionMessageId])

    const emojjRef = useRef<number>(-10)
    const hanldeClickEmojj = (messageId: number, emojj: string) => {
        emojjRef.current = messageId
        console.log("Clicked emoji:", emojj, "for message ID:", messageId);
        if (!currenConverID) return
        setActiveReactionMessageId(null);
        setMessageReactions((prev) => ({
            ...prev,
            [messageId]: upsertReaction(prev[messageId] || [], {
                messageId,
                senderId: currentUserId,
                emoji: emojj,
            }),
        }));
        setActiveMoreMessageId(null);
        submitReaction(emojj, messageId, currenConverID)
    }
    const store = useSelector((state: RootState) => state.chat.newMess)
    const storeEvent = useSelector((state: RootState) => state.chat.newMess?.event)
    const storeData = useSelector((state: RootState) => state.chat.newMess?.data) as ReactionData | undefined;
    useEffect(() => {
        if (!storeEvent || !storeData || !storeData.message) return
        if (storeEvent === SocketEvent.REACTION_ADD || storeEvent === SocketEvent.REACTION_ACK) {
            console.log("[Reaction][FE][ListMess][receive]", {
                event: storeEvent,
                currentConversationId,
                socketConversationId: storeData.conversationId,
                payload: storeData.message,
                currentMessageIds: conversation.map((message) => message.messageId),
            })
            const reactionMessageId = Number(storeData.message.messageId ?? storeData.message.messageID)
            if (!Number.isFinite(reactionMessageId) || reactionMessageId <= 0) {
                console.log("[Reaction][FE][ListMess][skip-invalid-message-id]", {
                    reactionMessageId,
                    payload: storeData.message,
                })
                return
            }
            const belongsToCurrentConversation =
                storeData.conversationId === null ||
                Number(storeData.conversationId) === Number(currentConversationId) ||
                conversation.some((message) => message.messageId === reactionMessageId)
            if (!belongsToCurrentConversation) {
                console.log("[Reaction][FE][ListMess][skip-wrong-conversation]", {
                    reactionMessageId,
                    currentConversationId,
                    socketConversationId: storeData.conversationId,
                })
                return
            }
            setActiveReactionMessageId(null);
            const reaction = {
                ...storeData.message,
                messageId: reactionMessageId,
            }
            setMessageReactions((prev) => ({
                ...prev,
                [reactionMessageId]: upsertReaction(prev[reactionMessageId] || [], reaction),
            }));
            console.log("[Reaction][FE][ListMess][apply]", {
                reactionMessageId,
                reaction,
            })
            setActiveMoreMessageId(null);
        }

    }, [store, currentConversationId, storeData, storeEvent])
    const clickMoreButton = (action: string, message: MessageInterface) => {
        const messageId = message.messageId
        console.log('nhan vao more ne', action, messageId)
        if (!currentConversationId) return
        if (action === 'Gỡ') {
            onRecallMessage?.(messageId)
        }
        if (action === 'Chuyển tiếp') {
            onForwardMessage?.(message)
        }
        if (action === 'Ghim' || action === 'Bỏ ghim') {
            onPinMessage?.(message, !isMessagePinned(message))
        }

    }

    const renderOutgoingStatus = (mess: MessageInterface) => {
        if (!visibleMessageStatus) return null
        const visibleStatusMessageExists = conversation.some(
            (message) => message.messageId === visibleMessageStatus.messageId
        )
        const shouldShowStatus =
            mess.messageId === visibleMessageStatus.messageId ||
            (mess.messageId === latestOutgoingMessageId && !visibleStatusMessageExists)
        if (!shouldShowStatus) return null
        if (!visibleMessageStatus.status) return null

        const statusText = {
            SENDING: "Đang gửi",
            SENT: "Đã gửi",
            DELIVERED: "Đã nhận",
            SEEN: "Đã xem",
        }[visibleMessageStatus.status]

        return (
            <Box
                sx={{
                    mt: 0.35,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    width: "100%",
                    minHeight: 16,
                    color: "#3f444a",
                    fontSize: 12,
                    lineHeight: 1.2,
                    fontWeight: 600,
                    fontFamily: appFontFamily,
                }}
            >
                <Box component="span">{statusText}</Box>
            </Box>
        )
    }

    const renderMessageActions = (mess: MessageInterface, menuPlacement: "left" | "right") => {
        const isActive = activeReactionMessageId === mess.messageId || activeMoreMessageId === mess.messageId

        return (
            <Box
                ref={isActive ? moreMenuRef : undefined}
                className="message-actions"
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.25,
                    mb: 0.25,
                    position: "relative",
                    opacity: isActive ? 1 : 0,
                    pointerEvents: isActive ? "auto" : "none",
                    transition: "opacity 120ms ease",
                }}
            >
                {activeReactionMessageId === mess.messageId && (
                    <Box
                        sx={{
                            position: "absolute",
                            left: menuPlacement === "right" ? 0 : "auto",
                            right: menuPlacement === "left" ? 0 : "auto",
                            bottom: "calc(100% + 8px)",
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            px: 1,
                            py: 0.75,
                            bgcolor: "#fff",
                            borderRadius: "999px",
                            boxShadow: "0 3px 12px rgba(0,0,0,0.18)",
                            zIndex: 5,
                        }}
                    >
                        {reactions.map((reaction) => (
                            <Box
                                component="button"
                                key={reaction}
                                type="button"

                                sx={{
                                    width: 34,
                                    height: 34,
                                    p: 0,
                                    border: 0,
                                    cursor: "pointer",
                                    bgcolor: "transparent",
                                    color: "initial",
                                    opacity: 1,
                                    fontSize: 27,
                                    fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
                                    filter: "saturate(1.35) contrast(1.08)",
                                    lineHeight: 1,
                                    "&:hover": {
                                        bgcolor: "#f1f3f4",
                                        transform: "scale(1.12)",
                                    },
                                    transition: "transform 120ms ease, background-color 120ms ease",
                                }}
                                onClick={() => hanldeClickEmojj(mess.messageId, reaction)}
                            >
                                {reaction}
                            </Box>
                        ))}

                    </Box>
                )}
                <IconButton
                    size="small"
                    onClick={() =>
                        setActiveReactionMessageId((prev) =>
                            prev === mess.messageId ? null : mess.messageId
                        )
                    }
                    onMouseDown={() => setActiveMoreMessageId(null)}
                    sx={{ color: "#5f6368", p: 0.2 }}
                >
                    <SentimentSatisfiedAltIcon sx={{ fontSize: 20 }} />
                </IconButton>
                <IconButton size="small" sx={{ color: "#5f6368", p: 0.2 }}
                    onClick={() => {

                        setReplyMess(mess)
                    }}
                >
                    <ReplyIcon sx={{ fontSize: 20 }} />
                </IconButton>
                <IconButton
                    size="small"
                    onClick={() => {
                        setActiveReactionMessageId(null)
                        setActiveMoreMessageId((prev) =>
                            prev === mess.messageId ? null : mess.messageId
                        )
                    }}
                    sx={{
                        color: "#5f6368",
                        p: 0.2,
                        border: "2px solid #1a73e8",
                    }}
                >
                    <MoreVertIcon sx={{ fontSize: 20 }} />
                </IconButton>
                {activeMoreMessageId === mess.messageId && (
                    <Box
                        sx={{
                            position: "absolute",
                            left: menuPlacement === "right" ? "calc(100% + 6px)" : "auto",
                            right: menuPlacement === "left" ? "calc(100% + 6px)" : "auto",
                            top: "auto",
                            bottom: "calc(100% + 6px)",
                            width: 136,
                            py: 0.25,
                            bgcolor: "#fff",
                            borderRadius: "8px",
                            boxShadow: "0 3px 10px rgba(0,0,0,0.18)",
                            zIndex: 100,
                            overflow: "hidden",
                            fontFamily: appFontFamily,
                        }}
                    >
                        {moreActions.map((action) => {
                            const actionLabel = action === "Ghim" && isMessagePinned(mess) ? "Bỏ ghim" : action
                            if (menuPlacement === 'right' && action === 'Gỡ') {
                                return null
                            }
                            if (!mess.content && action === 'Gỡ' && mess.type === 'text') {
                                return null
                            }
                            return (

                                <Box
                                    component="button"
                                    key={action}
                                    type="button"
                                    onClick={() => {
                                        setActiveMoreMessageId(null)
                                        clickMoreButton(actionLabel, mess)

                                    }}
                                    sx={{
                                        width: "100%",
                                        height: 32,
                                        px: 1.25,
                                        display: "flex",
                                        alignItems: "center",
                                        border: 0,
                                        bgcolor: "#fff",
                                        color: "#111",
                                        cursor: "pointer",
                                        fontSize: 14,
                                        fontWeight: 400,
                                        textAlign: "left",
                                        "&:hover": {
                                            bgcolor: "#f1f3f4",
                                        },
                                        "&:focus-visible": {
                                            outline: "2px solid #1a73e8",
                                            outlineOffset: -2,
                                        },
                                    }}
                                >
                                    {actionLabel}
                                </Box>)
                        })}
                    </Box>
                )}
            </Box>
        )
    }

    const isCallMessage = (mess: MessageInterface) => mess.type === "CALL_AUDIO" || mess.type === "CALL_VIDEO"

    const isImageMessage = (mess: MessageInterface) => mess.type?.startsWith("image/")
    const isVideoMessage = (mess: MessageInterface) => mess.type?.startsWith("video/")
    const isAudioMessage = (mess: MessageInterface) => mess.type?.startsWith("audio/")
    const isFileMessage = (mess: MessageInterface) => !!mess.mediaURL && !isImageMessage(mess) && !isVideoMessage(mess) && !isAudioMessage(mess)

    const isPolicyViolationMessage = (mess: any) => mess.moderationStatus === "HATE" || mess.moderation_status === "HATE"
    const isOffensiveMessage = (mess: any) => mess.moderationStatus === "OFFENSIVE" || mess.moderation_status === "OFFENSIVE"
    const getHiddenMessageText = (mess: MessageInterface, isMine: boolean) => {
        if (isPolicyViolationMessage(mess)) {
            return "Tin nhắn bị vi phạm chính sách"
        }
        return isMine ? "Bạn đã thu hồi tin nhắn" : "Tin nhắn đã được thu hồi"
    }
    const isDeletedMessage = (mess: MessageInterface) =>
        isPolicyViolationMessage(mess) || mess.isDeleted || (!mess.content && !mess.mediaURL)

    const revealOffensiveMessage = (messageId: number) => {
        setRevealedOffensiveMessageIds((prev) => {
            const next = new Set(prev)
            next.add(messageId)
            return next
        })
    }

    const renderMessageContent = (mess: MessageInterface, content: string, textColor: string = "inherit") => {
        if (!isOffensiveMessage(mess) || revealedOffensiveMessageIds.has(mess.messageId)) {
            return <Box component="span">{content}</Box>
        }

        return (
            <Box sx={{ display: "grid", gap: 0.75 }}>
                <Box sx={{ color: textColor, fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
                    Nội dung có thể gây khó chịu
                </Box>
                <Box
                    sx={{
                        filter: "blur(4px)",
                        userSelect: "none",
                        pointerEvents: "none",
                    }}
                >
                    {content}
                </Box>
                <Box
                    component="button"
                    type="button"
                    onClick={() => revealOffensiveMessage(mess.messageId)}
                    sx={{
                        justifySelf: "start",
                        border: "1px solid rgba(148,163,184,0.45)",
                        borderRadius: "999px",
                        bgcolor: "rgba(255,255,255,0.85)",
                        color: "#991b1b",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                        px: 1.1,
                        py: 0.35,
                        "&:hover": {
                            bgcolor: "#fff",
                        },
                    }}
                >
                    Xem
                </Box>
            </Box>
        )
    }

    const renderDeletedMessage = (mess: MessageInterface) => {
        const isMine = mess.senderId === currentUserId
        const senderName = getSenderName(mess.senderId)
        const senderAvatar = getSenderAvatar(mess.senderId)
        const hiddenMessageText = getHiddenMessageText(mess, isMine)
        const bubble = (
            <Box
                sx={{
                    maxWidth: "100%",
                    px: 2,
                    py: 1,
                    borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: isMine ? (theme?.gradient || "#b30000") : "#fff",
                    color: isMine ? "#fff" : "#5f6368",
                    fontSize: 15,
                    fontStyle: "italic",
                    lineHeight: 1.4,
                    whiteSpace: "nowrap",
                    wordBreak: "normal",
                }}
            >
                {hiddenMessageText}
            </Box>
        )

        if (!isMine) {
            return (
                <Box
                    key={mess.messageId}
                    sx={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "flex-start",
                        alignItems: "flex-start",
                        gap: 1,
                        mb: 1,
                    }}
                >
                    <Avatar
                        src={senderAvatar || undefined}
                        sx={{ width: 30, height: 30, mt: isGroupConversation ? "18px" : 0 }}
                    >
                        {senderName.charAt(0).toUpperCase()}
                    </Avatar>

                    <Box sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        maxWidth: "calc(100% - 38px)",
                    }}>
                        {isGroupConversation && (
                            <Box
                                sx={{
                                    ml: 1,
                                    mb: 0.3,
                                    color: "#5f4638",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    lineHeight: "16px",
                                    minHeight: 16,
                                }}
                            >
                                {senderName}
                            </Box>
                        )}
                        {bubble}
                    </Box>
                </Box>
            )
        }

        return (
            <Box
                key={mess.messageId}
                sx={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "flex-end",
                    mb: 1,
                }}
            >
                {bubble}
            </Box>
        )
    }

    const renderCallHistory = (mess: MessageInterface) => {
        let detail: { status?: string; durationSeconds?: number; callType?: "AUDIO" | "VIDEO" } = {}
        try {
            detail = mess.content ? JSON.parse(mess.content) : {}
        } catch {
            detail = {}
        }

        const callType: "AUDIO" | "VIDEO" = mess.type === "CALL_AUDIO" ? "AUDIO" : "VIDEO"
        const isMissed = detail.status === "MISSED"
        const isMine = mess.senderId === currentUserId
        const duration = Math.max(0, Number(detail.durationSeconds || 0))
        const timeText = mess.createdAt
            ? new Date(mess.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
            : ""
        const durationText = duration < 60
            ? `${duration} giây`
            : `${Math.ceil(duration / 60)} phút`
        const title = isMissed
            ? `Đã nhỡ cuộc gọi ${callType === "AUDIO" ? "thoại" : "video"}`
            : `Cuộc gọi ${callType === "AUDIO" ? "thoại" : "video"}`
        const subtitle = isMissed ? timeText : durationText
        const Icon = isMissed ? PhoneMissedIcon : callType === "AUDIO" ? CallIcon : VideocamIcon
        const senderProfile = senderProfiles[mess.senderId]
        const senderAvatar = normalizeAvatarUrl(
            senderProfile?.avatarUrl ||
            senderProfile?.avatar_url ||
            senderProfile?.avatar ||
            null
        )
        const senderName =
            senderProfile?.fullName ||
            senderProfile?.full_name ||
            senderProfile?.name ||
            senderProfile?.username ||
            "Người dùng"

        return (
            <Box
                key={mess.messageId}
                sx={{
                    width: "100%",
                    display: "flex",
                    justifyContent: isMine ? "flex-end" : "flex-start",
                    mb: 1,
                    pl: isMine ? 0 : 4.75,
                    position: "relative",
                }}
            >
                {!isMine && (
                    <Avatar
                        src={senderAvatar || undefined}
                        alt={senderName}
                        sx={{
                            position: "absolute",
                            left: 0,
                            bottom: 0,
                            width: 36,
                            height: 36,
                            bgcolor: "#e2e8f0",
                            fontSize: 14,
                        }}
                    >
                        {senderName.charAt(0).toUpperCase()}
                    </Avatar>
                )}
                <Box
                    sx={{
                        width: 290,
                        maxWidth: "min(290px, 78vw)",
                        borderRadius: "18px",
                        bgcolor: "#fff",
                        px: 2,
                        py: 1.35,
                        boxShadow: "0 1px 2px rgba(15,23,42,0.05)",
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.15 }}>
                        <Box
                            sx={{
                                width: 44,
                                height: 44,
                                borderRadius: "50%",
                                bgcolor: isMissed ? "#f43f5e" : "#eeeeee",
                                color: isMissed ? "#fff" : "#111",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <Icon sx={{ fontSize: 23 }} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Box
                                sx={{
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: "#0f172a",
                                    lineHeight: 1.3,
                                    wordBreak: "break-word",
                                    textTransform: "none",
                                }}
                            >
                                {title}
                            </Box>
                            <Box sx={{ fontSize: 12.5, color: "#64748b", mt: 0.2 }}>
                                {subtitle}
                            </Box>
                        </Box>
                    </Box>
                    <Box
                        component="button"
                        type="button"
                        onClick={() => onCallAgain?.(callType)}
                        sx={{
                            mt: 1.15,
                            width: "100%",
                            height: 36,
                            border: 0,
                            borderRadius: "8px",
                            bgcolor: "#f1f5f9",
                            color: "#1e293b",
                            fontSize: 14,
                            fontWeight: 600,
                            textTransform: "none",
                            cursor: "pointer",
                            transition: "background-color 0.15s ease",
                            "&:hover": {
                                bgcolor: "#e2e8f0",
                            },
                        }}
                    >
                        Gọi lại
                    </Box>
                </Box>
            </Box>
        )
    }

    const downloadFile = async (url: string, fileName?: string | null) => {
        const safeFileName = fileName || `file-${Date.now()}`
        try {
            const response = await fetch(url)
            const blob = await response.blob()
            const objectUrl = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = objectUrl
            link.download = safeFileName
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(objectUrl)
        } catch {
            const link = document.createElement("a")
            link.href = url
            link.download = safeFileName
            link.target = "_blank"
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }
    }

    const renderFileMessage = (mess: MessageInterface, isMine: boolean) => {
        const fileUrl = mess.mediaURL || ""
        const fileName = mess.fileName || "Tệp đính kèm"

        return (
            <Box
                component="button"
                type="button"
                onClick={() => fileUrl && downloadFile(fileUrl, fileName)}
                sx={{
                    width: "100%",
                    minHeight: 66,
                    border: 0,
                    p: 1.25,
                    display: "flex",
                    alignItems: "center",
                    gap: 1.2,
                    bgcolor: isMine ? "rgba(255,255,255,0.12)" : "#fff",
                    color: isMine ? "#fff" : "#0f172a",
                    cursor: fileUrl ? "pointer" : "default",
                    textAlign: "left",
                    fontFamily: appFontFamily,
                    "&:hover": {
                        bgcolor: isMine ? "rgba(255,255,255,0.18)" : "#f8fafc",
                    },
                }}
            >
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: isMine ? "rgba(255,255,255,0.18)" : "#fee2e2",
                        color: isMine ? "#fff" : "#a40000",
                        flexShrink: 0,
                    }}
                >
                    <InsertDriveFileIcon sx={{ fontSize: 22 }} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box
                        sx={{
                            fontSize: 14,
                            fontWeight: 700,
                            lineHeight: 1.25,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {fileName}
                    </Box>
                    <Box sx={{ mt: 0.35, fontSize: 12, opacity: 0.78 }}>
                        Nhấn để tải xuống
                    </Box>
                </Box>
                <DownloadIcon sx={{ fontSize: 20, opacity: 0.82, flexShrink: 0 }} />
            </Box>
        )
    }

    const renderImageMessage = (mess: MessageInterface) => {
        const imageUrl = mess.mediaURL || ""

        return (
            <>
                <Box
                    component="button"
                    type="button"
                    onClick={() => imageUrl && setPreviewImage({ url: imageUrl, fileName: mess.fileName })}
                    sx={{
                        width: "100%",
                        height: "100%",
                        p: 0,
                        m: 0,
                        border: 0,
                        bgcolor: "transparent",
                        cursor: imageUrl ? "zoom-in" : "default",
                        display: "block",
                    }}>
                    <ImageWithLoader
                        src={imageUrl}
                        alt={mess.fileName || "image message"}
                        sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                            fontFamily: appFontFamily,
                        }}
                    />
                </Box>

                {imageUrl && (
                    <Tooltip title="Tải ảnh">
                        <IconButton
                            aria-label="Tải ảnh"
                            onClick={(event) => {
                                event.stopPropagation()
                                downloadFile(imageUrl, mess.fileName)
                            }}
                            sx={{
                                position: "absolute",
                                top: 6,
                                right: 6,
                                width: 28,
                                height: 28,
                                bgcolor: "rgba(255, 255, 255, 0.9)",
                                color: "#111",
                                boxShadow: "0 2px 6px rgba(15,23,42,0.15)",
                                "&:hover": {
                                    bgcolor: "#fff",
                                },
                            }}
                        >
                            <DownloadIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                )}
            </>
        )
    }

    const renderAttachmentBody = (mess: MessageInterface, isMine: boolean) => {
        if (isFileMessage(mess)) {
            return renderFileMessage(mess, isMine)
        }

        if (isAudioMessage(mess)) {
            const isPlaying = playingAudioMessageId === mess.messageId
            const currentTime = audioCurrentTimes[mess.messageId] || 0
            const duration = audioDurations[mess.messageId] || getAudioDurationFromMessage(mess)

            return (
                <Box
                    sx={{
                        width: "100%",
                        minWidth: 240,
                        px: 1,
                        py: 0.75,
                        bgcolor: "#fff",
                        color: "#0f172a",
                        borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                    }}
                >
                    <IconButton
                        aria-label={isPlaying ? "Tạm dừng âm thanh" : "Nghe âm thanh"}
                        onClick={() => toggleAudioPlayback(mess.messageId)}
                        sx={{
                            width: 36,
                            height: 36,
                            bgcolor: isMine ? "#2563eb" : "#a40000",
                            color: "#fff",
                            flexShrink: 0,
                            "&:hover": {
                                bgcolor: isMine ? "#1d4ed8" : "#8a0000",
                            },
                        }}
                    >
                        {isPlaying ? <PauseIcon sx={{ fontSize: 21 }} /> : <PlayArrowIcon sx={{ fontSize: 24 }} />}
                    </IconButton>
                    <Box
                        sx={{
                            minWidth: 0,
                            flex: 1,
                            color: "#1e293b",
                        }}
                    >
                        <Box
                            sx={{
                                fontSize: 14,
                                fontWeight: 700,
                                lineHeight: 1.2,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            Tin nhắn thoại
                        </Box>
                        <Box
                            sx={{
                                mt: 0.35,
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#64748b",
                                lineHeight: 1,
                            }}
                        >
                            {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
                        </Box>
                    </Box>
                    <Box sx={{ display: "none", width: 0, height: 0, overflow: "hidden" }}>
                        <audio
                            ref={(element) => {
                                audioRefs.current[mess.messageId] = element
                            }}
                            src={mess.mediaURL || ""}
                            preload="auto"
                            onLoadedMetadata={(event) => {
                                updateAudioDuration(mess.messageId, event.currentTarget.duration)
                            }}
                            onDurationChange={(event) => {
                                updateAudioDuration(mess.messageId, event.currentTarget.duration)
                            }}
                            onTimeUpdate={(event) => {
                                const nextCurrentTime = event.currentTarget.currentTime
                                updateAudioDuration(mess.messageId, event.currentTarget.duration)
                                setAudioCurrentTimes((prev) => ({
                                    ...prev,
                                    [mess.messageId]: nextCurrentTime,
                                }))
                            }}
                            onEnded={() => {
                                setPlayingAudioMessageId(null)
                                setAudioCurrentTimes((prev) => ({
                                    ...prev,
                                    [mess.messageId]: 0,
                                }))
                            }}
                            onPause={() => {
                                if (playingAudioMessageId === mess.messageId) {
                                    setPlayingAudioMessageId(null)
                                }
                            }}
                        />
                    </Box>
                </Box>
            )
        }

        return (
            <Box
                sx={{
                    width: "100%",
                    height: 170,
                    overflow: "hidden",
                    position: "relative",
                    bgcolor: "black",
                }}
            >
                {isVideoMessage(mess) ? (
                    <ChatVideoPlayer src={mess.mediaURL ? mess.mediaURL : ''} />
                ) : (
                    renderImageMessage(mess)
                )}
            </Box>
        )
    }

    const getReplyPreviewText = (mess: MessageInterface) => {
        if ((mess as any).replyToModerationStatus === "HATE" || (mess as any).replyToModerationStatus === "OFFENSIVE") {
            return (mess as any).replyToModerationStatus === "HATE" ? "Tin nhắn bị vi phạm chính sách" : "Nội dung có thể gây khó chịu"
        }
        if (mess.replyToDeleted) return "Tin nhắn đã được thu hồi"
        if (mess.replyToContent) return mess.replyToContent
        if (mess.replyToFileName) return mess.replyToFileName
        if (mess.replyToMediaURL) {
            if (mess.replyToType?.startsWith("audio/")) return "Âm thanh"
            return mess.replyToType?.startsWith("video/") ? "Video" : "Hình ảnh"
        }
        return "Tin nhắn"
    }
    const renderReplyPreview = (mess: MessageInterface, isMine: boolean) => {
        if (!mess.replyToMessageId) return null
        const isReplyMine = mess.replyToSenderId === currentUserId
        const author = isReplyMine ? "Bạn" : getSenderName(mess.replyToSenderId || 0)

        return (
            <Box
                sx={{
                    mb: 0.75,
                    px: 1,
                    py: 0.75,
                    borderLeft: "3px solid",
                    borderColor: isMine ? "rgba(255,255,255,0.72)" : "#b30000",
                    borderRadius: "7px",
                    bgcolor: isMine ? "rgba(255,255,255,0.18)" : "rgba(179,0,0,0.08)",
                    color: isMine ? "#fff" : "#202124",
                    boxSizing: "border-box",
                    width: "100%",
                    minWidth: "min(184px, 56vw)",
                    maxWidth: "100%",
                    overflow: "hidden",
                }}
            >
                <Box
                    sx={{
                        fontSize: 12,
                        lineHeight: 1.2,
                        fontWeight: 700,
                        mb: 0.25,
                        opacity: 0.95,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {author}
                </Box>
                <Box
                    sx={{
                        fontSize: 13,
                        lineHeight: 1.25,
                        opacity: 0.92,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                    }}
                >
                    {getReplyPreviewText(mess)}
                </Box>
            </Box>
        )
    }

    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        if (!hasMoreMessages || loadingOlderMessages) return

        const element = event.currentTarget
        const maxScrollDistance = element.scrollHeight - element.clientHeight
        if (maxScrollDistance <= 0) return

        const distanceToOldest = element.scrollTop < 0
            ? maxScrollDistance + element.scrollTop
            : maxScrollDistance - element.scrollTop

        if (distanceToOldest > 96) {
            oldestThresholdReachedRef.current = false
            return
        }

        if (oldestThresholdReachedRef.current) {
            return
        }

        if (distanceToOldest <= 32) {
            oldestThresholdReachedRef.current = true
            pendingScrollRestoreRef.current = {
                scrollHeight: element.scrollHeight,
                scrollTop: element.scrollTop,
            }
            onLoadOlderMessages?.()
        }
    }

    return (
        <>
            <Box
                ref={scrollContainerRef}
                onScroll={handleScroll}
                sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column-reverse",
                    overflowY: "auto",
                    width: "100%",
                    px: 2,
                    py: 2,
                    position: "relative",
                    overflowAnchor: "none",
                    background: theme?.background || "linear-gradient(180deg, #f4f6fb, #eef1f8)",
                    fontFamily: appFontFamily,
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
                }}
            >

                {/* loading của người gửi */}
                {loadingOlderMessages && (
                    <Box
                        sx={{
                            position: "absolute",
                            top: 10,
                            left: 16,
                            right: 16,
                            zIndex: 50,
                            px: 1.25,
                            py: 0.85,
                            borderRadius: "999px",
                            bgcolor: "rgba(255,255,255,0.92)",
                            boxShadow: "0 6px 18px rgba(15,23,42,0.14)",
                            pointerEvents: "none",
                        }}
                    >
                        <CircularProgress
                            sx={{
                                height: 4,
                                borderRadius: 999,
                                bgcolor: "rgba(255,255,255,0.45)",
                                "& .MuiLinearProgress-bar": {
                                    background: theme?.gradient || "#b30000",
                                },
                            }}
                        />
                        <Box
                            sx={{
                                mt: 0.45,
                                color: "#5b1111",
                                fontSize: 12,
                                fontWeight: 700,
                                textAlign: "center",
                            }}
                        >
                            Đang tải tin nhắn cũ...
                        </Box>
                    </Box>
                )}

                {false && (<>
                    {/* mess reply */}

                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            mb: 1,
                            width: "100%",
                        }}
                    >
                        <Box
                            sx={{
                                maxWidth: "70%",
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "flex-end",
                            }}
                        >
                            <Box
                                sx={{
                                    mb: 0.35,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "flex-end",
                                }}
                            >
                                <Box
                                    sx={{
                                        fontSize: 13,
                                        color: "#5f6368",
                                        mb: 0.35,
                                    }}
                                >
                                    {"↩ Bạn đã trả lời Nguyen"}
                                </Box>

                                <Box
                                    sx={{
                                        px: 1.5,
                                        py: 0.75,
                                        borderRadius: "16px",
                                        bgcolor: "#f1f1f1",
                                        color: "#5f6368",
                                        fontSize: 14,
                                        lineHeight: 1.35,
                                        wordBreak: "break-word",
                                    }}
                                >
                                    {"Phòng 5 e"}
                                </Box>
                            </Box>

                            <Box
                                sx={{
                                    bgcolor: "rgb(179, 0, 0)",
                                    color: "#fff",
                                    px: 2,
                                    py: 1,
                                    borderRadius: "18px 18px 4px 18px",
                                    fontSize: 15,
                                    lineHeight: 1.4,
                                    wordBreak: "break-word",
                                }}
                            >
                                {"helo"}
                            </Box>
                        </Box>
                    </Box>

                </>)}

                {conversation.map((mess: MessageInterface) => {
                    if (isCallMessage(mess)) {
                        return renderCallHistory(mess)
                    }
                    if (isDeletedMessage(mess)) {
                        return renderDeletedMessage(mess)
                    }
                    if (mess.senderId !== currentUserId) {
                        if (!isGroupConversation) {
                            const senderName = getSenderName(mess.senderId)
                            const senderAvatar = getSenderAvatar(mess.senderId)
                            return (
                                <Box
                                    key={mess.messageId}
                                    sx={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "flex-start",
                                        width: "100%",
                                        mb: 1,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "flex-start",
                                            alignItems: "flex-end",
                                            gap: 1,
                                            width: "100%",
                                            "&:hover .message-actions": {
                                                opacity: 1,
                                                pointerEvents: "auto",
                                            },
                                        }}
                                    >

                                        <Avatar
                                            src={senderAvatar || undefined}
                                            sx={{ width: 30, height: 30, cursor: "pointer", "&:hover": { opacity: 0.85 } }}
                                            onClick={() => navigate(`/profile/${mess.senderId}`)}
                                        >
                                            {senderName.charAt(0).toUpperCase()}
                                        </Avatar>
                                        {
                                            (mess.type === 'text' && mess.content) ?

                                                (<>
                                                    <Box
                                                        sx={{
                                                            position: "relative",
                                                            bgcolor: "#fff",
                                                            px: 2,
                                                            py: 1,
                                                            borderRadius: "18px 18px 18px 4px",
                                                            maxWidth: "70%",
                                                        }}
                                                    >
                                                        {isMessagePinned(mess) && (
                                                            <PushPinIcon
                                                                sx={{
                                                                    position: "absolute",
                                                                    top: -6,
                                                                    right: -6,
                                                                    fontSize: 14,
                                                                    color: "#2563eb",
                                                                    bgcolor: "#fff",
                                                                    borderRadius: "50%",
                                                                    p: 0.2,
                                                                    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                                                                    zIndex: 1,
                                                                }}
                                                            />
                                                        )}
                                                        {renderReplyPreview(mess, false)}
                                                        {mess.content ? renderMessageContent(mess, mess.content, "#334155") : 'Tin nhắn đã được thu hồi'}
                                                        {renderReactionBadge(mess.messageId, "right")}
                                                    </Box>
                                                    {renderMessageActions(mess, "right")}
                                                </>) :


                                                (<>
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            alignItems: "flex-end",
                                                            gap: 1,
                                                            mb: 1,
                                                            width: "100%",
                                                            "&:hover .message-actions": {
                                                                opacity: 1,
                                                                pointerEvents: "auto",
                                                            },
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                width: isAudioMessage(mess) ? "min(340px, 78vw)" : 240,
                                                                overflow: "hidden",
                                                                borderRadius: "18px 18px 4px 18px",
                                                                background: theme?.gradient || "#b30000",
                                                                color: "#fff",
                                                                position: "relative",
                                                            }}
                                                        >
                                                            {isMessagePinned(mess) && (
                                                                <PushPinIcon
                                                                    sx={{
                                                                        position: "absolute",
                                                                        top: 6,
                                                                        right: 6,
                                                                        fontSize: 14,
                                                                        color: "#2563eb",
                                                                        bgcolor: "#fff",
                                                                        borderRadius: "50%",
                                                                        p: 0.2,
                                                                        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                                                                        zIndex: 1,
                                                                    }}
                                                                />
                                                            )}
                                                            {renderReplyPreview(mess, false)}
                                                            {renderAttachmentBody(mess, false)}

                                                            {
                                                                mess.content && (
                                                                    <>
                                                                        <Box
                                                                            sx={{
                                                                                px: 1.5,
                                                                                py: 1,
                                                                                fontSize: 14,
                                                                                lineHeight: 1.4,
                                                                                wordBreak: "break-word",
                                                                            }}
                                                                        >
                                                                            {renderMessageContent(mess, mess.content, "#fff")}
                                                                        </Box>
                                                                    </>
                                                                )
                                                            }

                                                            {renderReactionBadge(mess.messageId, "right")}
                                                        </Box>
                                                        {renderMessageActions(mess, "right")}
                                                    </Box>

                                                </>)
                                        }

                                    </Box>
                                    <Box sx={{ pl: "40px", mt: 0.25, display: "flex", justifyContent: "flex-start", width: "100%", fontFamily: appFontFamily }}>
                                        <Typography sx={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>
                                            {getFormattedMessageTime(mess.createdAt)}
                                        </Typography>
                                    </Box>
                                </Box>
                            )
                        }

                        const senderName = getSenderName(mess.senderId)
                        const senderAvatar = getSenderAvatar(mess.senderId)
                        console.log("[GroupMessage][FE][render-sender-profile]", {
                            senderId: mess.senderId,
                            profile: getSenderProfile(mess.senderId),
                            senderName,
                            senderAvatar,
                        })
                        return (
                            <>
                                <Box
                                    sx={{
                                        display: "flex",
                                        justifyContent: "flex-start",
                                        mb: 1,
                                        alignItems: "flex-start",
                                        gap: 1,
                                        width: "100%",
                                        "&:hover .message-actions": {
                                            opacity: 1,
                                            pointerEvents: "auto",
                                        },
                                    }} key={mess.messageId}
                                >

                                    <Avatar
                                        src={senderAvatar || undefined}
                                        sx={{ width: 30, height: 30, mt: "18px", cursor: "pointer", "&:hover": { opacity: 0.85 } }}
                                        onClick={() => navigate(`/profile/${mess.senderId}`)}
                                    >
                                        {senderName.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", maxWidth: "70%" }}>
                                        {isGroupConversation && (
                                            <Box
                                                onClick={() => navigate(`/profile/${mess.senderId}`)}
                                                sx={{
                                                    ml: 1,
                                                    mb: 0.3,
                                                    color: "#5f4638",
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    lineHeight: "16px",
                                                    minHeight: 16,
                                                    cursor: "pointer",
                                                    "&:hover": {
                                                        textDecoration: "underline",
                                                        color: "#2563eb",
                                                    },
                                                }}
                                            >
                                                {senderName}
                                            </Box>
                                        )}
                                        {
                                            (mess.type === 'text' && mess.content) ?

                                                (<>
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            alignItems: "flex-end",
                                                            gap: 1,
                                                            width: "100%",
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                position: "relative",
                                                                bgcolor: "#fff",
                                                                px: 2,
                                                                py: 1,
                                                                borderRadius: "18px 18px 18px 4px",
                                                                maxWidth: "100%",
                                                            }}
                                                        >
                                                            {isMessagePinned(mess) && (
                                                                <PushPinIcon
                                                                    sx={{
                                                                        position: "absolute",
                                                                        top: -6,
                                                                        right: -6,
                                                                        fontSize: 14,
                                                                        color: "#2563eb",
                                                                        bgcolor: "#fff",
                                                                        borderRadius: "50%",
                                                                        p: 0.2,
                                                                        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                                                                        zIndex: 1,
                                                                    }}
                                                                />
                                                            )}
                                                            {renderReplyPreview(mess, false)}
                                                            {mess.content ? renderMessageContent(mess, mess.content, "#334155") : 'Tin nhắn đã được thu hồi'}
                                                            {renderReactionBadge(mess.messageId, "right")}
                                                        </Box>
                                                        {renderMessageActions(mess, "right")}
                                                    </Box>
                                                </>) :


                                                (<>
                                                    <Box
                                                        sx={{
                                                            display: "flex",
                                                            alignItems: "flex-end",
                                                            gap: 1,
                                                            mb: 1,
                                                            width: "100%",
                                                            "&:hover .message-actions": {
                                                                opacity: 1,
                                                                pointerEvents: "auto",
                                                            },
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                width: isAudioMessage(mess) ? "min(340px, 78vw)" : 240,
                                                                overflow: "hidden",
                                                                borderRadius: "18px 18px 4px 18px",
                                                                background: theme?.gradient || "#b30000",
                                                                color: "#fff",
                                                                position: "relative",
                                                            }}
                                                        >
                                                            {isMessagePinned(mess) && (
                                                                <PushPinIcon
                                                                    sx={{
                                                                        position: "absolute",
                                                                        top: 6,
                                                                        right: 6,
                                                                        fontSize: 14,
                                                                        color: "#2563eb",
                                                                        bgcolor: "#fff",
                                                                        borderRadius: "50%",
                                                                        p: 0.2,
                                                                        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                                                                        zIndex: 1,
                                                                    }}
                                                                />
                                                            )}
                                                            {renderReplyPreview(mess, false)}
                                                            {renderAttachmentBody(mess, false)}

                                                            {
                                                                mess.content && (
                                                                    <>
                                                                        <Box
                                                                            sx={{
                                                                                px: 1.5,
                                                                                py: 1,
                                                                                fontSize: 14,
                                                                                lineHeight: 1.4,
                                                                                wordBreak: "break-word",
                                                                            }}
                                                                        >
                                                                            {renderMessageContent(mess, mess.content, "#fff")}
                                                                        </Box>
                                                                    </>
                                                                )
                                                            }

                                                            {renderReactionBadge(mess.messageId, "right")}
                                                        </Box>
                                                        {renderMessageActions(mess, "right")}
                                                    </Box>

                                                </>)
                                        }
                                        <Typography sx={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, mt: 0.25, ml: 1, fontFamily: appFontFamily }}>
                                            {getFormattedMessageTime(mess.createdAt)}
                                        </Typography>
                                    </Box>

                                </Box>

                            </>
                        )
                    }
                    else {
                        return (
                            <>

                                {
                                    (mess.type === 'text' && mess.content) ? (

                                        // mess reply 

                                        <Box
                                            key={mess.messageId}
                                            sx={{
                                                width: "100%",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "flex-end",
                                                mb: 1,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    justifyContent: "flex-end",
                                                    alignItems: "flex-end",
                                                    gap: 1,
                                                    width: "100%",
                                                    "&:hover .message-actions": {
                                                        opacity: 1,
                                                        pointerEvents: "auto",
                                                    },
                                                }}
                                            >
                                                {renderMessageActions(mess, "left")}
                                                <Box
                                                    sx={{
                                                        position: "relative",
                                                        background: theme?.gradient || "#b30000",
                                                        color: "#fff",
                                                        px: 2,
                                                        py: 1,
                                                        borderRadius: "18px 18px 4px 18px",
                                                        maxWidth: "70%",
                                                    }}
                                                >
                                                    {isMessagePinned(mess) && (
                                                        <PushPinIcon
                                                            sx={{
                                                                position: "absolute",
                                                                top: -6,
                                                                left: -6,
                                                                fontSize: 14,
                                                                color: "#2563eb",
                                                                bgcolor: "#fff",
                                                                borderRadius: "50%",
                                                                p: 0.2,
                                                                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                                                                zIndex: 1,
                                                            }}
                                                        />
                                                    )}
                                                    {renderReplyPreview(mess, true)}
                                                    {mess.content ? renderMessageContent(mess, mess.content, "#fff") : 'Bạn đã thu hồi tin nhắn'}
                                                    {renderReactionBadge(mess.messageId, "left")}
                                                </Box>
                                            </Box>
                                            <Box sx={{ mt: 0.25, mr: 1, display: "flex", justifyContent: "flex-end", width: "100%", fontFamily: appFontFamily }}>
                                                <Typography sx={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>
                                                    {getFormattedMessageTime(mess.createdAt)}
                                                </Typography>
                                            </Box>
                                            {renderSeenStatus(mess)}

                                        </Box>) :


                                        (<Box
                                            key={mess.messageId}
                                            sx={{
                                                width: "100%",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "flex-end",
                                                mb: 1,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    justifyContent: "flex-end",
                                                    alignItems: "flex-end",
                                                    gap: 1,
                                                    width: "100%",
                                                    "&:hover .message-actions": {
                                                        opacity: 1,
                                                        pointerEvents: "auto",
                                                    },
                                                }}
                                            >
                                                {renderMessageActions(mess, "left")}
                                                <Box
                                                    sx={{
                                                        width: isAudioMessage(mess) ? "min(340px, 78vw)" : 240,
                                                        overflow: "hidden",
                                                        borderRadius: "18px 18px 4px 18px",
                                                        background: theme?.gradient || "#b30000",
                                                        color: "#fff",
                                                        position: "relative",
                                                    }}
                                                >
                                                    {isMessagePinned(mess) && (
                                                        <PushPinIcon
                                                            sx={{
                                                                position: "absolute",
                                                                top: 6,
                                                                left: 6,
                                                                fontSize: 14,
                                                                color: "#2563eb",
                                                                bgcolor: "#fff",
                                                                borderRadius: "50%",
                                                                p: 0.2,
                                                                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                                                                zIndex: 1,
                                                            }}
                                                        />
                                                    )}
                                                    {renderReplyPreview(mess, true)}
                                                    {renderAttachmentBody(mess, true)}

                                                    {
                                                        mess.content && (
                                                            <>
                                                                <Box
                                                                    sx={{
                                                                        px: 1.5,
                                                                        py: 1,
                                                                        fontSize: 14,
                                                                        lineHeight: 1.4,
                                                                        wordBreak: "break-word",
                                                                    }}
                                                                >
                                                                    {renderMessageContent(mess, mess.content, "#fff")}
                                                                </Box>
                                                            </>
                                                        )
                                                    }

                                                    {renderReactionBadge(mess.messageId, "left")}
                                                </Box>
                                            </Box>
                                            <Box sx={{ mt: 0.25, mr: 1, display: "flex", justifyContent: "flex-end", width: "100%", fontFamily: appFontFamily }}>
                                                <Typography sx={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>
                                                    {getFormattedMessageTime(mess.createdAt)}
                                                </Typography>
                                            </Box>
                                            {renderSeenStatus(mess)}
                                        </Box>)
                                }


                            </>
                        )
                    }
                })}

                {false && loadingOlderMessages && (
                    <Box
                        sx={{
                            width: "100%",
                            minHeight: 56,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        <CircularProgress aria-label="Loading..." size={28} thickness={4} />
                    </Box>
                )}

            </Box >

            <Dialog
                open={!!previewImage}
                onClose={() => setPreviewImage(null)}
                maxWidth={false}
                PaperProps={{
                    sx: {
                        m: 2,
                        maxWidth: "calc(100vw - 32px)",
                        maxHeight: "calc(100vh - 32px)",
                        bgcolor: "rgba(10,10,10,0.96)",
                        borderRadius: "8px",
                        overflow: "hidden",
                    },
                }}
            >
                <Box
                    sx={{
                        position: "relative",
                        width: "min(1100px, calc(100vw - 32px))",
                        height: "min(760px, calc(100vh - 32px))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "#050505",
                    }}
                >
                    {previewImage && (
                        <Box
                            component="img"
                            src={previewImage.url}
                            alt={previewImage.fileName || "image preview"}
                            sx={{
                                maxWidth: "100%",
                                maxHeight: "100%",
                                objectFit: "contain",
                                display: "block",
                            }}
                        />
                    )}

                    <Tooltip title="Đóng">
                        <IconButton
                            aria-label="Đóng"
                            onClick={() => setPreviewImage(null)}
                            sx={{
                                position: "absolute",
                                top: 12,
                                right: 12,
                                bgcolor: "rgba(255,255,255,0.92)",
                                color: "#111",
                                "&:hover": { bgcolor: "#fff" },
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Tooltip>

                    {previewImage && (
                        <Tooltip title="Tải ảnh">
                            <IconButton
                                aria-label="Tải ảnh"
                                onClick={() => downloadFile(previewImage.url, previewImage.fileName)}
                                sx={{
                                    position: "absolute",
                                    top: 12,
                                    right: 64,
                                    bgcolor: "rgba(255,255,255,0.92)",
                                    color: "#111",
                                    "&:hover": { bgcolor: "#fff" },
                                }}
                            >
                                <DownloadIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Dialog>
        </>

    )
}

export default React.memo(ListMess)

