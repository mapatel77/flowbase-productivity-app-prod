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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Toaster, toast } from "@/components/ui/toast";
import {
  createPage,
  deletePage,
  deleteSpace,
  duplicatePage,
  duplicateSpace,
  markSpaceOpened,
  movePage,
  setPageArchived,
  setSpaceArchived,
  togglePageFavorite,
  updatePage,
  updateSpace,
} from "@/app/pages/actions";
import { PageActionsMenu } from "@/components/pages/page-actions-menu";
import { PageDialog, type PageFormValues } from "@/components/pages/page-dialog";
import { PageMoveDialog } from "@/components/pages/page-move-dialog";
import { PagePreviewCard } from "@/components/pages/page-preview-card";
import { PageRenameDialog } from "@/components/pages/page-rename-dialog";
import { SpaceActionsMenu } from "@/components/pages/space-actions-menu";
import { SpaceDialog, type SpaceFormValues } from "@/components/pages/space-dialog";
import { SpaceMembersSheet } from "@/components/pages/space-members-sheet";
import { SpacePagesTable } from "@/components/pages/space-pages-table";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FilePlus2, Folder, FolderPlus } from "lucide-react";

import { categoryTones } from "@/lib/calendar/colors";
import { pageFileName, pageToMarkdown } from "@/lib/pages/export";
import type { Space, SpacePage } from "@/lib/pages/types";
import { cn } from "@/lib/utils";

