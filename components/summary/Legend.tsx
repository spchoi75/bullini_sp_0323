"use client";

export default function Legend() {
  return (
    <div className="border-t border-border p-3">
      <div className="mb-2 text-[10px] font-bold tracking-wider text-dim">
        범례
      </div>
      <div className="space-y-2 text-[11px]">
        {/* 노드 타입 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-5 rounded-lg border border-accent/40 bg-accent/10" />
            <span className="text-dim">이벤트</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-5 border border-border bg-card" />
            <span className="text-dim">수치</span>
          </div>
        </div>
        {/* 신뢰도 */}
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green" />
          <span className="text-dim">high</span>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow" />
          <span className="text-dim">medium</span>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red" />
          <span className="text-dim">low</span>
        </div>
        {/* 엣지 상태 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-0 w-6 border-t border-dim" />
            <span className="text-dim">확정값</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-0 w-6 border-t border-dashed border-yellow" />
            <span className="text-yellow">미입력</span>
          </div>
        </div>
      </div>
    </div>
  );
}
