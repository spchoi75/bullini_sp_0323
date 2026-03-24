"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TopicInputProps {
  onSubmit: (topic: string) => void;
  isLoading?: boolean;
}

export default function TopicInput({ onSubmit, isLoading }: TopicInputProps) {
  const [topic, setTopic] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) onSubmit(topic.trim());
  };

  return (
    <div className="p-3">
      <div className="mb-2 text-[10px] font-bold tracking-wider text-dim">
        분석 주제
      </div>
      <form onSubmit={handleSubmit} className="space-y-2">
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="예: 한국 반도체 기업 주가에 영향을 미치는 요인"
          className="h-8 border-border bg-card text-xs text-foreground placeholder:text-dim"
        />
        <div className="flex gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={!topic.trim() || isLoading}
            className="h-7 flex-1 bg-accent text-xs font-semibold text-background hover:bg-accent/90"
          >
            {isLoading ? "생성 중..." : "인과 체인 생성"}
          </Button>
        </div>
      </form>
    </div>
  );
}
