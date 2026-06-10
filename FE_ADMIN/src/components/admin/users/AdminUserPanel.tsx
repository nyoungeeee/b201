import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import {
  AdminArrowLeftIcon,
  AdminChevronDownIcon,
  AdminChevronRightIcon,
  AdminPersonIcon,
  AdminPlusIcon,
  AdminTeamIcon,
  AdminUserIcon,
  AdminWarningIcon,
} from "../icons";
import AdminSelect from "../common/AdminSelect";
import * as adminApi from "../../../apis/adminApi";
import type {
  AdminManagedTeam,
  AdminManagedUser,
  AdminTeamColor,
  AdminTeamMemberEditUser,
  AdminTeamLeaderFilterOption,
} from "./types";

export type AdminUserView =
  | { name: "list" }
  | { name: "user-detail"; userId: number }
  | { name: "block-user"; userId: number }
  | { name: "team-detail"; teamId: number }
  | { name: "team-settings"; teamId: number }
  | { name: "add-members"; teamId: number }
  | { name: "change-leader"; teamId: number }
  | { name: "create-team" }
  | { name: "delete-team"; teamId: number };

type AdminUserPanelProps = {
  initialView?: AdminUserView | null;
  onInitialBack?: () => void;
  onToast?: (message: string) => void;
};

const USER_PANEL_PAGE_SIZE = 10;
const USER_SEARCH_DEBOUNCE_MS = 400;

const getInitial = (name: string) => name.slice(0, 1);

const statusLabel = (status: AdminManagedUser["status"]) => (status === "blocked" ? "블락됨" : "일반");

const OWNER_LEADER_ID = 0;
const OWNER_LEADER = {
  id: OWNER_LEADER_ID,
  nickname: "사장님",
  email: "사장님 계정",
};

const getLeaderName = (leaderId: number, users: AdminManagedUser[], fallbackName?: string) => {
  if (leaderId === OWNER_LEADER_ID) {
    return OWNER_LEADER.nickname;
  }

  return users.find((user) => user.id === leaderId)?.nickname ?? fallbackName ?? "-";
};

const getLeaderEmail = (leaderId: number, users: AdminManagedUser[]) => {
  if (leaderId === OWNER_LEADER_ID) {
    return OWNER_LEADER.email;
  }

  return users.find((user) => user.id === leaderId)?.email ?? "";
};

const getCurrentUserId = () => undefined;

const UserAvatar = ({
  user,
  size = "md",
}: {
  user: AdminManagedUser;
  size?: "sm" | "md" | "lg";
}) => (
  <span className={`admin-user-avatar admin-user-avatar--${size}`}>{getInitial(user.nickname)}</span>
);

const TeamAvatar = ({
  team,
  color,
  size = "md",
}: {
  team: AdminManagedTeam;
  color?: AdminTeamColor;
  size?: "sm" | "md" | "lg";
}) => (
  <span
    className={`admin-team-avatar admin-team-avatar--${size}`}
    style={{ background: color?.value ?? "#3B82F6" }}
  >
    {team.name.replace("팀", "")}
  </span>
);

