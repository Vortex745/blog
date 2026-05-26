"use client";

import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandDialogTrigger,
  CommandDialogPopup,
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandGroupLabel,
  CommandCollection,
  CommandItem,
  CommandEmpty,
  CommandSeparator,
} from "@/components/ui/command";

interface SearchItem {
  id: string;
  title: string;
  description: string;
  url: string;
  type: "article" | "project";
}

interface SearchDialogProps {
  articles: { id: string; title: string; description: string; tags: string[] }[];
  projects: { id: string; title: string; description: string; tags: string[] }[];
}

export function SearchDialog({ articles, projects }: SearchDialogProps) {
  const [open, setOpen] = useState(false);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const items: SearchItem[] = [
    ...articles.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      url: `/articles/${a.id}/`,
      type: "article" as const,
    })),
    ...projects.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      url: `/projects/${p.id}/`,
      type: "project" as const,
    })),
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandDialogTrigger className="flex items-center text-white/80 transition-colors hover:text-white" aria-label="搜索">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </CommandDialogTrigger>

      <CommandDialogPopup className="max-w-xl">
        <Command onItemSelect={(value: string) => {
          const item = items.find((i) => i.id === value);
          if (item) window.location.href = item.url;
        }}>
          <CommandInput placeholder="搜索文章和项目… (Ctrl+K)" />
          <CommandList>
            <CommandEmpty>没有找到匹配的结果。</CommandEmpty>

            <CommandCollection>
              {articles.length > 0 && (
                <>
                  <CommandGroup>
                    <CommandGroupLabel>文章</CommandGroupLabel>
                    {articles.map((a) => (
                      <CommandItem key={a.id} value={a.id} onSelect={() => {
                        setOpen(false);
                        window.location.href = `/articles/${a.id}/`;
                      }}>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium">{a.title}</span>
                          <span className="text-xs text-muted-foreground line-clamp-1">{a.description}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {projects.length > 0 && (
                <CommandGroup>
                  <CommandGroupLabel>项目</CommandGroupLabel>
                  {projects.map((p) => (
                    <CommandItem key={p.id} value={p.id} onSelect={() => {
                      setOpen(false);
                      window.location.href = `/projects/${p.id}/`;
                    }}>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{p.title}</span>
                        <span className="text-xs text-muted-foreground line-clamp-1">{p.description}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandCollection>
          </CommandList>
        </Command>
      </CommandDialogPopup>
    </CommandDialog>
  );
}
