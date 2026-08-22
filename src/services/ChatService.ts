import WebSocketManager from "../socket/WebSocketManager"
import { SocketEvent } from "../enum/SocketEvent"
import { BASE_CHAT_SERVICE, SOCKET_SEND_MESSAGE } from "../config/BaseConfig"
import { apiFetch, isApiSuccess } from "../config/apiClient"

export type MessageRequestItem = {
    conversationId: number;
    otherUserId: number;
    unreadCount?: number;
    lastMessage?: {
        messageId: number;
        senderId: number;
        type: string;
        content: string | null;
        mediaURL?: string | null;
        fileName?: string | null;
        createdAt?: string;
        isDeleted?: boolean;
    } | null;
}

export const sendText = (content: string, conversationId: number) => {
    let ws = WebSocketManager.getInstance()
    ws.connect().then(() => {
        ws.sendMessage(SOCKET_SEND_MESSAGE, {
            event: SocketEvent.SEND_CHAT,
            data: {
                conversationId: conversationId,
                type: "text",
                content: content,
            }
        })
    }).catch((err) => {
        console.error("Lỗi connect:", err);
    });
}

export const replyText = (content: string, messageID: number, type: string, conversationId?: number) => {
    let ws = WebSocketManager.getInstance()
    ws.connect().then(() => {
        ws.sendMessage(SOCKET_SEND_MESSAGE, {
            event: SocketEvent.SEND_REPLY_MESSAGE,
            data: {
                conversationId: conversationId,
                type: type,
                messageID: messageID,
                content: content,
            }
        })
    }).catch((err) => {
        console.error("Lỗi connect:", err);
    });
}

export const sendFirstMessage = (content: string, to: number) => {
    let ws = WebSocketManager.getInstance()
    ws.connect().then(() => {
        ws.sendMessage(SOCKET_SEND_MESSAGE, {
            event: SocketEvent.FIRST_PRIVATE_MESS,
            data: {
                senderId: Number(localStorage.getItem('userId')),
                to: to,
                type: "text",
                content: content,
            }
        })
    }).catch((err) => {
        console.error("Lỗi connect:", err);
    });
}

export const loadConversation = async (currentU: number, targetU: number, page: number = 0): Promise<any> => {
    const url = `${BASE_CHAT_SERVICE}/conversation?currentUser=${currentU}&targetUser=${targetU}&page=${page}`
    return apiFetch<any>(url, { method: 'GET' });
}

export const loadGroupConversation = async (currentU: number, groupId: number, page: number = 0): Promise<any> => {
    const url = `${BASE_CHAT_SERVICE}/conversation/group?currentUser=${currentU}&groupId=${groupId}&page=${page}`
    return apiFetch<any>(url, { method: 'GET' });
}

export const loadConversationById = async (currentU: number, conversationId: number, page: number = 0): Promise<any> => {
    const url = `${BASE_CHAT_SERVICE}/conversation/by-id?currentUser=${currentU}&conversationId=${conversationId}&page=${page}`
    return apiFetch<any>(url, { method: 'GET' });
}

export const loadMessageRequests = async (currentUserId: number): Promise<MessageRequestItem[]> => {
    const url = `${BASE_CHAT_SERVICE}/conversation/message-requests?currentUser=${currentUserId}`
    const res: any = await apiFetch<any>(url, { method: 'GET' });
    const data = res?.data ?? res?.result ?? res;
    return Array.isArray(data) ? data : [];
}

export const loadAcceptedDirectConversations = async (currentUserId: number): Promise<MessageRequestItem[]> => {
    const url = `${BASE_CHAT_SERVICE}/conversation/accepted-direct?currentUser=${currentUserId}`
    const res: any = await apiFetch<any>(url, { method: 'GET' });
    const data = res?.data ?? res?.result ?? res;
    return Array.isArray(data) ? data : [];
}

export function recallMess(conversationId: number, messageId: number) {
    let ws = WebSocketManager.getInstance()
    ws.connect().then(() => {
        ws.sendMessage(SOCKET_SEND_MESSAGE, {
            event: SocketEvent.MESSAGE_RECALL,
            data: {
                conversationID: conversationId,
                messageID: messageId,
            }
        })
    }).catch((err) => {
        console.error("Lỗi connect:", err);
    });
}

