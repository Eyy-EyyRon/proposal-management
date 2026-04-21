"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  Users,
  ArrowLeft,
  X,
  Loader2,
  Search,
  Trash2,
  MoreHorizontal,
  Lock,
} from "lucide-react";
import { useIsElevated, useAuth } from "@/contexts/auth-context";
import { JITGuard } from "@/components/jit-guard";
import { JitElevationModal } from "@/components/jit-elevation-modal";
import {
  subscribeToDepartmentsList,
  subscribeToAllUsers,
  createDepartment,
  deleteDepartment,
  type FirestoreDepartment,
  type TeamMember,
} from "@/lib/firestore";

type ViewMode = "grid" | "detail";

export default function DepartmentsPage() {
  const isElevated = useIsElevated();
  const { profile } = useAuth();
  const [departments, setDepartments] = useState<FirestoreDepartment[]>([]);
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedDept, setSelectedDept] = useState<FirestoreDepartment | null>(null);
  
  // Create department modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [creating, setCreating] = useState(false);
  
  // Delete state
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showElevationModal, setShowElevationModal] = useState(false);

  useEffect(() => {
    if (profile?.role !== "super_admin") return;
    const unsubDepts = subscribeToDepartmentsList((data) => {
      setDepartments(data);
      setLoading(false);
    });
    
    const unsubUsers = subscribeToAllUsers((data) => {
      setUsers(data);
    });
    
    return () => {
      unsubDepts();
      unsubUsers();
    };
  }, [profile?.role]);

  const getDepartmentUsers = (deptName: string): TeamMember[] => {
    return users.filter(
      (u) => u.departments?.includes(deptName) || u.department === deptName
    );
  };

  const getDepartmentUserCount = (deptName: string): number => {
    return getDepartmentUsers(deptName).length;
  };

  const handleCreateDepartment = async () => {
    if (!newDeptName.trim()) return;
    setCreating(true);
    try {
      await createDepartment({
        name: newDeptName.trim(),
        description: newDeptDesc.trim(),
      });
      setNewDeptName("");
      setNewDeptDesc("");
      setIsCreateModalOpen(false);
    } finally {
      setCreating(false);
    }
  };

  const doDeleteDepartment = async (id: string) => {
    setDeleting(id);
    try {
      await deleteDepartment(id);
      if (selectedDept?.id === id) {
        setViewMode("grid");
        setSelectedDept(null);
      }
    } finally {
      setDeleting(null);
    }
  };

  const openDepartmentDetail = (dept: FirestoreDepartment) => {
    setSelectedDept(dept);
    setViewMode("detail");
  };

  const goBackToGrid = () => {
    setViewMode("grid");
    setSelectedDept(null);
  };

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-8 pb-10 pt-24 lg:px-10">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        <p className="mt-4 text-[13px] text-slate-500">Loading departments...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col space-y-6 px-8 pb-10 pt-12 lg:px-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            {viewMode === "detail" && selectedDept ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={goBackToGrid}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {selectedDept.name}
              </div>
            ) : (
              "Departments"
            )}
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            {viewMode === "detail" && selectedDept
              ? `Managing ${getDepartmentUserCount(selectedDept.name)} team members`
              : "Create and manage your organization departments"}
          </p>
        </div>

        {viewMode === "grid" && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-[#800020] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#660018]"
          >
            <Plus className="h-4 w-4" />
            Create Department
          </button>
        )}
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <>
          {departments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Building2 className="h-8 w-8 text-slate-400" />
              </div>
              <p className="mt-4 text-lg font-semibold text-slate-800">
                No departments yet
              </p>
              <p className="mt-2 max-w-[300px] text-[13px] text-slate-500">
                Create your first department to start organizing your team members.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-6 flex items-center gap-2 rounded-lg bg-[#800020] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#660018]"
              >
                <Plus className="h-4 w-4" />
                Create First Department
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {departments.map((dept) => {
                const userCount = getDepartmentUserCount(dept.name);
                return (
                  <div
                    key={dept.id}
                    onClick={() => openDepartmentDetail(dept)}
                    className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-[#800020]/30 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#800020]/10">
                        <Building2 className="h-6 w-6 text-[#800020]" />
                      </div>
                      <JITGuard
                        actionLabel={`Delete department: ${dept.name}`}
                        onElevationNeeded={() => setShowElevationModal(true)}
                      >
                        {({ trigger }) => (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              trigger(() => doDeleteDepartment(dept.id));
                            }}
                            disabled={deleting === dept.id}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg opacity-0 transition-all group-hover:opacity-100 disabled:opacity-50 ${
                              isElevated
                                ? "text-slate-300 hover:bg-rose-50 hover:text-rose-500"
                                : "cursor-not-allowed text-slate-300 hover:bg-slate-50 hover:text-slate-400"
                            }`}
                            title={isElevated ? "Delete department" : "Requires elevation"}
                          >
                            {deleting === dept.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isElevated ? (
                              <Trash2 className="h-4 w-4" />
                            ) : (
                              <Lock className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </JITGuard>
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-slate-900">
                      {dept.name}
                    </h3>
                    {dept.description && (
                      <p className="mt-1 line-clamp-2 text-[12px] text-slate-500">
                        {dept.description}
                      </p>
                    )}

                    <div className="mt-4 flex items-center gap-2 text-[13px] text-slate-600">
                      <Users className="h-4 w-4" />
                      <span>
                        {userCount} {userCount === 1 ? "member" : "members"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Detail View */}
      {viewMode === "detail" && selectedDept && (
        <div className="space-y-6">
          {/* Department Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[12px] font-medium text-slate-500 uppercase">Total Members</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {getDepartmentUserCount(selectedDept.name)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[12px] font-medium text-slate-500 uppercase">Staff</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {getDepartmentUsers(selectedDept.name).filter((u) => u.role === "staff").length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-[12px] font-medium text-slate-500 uppercase">Admins</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {getDepartmentUsers(selectedDept.name).filter((u) => u.role === "admin" || u.role === "super_admin").length}
              </p>
            </div>
          </div>

          {/* Members Table */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="font-semibold text-slate-900">Department Members</h3>
            </div>
            
            {getDepartmentUsers(selectedDept.name).length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Users className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-[13px] text-slate-500">No members in this department</p>
                <p className="mt-1 text-[12px] text-slate-400">
                  Assign members from the Team Management page
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Member
                      </th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Job Title
                      </th>
                      <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Email
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getDepartmentUsers(selectedDept.name).map((user, i) => (
                      <tr
                        key={user.id}
                        className={`${
                          i !== getDepartmentUsers(selectedDept.name).length - 1
                            ? "border-b border-slate-100"
                            : ""
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#800020]/10 text-[11px] font-semibold text-[#800020]">
                              {user.firstName?.[0]}{user.lastName?.[0]}
                            </div>
                            <span className="text-[13px] font-medium text-slate-800">
                              {user.firstName} {user.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                              user.role === "super_admin"
                                ? "bg-violet-100 text-violet-700"
                                : user.role === "admin"
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {user.role === "super_admin" ? "Super Admin" : user.role === "admin" ? "Dept Admin" : "Staff"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[13px] text-slate-600">
                            {user.jobTitle || "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[13px] text-slate-500">
                            {user.email}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Department Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Create New Department
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  Department Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Marketing"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] outline-none transition focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  Description (Optional)
                </label>
                <textarea
                  placeholder="Brief description of this department"
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] outline-none transition focus:border-[#800020] focus:ring-2 focus:ring-[#800020]/20 resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDepartment}
                disabled={!newDeptName.trim() || creating}
                className="flex items-center gap-2 rounded-lg bg-[#800020] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#660018] disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Department
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* JIT Elevation Modal */}
      <JitElevationModal
        isOpen={showElevationModal}
        onClose={() => setShowElevationModal(false)}
      />
    </div>
  );
}
