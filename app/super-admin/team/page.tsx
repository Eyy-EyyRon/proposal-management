"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, Plus, Search, MoreHorizontal, Building2, X, Check, ChevronDown, 
  Filter, Crown, Shield, User, Loader2, AlertCircle 
} from "lucide-react";
import {
  subscribeToAllUsers,
  subscribeToDepartmentsList,
  setUserDepartments,
  deactivateUser,
  OrphanError,
  type TeamMember,
  type FirestoreDepartment,
} from "@/lib/firestore";

type FilterMode = "all" | "by-department";
type UserRole = "staff" | "admin" | "ceo";

const ROLE_BADGES: Record<UserRole, { label: string; className: string; icon: typeof Crown }> = {
  ceo: { 
    label: "CEO", 
    className: "bg-violet-100 text-violet-700 border-violet-200",
    icon: Crown 
  },
  admin: { 
    label: "Admin", 
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: Shield 
  },
  staff: { 
    label: "Staff", 
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: User 
  },
};

export default function TeamManagementPage() {
  const router = useRouter();
  
  // Data states
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [departments, setDepartments] = useState<FirestoreDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Deactivate / Orphan protection
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [orphanModal, setOrphanModal] = useState<{
    userName: string;
    orphans: Array<{ id: string; clientName: string; status: string }>;
  } | null>(null);
  
  // Subscribe to users and departments
  useEffect(() => {
    const unsubUsers = subscribeToAllUsers((data) => {
      setUsers(data);
      setLoading(false);
    });
    
    const unsubDepts = subscribeToDepartmentsList((data) => {
      setDepartments(data);
      if (data.length > 0 && !selectedDepartment) {
        setSelectedDepartment(data[0].name);
      }
    });
    
    return () => {
      unsubUsers();
      unsubDepts();
    };
  }, []);
  
  // Filter users based on current filters
  const filteredUsers = useMemo(() => {
    let result = users;
    
    // Exclude CEO from all views (as per requirements)
    result = result.filter((u) => u.role !== "ceo");
    
    // Apply filter mode
    if (filterMode === "by-department" && selectedDepartment) {
      result = result.filter((u) => 
        u.departments?.includes(selectedDepartment) || 
        u.department === selectedDepartment
      );
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((u) => 
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [users, filterMode, selectedDepartment, searchQuery]);
  
  // Get department display name for a user
  const getUserDepartments = (user: TeamMember): string => {
    if (user.departments && user.departments.length > 0) {
      return user.departments.join(", ");
    }
    return user.department || "No department";
  };
  
  // Open assign modal
  const openAssignModal = (user: TeamMember) => {
    setSelectedUser(user);
    setSelectedDepartments(user.departments || (user.department ? [user.department] : []));
    setIsAssignModalOpen(true);
  };
  
  // Toggle department selection
  const toggleDepartment = (deptName: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(deptName)
        ? prev.filter((d) => d !== deptName)
        : [...prev, deptName]
    );
  };
  
  // Deactivate user with orphan guard
  const handleDeactivate = async (member: TeamMember) => {
    if (!confirm(`Deactivate ${member.firstName} ${member.lastName}? They will lose all access.`)) return;
    setDeactivating(member.id);
    try {
      await deactivateUser(member.id);
      alert(`${member.firstName} ${member.lastName} has been deactivated.`);
    } catch (err) {
      if (err instanceof OrphanError) {
        setOrphanModal({
          userName: `${member.firstName} ${member.lastName}`,
          orphans: err.orphans,
        });
      } else {
        alert("Failed to deactivate user. Please try again.");
      }
    } finally {
      setDeactivating(null);
    }
  };

  // Save department assignments
  const handleSaveDepartments = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await setUserDepartments(selectedUser.id, selectedDepartments);
      setIsAssignModalOpen(false);
      setSelectedUser(null);
    } catch (err) {
      console.error("Failed to update departments:", err);
      alert("Failed to update departments. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-8 pb-10 pt-24 lg:px-10">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <p className="mt-4 text-[13px] text-slate-500">Loading team members...</p>
      </div>
    );
  }
  
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col space-y-6 px-8 pb-10 pt-12 lg:px-10">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="mb-4 text-3xl font-semibold tracking-tight text-slate-900">
          Team Management
        </h2>
        <p className="text-[13px] text-slate-500">
          Manage your team members, assign departments, and control access permissions.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setFilterMode("all")}
          className={`flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition border-b-2 -mb-[1px] ${
            filterMode === "all"
              ? "border-[#800020] text-[#800020]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="h-4 w-4" />
          All Users
          <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
            {users.filter((u) => u.role !== "ceo").length}
          </span>
        </button>
        
        <button
          onClick={() => setFilterMode("by-department")}
          className={`flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition border-b-2 -mb-[1px] ${
            filterMode === "by-department"
              ? "border-[#800020] text-[#800020]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Building2 className="h-4 w-4" />
          By Department
        </button>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-[13px] outline-none shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] transition focus:border-[#800020] focus:ring-1 focus:ring-[#800020]/20"
            />
          </div>
          
          {/* Department Filter (when in By Department mode) */}
          {filterMode === "by-department" && (
            <div className="relative">
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-4 pr-10 text-[13px] outline-none transition focus:border-[#800020] focus:ring-1 focus:ring-[#800020]/20"
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>
        
        <button className="flex items-center gap-2 rounded-lg bg-[#800020] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#660018]">
          <Plus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {/* Info Banner */}
      {filterMode === "all" && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-[12px] text-slate-600">
          <AlertCircle className="h-4 w-4 text-slate-400" />
          <span>Showing all users except CEO. Use "By Department" filter to view users in specific departments.</span>
        </div>
      )}

      {/* Team Members Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Member
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Role
                </th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Departments
                </th>
                <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((member, i) => {
                const roleBadge = ROLE_BADGES[member.role as UserRole] ?? ROLE_BADGES.staff;
                const RoleIcon = roleBadge.icon;
                
                return (
                  <tr
                    key={member.id}
                    className={`group transition-colors duration-300 ease-out hover:bg-slate-50/80 ${
                      i !== filteredUsers.length - 1
                        ? "border-b border-slate-100/80"
                        : ""
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#800000]/10 text-[11px] font-semibold text-[#800000]">
                          {member.firstName?.[0]}{member.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-slate-800">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-[12px] text-slate-400">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium ${roleBadge.className}`}
                      >
                        <RoleIcon className="h-3 w-3" />
                        {roleBadge.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(member.departments?.length ? member.departments : member.department ? [member.department] : []).map((dept) => (
                          <span
                            key={dept}
                            className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                          >
                            {dept}
                          </span>
                        ))}
                        {!member.departments?.length && !member.department && (
                          <span className="text-[12px] text-slate-400 italic">No department assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openAssignModal(member)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 active:scale-95"
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          Assign Dept
                        </button>
                        <button
                          onClick={() => handleDeactivate(member)}
                          disabled={deactivating === member.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[12px] font-medium text-rose-600 transition hover:bg-rose-100 active:scale-95 disabled:opacity-50"
                          title="Deactivate user (blocked if active proposals exist)"
                        >
                          {deactivating === member.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-6 py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.02)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <Users className="h-5 w-5 text-slate-400" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-800">
            {searchQuery ? "No users found" : filterMode === "by-department" 
              ? `No users in ${selectedDepartment}` 
              : "No team members yet"}
          </p>
          <p className="mt-1 max-w-[260px] text-[13px] leading-relaxed text-slate-500">
            {searchQuery 
              ? "Try adjusting your search query" 
              : "Add your first team member to start collaborating on proposals."}
          </p>
        </div>
      )}

      {/* Department Assignment Modal */}
      {isAssignModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Assign Departments
              </h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="mb-4 text-[13px] text-slate-500">
              Select which departments <strong>{selectedUser.firstName} {selectedUser.lastName}</strong> should be assigned to:
            </p>
            
            <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
              {departments.map((dept) => (
                <label
                  key={dept.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${
                    selectedDepartments.includes(dept.name)
                      ? "border-[#800020] bg-[#800020]/5"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded border transition ${
                      selectedDepartments.includes(dept.name)
                        ? "border-[#800020] bg-[#800020]"
                        : "border-slate-300"
                    }`}
                  >
                    {selectedDepartments.includes(dept.name) && (
                      <Check className="h-3.5 w-3.5 text-white" />
                    )}
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedDepartments.includes(dept.name)}
                    onChange={() => toggleDepartment(dept.name)}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="text-[13px] font-medium text-slate-700">
                      {dept.name}
                    </span>
                  </div>
                </label>
              ))}
            </div>
            
            {departments.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center mb-6">
                <AlertCircle className="mx-auto h-5 w-5 text-slate-400" />
                <p className="mt-2 text-[12px] text-slate-500">No departments available</p>
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDepartments}
                disabled={saving || departments.length === 0}
                className="flex items-center gap-2 rounded-lg bg-[#800020] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#660018] disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orphan Protection Modal — blocks deactivation when active proposals exist */}
      {orphanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50">
                <AlertCircle className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-slate-900">Cannot Deactivate</h3>
                <p className="mt-1 text-[13px] text-slate-500">
                  <strong>{orphanModal.userName}</strong> has {orphanModal.orphans.length} active proposal{orphanModal.orphans.length !== 1 ? "s" : ""} that must be reassigned or resolved before deactivation.
                </p>
              </div>
            </div>
            <div className="mb-5 max-h-40 overflow-y-auto rounded-lg border border-rose-100 bg-rose-50/60 divide-y divide-rose-100">
              {orphanModal.orphans.map((o) => (
                <div key={o.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-[12px] font-medium text-slate-700">{o.clientName}</span>
                  <span className="text-[11px] capitalize text-rose-600">{o.status}</span>
                </div>
              ))}
            </div>
            <p className="mb-4 text-[12px] text-slate-500">
              Reassign or close these proposals first, then retry deactivation.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setOrphanModal(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-slate-700 active:scale-95"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
