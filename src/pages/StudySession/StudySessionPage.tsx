import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { HeaderCard } from "./components/HeaderCard";
import { QuickStats } from "./components/QuickStats";
import { FilterTabs } from "./components/FilterTabs";
import { WeeklyCalendar } from "./components/WeeklyCalendar";
import { TodaySessionList } from "./components/TodaySessionList";
import { AllSessionList } from "./components/AllSessionList";
import { CreateSessionModal } from "./components/CreateSessionModal";
import { SessionDetailModal } from "./components/SessionDetailModal";
import { StudySessionRoom } from "./components/StudySessionRoom";
import FeedbackSubmitPanel from "./components/FeedbackModal";
import type { ScheduleFilter, StudySessionVm } from "./types";
import {
  getFeedbackEligibility,
  getStudySessionById,
  getUserStudySessions,
} from "../../services/StudySessionService";
import type {
  PageResponse,
  UserStudySessionParams,
} from "../../services/StudySessionService";
import {
  getFriendsListService,
  type FriendListItem,
} from "../../services/FriendService";
import type {
  FeedbackEligibilityResponse,
  JoinStudySessionResponse,
  StudySessionResponse,
} from "./types";
import {
  Clock,
  Award,
  TrendingUp,
  BookOpen,
  PieChart as PieIcon,
  Calendar,
  Loader2,
  AlertCircle
} from "lucide-react";

const DEFAULT_SESSION_PAGE_SIZE = 10;
const CALENDAR_SESSION_PAGE_SIZE = 200;
const SESSION_PAGE_SIZE_OPTIONS = [10, 20, 50];

function createEmptyPage<T>(
  size = DEFAULT_SESSION_PAGE_SIZE,
  page = 0,
): PageResponse<T> {
  return {
    content: [],
    empty: true,
    first: true,
    last: true,
    number: page,
    numberOfElements: 0,
    size,
    totalElements: 0,
    totalPages: 0,
  };
}

function toLocalDateTimeParam(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 19);
}

function getWeekRange(offset: number) {
  const startOfWeek = new Date();
  const day = startOfWeek.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  startOfWeek.setDate(startOfWeek.getDate() + diffToMonday + offset * 7);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  endOfWeek.setHours(0, 0, 0, 0);

  return {
    startOfWeek,
    endOfWeek,
    startFrom: toLocalDateTimeParam(startOfWeek),
    startTo: toLocalDateTimeParam(endOfWeek),
  };
}

function getTodayRange() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(startOfToday.getDate() + 1);
  endOfToday.setHours(0, 0, 0, 0);

  return {
    startFrom: toLocalDateTimeParam(startOfToday),
    startTo: toLocalDateTimeParam(endOfToday),
  };
}

function getSessionParamsByFilter(
  filter: ScheduleFilter,
): Pick<UserStudySessionParams, "sessionType" | "participantStatus"> {
  if (filter === "USER_PAIR" || filter === "GROUP") {
    return { sessionType: filter };
  }

  if (filter === "PENDING") {
    return { participantStatus: "PENDING" };
  }

  return {};
}

function matchesFilter(session: StudySessionVm, filter: ScheduleFilter) {
  if (filter === "ALL") return true;
  if (filter === "PENDING") return session.participantStatus === "PENDING";
  return session.sessionType === filter;
}

function isSessionInWeek(session: StudySessionVm, offset: number) {
  const { startFrom, startTo } = getWeekRange(offset);
  return session.startTime >= startFrom && session.startTime < startTo;
}

function isSessionToday(session: StudySessionVm) {
  const today = new Date().toDateString();
  return new Date(session.startTime).toDateString() === today;
}

