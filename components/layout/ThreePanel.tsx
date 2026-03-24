"use client";

import React, { useState } from "react";

interface TwoPanelProps {
  left: React.ReactNode;
  center: React.ReactNode;
}

export default function ThreePanel({ left, center }: TwoPanelProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-full w-full mt-[40px]">
      {/* 사이드패널 토글 (좁은 화면용) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-0 top-[50px] z-40 rounded-r border border-l-0 border-border bg-panel px-1.5 py-3 text-[10px] text-dim hover:text-foreground"
        >
          ▶
        </button>
      )}

      {/* Left panel */}
      {sidebarOpen && (
        <aside
          className="relative w-[340px] min-w-[340px] overflow-y-auto border-r border-border bg-panel"
        >
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute right-2 top-2 z-10 text-[10px] text-dim hover:text-foreground xl:hidden"
          >
            ✕
          </button>
          {left}
        </aside>
      )}

      {/* Center — 그래프 */}
      <main
        className="flex-1 overflow-hidden bg-background min-w-0"
      >
        {center}
      </main>
    </div>
  );
}
