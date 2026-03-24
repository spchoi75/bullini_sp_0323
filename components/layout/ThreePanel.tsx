"use client";

import React from "react";

interface TwoPanelProps {
  left: React.ReactNode;
  center: React.ReactNode;
}

export default function ThreePanel({ left, center }: TwoPanelProps) {
  return (
    <div className="flex h-full w-full" style={{ marginTop: 40 }}>
      {/* Left panel — 사이드패널 통합 */}
      <aside
        className="w-[340px] min-w-[340px] overflow-y-auto border-r border-border"
        style={{ backgroundColor: "var(--panel)" }}
      >
        {left}
      </aside>

      {/* Center — 그래프 */}
      <main
        className="flex-1 overflow-hidden"
        style={{ backgroundColor: "var(--background)" }}
      >
        {center}
      </main>
    </div>
  );
}
