"use client";

import { useState } from "react";
import {
  Settings,
  Bell,
  Shield,
  Palette,
  Save,
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"general" | "notifications" | "security" | "appearance">("general");

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">Settings</h2>
        <p className="text-[13px] text-slate-500">
          Manage your workspace preferences and configurations.
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar Tabs */}
        <div className="flex flex-col gap-1 lg:w-64">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition ${
              activeTab === "general"
                ? "bg-[#800000]/10 text-[#800000]"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Settings className="h-4 w-4" />
            General
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition ${
              activeTab === "notifications"
                ? "bg-[#800000]/10 text-[#800000]"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Bell className="h-4 w-4" />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition ${
              activeTab === "security"
                ? "bg-[#800000]/10 text-[#800000]"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Shield className="h-4 w-4" />
            Security
          </button>
          <button
            onClick={() => setActiveTab("appearance")}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition ${
              activeTab === "appearance"
                ? "bg-[#800000]/10 text-[#800000]"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Palette className="h-4 w-4" />
            Appearance
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 rounded-xl border border-slate-200/80 bg-white p-6">
          {activeTab === "general" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[16px] font-semibold text-slate-900">
                  General Settings
                </h3>
                <p className="text-[13px] text-slate-500">
                  Configure your workspace details
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Hyacinth Industries"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] outline-none focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Default From Email
                  </label>
                  <input
                    type="email"
                    defaultValue="proposals@hyacinth.com"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] outline-none focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Default Reply-To
                  </label>
                  <input
                    type="email"
                    defaultValue="admin@hyacinth.com"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] outline-none focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[16px] font-semibold text-slate-900">
                  Notification Preferences
                </h3>
                <p className="text-[13px] text-slate-500">
                  Choose when you want to be notified
                </p>
              </div>

              <div className="space-y-3">
                {[
                  "Proposal accepted",
                  "Proposal rejected",
                  "Proposal viewed",
                  "New team member added",
                  "Template updated",
                ].map((setting) => (
                  <label
                    key={setting}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
                  >
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 rounded border-slate-300 text-[#800000] focus:ring-[#800000]"
                    />
                    <span className="text-[13px] text-slate-700">{setting}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[16px] font-semibold text-slate-900">
                  Security Settings
                </h3>
                <p className="text-[13px] text-slate-500">
                  Manage your security preferences
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] outline-none focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] outline-none focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-[13px] outline-none focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[16px] font-semibold text-slate-900">
                  Appearance
                </h3>
                <p className="text-[13px] text-slate-500">
                  Customize your workspace look
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-slate-700">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[#800000]" />
                    <input
                      type="text"
                      defaultValue="#800000"
                      className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 text-[#800000] focus:ring-[#800000]"
                  />
                  <span className="text-[13px] text-slate-700">
                    Compact mode
                  </span>
                </label>
              </div>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
            <button className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50">
              Cancel
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-[#800000] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#660000]">
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
