"use client";

import { FilePlus2, FolderInput, LayoutTemplate } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ColorToken } from "@/lib/calendar/colors";
import { PAGE_TITLE_MAX_LENGTH } from "@/lib/pages/constants";
import { PAGE_TEMPLATE_OPTIONS } from "@/lib/pages/templates";
import type { PageTemplate } from "@/lib/pages/types";

export type PageFormValues = {
  title: string;
  spaceId: number;
  template: PageTemplate;
};

export type SpaceOption = {
  id: number;
  name: string;
  color: ColorToken;
};

type PageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Spaces the page can be added to. */
  spaces: SpaceOption[];
  /** Pre-selected space, e.g. the one the user is currently in. */
  defaultSpaceId?: number | null;
  busy?: boolean;
  onSubmit: (values: PageFormValues) => Promise<boolean>;
};

/** Side panel used to create a page inside a space. */
export function PageDialog({
  open,
  onOpenChange,
  spaces,
  defaultSpaceId = null,
  busy = false,
  onSubmit,
}: PageDialogProps) {
  const [title, setTitle] = useState("");
  const [spaceId, setSpaceId] = useState<number | null>(defaultSpaceId);
  const [template, setTemplate] = useState<PageTemplate>("blank");

  const selectedSpaceId =
    spaceId ?? defaultSpaceId ?? spaces[0]?.id ?? null;
  const selectedSpace = spaces.find((space) => space.id === selectedSpaceId);
  const selectedTemplate =
    PAGE_TEMPLATE_OPTIONS.find((option) => option.value === template) ??
    PAGE_TEMPLATE_OPTIONS[0];

  const submit = async () => {
    if (busy || selectedSpaceId === null) return;

    const saved = await onSubmit({
      title: title.trim(),
      spaceId: selectedSpaceId,
      template,
    });

    if (saved) {
      setTitle("");
      setTemplate("blank");
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 px-5 py-4">
          <SheetTitle>Create a new page</SheetTitle>
          <SheetDescription>
            Pages are the documents inside a space. Pick a template to start
            from.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="page-name">Page name</Label>
            <Input
              id="page-name"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submit();
                }
              }}
              placeholder="e.g. Q2 Roadmap"
              autoFocus
              maxLength={PAGE_TITLE_MAX_LENGTH}
              className="h-9 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>
              <FolderInput className="size-4 text-violet-500 dark:text-violet-400" />
              Add to space
            </Label>
            <Select
              value={selectedSpaceId === null ? null : String(selectedSpaceId)}
              onValueChange={(value) => {
                if (value === null) return;
                setSpaceId(Number(value));
              }}
              disabled={spaces.length === 0}
            >
              <SelectTrigger className="h-9 w-full rounded-xl">
                <SelectValue>
                  {(value) =>
                    spaces.find((space) => space.id === Number(value))
                      ?.name ?? "Choose a space"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {spaces.map((space) => (
                  <SelectItem key={space.id} value={String(space.id)}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {spaces.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Create a space first — pages always live inside one.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>
              <LayoutTemplate className="size-4 text-violet-500 dark:text-violet-400" />
              Template
            </Label>
            <Select
              value={template}
              onValueChange={(value) => {
                if (value === null) return;
                setTemplate(value as PageTemplate);
              }}
            >
              <SelectTrigger className="h-9 w-full rounded-xl">
                <SelectValue>
                  {(value) =>
                    PAGE_TEMPLATE_OPTIONS.find(
                      (option) => option.value === value,
                    )?.label ?? "Blank Page"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAGE_TEMPLATE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {selectedTemplate?.description}
            </p>
          </div>
        </div>

        <SheetFooter className="border-t border-border/60 px-5 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={busy || selectedSpaceId === null}
            className="gap-1.5 rounded-xl"
          >
            <FilePlus2 className="size-4" />
            Create page
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
