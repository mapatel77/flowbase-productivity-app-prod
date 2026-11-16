"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "@/components/ui/toast";
import {
  deletePage,
  duplicatePage,
  movePage,
  setPageArchived,
  togglePageFavorite,
  updatePage,
} from "@/app/pages/actions";
import { PageActionsMenu } from "@/components/pages/page-actions-menu";
import { PageEditor } from "@/components/pages/page-editor";
import { PageMoveDialog } from "@/components/pages/page-move-dialog";
import { PageRenameDialog } from "@/components/pages/page-rename-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { categoryTones } from "@/lib/calendar/colors";
import { getUserColor, getUserInitials } from "@/lib/liveblocks/user-color";
import { pageFileName, pageToMarkdown } from "@/lib/pages/export";
import { getTemplateOption } from "@/lib/pages/templates";
import type { PageSaveResult, Space, SpacePage } from "@/lib/pages/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ListChecks, MessageSquare } from "lucide-react";

type PageViewProps = {
  initialSpace: Space;
  initialPage: SpacePage;
  /** Spaces the page can be moved to. */
  spaceOptions: Array<{ id: number; name: string; color: Space["color"] }>;
};

/** Downloads a page as a Markdown file. */
function downloadMarkdown(page: SpacePage) {
  const markdown = pageToMarkdown(page.title, page.content);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${pageFileName(page.title)}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4_000);
}