export async function uploadMedia(conversationID: string, file: File, content: string = "") {
    let url = `${BASE_CHAT_SERVICE}/messages/media`
    let formData = new FormData();
    formData.append('conversationID', conversationID)
    formData.append('file', file)
    formData.append('type', file.type || 'application/octet-stream')
    formData.append('content', content || '')
    formData.append('fileName', file.name)
    
    return await apiFetch<any>(url, {
        method: "POST",
        body: formData as any,
    });
}

export const sendSeen = (conversationId: number, messageIds: number[]) => {
    if (messageIds.length === 0) return Promise.resolve()

    let ws = WebSocketManager.getInstance()
    return ws.connect().then(() => {
        ws.sendMessage(SOCKET_SEND_MESSAGE, {
            event: SocketEvent.MESSAGE_SEEN,
            data: {
                conversationID: conversationId,
                messageIDs: messageIds,
            }
        })
    }).catch((err) => {
        console.error("Loi connect:", err);
        throw err
    });
}

export const sendDelivered = (conversationId: number, messageIds: number[]) => {
    if (messageIds.length === 0) return

    let ws = WebSocketManager.getInstance()
    ws.connect().then(() => {
        ws.sendMessage(SOCKET_SEND_MESSAGE, {
            event: SocketEvent.MESSAGE_DELIVERED,
            data: {
                conversationID: conversationId,
                messageIDs: messageIds,
            }
        })
    }).catch((err) => {
        console.error("Loi connect:", err);
    });
}

export const updateConversationColor = async (conversationId: number, color: string): Promise<any> => {
    const url = `${BASE_CHAT_SERVICE}/conversation/${conversationId}/color?color=${encodeURIComponent(color)}`;
    const res = await apiFetch<any>(url, { method: 'PUT' });
    if (!isApiSuccess(res)) {
        throw new Error('Failed to update conversation color');
    }
    return res;
}

export const updateConversationFont = async (conversationId: number, font: string): Promise<any> => {
    const url = `${BASE_CHAT_SERVICE}/conversation/${conversationId}/font?font=${encodeURIComponent(font)}`;
    const res = await apiFetch<any>(url, { method: 'PUT' });
    if (!isApiSuccess(res)) {
        throw new Error('Failed to update conversation font');
    }
    return res;
}

export const forwardMessage = async (messageId: number, targetConversationId: number) => {
    let ws = WebSocketManager.getInstance();
    await ws.connect();
    ws.sendMessage(SOCKET_SEND_MESSAGE, {
        event: SocketEvent.FORWARD_MESSAGE,
        data: {
            sourceMessageId: messageId,
            targetConversationId: targetConversationId
        }
    });
};

export const loadGroupConversationPins = async (currentUserId: number, groupIds: number[]): Promise<any[]> => {
    const url = `${BASE_CHAT_SERVICE}/conversation/group/pins?currentUser=${currentUserId}&groupIds=${groupIds.join(',')}`;
    const res = await apiFetch<any>(url, { method: 'GET' });
    if (!isApiSuccess(res)) return [];
    return res.data || [];
};

export const setGroupConversationPinned = async (userId: number, groupId: number, pinned: boolean): Promise<any> => {
    const url = `${BASE_CHAT_SERVICE}/conversation/group/pin`;
    const res = await apiFetch<any>(url, {
        method: 'POST',
        body: JSON.stringify({ userId, groupId, pinned })
    });
    if (!isApiSuccess(res)) throw new Error('Cannot pin group conversation');
    return res;
};

export const setMessagePinned = async (conversationId: number, messageId: number, pinned: boolean): Promise<any> => {
    const url = `${BASE_CHAT_SERVICE}/messages/${messageId}/pin?conversationId=${conversationId}&pinned=${pinned}`;
    const res = await apiFetch<any>(url, { method: 'PATCH' });
    if (!isApiSuccess(res)) throw new Error('Cannot pin message');
    return res;
};

export const loadMediaAndFiles = async (conversationId: number, currentUserId: number): Promise<any> => {
    const url = `${BASE_CHAT_SERVICE}/conversation/${conversationId}/media-files?currentUser=${currentUserId}`;
    const res = await apiFetch<any>(url, { method: 'GET' });
    if (!isApiSuccess(res)) throw new Error('Cannot load media and files');
    return res.data || [];
};
