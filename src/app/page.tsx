import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/db";

export default async function HomePage() {
  const token = (await cookies()).get("token")?.value;
  if (token) {
    const payload = verifyToken(token);
    if (payload) redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1b2d]">
      {/* Top nav */}
      <nav className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
            A
          </div>
          <span className="text-lg font-bold text-white tracking-tight">ACBot</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/login"
            className="text-sm text-slate-300 hover:text-white transition-colors px-4 py-2"
          >
            登录
          </a>
          <a
            href="/register"
            className="text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors px-4 py-2 rounded-lg font-medium"
          >
            注册
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="max-w-3xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            社区日常维护
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
              更轻松
            </span>
          </h1>
          <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto">
            帮你和朋友的 KOOK 社区打理欢迎、签到、群管等日常事务，配置简单，省心省力。
          </p>

          <div className="flex items-center justify-center gap-3">
            <a
              href="/register"
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              立即开始
            </a>
            <a
              href="/login"
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-medium transition-colors"
            >
              登录控制台
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div>
              <div className="text-3xl font-bold text-white">33+</div>
              <div className="text-sm text-slate-500 mt-1">功能模块</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">87</div>
              <div className="text-sm text-slate-500 mt-1">在线运行</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">89</div>
              <div className="text-sm text-slate-500 mt-1">接入机器人</div>
            </div>
          </div>
        </div>
      </div>

      <footer className="text-center py-6 text-sm text-slate-600">
        ACBot · 社区管理工具
      </footer>
    </div>
  );
}
