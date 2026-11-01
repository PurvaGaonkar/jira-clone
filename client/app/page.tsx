import KanbanBoard from "@/components/KanbanBoard";
import { AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@radix-ui/react-avatar";
import { ChevronRight, MoreHorizontal, Share2 } from "lucide-react";
import { Suspense } from "react";

export default function Home() {
  return (
    <div className="flex h-full flex-col p-6 overflow-hidden">
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-[#5E6C84]">
          <span>Projects</span>
          <ChevronRight className="h-4 w-4" />
          <span>Platform Services</span>
          <ChevronRight className="h-4 w-4" />
          <span>Kanban Board</span>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#172B4D]">
            Kanban Board
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map((i) => (
              <Avatar
                key={i}
                className="h-8 w-8 border-2 border-white rounded-full"
              >
                <AvatarImage src={`https://i.pravatar.cc/150?u=${i}`} />
                <AvatarFallback>U{i}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full border-dashed bg-transparent"
          >
            Only My Issues
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-full border-dashed bg-transparent"
          >
            Recently Updated
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto min-h-0">
        <Suspense fallback={<div>Loading board...</div>}>
          <KanbanBoard />
        </Suspense>
      </div>
    </div>
  );
}
