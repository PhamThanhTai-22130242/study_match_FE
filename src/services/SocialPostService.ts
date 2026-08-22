import { BASE_SOCIAL_SERVICE } from "../config/BaseConfig";
import { apiFetch, isApiSuccess } from "../config/apiClient";

const unwrap = (payload: any) => payload?.data ?? payload?.result ?? payload;

const requireSocialOk = (res: any, label: string) => {
  if (!isApiSuccess(res)) {
    throw new Error(res?.message || label);
  }
  if (res && typeof res === "object" && "data" in res) {
    return unwrap(res.data);
  }
  return unwrap(res);
};

export type PostMedia = {
  id?: number;
  mediaUrl: string;
  mediaType: string;
};

export type SocialPost = {
  id: number;
  authorId: number;
  authorName: string;
  authorAvatarUrl?: string | null;
  content?: string | null;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  media: PostMedia[];
  likeCount: number;
  commentCount: number;
  likedByViewer: boolean;
  reactionType?: string | null;
  topReactions?: string[] | null;
  sharedPost?: SocialPost | null;
};

export type PostComment = {
  id: number;
  authorId: number;
  authorName: string;
  authorAvatarUrl?: string | null;
  content: string;
  createdAt: string;
  moderationStatus?: string | null;
};

export type ProfileSocialStats = {
  postCount: number;
  likeCount: number;
  commentCount: number;
  friendCount: number;
};

export type Achievement = {
  code: string;
  title: string;
  description: string;
  achieved: boolean;
  progress: number;
  target: number;
};

export async function loadProfilePosts(
  userId: number,
  page: number,
  size: number,
  viewerId?: number
): Promise<SocialFeedPageResponse<SocialPost>> {
  const viewerQuery = viewerId ? `&viewerId=${viewerId}` : "";
  const res = await apiFetch<any>(
    `${BASE_SOCIAL_SERVICE}/social/posts/user/${userId}?page=${page}&size=${size}${viewerQuery}`
  );
  return requireSocialOk(res, "Cannot load posts");
}


export async function createPost(payload: {
  authorId: number;
  content: string;
  visibility?: string;
  media?: { mediaUrl: string; mediaType: string }[];
}): Promise<SocialPost> {
  const res = await apiFetch<any>(`${BASE_SOCIAL_SERVICE}/social/posts?viewerId=${payload.authorId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return requireSocialOk(res, "Cannot create post");
}

export async function uploadPostMedia(file: File): Promise<{ mediaUrl: string; mediaType: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch<any>(`${BASE_SOCIAL_SERVICE}/social/posts/media`, {
    method: "POST",
    body: formData as any,
  });
  return requireSocialOk(res, "Cannot upload post media");
}

export async function updatePost(postId: number, payload: {
  actorId: number;
  content: string;
  visibility?: string;
  media?: { mediaUrl: string; mediaType: string }[];
}): Promise<SocialPost> {
  const res = await apiFetch<any>(`${BASE_SOCIAL_SERVICE}/social/posts/${postId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return requireSocialOk(res, "Cannot update post");
}

export async function getPostById(postId: number): Promise<SocialPost | null> {
  try {
    const res = await apiFetch<any>(`${BASE_SOCIAL_SERVICE}/social/posts/${postId}`);
    if (res && isApiSuccess(res)) {
      return unwrap(res.data ?? res);
    }
    if (res?.data) return res.data;
    return null;
  } catch (error) {
    console.error("Failed to fetch post by id", error);
    return null;
  }
}

export async function deletePost(postId: number, actorId: number): Promise<void> {
  const res = await apiFetch<any>(`${BASE_SOCIAL_SERVICE}/social/posts/${postId}?actorId=${actorId}`, {
    method: "DELETE",
  });
  requireSocialOk(res, "Cannot delete post");
}

export async function togglePostLike(postId: number, userId: number, reactionType?: string): Promise<SocialPost> {
  const url = reactionType 
    ? `${BASE_SOCIAL_SERVICE}/social/posts/${postId}/like?userId=${userId}&reactionType=${encodeURIComponent(reactionType)}`
    : `${BASE_SOCIAL_SERVICE}/social/posts/${postId}/like?userId=${userId}`;
  const res = await apiFetch<any>(url, {
    method: "POST",
  });
  return requireSocialOk(res, "Cannot toggle like");
}

export async function loadPostComments(postId: number): Promise<PostComment[]> {
  const res = await apiFetch<any>(`${BASE_SOCIAL_SERVICE}/social/posts/${postId}/comments`);
  return requireSocialOk(res, "Cannot load comments") || [];
}

export async function addPostComment(postId: number, authorId: number, content: string): Promise<PostComment> {
  const res = await apiFetch<any>(`${BASE_SOCIAL_SERVICE}/social/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ authorId, content }),
  });
  return requireSocialOk(res, "Cannot add comment");
}

export async function loadProfileSocialStats(userId: number): Promise<ProfileSocialStats> {
  const res = await apiFetch<any>(`${BASE_SOCIAL_SERVICE}/social/users/${userId}/stats`);
  return requireSocialOk(res, "Cannot load stats");
}

export async function loadAchievements(userId: number): Promise<Achievement[]> {
  const res = await apiFetch<any>(`${BASE_SOCIAL_SERVICE}/social/users/${userId}/achievements`);
  return requireSocialOk(res, "Cannot load achievements") || [];
}

export interface PageResponse<T> {
  content: T[];
  empty: boolean;
  first: boolean;
  last: boolean;
  number: number;
  numberOfElements: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface SocialFeedPageResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
}

export async function loadFeedPosts(
  page: number,
  size: number,
  viewerId: number,
): Promise<SocialFeedPageResponse<SocialPost>> {
  const res = await apiFetch<any>(
    `${BASE_SOCIAL_SERVICE}/social/posts/feed?page=${page}&size=${size}&viewerId=${viewerId}`,
  );
  return requireSocialOk(res, "Cannot load feed posts");
}

export type PostReactionUser = {
  userId: number;
  fullName: string;
  avatarUrl?: string | null;
  reactionType: string;
  isFriend: boolean;
  mutualFriends: number;
};

export async function loadPostReactions(postId: number, viewerId?: number): Promise<PostReactionUser[]> {
  const url = viewerId 
    ? `${BASE_SOCIAL_SERVICE}/social/posts/${postId}/reactions?viewerId=${viewerId}`
    : `${BASE_SOCIAL_SERVICE}/social/posts/${postId}/reactions`;
  const res = await apiFetch<any>(url);
  return requireSocialOk(res, "Cannot load reactions") || [];
}

export async function sharePost(
  postId: number,
  payload: {
    authorId: number;
    content?: string;
    visibility?: string;
  },
  viewerId?: number,
): Promise<SocialPost> {
  const query = viewerId ? `?viewerId=${viewerId}` : "";
  const res = await apiFetch<any>(`${BASE_SOCIAL_SERVICE}/social/posts/${postId}/share${query}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return requireSocialOk(res, "Cannot share post");
}