function resolvePartnerName(
  session: StudySessionResponse | StudySessionVm,
  friendsById: Map<number, FriendListItem>,
) {
  const partnerUserName = "partnerUserName" in session ? session.partnerUserName : undefined;
  const partnerName = partnerUserName ?? session.partnerName;

  if (!partnerName) return undefined;

  if (partnerUserName) {
    return partnerUserName;
  }

  const match = partnerName.match(/^User\s*#(\d+)$/i);
  if (!match) return partnerName;

  const friendId = Number(match[1]);
  const friend = friendsById.get(friendId);

  return friend?.full_name || partnerName;
}

function mapSessionToVm(
  session: StudySessionResponse,
  friendsById: Map<number, FriendListItem>,
): StudySessionVm {
  return {
    id: session.id,
    sessionType: session.sessionType,
    groupId: session.groupId,
    title: session.title,
    description: session.description ?? undefined,
    startTime: session.startTime,
    endTime: session.endTime,
    studyMode: session.studyMode,
    location: session.location ?? undefined,
    meetingUrl: session.meetingUrl ?? undefined,
    createdByUserId: session.createdByUserId,
    status: session.status,
    participantStatus: session.participantStatus,
    partnerName: resolvePartnerName(session, friendsById),
    groupName: session.groupName ?? undefined,
    membersCount: session.membersCount ?? undefined,
    subjectName: session.subjectName ?? undefined,
    recurrenceId: session.recurrenceId ?? undefined,
    recurrenceType: session.recurrenceType ?? undefined,
  };
}

function applySessionUpdate(
  sessions: StudySessionVm[],
  updatedSession: StudySessionVm,
  filter: ScheduleFilter,
) {
  if (!matchesFilter(updatedSession, filter)) {
    return sessions.filter((session) => session.id !== updatedSession.id);
  }

  return sessions.map((session) =>
    session.id === updatedSession.id ? updatedSession : session,
  );
}

export default function StudySessionPage() {
  const [sessions, setSessions] = useState<StudySessionVm[]>([]);
  const [calendarSessions, setCalendarSessions] = useState<StudySessionVm[]>(
    [],
  );
  const [sessionPage, setSessionPage] = useState<
    PageResponse<StudySessionResponse>
  >(createEmptyPage());
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_SESSION_PAGE_SIZE);
  const [filter, setFilter] = useState<ScheduleFilter>("ALL");
  const [bottomFilter, setBottomFilter] = useState<ScheduleFilter>("ALL");
  const [bottomSearchTerm, setBottomSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(bottomSearchTerm);
      setPage(0);
    }, 400);
    return () => clearTimeout(handler);
  }, [bottomSearchTerm]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<StudySessionVm | null>(
    null,
  );
  const [joinedRoom, setJoinedRoom] = useState<JoinStudySessionResponse | null>(
    null,
  );
  const [joinedSession, setJoinedSession] = useState<StudySessionVm | null>(
    null,
  );
  const [feedbackEligibility, setFeedbackEligibility] =
    useState<FeedbackEligibilityResponse | null>(null);
  const [loadingAll, setLoadingAll] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [loadingToday, setLoadingToday] = useState(true);
  const [friendsById, setFriendsById] = useState<Map<number, FriendListItem>>(new Map());
  const [sessionError, setSessionError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [todaySessions, setTodaySessions] = useState<StudySessionVm[]>([]);
  const [currentWeekSessions, setCurrentWeekSessions] = useState<StudySessionVm[]>([]);
  const [loadingCurrentWeek, setLoadingCurrentWeek] = useState(true);

  const currentUserId = Number(localStorage.getItem("userId"));

  const querySessionId = searchParams.get("sessionId");

  const currentUserName =
    localStorage.getItem("fullName") ||
    localStorage.getItem("userName") ||
    localStorage.getItem("username") ||
    "";

  const handleFilterChange = (nextFilter: ScheduleFilter) => {
    setFilter(nextFilter);
    setPage(0);
  };

  const handleBottomFilterChange = (nextFilter: ScheduleFilter) => {
    setBottomFilter(nextFilter);
    setPage(0);
  };

  useEffect(() => {
    const handleUpdate = () => {
      setReloadTrigger((prev) => prev + 1);
    };
    window.addEventListener("study_session_updated", handleUpdate);
    return () => {
      window.removeEventListener("study_session_updated", handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (querySessionId && Number.isFinite(currentUserId) && currentUserId > 0) {
      const sessionIdNum = Number(querySessionId);
      if (sessionIdNum > 0) {
        getStudySessionById(sessionIdNum, currentUserId)
          .then((res) => {
            if (res.data) {
              const mapped = mapSessionToVm(res.data, new Map());
              setSelectedSession(mapped);
              searchParams.delete("sessionId");
              setSearchParams(searchParams, { replace: true });
            }
          })
          .catch((err) => {
            console.error("Lỗi khi tải chi tiết lịch học từ URL:", err);
          });
      }
    }
  }, [querySessionId, currentUserId]);

  useEffect(() => {
    if (!Number.isFinite(currentUserId) || currentUserId <= 0) return;
    getFriendsListService(currentUserId)
      .then((res) => {
        const friends = res.data ?? [];
        setFriendsById(new Map<number, FriendListItem>(
          friends.map((friend: any) => [friend.user_id, friend]),
        ));
      })
      .catch((err) => {
        console.error("Lỗi khi tải danh sách bạn bè:", err);
      });
  }, [currentUserId]);

  useEffect(() => {
    if (friendsById.size === 0) return;

    setSessions((prev) =>
      prev.map((session) => ({
        ...session,
        partnerName: resolvePartnerName(session, friendsById) || session.partnerName,
      }))
    );
    setCalendarSessions((prev) =>
      prev.map((session) => ({
        ...session,
        partnerName: resolvePartnerName(session, friendsById) || session.partnerName,
      }))
    );
    setCurrentWeekSessions((prev) =>
      prev.map((session) => ({
        ...session,
        partnerName: resolvePartnerName(session, friendsById) || session.partnerName,
      }))
    );
    setTodaySessions((prev) =>
      prev.map((session) => ({
        ...session,
        partnerName: resolvePartnerName(session, friendsById) || session.partnerName,
      }))
    );
  }, [friendsById]);

  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      if (!Number.isFinite(currentUserId) || currentUserId <= 0) {
        if (mounted) {
          setSessions([]);
          setSessionPage(createEmptyPage(pageSize, page));
          setSessionError("Không tìm thấy userId. Vui lòng đăng nhập lại.");
          setLoadingAll(false);
        }
        return;
      }

      try {
        setLoadingAll(true);
        setSessionError("");

        const filterParams = getSessionParamsByFilter(bottomFilter);
        const response = await getUserStudySessions(currentUserId, {
          ...filterParams,
          search: debouncedSearchTerm,
          page,
          size: pageSize,
        });

        if (!mounted) return;

        const content = response.data?.content ?? [];
        setSessions(
          content.map((session: any) => mapSessionToVm(session, friendsById)),
        );
        setSessionPage(response.data ?? createEmptyPage(pageSize, page));
      } catch {
        if (!mounted) return;
        setSessions([]);
        setSessionPage(createEmptyPage(pageSize, page));
        setSessionError("Không thể tải danh sách lịch học");
      } finally {
        if (mounted) {
          setLoadingAll(false);
        }
      }
    }

    loadAll();

    return () => {
      mounted = false;
    };
  }, [currentUserId, bottomFilter, debouncedSearchTerm, page, pageSize, reloadTrigger]);

  useEffect(() => {
    let mounted = true;

    async function loadCalendar() {
      if (!Number.isFinite(currentUserId) || currentUserId <= 0) {
        if (mounted) {
          setCalendarSessions([]);
          setLoadingCalendar(false);
        }
        return;
      }

      try {
        setLoadingCalendar(true);

        const filterParams = getSessionParamsByFilter(filter);
        const weekRange = getWeekRange(weekOffset);
        const response = await getUserStudySessions(currentUserId, {
          ...filterParams,
          ...weekRange,
          page: 0,
          size: CALENDAR_SESSION_PAGE_SIZE,
        });

        if (!mounted) return;

        const content = response.data?.content ?? [];
        setCalendarSessions(
          content.map((session: any) => mapSessionToVm(session, friendsById)),
        );
      } catch {
        if (!mounted) return;
        setCalendarSessions([]);
      } finally {
        if (mounted) {
          setLoadingCalendar(false);
        }
      }
    }

    loadCalendar();

    return () => {
      mounted = false;
    };
  }, [currentUserId, filter, weekOffset, reloadTrigger]);

  useEffect(() => {
    let mounted = true;

    async function loadToday() {
      if (!Number.isFinite(currentUserId) || currentUserId <= 0) {
        if (mounted) {
          setTodaySessions([]);
          setLoadingToday(false);
        }
        return;
      }

      try {
        setLoadingToday(true);

        const filterParams = getSessionParamsByFilter(filter);
        const todayRange = getTodayRange();
        const response = await getUserStudySessions(currentUserId, {
          ...filterParams,
          ...todayRange,
          page: 0,
          size: CALENDAR_SESSION_PAGE_SIZE,
        });

        if (!mounted) return;

        const content = response.data?.content ?? [];
        setTodaySessions(
          content.map((session: any) => mapSessionToVm(session, friendsById)),
        );
      } catch {
        if (!mounted) return;
        setTodaySessions([]);
      } finally {
        if (mounted) {
          setLoadingToday(false);
        }
      }
    }

    loadToday();

    return () => {
      mounted = false;
    };
  }, [currentUserId, filter, reloadTrigger]);

  useEffect(() => {
    let mounted = true;

    async function loadCurrentWeek() {
      if (!Number.isFinite(currentUserId) || currentUserId <= 0) {
        if (mounted) {
          setCurrentWeekSessions([]);
          setLoadingCurrentWeek(false);
        }
        return;
      }

      try {
        setLoadingCurrentWeek(true);

        const currentWeekRange = getWeekRange(0);
        const response = await getUserStudySessions(currentUserId, {
          ...currentWeekRange,
          page: 0,
          size: CALENDAR_SESSION_PAGE_SIZE,
        });

        if (!mounted) return;

        const content = response.data?.content ?? [];
        setCurrentWeekSessions(
          content.map((session: any) => mapSessionToVm(session, friendsById)),
        );
      } catch {
        if (!mounted) return;
        setCurrentWeekSessions([]);
      } finally {
        if (mounted) {
          setLoadingCurrentWeek(false);
        }
      }
    }

    loadCurrentWeek();

    return () => {
      mounted = false;
    };
  }, [currentUserId, reloadTrigger]);

  const parsedCurrentWeekSessions = useMemo(() => {
    const { startOfWeek, endOfWeek } = getWeekRange(0);

    return currentWeekSessions
      .filter((session) => {
        const startTime = new Date(session.startTime).getTime();
        return (
          startTime >= startOfWeek.getTime() &&
          startTime < endOfWeek.getTime()
        );
      })
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
  }, [currentWeekSessions]);

  const weekSessions = useMemo(() => {
    const { startOfWeek, endOfWeek } = getWeekRange(weekOffset);

    return calendarSessions
      .filter((session) => {
        const startTime = new Date(session.startTime).getTime();
        return (
          startTime >= startOfWeek.getTime() &&
          startTime < endOfWeek.getTime()
        );
      })
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
  }, [calendarSessions, weekOffset]);

  const handleCreateSession = (newSession: StudySessionVm) => {
    if (matchesFilter(newSession, filter)) {
      setPage(0);
      setSessions((prev) => [newSession, ...prev].slice(0, pageSize));
      setSessionPage((prev) => ({
        ...prev,
        empty: false,
        first: true,
        number: 0,
        numberOfElements: Math.min(prev.numberOfElements + 1, pageSize),
        totalElements: prev.totalElements + 1,
        totalPages: Math.max(1, Math.ceil((prev.totalElements + 1) / pageSize)),
      }));
    }

    if (matchesFilter(newSession, filter) && isSessionInWeek(newSession, weekOffset)) {
      setCalendarSessions((prev) => [newSession, ...prev]);
    }

    if (matchesFilter(newSession, filter) && isSessionInWeek(newSession, 0)) {
      setCurrentWeekSessions((prev) => [newSession, ...prev]);
    }

    if (matchesFilter(newSession, filter) && isSessionToday(newSession)) {
      setTodaySessions((prev) => [newSession, ...prev]);
    }

    setIsCreateOpen(false);
  };

  const handleJoinSession = (joinData: JoinStudySessionResponse) => {
    setFeedbackEligibility(null);
    setJoinedSession(selectedSession);
    setJoinedRoom(joinData);
    setSelectedSession(null);
  };

  const handleLeaveRoom = useCallback(async (sessionId: number) => {
    setJoinedRoom(null);
    setFeedbackEligibility(null);
    const fallback =
      joinedSession ??
      sessions.find((session) => session.id === sessionId) ??
      null;

    if (fallback) {
      setSelectedSession(fallback);
    }

    if (!Number.isFinite(currentUserId) || currentUserId <= 0 || !fallback) {
      setJoinedSession(null);
      return;
    }

    try {
      const [sessionResponse, eligibilityResponse] = await Promise.all([
        getStudySessionById(sessionId, currentUserId).catch(() => null),
        getFeedbackEligibility(sessionId, currentUserId).catch(() => null),
      ]);

      const eligibility = eligibilityResponse?.data ?? null;
      setFeedbackEligibility(eligibility);

      if (sessionResponse?.data) {
        const updatedSession = mapSessionToVm(sessionResponse.data, new Map());
        setSessions((prev) => applySessionUpdate(prev, updatedSession, filter));
        setCalendarSessions((prev) =>
          applySessionUpdate(prev, updatedSession, filter),
        );
        setCurrentWeekSessions((prev) =>
          applySessionUpdate(prev, updatedSession, filter),
        );
        setTodaySessions((prev) =>
          applySessionUpdate(prev, updatedSession, filter),
        );

        const isEligibleForFullFeedback =
          eligibility?.sessionEnded &&
          eligibility?.feedbackType === "SESSION_FEEDBACK" &&
          eligibility?.canSubmitFeedback;

        if (isEligibleForFullFeedback) {
          setSelectedSession(null);
        } else {
          setSelectedSession(updatedSession);
        }
      } else if (
        eligibility?.sessionEnded &&
        eligibility?.feedbackType === "SESSION_FEEDBACK" &&
        eligibility?.canSubmitFeedback
      ) {
        setSelectedSession(null);
      }
    } catch {
    } finally {
      setJoinedSession(null);
    }
  }, [currentUserId, filter, joinedSession, sessions]);

  return (
    <div className="min-h-screen bg-blue-50/30 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <HeaderCard onCreateClick={() => setIsCreateOpen(true)} />

        {sessionError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {sessionError}
          </div>
        )}

        <QuickStats sessions={parsedCurrentWeekSessions} loading={loadingCurrentWeek} />

        <FilterTabs activeFilter={filter} onChange={handleFilterChange} />

        <WeeklyCalendar
          sessions={weekSessions}
          onSelectSession={setSelectedSession}
          weekOffset={weekOffset}
          onWeekOffsetChange={setWeekOffset}
          loading={loadingCalendar}
        />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[7fr_3fr]">
          <AllSessionList
            sessions={sessions}
            page={sessionPage.number}
            pageSize={pageSize}
            pageSizeOptions={SESSION_PAGE_SIZE_OPTIONS}
            totalElements={sessionPage.totalElements}
            totalPages={sessionPage.totalPages}
            onPageChange={setPage}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(0);
            }}
            onSelectSession={setSelectedSession}
            loading={loadingAll}
            filter={bottomFilter}
            onFilterChange={handleBottomFilterChange}
            searchTerm={bottomSearchTerm}
            onSearchChange={setBottomSearchTerm}
          />
          <TodaySessionList
            sessions={todaySessions}
            onSelectSession={setSelectedSession}
            loading={loadingToday}
          />
        </div>
      </div>

      <CreateSessionModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={handleCreateSession}
      />

      <SessionDetailModal
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        onSessionUpdated={(updatedSession) => {
          setSessions((prev) =>
            applySessionUpdate(prev, updatedSession, filter),
          );
          setCalendarSessions((prev) =>
            applySessionUpdate(prev, updatedSession, filter),
          );
          setCurrentWeekSessions((prev) =>
            applySessionUpdate(prev, updatedSession, filter),
          );
          setTodaySessions((prev) =>
            applySessionUpdate(prev, updatedSession, filter),
          );
          setSelectedSession(updatedSession);
        }}
        onJoinSession={handleJoinSession}
      />

      {feedbackEligibility?.sessionEnded &&
        feedbackEligibility?.feedbackType === "SESSION_FEEDBACK" &&
        feedbackEligibility?.canSubmitFeedback && (
          <FeedbackSubmitPanel
            eligibility={feedbackEligibility}
            onClose={() => setFeedbackEligibility(null)}
          />
        )}

      {joinedRoom && (
        <StudySessionRoom
          joinData={joinedRoom}
          userName={currentUserName}
          userId={currentUserId}
          onLeave={handleLeaveRoom}
        />
      )}
    </div>
  );
}