const AdminUserPanel = ({ initialView, onInitialBack, onToast }: AdminUserPanelProps) => {
  const [users, setUsers] = useState<AdminManagedUser[]>([]);
  const [teams, setTeams] = useState<AdminManagedTeam[]>([]);
  const [colors, setColors] = useState<AdminTeamColor[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "teams">("users");
  const [viewStack, setViewStack] = useState<AdminUserView[]>([initialView ?? { name: "list" }]);
  const [teamLeaderOptions, setTeamLeaderOptions] = useState<AdminTeamLeaderFilterOption[]>([]);
  const [userSearchInput, setUserSearchInput] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [userTeamFilter, setUserTeamFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | AdminManagedUser["status"]>("all");
  const [teamQuery, setTeamQuery] = useState("");
  const [teamLeaderFilter, setTeamLeaderFilter] = useState("all");
  const [userPage, setUserPage] = useState(1);
  const [teamPage, setTeamPage] = useState(1);
  const [normalUserTotalCount, setNormalUserTotalCount] = useState(0);
  const [teamTotalCount, setTeamTotalCount] = useState(0);
  const [hasNextUsers, setHasNextUsers] = useState(false);
  const [hasNextTeams, setHasNextTeams] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [isLoadingColors, setIsLoadingColors] = useState(true);
  const [isLoadingMoreUsers, setIsLoadingMoreUsers] = useState(false);
  const [isLoadingMoreTeams, setIsLoadingMoreTeams] = useState(false);
  const [teamMemberCache, setTeamMemberCache] = useState<Record<number, AdminTeamMemberEditUser[]>>({});
  const [loadingTeamMemberIds, setLoadingTeamMemberIds] = useState<number[]>([]);
  const loadingTeamMemberIdSetRef = useRef<Set<number>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isActive = true;

    adminApi.getTeamColors()
      .then((nextColors) => {
        if (isActive) setColors(nextColors);
      })
      .catch(console.error)
      .finally(() => {
        if (isActive) setIsLoadingColors(false);
      })

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setUserQuery(userSearchInput);
    }, USER_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timerId);
  }, [userSearchInput]);

  useEffect(() => {
    let isActive = true;

    adminApi.getUsersPage({
      page: 1,
      pageSize: 1,
      status: "normal",
    })
      .then((result) => {
        if (isActive) setNormalUserTotalCount(result.totalCount);
      })
      .catch(console.error);

    return () => {
      isActive = false;
    };
  }, []);

  const refreshUsers = useCallback(async () => {
    setIsLoadingUsers(true);

    try {
      const result = await adminApi.getUsersPage({
        page: 1,
        pageSize: USER_PANEL_PAGE_SIZE,
        query: userQuery,
        teamId: userTeamFilter,
        status: userStatusFilter,
      });

      setUsers(result.users);
      setUserPage(1);
      setHasNextUsers(result.hasNext);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [userQuery, userStatusFilter, userTeamFilter]);

  const refreshTeams = useCallback(async () => {
    setIsLoadingTeams(true);

    try {
      const result = await adminApi.getTeamsPage({
        page: 1,
        pageSize: USER_PANEL_PAGE_SIZE,
        query: teamQuery,
        leaderId: teamLeaderFilter,
      });

      setTeams(result.teams);
      setTeamPage(1);
      setTeamTotalCount(result.totalCount);
      setHasNextTeams(result.hasNext);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingTeams(false);
    }
  }, [teamLeaderFilter, teamQuery]);

  useEffect(() => {
    void refreshUsers();
  }, [refreshUsers]);

  useEffect(() => {
    void refreshTeams();
  }, [refreshTeams]);

  useEffect(() => {
    adminApi.getTeamLeaderOptions(teams, users).then(setTeamLeaderOptions).catch(console.error);
  }, [teams, users]);

  const view = useMemo(() => viewStack[viewStack.length - 1] ?? { name: "list" }, [viewStack]);
  const navigate = (nextView: AdminUserView) => setViewStack((currentStack) => [...currentStack, nextView]);
  const replaceView = (nextView: AdminUserView) => setViewStack([nextView]);
  const goBack = () => {
    if (viewStack.length > 1) {
      setViewStack((currentStack) => currentStack.slice(0, -1));
      return;
    }

    if (onInitialBack) {
      onInitialBack();
      return;
    }

    replaceView({ name: "list" });
  };

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const colorById = useMemo(() => new Map(colors.map((color) => [color.id, color])), [colors]);
  const selectedTeamLeaderFilter =
    teamLeaderFilter === "all" || teamLeaderOptions.some((leader) => leader.id === Number(teamLeaderFilter))
      ? teamLeaderFilter
      : "all";

  useEffect(() => {
    if ((view.name !== "user-detail" && view.name !== "block-user") || userById.has(view.userId)) {
      return;
    }

    let isActive = true;

    adminApi.getUser(view.userId)
      .then((user) => {
        if (!isActive) return;

        setUsers((currentUsers) => (
          currentUsers.some((currentUser) => currentUser.id === user.id)
            ? currentUsers
            : [...currentUsers, user]
        ));
      })
      .catch(console.error);

    return () => {
      isActive = false;
    };
  }, [userById, view]);

  useEffect(() => {
    const currentTeam =
      "teamId" in view ? teamById.get(view.teamId) : undefined;

    if (
      (view.name !== "team-detail" &&
        view.name !== "team-settings" &&
        view.name !== "add-members" &&
        view.name !== "change-leader" &&
        view.name !== "delete-team") ||
      currentTeam
    ) {
      return;
    }

    let isActive = true;

    adminApi.getTeam(view.teamId)
      .then((team) => {
        if (!isActive) return;

        setTeams((currentTeams) => {
          const hasTeam = currentTeams.some((currentTeam) => currentTeam.id === team.id);

          return hasTeam
            ? currentTeams.map((currentTeam) => (
              currentTeam.id === team.id ? { ...currentTeam, ...team } : currentTeam
            ))
            : [...currentTeams, team];
        });
      })
      .catch(console.error);

    return () => {
      isActive = false;
    };
  }, [teamById, view]);

  useEffect(() => {
    if (
      view.name !== "team-detail" &&
      view.name !== "change-leader" &&
      view.name !== "delete-team"
    ) {
      return;
    }

    const teamId = view.teamId;

    if (
      Object.prototype.hasOwnProperty.call(teamMemberCache, teamId) ||
      loadingTeamMemberIdSetRef.current.has(teamId)
    ) {
      return;
    }

    let isActive = true;

    loadingTeamMemberIdSetRef.current.add(teamId);
    setLoadingTeamMemberIds((currentIds) => [...currentIds, teamId]);
    adminApi.getTeamMemberEditList(teamId)
      .then((data) => {
        if (!isActive) return;

        setTeamMemberCache((currentCache) => ({
          ...currentCache,
          [teamId]: data.members,
        }));
      })
      .catch(console.error)
      .finally(() => {
        loadingTeamMemberIdSetRef.current.delete(teamId);
        if (isActive) {
          setLoadingTeamMemberIds((currentIds) => currentIds.filter((id) => id !== teamId));
        }
      });

    return () => {
      isActive = false;
    };
  }, [teamMemberCache, view]);

  const loadMoreUsers = useCallback(async () => {
    if (isLoadingUsers || isLoadingMoreUsers || !hasNextUsers) {
      return;
    }

    const nextPage = userPage + 1;
    setIsLoadingMoreUsers(true);

    try {
      const result = await adminApi.getUsersPage({
        page: nextPage,
        pageSize: USER_PANEL_PAGE_SIZE,
        query: userQuery,
        teamId: userTeamFilter,
        status: userStatusFilter,
      });

      setUsers((currentUsers) => {
        const userMap = new Map(currentUsers.map((user) => [user.id, user]));

        result.users.forEach((user) => userMap.set(user.id, user));

        return Array.from(userMap.values());
      });
      setUserPage(nextPage);
      setHasNextUsers(result.hasNext);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingMoreUsers(false);
    }
  }, [
    hasNextUsers,
    isLoadingMoreUsers,
    isLoadingUsers,
    userPage,
    userQuery,
    userStatusFilter,
    userTeamFilter,
  ]);

  const loadMoreTeams = useCallback(async () => {
    if (isLoadingTeams || isLoadingMoreTeams || !hasNextTeams) {
      return;
    }

    const nextPage = teamPage + 1;
    setIsLoadingMoreTeams(true);

    try {
      const result = await adminApi.getTeamsPage({
        page: nextPage,
        pageSize: USER_PANEL_PAGE_SIZE,
        query: teamQuery,
        leaderId: selectedTeamLeaderFilter,
      });

      setTeams((currentTeams) => {
        const teamMap = new Map(currentTeams.map((team) => [team.id, team]));

        result.teams.forEach((team) => teamMap.set(team.id, team));

        return Array.from(teamMap.values());
      });
      setTeamPage(nextPage);
      setTeamTotalCount(result.totalCount);
      setHasNextTeams(result.hasNext);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingMoreTeams(false);
    }
  }, [
    hasNextTeams,
    isLoadingMoreTeams,
    isLoadingTeams,
    selectedTeamLeaderFilter,
    teamPage,
    teamQuery,
  ]);

  const handlePanelScroll = () => {
    const scrollContainer = scrollContainerRef.current;

    if (!scrollContainer) return;

    const distanceToBottom =
      scrollContainer.scrollHeight -
      scrollContainer.scrollTop -
      scrollContainer.clientHeight;

    if (distanceToBottom >= 120) {
      return;
    }

    if (activeTab === "users") {
      void loadMoreUsers();
      return;
    }

    void loadMoreTeams();
  };

  const isCurrentTabLoading =
    isLoadingColors || (activeTab === "users" ? isLoadingUsers : isLoadingTeams);
  const isCurrentTabLoadingMore =
    activeTab === "users" ? isLoadingMoreUsers : isLoadingMoreTeams;
  const shouldShowListEnd =
    activeTab === "users"
      ? users.length > 0 && !hasNextUsers && !isLoadingUsers && !isLoadingMoreUsers
      : teams.length > 0 && !hasNextTeams && !isLoadingTeams && !isLoadingMoreTeams;

  const handleBlockUser = (userId: number) => {
    adminApi.blockUser(userId).catch(console.error);
    setUsers((currentUsers) =>
      currentUsers.map((user) => (user.id === userId ? { ...user, status: "blocked" } : user)),
    );
    setNormalUserTotalCount((currentCount) => Math.max(currentCount - 1, 0));
    replaceView({ name: "user-detail", userId });
    onToast?.("사용자를 블락했습니다.");
  };

  const handleUnblockUser = (userId: number) => {
    adminApi.unblockUser(userId).catch(console.error);
    setUsers((currentUsers) =>
      currentUsers.map((user) => (user.id === userId ? { ...user, status: "normal" } : user)),
    );
    setNormalUserTotalCount((currentCount) => currentCount + 1);
    onToast?.("사용자 블락을 해제했습니다.");
  };

  const handleCreateTeam = async (teamName: string, colorId: string, leaderId: number) => {
    const isOwnerLeader = leaderId === OWNER_LEADER_ID;
    const memberIds = isOwnerLeader ? [] : [leaderId];
    const created = await adminApi.createTeam({ name: teamName, colorId, leaderId, memberIds });

    setTeams((currentTeams) => [created, ...currentTeams]);
    if (!isOwnerLeader) {
      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === leaderId ? { ...user, teams: [...user.teams, created.id] } : user,
        ),
      );
    }
    setActiveTab("teams");
    replaceView({ name: "team-detail", teamId: created.id });
    onToast?.("팀을 생성했습니다.");
  };

  const handleSaveTeamSettings = (teamId: number, teamName: string, colorId: string) => {
    adminApi.updateTeam(teamId, { name: teamName, colorId }).catch(console.error);
    setTeams((currentTeams) =>
      currentTeams.map((team) =>
        team.id === teamId ? { ...team, name: teamName, colorId, updatedAt: "2026.05.14" } : team,
      ),
    );
    goBack();
    onToast?.("팀 설정을 저장했습니다.");
  };

  const handleUpdateMembers = async (teamId: number, memberIds: number[]) => {
    const updatedMembers = await adminApi.updateTeamMembers(teamId, memberIds);
    const updatedMemberIds = updatedMembers.members.map((member) => member.id);

    setTeams((currentTeams) =>
      currentTeams.map((team) =>
        team.id === teamId
          ? { ...team, memberIds: updatedMemberIds, memberCount: updatedMemberIds.length, updatedAt: "2026.05.14" }
          : team,
      ),
    );
    setUsers((currentUsers) =>
      currentUsers.map((user) => ({
        ...user,
        teams: updatedMemberIds.includes(user.id)
          ? Array.from(new Set([...user.teams, teamId]))
          : user.teams.filter((id) => id !== teamId),
      })),
    );
    setTeamMemberCache((currentCache) => ({
      ...currentCache,
      [teamId]: updatedMembers.members,
    }));
    goBack();
    onToast?.("팀 멤버를 수정했습니다.");
  };

  const handleChangeLeader = (teamId: number, leaderId: number) => {
    adminApi.changeTeamLeader(teamId, leaderId).catch(console.error);
    setTeams((currentTeams) =>
      currentTeams.map((team) => {
        if (team.id !== teamId) {
          return team;
        }

        return {
          ...team,
          leaderId,
          memberIds:
            leaderId === OWNER_LEADER_ID
              ? team.memberIds
              : Array.from(new Set([...team.memberIds, leaderId])),
          updatedAt: "2026.05.14",
        };
      }),
    );
    if (leaderId !== OWNER_LEADER_ID) {
      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === leaderId && !user.teams.includes(teamId)
            ? { ...user, teams: [...user.teams, teamId] }
            : user,
        ),
      );
    }
    setTeamMemberCache((currentCache) => (
      currentCache[teamId]
        ? {
            ...currentCache,
            [teamId]: currentCache[teamId].map((member) => ({
              ...member,
              isLeader: member.id === leaderId,
            })),
          }
        : currentCache
    ));
    goBack();
    onToast?.("리더를 변경했습니다.");
  };

  const handleDeleteTeam = (teamId: number) => {
    adminApi.deleteTeam(teamId).catch(console.error);
    setTeams((currentTeams) =>currentTeams.filter((team) => team.id !== teamId));
    setUsers((currentUsers) =>
      currentUsers.map((user) => ({ ...user, teams: user.teams.filter((id) => id !== teamId) })),
    );
    setTeamMemberCache((currentCache) => {
      const nextCache = { ...currentCache };

      delete nextCache[teamId];
      return nextCache;
    });
    setActiveTab("teams");
    replaceView({ name: "list" });
    onToast?.("팀을 삭제했습니다.");
  };

  if (view.name === "user-detail") {
    const user = userById.get(view.userId);

    if (!user) {
      return null;
    }

    return (
      <UserDetailScreen
        user={user}
        teams={teams}
        colors={colors}
        onBack={goBack}
        onBlock={() => navigate({ name: "block-user", userId: user.id })}
        onUnblock={() => handleUnblockUser(user.id)}
        onTeamSelect={(teamId) => navigate({ name: "team-detail", teamId })}
      />
    );
  }

  if (view.name === "block-user") {
    const user = userById.get(view.userId);

    if (!user) {
      return null;
    }

    return (
      <BlockUserScreen
        user={user}
        teams={teams}
        onBack={goBack}
        onConfirm={() => handleBlockUser(user.id)}
      />
    );
  }

  if (view.name === "team-detail") {
    const team = teamById.get(view.teamId);

    if (!team) {
      return null;
    }

    const teamMembers = teamMemberCache[team.id] ?? [];

    return (
      <TeamDetailScreen
        team={team}
        users={users}
        members={teamMembers}
        isLoadingMembers={loadingTeamMemberIds.includes(team.id)}
        color={colorById.get(team.colorId)}
        onBack={goBack}
        onSettings={() => navigate({ name: "team-settings", teamId: team.id })}
        onAddMembers={() => navigate({ name: "add-members", teamId: team.id })}
        onChangeLeader={() => navigate({ name: "change-leader", teamId: team.id })}
        onDelete={() => navigate({ name: "delete-team", teamId: team.id })}
        onUserSelect={(userId) => navigate({ name: "user-detail", userId })}
      />
    );
  }

  if (view.name === "team-settings") {
    const team = teamById.get(view.teamId);

    if (!team) {
      return null;
    }

    return (
      <TeamSettingsScreen
        team={team}
        users={users}
        colors={colors}
        onBack={goBack}
        onChangeLeader={() => navigate({ name: "change-leader", teamId: team.id })}
        onSave={handleSaveTeamSettings}
      />
    );
  }

  if (view.name === "add-members") {
    const team = teamById.get(view.teamId);

    if (!team) {
      return null;
    }

    return (
      <AddMembersScreen
        team={team}
        onBack={goBack}
        onSave={(memberIds) => handleUpdateMembers(team.id, memberIds)}
      />
    );
  }

  if (view.name === "change-leader") {
    const team = teamById.get(view.teamId);

    if (!team) {
      return null;
    }

    const teamMembers = teamMemberCache[team.id] ?? [];

    return (
      <ChangeLeaderScreen
        team={team}
        users={users}
        members={teamMembers}
        isLoadingMembers={loadingTeamMemberIds.includes(team.id)}
        color={colorById.get(team.colorId)}
        onBack={goBack}
        onChange={(leaderId) => handleChangeLeader(team.id, leaderId)}
      />
    );
  }

  if (view.name === "create-team") {
    return (
      <CreateTeamScreen
        users={users}
        colors={colors}
        onBack={goBack}
        onCreate={handleCreateTeam}
      />
    );
  }

  if (view.name === "delete-team") {
    const team = teamById.get(view.teamId);

    if (!team) {
      return null;
    }

    const teamMembers = teamMemberCache[team.id] ?? [];

    return (
      <DeleteTeamScreen
        team={team}
        users={users}
        members={teamMembers}
        isLoadingMembers={loadingTeamMemberIds.includes(team.id)}
        color={colorById.get(team.colorId)}
        onBack={goBack}
        onDelete={() => handleDeleteTeam(team.id)}
      />
    );
  }

  return (
    <section className="admin-users" aria-label="사용자 관리">
      <div className="admin-user-tabs">
        <button
          className={activeTab === "users" ? "is-active" : ""}
          type="button"
          onClick={() => setActiveTab("users")}
        >
          사용자
        </button>
        <button
          className={activeTab === "teams" ? "is-active" : ""}
          type="button"
          onClick={() => setActiveTab("teams")}
        >
          팀 관리
        </button>
      </div>

      <div className="admin-panel-scroll" ref={scrollContainerRef} onScroll={handlePanelScroll}>
        {activeTab === "users" ? (
          <>
            <UserList
              users={users}
              teams={teams}
              colors={colors}
              query={userSearchInput}
              selectedTeamId={userTeamFilter}
              selectedStatus={userStatusFilter}
              normalTotalCount={normalUserTotalCount}
              isLoading={isLoadingUsers || isLoadingColors}
              onQueryChange={setUserSearchInput}
              onTeamFilterChange={setUserTeamFilter}
              onStatusFilterChange={setUserStatusFilter}
              onSelect={(userId) => navigate({ name: "user-detail", userId })}
            />
            {isCurrentTabLoadingMore && (
              <div className="admin-reservation-list-loading admin-reservation-list-loading--compact" role="status" aria-live="polite">
                <div className="admin-reservation-list-loading__spinner" aria-hidden="true" />
                <p>다음 목록을 불러오고 있어요.</p>
              </div>
            )}
            {shouldShowListEnd && (
              <p className="admin-list-end">모든 목록을 조회했습니다.</p>
            )}
          </>
        ) : isCurrentTabLoading ? (
          <div className="admin-user-loading" role="status" aria-live="polite">
            <div className="admin-user-loading__spinner" aria-hidden="true" />
            <p>팀 데이터를 불러오고 있어요</p>
          </div>
        ) : (
          <>
            <TeamList
              teams={teams}
              users={users}
              colors={colors}
              leaderOptions={teamLeaderOptions}
              query={teamQuery}
              selectedLeaderId={selectedTeamLeaderFilter}
              totalCount={teamTotalCount}
              onQueryChange={setTeamQuery}
              onLeaderFilterChange={setTeamLeaderFilter}
              onCreate={() => navigate({ name: "create-team" })}
              onSelect={(teamId) => navigate({ name: "team-detail", teamId })}
            />
            {isCurrentTabLoadingMore && (
              <div className="admin-reservation-list-loading admin-reservation-list-loading--compact" role="status" aria-live="polite">
                <div className="admin-reservation-list-loading__spinner" aria-hidden="true" />
                <p>다음 목록을 불러오고 있어요.</p>
              </div>
            )}
            {shouldShowListEnd && (
              <p className="admin-list-end">모든 목록을 조회했습니다.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
};

const UserList = ({
  users,
  teams,
  colors,
  query,
  selectedTeamId,
  selectedStatus,
  normalTotalCount,
  isLoading,
  onQueryChange,
  onTeamFilterChange,
  onStatusFilterChange,
  onSelect,
}: {
  users: AdminManagedUser[];
  teams: AdminManagedTeam[];
  colors: AdminTeamColor[];
  query: string;
  selectedTeamId: string;
  selectedStatus: "all" | AdminManagedUser["status"];
  normalTotalCount: number;
  isLoading: boolean;
  onQueryChange: (value: string) => void;
  onTeamFilterChange: (value: string) => void;
  onStatusFilterChange: (value: "all" | AdminManagedUser["status"]) => void;
  onSelect: (userId: number) => void;
}) => {
  const blockedCount = users.filter((user) => user.status === "blocked").length;

  return (
    <>
      <div className="admin-user-stats">
        <div>
          <AdminUserIcon />
          <span>일반</span>
          <strong>{normalTotalCount}</strong>
        </div>
        <div>
          <AdminWarningIcon />
          <span>현재 블락</span>
          <strong className="is-danger">{blockedCount}</strong>
        </div>
      </div>

      <div className="admin-user-filter-row">
        <label className="admin-user-search">
          <AdminUserIcon />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="닉네임"
          />
          <AdminChevronDownIcon />
        </label>
        <AdminSelect
          className="admin-user-select-filter"
          value={selectedTeamId}
          icon={<AdminTeamIcon />}
          options={[
            { value: "all", label: "팀 전체" },
            ...teams.map((team) => ({ value: String(team.id), label: team.name })),
          ]}
          onChange={onTeamFilterChange}
        />
        <AdminSelect<"all" | AdminManagedUser["status"]>
          className="admin-user-select-filter"
          value={selectedStatus}
          icon={<AdminWarningIcon />}
          options={[
            { value: "all", label: "상태 전체" },
            { value: "normal", label: "일반" },
            { value: "blocked", label: "블락됨" },
          ]}
          onChange={onStatusFilterChange}
        />
      </div>

      <h2 className="admin-users__section-title">등록된 사용자</h2>
      <div className="admin-user-card-list">
        {isLoading ? (
          <div className="admin-user-loading" role="status" aria-live="polite">
            <div className="admin-user-loading__spinner" aria-hidden="true" />
            <p>사용자 데이터를 불러오고 있어요</p>
          </div>
        ) : users.length > 0 ? (
          users.map((user, index) => (
            <UserCard
              key={user.id}
              user={user}
              index={index}
              teams={teams}
              colors={colors}
              onClick={() => onSelect(user.id)}
            />
          ))
        ) : (
          <p className="admin-reservation__empty">조건에 맞는 사용자가 없습니다.</p>
        )}
      </div>
    </>
  );
};

const UserCard = ({
  user,
  index = 0,
  teams,
  colors,
  onClick,
}: {
  user: AdminManagedUser;
  index?: number;
  teams: AdminManagedTeam[];
  colors: AdminTeamColor[];
  onClick: () => void;
}) => {
  const userTeams = user.teams
    .map((teamId) => teams.find((team) => team.id === teamId))
    .filter((team): team is AdminManagedTeam => Boolean(team));
  const visibleTeams = userTeams.slice(0, 4);
  const hiddenTeamCount = Math.max(userTeams.length - visibleTeams.length, 0);

  return (
    <button
      className="admin-user-card"
      type="button"
      style={{ "--admin-list-item-index": index } as CSSProperties}
      onClick={onClick}
    >
      <div className="admin-user-card__body">
        <strong>{user.nickname}</strong>
        <span>{user.email}</span>
        <p>
          소속 팀
          {visibleTeams.length > 0 ? (
            visibleTeams.map((team) => (
              <em key={team.id} style={{ color: colors.find((color) => color.id === team.colorId)?.value }}>
                {team.name}
              </em>
            ))
          ) : (
            <em>미소속</em>
          )}
          {hiddenTeamCount > 0 && <em>+{hiddenTeamCount}</em>}
        </p>
      </div>
      <span className={`admin-status-badge is-${user.status}`}>{statusLabel(user.status)}</span>
      <AdminChevronRightIcon />
    </button>
  );
};

const TeamList = ({
  teams,
  users,
  colors,
  leaderOptions,
  query,
  selectedLeaderId,
  totalCount,
  onQueryChange,
  onLeaderFilterChange,
  onCreate,
  onSelect,
}: {
  teams: AdminManagedTeam[];
  users: AdminManagedUser[];
  colors: AdminTeamColor[];
  leaderOptions: AdminTeamLeaderFilterOption[];
  query: string;
  selectedLeaderId: string;
  totalCount: number;
  onQueryChange: (value: string) => void;
  onLeaderFilterChange: (value: string) => void;
  onCreate: () => void;
  onSelect: (teamId: number) => void;
}) => (
  <>
    <div className="admin-team-summary-row">
      <button className="admin-team-create" type="button" onClick={onCreate}>
        <AdminPlusIcon />
        팀 생성
      </button>
      <div className="admin-team-stats">
        <div>
          <AdminTeamIcon />
          <span>활성 팀</span>
          <strong>{totalCount}</strong>
        </div>
        <div>
          <AdminUserIcon />
          <span>멤버</span>
          <strong>{users.length}</strong>
        </div>
      </div>
    </div>
    <div className="admin-user-filter-row admin-user-filter-row--team">
      <label className="admin-user-search">
        <AdminUserIcon />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="팀명"
        />
        <AdminChevronDownIcon />
      </label>
      <AdminSelect
        className="admin-user-select-filter"
        value={selectedLeaderId}
        icon={<AdminPersonIcon />}
        options={[
          { value: "all", label: "리더 전체" },
          ...leaderOptions.map((leader) => ({ value: String(leader.id), label: leader.nickname })),
        ]}
        onChange={onLeaderFilterChange}
      />
    </div>
    <h2 className="admin-users__section-title">등록된 팀</h2>
    <p className="admin-subtitle">총 {totalCount}팀 중 {teams.length}팀을 조회했습니다.</p>
    <div className="admin-team-list">
      {teams.length > 0 ? (
        teams.map((team, index) => {
          const leaderName = getLeaderName(team.leaderId, users, team.leaderName);
          const color = colors.find((teamColor) => teamColor.id === team.colorId);

          return (
            <button
              className="admin-team-card"
              key={team.id}
              type="button"
              style={{ "--admin-list-item-index": index } as CSSProperties}
              onClick={() => onSelect(team.id)}
            >
              <TeamAvatar team={team} color={color} />
              <div>
                <strong>{team.name}</strong>
                <span>
                  리더 {leaderName} · 멤버 {team.memberCount ?? team.memberIds.length}명 · 최근 수정일 {team.updatedAt}
                </span>
              </div>
              <AdminChevronRightIcon />
            </button>
          );
        })
      ) : (
        <p className="admin-reservation__empty">조건에 맞는 팀이 없습니다.</p>
      )}
    </div>
  </>
);

const ScreenHeader = ({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) => (
  <header className="admin-sub-screen__header">
    <button type="button" aria-label="뒤로가기" onClick={onBack}>
      <AdminArrowLeftIcon />
    </button>
    <h2>{title}</h2>
  </header>
);

const UserDetailScreen = ({
  user,
  teams,
  colors,
  onBack,
  onBlock,
  onUnblock,
  onTeamSelect,
}: {
  user: AdminManagedUser;
  teams: AdminManagedTeam[];
  colors: AdminTeamColor[];
  onBack: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onTeamSelect: (teamId: number) => void;
}) => {
  const userTeams = user.teams
    .map((teamId) => teams.find((team) => team.id === teamId))
    .filter((team): team is AdminManagedTeam => Boolean(team));

  return (
    <section className="admin-sub-screen">
      <ScreenHeader title="사용자 상세" onBack={onBack} />
      <div className="admin-sub-screen__content">
        <div className="admin-user-detail-hero">
          <UserAvatar user={user} size="lg" />
          <div>
            <h3>{user.nickname}</h3>
            <span className={`admin-status-badge is-${user.status}`}>{statusLabel(user.status)}</span>
          </div>
        </div>
        <InfoCard
          rows={[
            ["닉네임", user.nickname],
            ["이메일", user.email],
            ["상태", statusLabel(user.status)],
            ["가입일", user.joinedAt],
            ["소속 팀", userTeams.length > 0 ? userTeams.map((team) => team.name).join(", ") : "미소속"],
          ]}
        />
        <section className="admin-user-team-info">
          <h3>팀 정보</h3>
          {userTeams.length > 0 ? (
            userTeams.map((team) => (
              <button
                className="admin-user-team-info__item"
                key={team.id}
                type="button"
                onClick={() => onTeamSelect(team.id)}
              >
                <TeamAvatar team={team} color={colors.find((color) => color.id === team.colorId)} size="sm" />
                <strong>{team.name}</strong>
                <span>팀 관리는 팀 관리 메뉴에서 할 수 있습니다.</span>
                <AdminChevronRightIcon />
              </button>
            ))
          ) : (
            <p>소속된 팀이 없습니다.</p>
          )}
        </section>
        <div className="admin-info-box">
          <AdminWarningIcon />
          <p>블락된 사용자는 새로운 예약을 생성할 수 없습니다.</p>
        </div>
      </div>
      <footer className="admin-sub-actions">
        <button type="button" onClick={onBack}>닫기</button>
        {user.status === "blocked" ? (
          <button className="is-outline-primary" type="button" onClick={onUnblock}>블락 해제하기</button>
        ) : (
          <button className="is-danger" type="button" onClick={onBlock}>블락하기</button>
        )}
      </footer>
    </section>
  );
};

const BlockUserScreen = ({
  user,
  teams,
  onBack,
  onConfirm,
}: {
  user: AdminManagedUser;
  teams: AdminManagedTeam[];
  onBack: () => void;
  onConfirm: () => void;
}) => (
  <section className="admin-sub-screen">
    <ScreenHeader title="사용자 블락" onBack={onBack} />
    <div className="admin-sub-screen__content">
      <div className="admin-warning-title">
        <h3>선택한 사용자를 블락하시겠습니까?</h3>
        <p>블락 처리된 사용자는 신규 예약 및 팀 기능 이용이 제한됩니다.</p>
      </div>
      <button className="admin-user-card" type="button">
        <UserAvatar user={user} size="md" />
        <div className="admin-user-card__body">
          <strong>{user.nickname}</strong>
          <span>{user.email}</span>
          <p>소속 팀 <em>{user.teams.map((id) => teams.find((team) => team.id === id)?.name).filter(Boolean).join(", ") || "미소속"}</em></p>
        </div>
        <span className="admin-status-badge is-normal">일반</span>
      </button>
      <div className="admin-danger-guide">
        <h3>블락 안내</h3>
        <p>신규 예약 불가</p>
        <p>팀 기능 이용 제한</p>
        <p>기존 기록은 유지</p>
      </div>
    </div>
    <footer className="admin-sub-actions">
      <button type="button" onClick={onBack}>취소</button>
      <button className="is-danger" type="button" onClick={onConfirm}>블락 처리</button>
    </footer>
  </section>
);

const InfoCard = ({ rows }: { rows: [string, string][] }) => (
  <section className="admin-info-card">
    {rows.map(([label, value]) => (
      <p key={label}>
        <span>{label}</span>
        <strong>{value}</strong>
      </p>
    ))}
  </section>
);

const TeamDetailScreen = ({
  team,
  users,
  members,
  isLoadingMembers,
  color,
  onBack,
  onSettings,
  onAddMembers,
  onChangeLeader,
  onDelete,
  onUserSelect,
}: {
  team: AdminManagedTeam;
  users: AdminManagedUser[];
  members: AdminTeamMemberEditUser[];
  isLoadingMembers: boolean;
  color?: AdminTeamColor;
  onBack: () => void;
  onSettings: () => void;
  onAddMembers: () => void;
  onChangeLeader: () => void;
  onDelete: () => void;
  onUserSelect: (userId: number) => void;
}) => {
  const leaderName = getLeaderName(team.leaderId, users, team.leaderName);
  const memberCount = team.memberCount ?? members.length;

  return (
    <section className="admin-sub-screen">
      <ScreenHeader title="팀 상세" onBack={onBack} />
      <div className="admin-sub-screen__content">
        <div className="admin-team-detail-hero">
          <TeamAvatar team={team} color={color} size="lg" />
          <div>
            <h3>{team.name}</h3>
            <span>리더 {leaderName}</span>
          </div>
        </div>
        <InfoCard
          rows={[
            ["팀 이름", team.name],
            ["팀 컬러", `${color?.value ?? "-"}`],
            ["리더", leaderName],
            ["멤버 수", `${memberCount}명`],
            ["최근 수정일", team.updatedAt],
          ]}
        />
        <h3 className="admin-users__section-title">멤버 목록</h3>
        <section className="admin-member-list">
          {isLoadingMembers ? (
            <p className="admin-member-list__empty">멤버 목록을 불러오는 중입니다.</p>
          ) : members.map((member) => (
            <button className="admin-member-list__user" key={member.id} type="button" onClick={() => onUserSelect(member.id)}>
              <strong>{member.nickname}</strong>
              <span>{member.email}</span>
              <span className="admin-member-list__role">
                {member.id === team.leaderId && <em>리더</em>}
              </span>
              <AdminChevronRightIcon />
            </button>
          ))}
        </section>
        <section className="admin-quick-actions">
          <button type="button" onClick={onChangeLeader}>리더 변경 <AdminChevronRightIcon /></button>
          <button type="button" onClick={onAddMembers}>멤버 수정 <AdminChevronRightIcon /></button>
        </section>
      </div>
      <footer className="admin-sub-actions">
        <button className="is-outline-danger" type="button" onClick={onDelete}>팀 삭제</button>
        <button type="button" onClick={onSettings}>팀 설정</button>
      </footer>
    </section>
  );
};

const TeamSettingsScreen = ({
  team,
  colors,
  users,
  onBack,
  onChangeLeader,
  onSave,
}: {
  team: AdminManagedTeam;
  colors: AdminTeamColor[];
  users: AdminManagedUser[];
  onBack: () => void;
  onChangeLeader: () => void;
  onSave: (teamId: number, teamName: string, colorId: string) => void;
}) => {
  const [teamName, setTeamName] = useState(team.name);
  const [colorId, setColorId] = useState(team.colorId);
  const selectedColor = colors.find((color) => color.id === colorId);
  const leaderName = getLeaderName(team.leaderId, users, team.leaderName);
  const leaderEmail = getLeaderEmail(team.leaderId, users);

  return (
    <section className="admin-sub-screen">
      <ScreenHeader title="팀 설정" onBack={onBack} />
      <div className="admin-sub-screen__content">
        <label className="admin-form-field">
          <span>팀 이름</span>
          <input value={teamName} maxLength={20} onChange={(event) => setTeamName(event.target.value)} />
          <small>팀 이름은 최대 20자까지 입력할 수 있습니다.</small>
          <em>{teamName.length}/20</em>
        </label>
        <section className="admin-settings-section">
          <div className="admin-settings-section__header">
            <div>
              <h3>팀 컬러</h3>
              <p>팀의 대표 컬러를 선택하세요.</p>
            </div>
            <div className="admin-team-preview">
              <span>미리보기</span>
              <strong style={{ background: selectedColor?.value }}>{teamName || "팀"}</strong>
            </div>
          </div>
          <ColorPicker colors={colors} selectedColorId={colorId} onSelect={setColorId} showTitle={false} />
          <p className="admin-settings-help">선택한 컬러는 팀 태그, 목록, 캘린더 등에 사용됩니다.</p>
        </section>
        <button className="admin-team-leader-card" type="button" onClick={onChangeLeader}>
          <AdminPersonIcon />
          <div>
            <span>리더</span>
            <strong>{leaderName}</strong>
            {leaderEmail && <p>{leaderEmail}</p>}
          </div>
          <em>{team.leaderId === OWNER_LEADER_ID ? "사장님" : "현재 리더"}</em>
          <AdminChevronRightIcon />
        </button>
        <p className="admin-settings-help">각 팀은 반드시 리더가 1명 지정되어야 합니다.</p>
        <div className="admin-info-box">
          <AdminWarningIcon />
          <p>모든 팀은 반드시 리더가 1명 있어야 합니다.</p>
        </div>
      </div>
      <footer className="admin-sub-actions">
        <button type="button" onClick={onBack}>취소</button>
        <button type="button" onClick={() => onSave(team.id, teamName.trim() || team.name, colorId)}>저장하기</button>
      </footer>
    </section>
  );
};

const CreateTeamScreen = ({
  users,
  colors,
  onBack,
  onCreate,
}: {
  users: AdminManagedUser[];
  colors: AdminTeamColor[];
  onBack: () => void;
  onCreate: (teamName: string, colorId: string, leaderId: number) => void;
}) => {
  const firstAvailableColorId = colors.find((color) => color.available)?.id ?? colors[0]?.id ?? "";
  const [teamName, setTeamName] = useState("");
  const [colorId, setColorId] = useState(firstAvailableColorId);
  const [leaderId, setLeaderId] = useState<number | null>(null);
  const [leaderQuery, setLeaderQuery] = useState("");
  const isOwnerLeader = leaderId === OWNER_LEADER_ID;
  const selectedLeader = isOwnerLeader
    ? OWNER_LEADER
    : leaderId === null
      ? null
      : users.find((user) => user.id === leaderId);
  const filteredUsers = users.filter((user) => {
    const keyword = leaderQuery.trim().toLowerCase();

    if (!keyword) {
      return true;
    }

    return user.nickname.toLowerCase().includes(keyword) || user.email.toLowerCase().includes(keyword);
  });
  const clearLeader = () => {
    setLeaderId(null);
  };
  const handleSubmit = () => {
    const trimmedTeamName = teamName.trim();

    if (!trimmedTeamName && leaderId === null) {
      window.alert("팀 이름과 리더를 입력해 주세요.");
      return;
    }

    if (!trimmedTeamName) {
      window.alert("팀 이름을 입력해 주세요.");
      return;
    }

    if (leaderId === null) {
      window.alert("리더를 선택해 주세요.");
      return;
    }

    onCreate(trimmedTeamName, colorId, leaderId);
  };

  return (
    <section className="admin-sub-screen">
      <ScreenHeader title="팀 생성" onBack={onBack} />
      <div className="admin-sub-screen__content">
        <div className="admin-info-box">
          <AdminWarningIcon />
          <p>팀은 반드시 리더가 1명이어야 합니다. 사용 가능한 색상만 선택할 수 있습니다.</p>
        </div>
        <label className="admin-form-field">
          <span>팀 이름</span>
          <input value={teamName} maxLength={20} onChange={(event) => setTeamName(event.target.value)} placeholder="예) 마케팅팀" />
        </label>
        <ColorPicker colors={colors} selectedColorId={colorId} onSelect={setColorId} />
        <h3 className="admin-users__section-title">리더 설정</h3>
        <label className="admin-user-search admin-user-search--wide">
          <AdminUserIcon />
          <input
            value={leaderQuery}
            onChange={(event) => setLeaderQuery(event.target.value)}
            placeholder="리더로 지정할 사용자 검색"
          />
        </label>
        <div className="admin-member-list admin-member-list--leader-picker">
          {filteredUsers.map((user) => (
            <label className="admin-selectable-user" key={user.id}>
              <input type="radio" checked={leaderId === user.id} onChange={() => setLeaderId(user.id)} />
              <UserAvatar user={user} size="sm" />
              <strong>{user.nickname}</strong>
              <span>{user.email}</span>
            </label>
          ))}
        </div>
        <label className="admin-owner-leader-check">
          <input
            type="checkbox"
            checked={isOwnerLeader}
            onChange={(event) => setLeaderId(event.target.checked ? OWNER_LEADER_ID : null)}
          />
          <span>
            <strong>사장님을 리더로 지정</strong>
            <em>사장님 계정이 리더가 됩니다.</em>
          </span>
        </label>
        {selectedLeader && (
          <section className="admin-selected-leader">
            <span>선택된 리더</span>
            <div className="admin-selected-leader__body">
              {isOwnerLeader ? (
                <strong className="admin-owner-avatar">사</strong>
              ) : (
                <UserAvatar user={selectedLeader as AdminManagedUser} size="sm" />
              )}
              <div>
                <strong>{selectedLeader.nickname}</strong>
                <small>{selectedLeader.email}</small>
              </div>
            </div>
            <button type="button" aria-label="선택된 리더 해제" onClick={clearLeader}>×</button>
          </section>
        )}
      </div>
      <footer className="admin-sub-actions">
        <button type="button" onClick={onBack}>취소</button>
        <button type="button" onClick={handleSubmit}>생성하기</button>
      </footer>
    </section>
  );
};

const ColorPicker = ({
  colors,
  selectedColorId,
  onSelect,
  showTitle = true,
}: {
  colors: AdminTeamColor[];
  selectedColorId: string;
  onSelect: (colorId: string) => void;
  showTitle?: boolean;
}) => (
  <section className="admin-color-picker">
    {showTitle && <h3>팀 컬러</h3>}
    <div>
      {colors.map((color) => (
        <button
          key={color.id}
          className={`${selectedColorId === color.id ? "is-selected" : ""}${!color.available ? " is-disabled" : ""}`}
          type="button"
          style={{ background: color.value }}
          disabled={!color.available}
          aria-label={`${color.name}${color.available ? "" : " 사용 불가"}`}
          onClick={() => onSelect(color.id)}
        />
      ))}
    </div>
  </section>
);

const AddMembersScreen = ({
  team,
  onBack,
  onSave,
}: {
  team: AdminManagedTeam;
  onBack: () => void;
  onSave: (memberIds: number[]) => Promise<void>;
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [members, setMembers] = useState<AdminTeamMemberEditUser[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    adminApi.getTeamMemberEditList(team.id).then((data) => {
      if (!isMounted) {
        return;
      }

      const nextMembers = [...data.members, ...data.nonMembers];

      setMembers(nextMembers);
      setSelectedIds(data.members.map((member) => member.id));
    }).catch(console.error).finally(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [team.id]);

  const filteredMembers = members.filter((member) => {
    const keyword = query.trim().toLowerCase();

    if (!keyword) {
      return true;
    }

    return member.nickname.toLowerCase().includes(keyword) || member.email.toLowerCase().includes(keyword);
  });

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await onSave(selectedIds);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "팀 멤버 수정에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="admin-sub-screen">
      <ScreenHeader title="멤버 수정" onBack={onBack} />
      <div className="admin-sub-screen__content">
        <p className="admin-subtitle">대상 팀: <strong>{team.name}</strong></p>
        <label className="admin-user-search admin-user-search--wide">
          <AdminUserIcon />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="닉네임 또는 이메일 검색"
          />
        </label>
        <div className="admin-member-list">
          {isLoading ? (
            <p className="admin-member-list__empty">멤버 목록을 불러오는 중입니다.</p>
          ) : filteredMembers.length > 0 ? (
            filteredMembers.map((user) => {
              const checked = selectedIds.includes(user.id);

              return (
                <label
                  className={[
                    "admin-selectable-user",
                    "admin-selectable-user--no-avatar",
                    user.isMember ? "is-member" : "",
                  ].filter(Boolean).join(" ")}
                  key={user.id}
                >
                  <strong>{user.nickname}</strong>
                  <span>{user.email}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={user.isLeader}
                    onChange={() =>
                      setSelectedIds((currentIds) =>
                        checked ? currentIds.filter((id) => id !== user.id) : [...currentIds, user.id],
                      )
                    }
                  />
                </label>
              );
            })
          ) : (
            <p className="admin-member-list__empty">조건에 맞는 사용자가 없습니다.</p>
          )}
        </div>
      </div>
      <footer className="admin-sub-actions">
        <button type="button" onClick={onBack}>취소</button>
        <button type="button" onClick={() => void handleSave()} disabled={isLoading || isSaving}>
          {isSaving ? "저장 중" : "저장하기"}
        </button>
      </footer>
    </section>
  );
};

const ChangeLeaderScreen = ({
  team,
  users,
  members,
  isLoadingMembers,
  color,
  onBack,
  onChange,
}: {
  team: AdminManagedTeam;
  users: AdminManagedUser[];
  members: AdminTeamMemberEditUser[];
  isLoadingMembers: boolean;
  color?: AdminTeamColor;
  onBack: () => void;
  onChange: (leaderId: number) => void;
}) => {
  const [leaderId, setLeaderId] = useState(team.leaderId);
  const [leaderQuery, setLeaderQuery] = useState("");
  const currentUserId = getCurrentUserId();
  const isOwnerLeader = leaderId === OWNER_LEADER_ID;
  const selectableMembers = members.filter((user) => user.id !== currentUserId);
  const filteredMembers = selectableMembers.filter((user) => {
    const keyword = leaderQuery.trim().toLowerCase();

    if (!keyword) {
      return true;
    }

    return user.nickname.toLowerCase().includes(keyword) || user.email.toLowerCase().includes(keyword);
  });
  const selectedLeader = isOwnerLeader
    ? OWNER_LEADER
    : members.find((user) => user.id === leaderId) ?? users.find((user) => user.id === leaderId);
  const currentLeaderName = getLeaderName(team.leaderId, users, team.leaderName);
  const fallbackMemberId = selectableMembers[0]?.id ?? OWNER_LEADER_ID;
  const memberCount = team.memberCount ?? members.length;

  return (
    <section className="admin-sub-screen">
      <ScreenHeader title="리더 변경" onBack={onBack} />
      <div className="admin-sub-screen__content">
        <div className="admin-team-current-leader">
          <TeamAvatar team={team} color={color} />
          <div><span>현재 리더</span><strong>{currentLeaderName}</strong></div>
          <strong>{memberCount}명</strong>
        </div>
        <h3 className="admin-users__section-title">리더로 변경할 사용자 선택</h3>
        <label className="admin-user-search admin-user-search--wide">
          <AdminUserIcon />
          <input
            value={leaderQuery}
            onChange={(event) => setLeaderQuery(event.target.value)}
            placeholder="리더로 지정할 사용자 검색"
          />
        </label>
        <div className="admin-member-list">
          {isLoadingMembers ? (
            <p className="admin-member-list__empty">멤버 목록을 불러오는 중입니다.</p>
          ) : filteredMembers.map((user) => (
            <label className="admin-selectable-user admin-selectable-user--no-avatar" key={user.id}>
              <strong>{user.nickname}</strong>
              <span>{user.email}</span>
              <input type="radio" checked={leaderId === user.id} onChange={() => setLeaderId(user.id)} />
            </label>
          ))}
        </div>
        <label className="admin-owner-leader-check">
          <input
            type="checkbox"
            checked={isOwnerLeader}
            onChange={(event) => setLeaderId(event.target.checked ? OWNER_LEADER_ID : fallbackMemberId)}
          />
          <span>
            <strong>사장님을 리더로 지정</strong>
            <em>사장님 계정이 리더가 됩니다.</em>
          </span>
        </label>
        {selectedLeader && (
          <section className="admin-selected-leader admin-selected-leader--compact">
            <span>선택된 리더</span>
            <strong>{selectedLeader.nickname}</strong>
            <small>{selectedLeader.email}</small>
          </section>
        )}
        <div className="admin-info-box">
          <AdminWarningIcon />
          <p>팀에는 반드시 한 명의 리더가 필요합니다.</p>
        </div>
      </div>
      <footer className="admin-sub-actions">
        <button type="button" onClick={onBack}>취소</button>
        <button type="button" onClick={() => onChange(leaderId)}>변경하기</button>
      </footer>
    </section>
  );
};

const DeleteTeamScreen = ({
  team,
  users,
  members,
  isLoadingMembers,
  color,
  onBack,
  onDelete,
}: {
  team: AdminManagedTeam;
  users: AdminManagedUser[];
  members: AdminTeamMemberEditUser[];
  isLoadingMembers: boolean;
  color?: AdminTeamColor;
  onBack: () => void;
  onDelete: () => void;
}) => {
  const leader = users.find((user) => user.id === team.leaderId);
  const memberCount = team.memberCount ?? members.length;

  return (
    <section className="admin-sub-screen">
      <ScreenHeader title="팀 삭제" onBack={onBack} />
      <div className="admin-sub-screen__content">
        <div className="admin-warning-title">
          <h3>{team.name}을 삭제하시겠습니까?</h3>
          <p>삭제된 팀은 복구할 수 없습니다.</p>
        </div>
        <div className="admin-delete-team-card">
          <TeamAvatar team={team} color={color} size="lg" />
          <div>
            <h3>{team.name}</h3>
            <p>리더 {leader?.nickname ?? team.leaderName ?? "-"} · 멤버 수 {memberCount}명</p>
          </div>
        </div>
        <div className="admin-danger-guide">
          <h3>삭제 안내</h3>
          <p>팀 정보는 비활성 또는 해제됩니다.</p>
          <p>팀에 속한 멤버는 미소속 상태가 될 수 있습니다.</p>
          <p>팀의 기록은 유지될 수 있습니다.</p>
        </div>
        <h3 className="admin-users__section-title">영향을 받는 멤버 ({memberCount}명)</h3>
        <section className="admin-member-list">
          {isLoadingMembers ? (
            <p className="admin-member-list__empty">멤버 목록을 불러오는 중입니다.</p>
          ) : members.map((member) => (
            <div className="admin-member-list__row--no-avatar" key={member.id}>
              <strong>{member.nickname}</strong>
              <span>{member.email}</span>
              <AdminChevronRightIcon />
            </div>
          ))}
        </section>
      </div>
      <footer className="admin-sub-actions">
        <button type="button" onClick={onBack}>닫기</button>
        <button className="is-danger" type="button" onClick={onDelete}>삭제하기</button>
      </footer>
    </section>
  );
};

export default AdminUserPanel;
