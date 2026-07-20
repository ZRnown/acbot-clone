"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "登录失败");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - brand */}
      <div
        className="hidden md:flex md:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0f1b2d 0%, #0a1628 100%)" }}
      >
        <div className="absolute inset-0 bg-hatch pointer-events-none" />
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-6">
            A
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">ACBot</h1>
          <p className="text-slate-400 max-w-sm">
            帮你和朋友的 KOOK 社区打理欢迎、签到、群管等日常事务，配置简单，省心省力。
          </p>
          <div className="mt-12 grid grid-cols-3 gap-8 max-w-md">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">33+</div>
              <div className="text-xs text-slate-500 mt-1">功能模块</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">87</div>
              <div className="text-xs text-slate-500 mt-1">在线运行</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">89</div>
              <div className="text-xs text-slate-500 mt-1">接入机器人</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#f9fafb]">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">
              A
            </div>
          </div>

          <h2 className="text-2xl font-bold text-[#171d26] mb-2">欢迎回来</h2>
          <p className="text-sm text-slate-500 mb-8">登录后管理你的社区设置</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[#171d26] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full h-11 px-4 pr-11 rounded-xl border border-gray-200 bg-white text-[#171d26] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
            >
              {loading ? "登录中..." : "进入控制台"}
            </button>
          </form>

          <p className="text-sm text-slate-500 text-center mt-6">
            还没有账号？{" "}
            <a href="/register" className="text-blue-600 hover:text-blue-500 font-medium">
              立即注册
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
