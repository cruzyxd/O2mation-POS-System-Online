import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Save, Trash2, Power, UserPlus, Shield, User as UserIcon, X, AlertTriangle, Pencil } from "lucide-react";
import { useAuth } from "@/store/auth.store";
import * as usersService from "@/services/users.service";
import type { UserWithPassword, CreateUserRequest, UpdateUserRequest } from "@/types/users.types";
import { cn } from "@/lib/cn";

export function ManageUsersTab() {
  const { t } = useTranslation("settings");
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithPassword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [deleteConfirmUserId, setDeleteConfirmUserId] = useState<number | null>(null);
  const [deletePassword, setDeletePassword] = useState("");

  // Create form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"manager" | "cashier">("cashier");

  // Edit form state
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");

  // Check if user has access
  const hasAccess = currentUser?.role === "owner_admin" || currentUser?.role === "manager";

  useEffect(() => {
    if (hasAccess) {
      loadUsers();
    }
  }, [hasAccess]);

  async function loadUsers() {
    setLoading(true);
    setError(null);

    try {
      const usersList = await usersService.listUsers();
      setUsers(usersList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      const request: CreateUserRequest = {
        username: newUsername.trim(),
        password: newPassword,
        role: newRole,
      };

      const newUser = await usersService.createUser(request);
      setUsers([newUser, ...users]);
      setNewUsername("");
      setNewPassword("");
      setNewRole("cashier");
      setShowCreateForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  }

  async function handleUpdateUser(userId: number) {
    try {
      const request: UpdateUserRequest = {};
      if (editUsername.trim()) request.username = editUsername.trim();
      if (editPassword.trim()) request.password = editPassword.trim();

      const updatedUser = await usersService.updateUser(userId, request);
      setUsers(users.map(u => (u.id === userId ? updatedUser : u)));
      setEditingUserId(null);
      setEditUsername("");
      setEditPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  }

  async function handleToggleActive(userId: number, isActive: boolean) {
    try {
      await usersService.toggleUserActive(userId, { is_active: !isActive });
      setUsers(users.map(u => (u.id === userId ? { ...u, is_active: !isActive } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user status");
    }
  }

  async function handleDeleteUser(userId: number) {
    try {
      await usersService.deleteUser(userId, { confirm_password: deletePassword });
      setUsers(users.filter(u => u.id !== userId));
      setDeleteConfirmUserId(null);
      setDeletePassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  }

  function startEdit(user: UserWithPassword) {
    setEditingUserId(user.id);
    setEditUsername(user.username);
    setEditPassword("");
  }

  function cancelEdit() {
    setEditingUserId(null);
    setEditUsername("");
    setEditPassword("");
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="mx-auto mb-4 text-[var(--fg-subtle)]" size={48} />
          <p className="text-[var(--fg-muted)] text-lg">{t("users.accessDenied")}</p>
          <p className="text-[var(--fg-subtle)] text-sm mt-2">{t("users.onlyOwnersManagers")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--fg-heading)] mb-2 font-[var(--font-heading)]">
              {t("users.title")}
            </h2>
            <p className="text-[var(--fg-muted)] text-sm max-w-xl">
              {t("users.description")}
            </p>
          </div>

          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[var(--color-oxygen-500)] to-[var(--color-oxygen-600)] text-white rounded-lg font-bold text-sm shadow-lg shadow-[var(--color-oxygen-500)]/25 hover:shadow-xl hover:shadow-[var(--color-oxygen-500)]/40 hover:scale-105 transition-all duration-200"
            >
              <Plus size={18} strokeWidth={2.5} />
              {t("users.createButton")}
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 rounded-r-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-red-800 dark:text-red-200 text-sm font-medium">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
            >
              <X size={16} className="text-red-600 dark:text-red-400" />
            </button>
          </div>
        </div>
      )}

      {/* Create User Form */}
      {showCreateForm && (
        <div className="mb-8 p-6 bg-gradient-to-br from-[var(--bg-surface)] to-[var(--bg-page)] border-2 border-[var(--color-oxygen-500)] rounded-xl shadow-2xl shadow-[var(--color-oxygen-500)]/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-[var(--color-oxygen-500)] to-[var(--color-oxygen-600)] rounded-lg">
                <UserPlus size={20} className="text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-extrabold text-[var(--fg-heading)]">{t("users.createNewUser")}</h3>
            </div>
            <button
              onClick={() => setShowCreateForm(false)}
              className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
            >
              <X size={20} className="text-[var(--fg-subtle)]" />
            </button>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-[var(--fg-default)] mb-2 uppercase tracking-wide">
                  {t("users.username")}
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-[var(--bg-page)] border-2 border-[var(--border-color)] rounded-lg focus:border-[var(--color-oxygen-500)] focus:ring-4 focus:ring-[var(--color-oxygen-500)]/20 outline-none transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[var(--fg-default)] mb-2 uppercase tracking-wide">
                  {t("users.password")}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={4}
                  className="w-full px-4 py-2.5 bg-[var(--bg-page)] border-2 border-[var(--border-color)] rounded-lg focus:border-[var(--color-oxygen-500)] focus:ring-4 focus:ring-[var(--color-oxygen-500)]/20 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--fg-default)] mb-2 uppercase tracking-wide">
                {t("users.role")}
              </label>
              <div className="flex gap-3">
                <label className={cn(
                  "flex-1 p-4 border-2 rounded-xl cursor-pointer transition-all",
                  newRole === "manager"
                    ? "border-[var(--color-oxygen-500)] bg-gradient-to-br from-[var(--color-oxygen-500)]/10 to-[var(--color-oxygen-600)]/5"
                    : "border-[var(--border-color)] hover:border-[var(--color-oxygen-400)]"
                )}>
                  <input
                    type="radio"
                    name="role"
                    value="manager"
                    checked={newRole === "manager"}
                    onChange={() => setNewRole("manager")}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <Shield size={20} className={newRole === "manager" ? "text-[var(--color-oxygen-600)]" : "text-[var(--fg-subtle)]"} />
                    <div>
                      <div className="font-bold text-sm text-[var(--fg-heading)]">{t("users.managerRole")}</div>
                      <div className="text-xs text-[var(--fg-muted)]">{t("users.managerDesc")}</div>
                    </div>
                  </div>
                </label>

                <label className={cn(
                  "flex-1 p-4 border-2 rounded-xl cursor-pointer transition-all",
                  newRole === "cashier"
                    ? "border-[var(--color-oxygen-500)] bg-gradient-to-br from-[var(--color-oxygen-500)]/10 to-[var(--color-oxygen-600)]/5"
                    : "border-[var(--border-color)] hover:border-[var(--color-oxygen-400)]"
                )}>
                  <input
                    type="radio"
                    name="role"
                    value="cashier"
                    checked={newRole === "cashier"}
                    onChange={() => setNewRole("cashier")}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <UserIcon size={20} className={newRole === "cashier" ? "text-[var(--color-oxygen-600)]" : "text-[var(--fg-subtle)]"} />
                    <div>
                      <div className="font-bold text-sm text-[var(--fg-heading)]">{t("users.cashierRole")}</div>
                      <div className="text-xs text-[var(--fg-muted)]">{t("users.cashierDesc")}</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-br from-[var(--color-oxygen-500)] to-[var(--color-oxygen-600)] text-white rounded-lg font-bold shadow-lg shadow-[var(--color-oxygen-500)]/25 hover:shadow-xl hover:shadow-[var(--color-oxygen-500)]/40 transition-all"
              >
                <Plus size={18} strokeWidth={2.5} />
                {t("users.createButton")}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-5 py-3 bg-[var(--bg-page)] border-2 border-[var(--border-color)] text-[var(--fg-default)] rounded-lg font-bold hover:bg-[var(--bg-hover)] transition-all"
              >
                {t("users.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--color-oxygen-500)] border-t-transparent"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {users.map((user) => {
            const isEditing = editingUserId === user.id;
            const isDeleting = deleteConfirmUserId === user.id;
            const isOwner = user.role === "owner_admin";
            const isCurrentUser = user.id === currentUser?.id;

            return (
              <div
                key={user.id}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all duration-200",
                  isOwner
                    ? "bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-400 dark:border-amber-600"
                    : user.is_active
                      ? "bg-[var(--bg-surface)] border-[var(--border-color)] hover:border-[var(--color-oxygen-400)] hover:shadow-lg"
                      : "bg-[var(--bg-page)] border-[var(--border-color)] opacity-60"
                )}
              >
                {isEditing ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[var(--fg-subtle)] mb-1.5 uppercase tracking-wide">
                          {t("users.username")}
                        </label>
                        <input
                          type="text"
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--bg-page)] border-2 border-[var(--border-color)] rounded-lg focus:border-[var(--color-oxygen-500)] outline-none transition-all font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[var(--fg-subtle)] mb-1.5 uppercase tracking-wide">
                          {t("users.newPassword")}
                        </label>
                        <input
                          type="text"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder={t("users.leaveBlank")}
                          className="w-full px-3 py-2 bg-[var(--bg-page)] border-2 border-[var(--border-color)] rounded-lg focus:border-[var(--color-oxygen-500)] outline-none transition-all font-medium"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateUser(user.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--color-oxygen-600)] text-white rounded-lg font-bold text-sm hover:bg-[var(--color-oxygen-700)] transition-all"
                      >
                        <Save size={16} />
                        {t("users.saveChanges")}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 bg-[var(--bg-page)] border border-[var(--border-color)] rounded-lg font-bold text-sm hover:bg-[var(--bg-hover)] transition-all"
                      >
                        {t("users.cancel")}
                      </button>
                    </div>
                  </div>
                ) : isDeleting ? (
                  // Delete Confirmation Mode
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle size={24} className="text-red-500" />
                      <div>
                        <p className="font-bold text-[var(--fg-heading)]">{t("users.confirmDeletion")}</p>
                        <p className="text-sm text-[var(--fg-muted)]">{t("users.enterPasswordToDelete")} <span className="font-bold">{user.username}</span></p>
                      </div>
                    </div>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder={t("users.yourPassword")}
                      className="w-full px-4 py-2.5 bg-[var(--bg-page)] border-2 border-red-400 rounded-lg focus:border-red-500 focus:ring-4 focus:ring-red-500/20 outline-none transition-all font-medium"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={!deletePassword}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <Trash2 size={16} />
                        {t("users.confirmDeleteButton")}
                      </button>
                      <button
                        onClick={() => {
                          setDeleteConfirmUserId(null);
                          setDeletePassword("");
                        }}
                        className="px-4 py-2 bg-[var(--bg-page)] border border-[var(--border-color)] rounded-lg font-bold text-sm hover:bg-[var(--bg-hover)] transition-all"
                      >
                        {t("users.cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center font-extrabold text-base",
                          isOwner
                            ? "bg-gradient-to-br from-amber-500 to-amber-600 text-white"
                            : user.role === "manager"
                              ? "bg-gradient-to-br from-[var(--color-oxygen-500)] to-[var(--color-oxygen-600)] text-white"
                              : "bg-gradient-to-br from-slate-500 to-slate-600 text-white"
                        )}>
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-extrabold text-[var(--fg-heading)]">{user.username}</h3>
                            {isOwner && (
                              <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded uppercase">
                                {t("users.owner")}
                              </span>
                            )}
                            {user.role === "manager" && !isOwner && (
                              <span className="px-2 py-0.5 bg-[var(--color-oxygen-600)] text-white text-xs font-bold rounded uppercase flex items-center gap-1">
                                <Shield size={12} />
                                {t("users.managerRole")}
                              </span>
                            )}
                            {isCurrentUser && (
                              <span className="px-3 h-[24px] bg-black text-white text-[11px] font-bold rounded-full uppercase flex items-center shadow-sm tracking-wide">
                                {t("users.currentlyLoggedIn")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn(
                              "text-xs font-bold px-2 py-0.5 rounded",
                              user.is_active
                                ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                            )}>
                              {user.is_active ? t("users.active") : t("users.inactive")}
                            </span>
                            <span className="text-xs text-[var(--fg-subtle)]">
                              {t("users.created")} {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!isOwner && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(user)}
                            className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                            title="Edit user"
                          >
                            <Pencil size={18} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(user.id, user.is_active)}
                            className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors"
                            title={user.is_active ? "Deactivate" : "Activate"}
                          >
                            <Power size={18} className={user.is_active ? "text-green-600" : "text-gray-400"} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmUserId(user.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                            title="Delete user"
                          >
                            <Trash2 size={18} className="text-red-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {users.length === 0 && (
            <div className="text-center py-16">
              <UserIcon className="mx-auto mb-4 text-[var(--fg-subtle)]" size={48} />
              <p className="text-[var(--fg-muted)] text-lg font-medium">{t("users.noUsersFound")}</p>
              <p className="text-[var(--fg-subtle)] text-sm mt-1">{t("users.createFirstUser")}</p>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmUserId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-red-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-950/30 rounded-xl">
                <AlertTriangle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[var(--fg-heading)]">{t("users.confirmDeletion")}</h3>
                <p className="text-sm text-[var(--fg-muted)]">{t("users.cannotUndo")}</p>
              </div>
            </div>

            <p className="text-sm text-[var(--fg-default)] mb-4">
              {t("users.enterPasswordToConfirm")}{" "}
              <span className="font-bold text-[var(--fg-heading)]">
                {users.find(u => u.id === deleteConfirmUserId)?.username}
              </span>
            </p>

            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder={t("users.yourPassword")}
              autoFocus
              className="w-full px-4 py-2.5 mb-4 bg-[var(--bg-page)] border-2 border-[var(--border-color)] rounded-lg focus:border-red-500 focus:ring-4 focus:ring-red-500/20 outline-none transition-all font-medium"
            />

            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteUser(deleteConfirmUserId)}
                disabled={!deletePassword}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Trash2 size={18} />
                {t("users.deleteUserButton")}
              </button>
              <button
                onClick={() => {
                  setDeleteConfirmUserId(null);
                  setDeletePassword("");
                }}
                className="px-4 py-2.5 bg-[var(--bg-page)] border-2 border-[var(--border-color)] text-[var(--fg-default)] rounded-lg font-bold hover:bg-[var(--bg-hover)] transition-all"
              >
                {t("users.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
