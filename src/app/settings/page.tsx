"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/components/auth-provider";
import { User, Lock, Bot as BotIcon } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    if (newPassword.length < 6) {
      setError("新密码长度不能少于 6 位");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/settings/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "修改失败");
        return;
      }

      setSuccess("密码修改成功");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sidebar>
      <div className="flex-1 overflow-y-auto">
        <div className="h-[60px] border-b border-gray-200 flex items-center px-6 bg-white">
          <h1 className="text-lg font-semibold text-[#171d26]">个人设置</h1>
        </div>

        <div className="p-6 max-w-2xl space-y-6">
          {/* Account info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-[#171d26] mb-1">账户信息</h3>
            <p className="text-xs text-slate-400 mb-4">管理你的账户信息</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <User className="h-4 w-4" />
                  用户名
                </div>
                <span className="text-sm font-medium text-[#171d26]">{user?.username}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <BotIcon className="h-4 w-4" />
                  角色
                </div>
                <span className="text-sm font-medium text-[#171d26]">
                  {user?.role === "admin" ? "管理员" : "普通用户"}
                </span>
              </div>
            </div>
          </div>

          {/* Password change */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-[#171d26] mb-1">修改密码</h3>
            <p className="text-xs text-slate-400 mb-4">定期修改密码以保护账户安全</p>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">当前密码</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">新密码</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">确认新密码</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              {error && (
                <div className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</div>
              )}
              {success && (
                <div className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">{success}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="h-10 px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? "修改中..." : "修改密码"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}