/** The detail view of a single page. */
export function PageView({
  initialSpace,
  initialPage,
  spaceOptions,
}: PageViewProps) {
  const router = useRouter();

  const [space] = useState<Space>(initialSpace);
  const [page, setPage] = useState<SpacePage>(initialPage);
  const [description, setDescription] = useState(initialPage.description ?? "");
  const [busy, setBusy] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const savedDescriptionRef = useRef(initialPage.description ?? "");

  const template = getTemplateOption(page.template);
  const TemplateIcon = template.icon;
  const canEdit = space.accessRole !== "viewer";

  // Keep the local description in sync when it changes elsewhere.
  useEffect(() => {
    setDescription(page.description ?? "");
    savedDescriptionRef.current = page.description ?? "";
  }, [page.description]);

  const handleSaved = (result: PageSaveResult) => {
    setPage((current) => ({
      ...current,
      title: result.title,
      plainText: result.plainText,
      updatedAt: result.updatedAt,
    }));
  };

  const saveDescription = async () => {
    const next = description.trim();
    if (next === savedDescriptionRef.current) return;

    setBusy(true);
    try {
      const result = await updatePage({
        id: page.id,
        description: next || null,
      });

      if (!result.ok) {
        toast.add({
          title: "Could not save the description",
          description: result.error,
          type: "error",
        });
        return;
      }

      savedDescriptionRef.current = result.data.description ?? "";
      setPage((current) => ({ ...current, description: result.data.description }));
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (title: string) => {
    setBusy(true);
    try {
      const result = await updatePage({ id: page.id, title });

      if (!result.ok) {
        toast.add({
          title: "Could not rename the page",
          description: result.error,
          type: "error",
        });
        return false;
      }

      setPage((current) => ({ ...current, title: result.data.title }));
      toast.add({ title: "Page renamed", description: result.data.title });
      return true;
    } finally {
      setBusy(false);
    }
  };

  const handleMove = async (spaceId: number) => {
    setBusy(true);
    try {
      const result = await movePage({ id: page.id, spaceId });

      if (!result.ok) {
        toast.add({
          title: "Could not move the page",
          description: result.error,
          type: "error",
        });
        return false;
      }

      toast.add({ title: "Page moved", description: result.data.title });
      router.push(`/pages/${spaceId}`);
      return true;
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicate = async () => {
    setBusy(true);
    try {
      const result = await duplicatePage(page.id);

      if (!result.ok) {
        toast.add({
          title: "Could not duplicate the page",
          description: result.error,
          type: "error",
        });
        return;
      }

      toast.add({ title: "Page duplicated", description: result.data.title });
      router.push(`/pages/${result.data.spaceId}/${result.data.id}`);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleFavorite = async () => {
    const nextFavorite = !page.favorite;

    setPage((current) => ({ ...current, favorite: nextFavorite }));

    const result = await togglePageFavorite(page.id);

    if (!result.ok) {
      setPage((current) => ({ ...current, favorite: page.favorite }));
      toast.add({
        title: "Could not update the favourite",
        description: result.error,
        type: "error",
      });
      return;
    }

    setPage((current) => ({ ...current, favorite: result.data.favorite }));
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/pages/${page.spaceId}/${page.id}`;

    try {
      await navigator.clipboard.writeText(url);
      toast.add({ title: "Link copied", description: url });
    } catch {
      toast.add({ title: "Could not copy the link", description: url });
    }
  };

  const handleExport = () => {
    downloadMarkdown(page);
    toast.add({
      title: "Page exported",
      description: `${pageFileName(page.title)}.md was downloaded.`,
    });
  };

  const handleArchive = async () => {
    const nextArchived = !page.archived;

    const result = await setPageArchived(page.id, nextArchived);

    if (!result.ok) {
      toast.add({
        title: "Could not archive the page",
        description: result.error,
        type: "error",
      });
      return;
    }

    setPage((current) => ({ ...current, archived: nextArchived }));
    toast.add({
      title: nextArchived ? "Page archived" : "Page restored",
      description: page.title,
    });
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      const result = await deletePage(page.id);

      if (!result.ok) {
        toast.add({
          title: "Could not delete the page",
          description: result.error,
          type: "error",
        });
        return;
      }

      toast.add({ title: "Page deleted", description: page.title });
      router.push(`/pages/${space.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-12">
        <Breadcrumb>
          <BreadcrumbList className="text-[12px]">
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href="/pages" />}>
                All Spaces
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={`/pages/${space.id}`} />}>
                {space.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{page.title || "Untitled page"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="h-6 gap-1.5 rounded-full px-2.5 text-[11px]"
            >
              <TemplateIcon className="size-3.5" />
              {template.label}
            </Badge>
            {page.archived ? (
              <Badge
                variant="outline"
                className="h-6 rounded-full px-2.5 text-[11px] text-muted-foreground"
              >
                Archived
              </Badge>
            ) : null}
          </div>

          <PageActionsMenu
            page={page}
            canEdit={canEdit}
            onRename={() => setRenameOpen(true)}
            onMove={() => setMoveOpen(true)}
            onDuplicate={() => void handleDuplicate()}
            onToggleFavorite={() => void handleToggleFavorite()}
            onShare={() => void handleShare()}
            onExport={handleExport}
            onArchive={() => void handleArchive()}
            onDelete={() => setDeleteOpen(true)}
            trigger={
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-xl"
                aria-label="Page options"
              >
                More
              </Button>
            }
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card px-4 py-3">
            <span className="flex size-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
              <MessageSquare className="size-4" />
            </span>
            <div>
              <p className="font-heading text-base font-semibold tracking-tight">
                {page.commentsCount}
              </p>
              <p className="text-[11px] text-muted-foreground">Comments</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card px-4 py-3">
            <span className="flex size-8 items-center justify-center rounded-xl bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
              <ListChecks className="size-4" />
            </span>
            <div>
              <p className="font-heading text-base font-semibold tracking-tight">
                {page.linkedTasksCount}
              </p>
              <p className="text-[11px] text-muted-foreground">Linked tasks</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card px-4 py-3">
            <Avatar size="sm">
              <AvatarFallback
                className={cn(
                  "text-[9px] font-semibold",
                  categoryTones[getUserColor(page.lastEditedByName ?? "You")].chip,
                )}
              >
                {getUserInitials(page.lastEditedByName, "You")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">
                {page.lastEditedByName ?? "You"}
              </p>
              <p className="text-[11px] text-muted-foreground">Last edited by</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="page-description"
            className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
          >
            Description
          </label>
          <Textarea
            id="page-description"
            ref={descriptionRef}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            onBlur={() => void saveDescription()}
            placeholder="What is this page about?"
            disabled={!canEdit}
            rows={2}
            className="resize-none rounded-xl"
          />
        </div>

        <div className="rounded-2xl border border-border/70 bg-card">
          <PageEditor
            key={page.id}
            page={page}
            onSaved={handleSaved}
          />
        </div>
      </div>

      <PageRenameDialog
        key={`page-rename-${page.id}-${renameOpen}`}
        open={renameOpen}
        onOpenChange={setRenameOpen}
        initialTitle={page.title}
        busy={busy}
        onSubmit={handleRename}
      />

      <PageMoveDialog
        key={`page-move-${page.id}-${moveOpen}`}
        open={moveOpen}
        onOpenChange={setMoveOpen}
        spaces={spaceOptions}
        currentSpaceId={space.id}
        busy={busy}
        onSubmit={handleMove}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this page?</AlertDialogTitle>
            <AlertDialogDescription>
              “{page.title}” and its content will be permanently deleted. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/85"
            >
              Delete page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </>
  );
}
