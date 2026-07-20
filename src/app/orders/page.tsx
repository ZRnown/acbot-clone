"use client";

import { Sidebar } from "@/components/sidebar";
import { Receipt } from "lucide-react";

export default function OrdersPage() {
  return (
    <Sidebar>
      <div className="flex-1 overflow-y-auto">
        <div className="h-[60px] border-b border-gray-200 flex items-center px-6 bg-white">
          <h1 className="text-lg font-semibold text-[#171d26]">我的账单</h1>
        </div>
        <div className="p-6">
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Receipt className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-500 mb-1">暂无账单记录</p>
            <p className="text-xs text-slate-400">所有账单和订阅记录将显示在这里</p>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}