type SpaceViewProps = {
  initialSpace: Space;
  initialPages: SpacePage[];
  /** Spaces a page can be moved to. */
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

/** The detail view of a single space. */
export function SpaceView({
  initialSpace,
  initialPages,
  spaceOptions,
}: SpaceViewProps) {
  const router = useRouter();

  const [space, setSpace] = useState<Space>(initialSpace);
  const [pages, setPages] = useState<SpacePage[]>(initialPages);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(
    initialPages[0]?.id ?? null,
  );
  const [busy, setBusy] = useState(false);

  const [spaceDialogOpen, setSpaceDialogOpen] = useState(false);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<SpacePage | null>(null);
  const [moveTarget, setMoveTarget] = useState<SpacePage | null>(null);
  const [deletePageTarget, setDeletePageTarget] = useState<SpacePage | null>(
    null,
  );
  const [deleteSpaceOpen, setDeleteSpaceOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const tone = categoryTones[space.color];
  const canEdit = space.accessRole !== "viewer";
  const canManage = space.accessRole === "owner";

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedPageId) ?? null,
    [pages, selectedPageId],
  );

  // Remember the visit so the space shows up under “Recently Opened”.
  useEffect(() => {
    void markSpaceOpened(space.id).then((result) => {
      if (!result.ok) {
        console.error("Could not record the space visit", result.error);
      }
    });
  }, [space.id]);

  const replacePage = (updated: SpacePage) => {
    setPages((current) =>
      current.map((page) => (page.id === updated.id ? updated : page)),
    );
  };

  /* ── page actions ─────────────────────────────────────────────────────── */

  const handleCreatePage = async (values: PageFormValues) => {
    setBusy(true);
    try {
      const result = await createPage({
        spaceId: values.spaceId,
        title: values.title,
        template: values.template,
      });

      if (!result.ok) {
        toast.add({
          title: "Could not create the page",
          description: result.error,
          type: "error",
        });
        return false;
      }

      setPages((current) => [result.data, ...current]);
      setSelectedPageId(result.data.id);
      toast.add({ title: "Page created", description: result.data.title });
      return true;
    } finally {
      setBusy(false);
    }
  };

  const handleRenamePage = async (title: string) => {
    if (!renameTarget) return false;

    setBusy(true);
    try {
      const result = await updatePage({ id: renameTarget.id, title });

      if (!result.ok) {
        toast.add({
          title: "Could not rename the page",
          description: result.error,
          type: "error",
        });
        return false;
      }

      replacePage(result.data);
      toast.add({ title: "Page renamed", description: result.data.title });
      return true;
    } finally {
      setBusy(false);
    }
  };

  const handleMovePage = async (spaceId: number) => {
    if (!moveTarget) return false;

    setBusy(true);
    try {
      const result = await movePage({ id: moveTarget.id, spaceId });

      if (!result.ok) {
        toast.add({
          title: "Could not move the page",
          description: result.error,
          type: "error",
        });
        return false;
      }

      setPages((current) =>
        current.filter((page) => page.id !== result.data.id),
      );
      setSelectedPageId(null);
      toast.add({
        title: "Page moved",
        description: `“${result.data.title}” moved to another space.`,
      });
      return true;
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicatePage = async (page: SpacePage) => {
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

      setPages((current) => [result.data, ...current]);
      setSelectedPageId(result.data.id);
      toast.add({ title: "Page duplicated", description: result.data.title });
    } finally {
      setBusy(false);
    }
  };

  const handleTogglePageFavorite = async (page: SpacePage) => {
    const nextFavorite = !page.favorite;

    setPages((current) =>
      current.map((item) =>
        item.id === page.id ? { ...item, favorite: nextFavorite } : item,
      ),
    );

    const result = await togglePageFavorite(page.id);

    if (!result.ok) {
      setPages((current) =>
        current.map((item) =>
          item.id === page.id ? { ...item, favorite: page.favorite } : item,
        ),
      );
      toast.add({
        title: "Could not update the favourite",
        description: result.error,
        type: "error",
      });
      return;
    }

    replacePage(result.data);
  };

  const handleSharePage = async (page: SpacePage) => {
    const url = `${window.location.origin}/pages/${page.spaceId}/${page.id}`;

    try {
      await navigator.clipboard.writeText(url);
      toast.add({ title: "Link copied", description: url });
    } catch {
      toast.add({
        title: "Could not copy the link",
        description: url,
      });
    }
  };

  const handleExportPage = (page: SpacePage) => {
    downloadMarkdown(page);
    toast.add({
      title: "Page exported",
      description: `${pageFileName(page.title)}.md was downloaded.`,
    });
  };

  const handleArchivePage = async (page: SpacePage) => {
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

    setPages((current) =>
      current.map((item) =>
        item.id === page.id
          ? { ...item, archived: nextArchived, updatedAt: new Date() }
          : item,
      ),
    );

    toast.add({
      title: nextArchived ? "Page archived" : "Page restored",
      description: page.title,
    });
  };

  const handleDeletePage = async () => {
    if (!deletePageTarget) return;

    setBusy(true);
    try {
      const result = await deletePage(deletePageTarget.id);

      if (!result.ok) {
        toast.add({
          title: "Could not delete the page",
          description: result.error,
          type: "error",
        });
        return;
      }

      setPages((current) =>
        current.filter((page) => page.id !== deletePageTarget.id),
      );
      if (selectedPageId === deletePageTarget.id) setSelectedPageId(null);
      toast.add({ title: "Page deleted", description: deletePageTarget.title });
      setDeletePageTarget(null);
    } finally {
      setBusy(false);
    }
  };

  /* ── space actions ────────────────────────────────────────────────────── */

  const handleUpdateSpace = async (values: SpaceFormValues) => {
    setBusy(true);
    try {
      const result = await updateSpace({
        id: space.id,
        name: values.name,
        description: values.description,
        color: values.color,
      });

      if (!result.ok) {
        toast.add({
          title: "Could not update the space",
          description: result.error,
          type: "error",
        });
        return false;
      }

      setSpace((current) => ({ ...current, ...result.data }));
      toast.add({ title: "Space updated", description: result.data.name });
      return true;
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicateSpace = async () => {
    setBusy(true);
    try {
      const result = await duplicateSpace(space.id);

      if (!result.ok) {
        toast.add({
          title: "Could not duplicate the space",
          description: result.error,
          type: "error",
        });
        return;
      }

      toast.add({ title: "Space duplicated", description: result.data.name });
      router.push(`/pages/${result.data.id}`);
    } finally {
      setBusy(false);
    }
  };

  const handleArchiveSpace = async () => {
    const nextArchived = !space.archived;

    const result = await setSpaceArchived(space.id, nextArchived);

    if (!result.ok) {
      toast.add({
        title: "Could not archive the space",
        description: result.error,
        type: "error",
      });
      return;
    }

    setSpace((current) => ({ ...current, archived: nextArchived }));
    toast.add({
      title: nextArchived ? "Space archived" : "Space restored",
      description: space.name,
    });

    if (nextArchived) router.push("/pages");
  };

  const handleDeleteSpace = async () => {
    setBusy(true);
    try {
      const result = await deleteSpace(space.id);

      if (!result.ok) {
        toast.add({
          title: "Could not delete the space",
          description: result.error,
          type: "error",
        });
        return;
      }

      toast.add({ title: "Space deleted", description: space.name });
      router.push("/pages");
    } finally {
      setBusy(false);
    }
  };

  const renderActions = (page: SpacePage) => (
    <PageActionsMenu
      page={page}
      canEdit={canEdit}
      onRename={() => setRenameTarget(page)}
      onMove={() => setMoveTarget(page)}
      onDuplicate={() => void handleDuplicatePage(page)}
      onToggleFavorite={() => void handleTogglePageFavorite(page)}
      onShare={() => void handleSharePage(page)}
      onExport={() => handleExportPage(page)}
      onArchive={() => void handleArchivePage(page)}
      onDelete={() => setDeletePageTarget(page)}
    />
  );

  const preview = selectedPage ? (
    <PagePreviewCard
      page={selectedPage}
      spaceName={space.name}
      spaceColor={space.color}
      actions={renderActions(selectedPage)}
      onOpen={() => setPreviewOpen(false)}
    />
  ) : null;

  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 pb-10">
        <header className="flex flex-col gap-3">
          <Breadcrumb>
            <BreadcrumbList className="text-[12px]">
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/pages" />}>
                  All Spaces
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{space.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-2xl",
                  tone.chip,
                )}
              >
                <Folder className="size-5" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate font-heading text-2xl font-semibold tracking-tight">
                  {space.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {pages.filter((page) => !page.archived).length}{" "}
                  {pages.filter((page) => !page.archived).length === 1
                    ? "page"
                    : "pages"}
                  {space.description ? ` · ${space.description}` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setPageDialogOpen(true)}
                disabled={!canEdit}
                className="h-9 gap-1.5 rounded-xl"
              >
                <FilePlus2 className="size-4" />
                New Page
              </Button>

              <SpaceActionsMenu
                space={space}
                canManage={canManage}
                onRename={() => setSpaceDialogOpen(true)}
                onChangeColor={() => setSpaceDialogOpen(true)}
                onAddPage={() => setPageDialogOpen(true)}
                onInvite={() => setMembersOpen(true)}
                onDuplicate={() => void handleDuplicateSpace()}
                onArchive={() => void handleArchiveSpace()}
                onDelete={() => setDeleteSpaceOpen(true)}
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl"
                    aria-label="Space options"
                  >
                    More
                  </Button>
                }
              />
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            {pages.length === 0 ? (
              <Empty className="border border-dashed border-border/80 bg-card/40 py-14">
                <EmptyHeader>
                  <EmptyMedia
                    variant="icon"
                    className="size-11 rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
                  >
                    <FolderPlus />
                  </EmptyMedia>
                  <EmptyTitle>No pages in this space yet</EmptyTitle>
                  <EmptyDescription>
                    Create your first page and pick a template to get started.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button
                    onClick={() => setPageDialogOpen(true)}
                    disabled={!canEdit}
                    className="gap-1.5 rounded-xl"
                  >
                    <FilePlus2 className="size-4" />
                    New Page
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <SpacePagesTable
                pages={pages}
                selectedPageId={selectedPageId}
                onSelect={(page) => {
                  setSelectedPageId(page.id);
                  setPreviewOpen(true);
                }}
                onToggleFavorite={(page) => void handleTogglePageFavorite(page)}
                actionsFor={renderActions}
              />
            )}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-20 rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_color-mix(in_oklch,var(--foreground)_6%,transparent),0_12px_28px_-18px_color-mix(in_oklch,var(--foreground)_38%,transparent)]">
              {preview ? (
                preview
              ) : (
                <p className="py-8 text-center text-[12px] text-muted-foreground">
                  Select a page to see a quick preview.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-sm">
          <SheetHeader className="border-b border-border/60 px-5 py-4">
            <SheetTitle>Page preview</SheetTitle>
            <SheetDescription>
              A quick look at the selected page.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-5">{preview}</div>
        </SheetContent>
      </Sheet>

      <SpaceDialog
        key={`space-edit-${space.id}`}
        open={spaceDialogOpen}
        onOpenChange={setSpaceDialogOpen}
        space={space}
        busy={busy}
        onSubmit={handleUpdateSpace}
      />

      <PageDialog
        key={`page-create-${space.id}`}
        open={pageDialogOpen}
        onOpenChange={setPageDialogOpen}
        spaces={[{ id: space.id, name: space.name, color: space.color }]}
        defaultSpaceId={space.id}
        busy={busy}
        onSubmit={handleCreatePage}
      />

      <PageRenameDialog
        key={`page-rename-${renameTarget?.id ?? "none"}`}
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        initialTitle={renameTarget?.title ?? ""}
        busy={busy}
        onSubmit={handleRenamePage}
      />

      <PageMoveDialog
        key={`page-move-${moveTarget?.id ?? "none"}`}
        open={moveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setMoveTarget(null);
        }}
        spaces={spaceOptions}
        currentSpaceId={space.id}
        busy={busy}
        onSubmit={handleMovePage}
      />

      <SpaceMembersSheet
        key={`space-members-${space.id}`}
        open={membersOpen}
        onOpenChange={setMembersOpen}
        space={space}
        onChanged={() => router.refresh()}
      />

      <AlertDialog
        open={deletePageTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeletePageTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this page?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deletePageTarget?.title}” will be permanently deleted. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeletePage()}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/85"
            >
              Delete page
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteSpaceOpen}
        onOpenChange={setDeleteSpaceOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this space?</AlertDialogTitle>
            <AlertDialogDescription>
              “{space.name}” and every page inside it will be permanently
              deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteSpace()}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/85"
            >
              Delete space
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </>
  );
}
