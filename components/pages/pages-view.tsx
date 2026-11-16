"use client";

import { FolderPlus, LayoutGrid, Plus, SearchX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  createPage,
  createSpace,
  deleteSpace,
  duplicateSpace,
  setSpaceArchived,
  toggleSpaceFavorite,
  updateSpace,
} from "@/app/pages/actions";
import { PageDialog, type PageFormValues } from "@/components/pages/page-dialog";
import { SpaceCard } from "@/components/pages/space-card";
import { SpaceDialog, type SpaceFormValues } from "@/components/pages/space-dialog";
import { SpaceListRow } from "@/components/pages/space-list-row";
import { SpaceMembersSheet } from "@/components/pages/space-members-sheet";
import { SpacesToolbar } from "@/components/pages/spaces-toolbar";
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
import { RECENT_SPACE_WINDOW_DAYS } from "@/lib/pages/constants";
import type {
  Space,
  SpaceFilter,
  SpaceSort,
} from "@/lib/pages/types";
import { cn } from "@/lib/utils";

type PagesViewProps = {
  initialSpaces: Space[];
  /** Spaces a new page can be added to. */
  spaceOptions: Array<{ id: number; name: string; color: Space["color"] }>;
};

const RECENT_WINDOW_MS = RECENT_SPACE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** The “All Spaces” screen. */
export function PagesView({ initialSpaces, spaceOptions }: PagesViewProps) {
  const router = useRouter();

  const [spaces, setSpaces] = useState<Space[]>(initialSpaces);
  const [options, setOptions] = useState(spaceOptions);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SpaceFilter>("all");
  const [sort, setSort] = useState<SpaceSort>("recently-updated");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [busy, setBusy] = useState(false);

  const [spaceDialogOpen, setSpaceDialogOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);

  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [pageDialogSpaceId, setPageDialogSpaceId] = useState<number | null>(null);

  const [membersSpace, setMembersSpace] = useState<Space | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Space | null>(null);

  const visibleSpaces = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();

    const filtered = spaces.filter((space) => {
      if (filter === "archived") {
        if (!space.archived) return false;
      } else if (space.archived) {
        return false;
      }

      if (filter === "favourite" && !space.favorite) return false;

      if (filter === "recent") {
        if (!space.lastOpenedAt) return false;
        if (now - space.lastOpenedAt.getTime() > RECENT_WINDOW_MS) {
          return false;
        }
      }

      if (!query) return true;

      return (
        space.name.toLowerCase().includes(query) ||
        (space.description ?? "").toLowerCase().includes(query) ||
        space.pageTitles.some((title) => title.toLowerCase().includes(query))
      );
    });

    return filtered.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "most-pages":
          return b.pageCount - a.pageCount || a.name.localeCompare(b.name);
        case "favorites":
          return (
            b.favoritePageCount - a.favoritePageCount ||
            a.name.localeCompare(b.name)
          );
        case "recently-updated":
        default:
          return b.updatedAt.getTime() - a.updatedAt.getTime();
      }
    });
  }, [spaces, search, filter, sort]);

  const replaceSpace = (updated: Space) => {
    setSpaces((current) =>
      current.map((space) => (space.id === updated.id ? updated : space)),
    );
    setOptions((current) =>
      current.map((option) =>
        option.id === updated.id
          ? { id: updated.id, name: updated.name, color: updated.color }
          : option,
      ),
    );
  };

  /* ── space actions ────────────────────────────────────────────────────── */

  const handleCreateSpace = async (values: SpaceFormValues) => {
    setBusy(true);
    try {
      const result = await createSpace({
        name: values.name,
        description: values.description,
        color: values.color,
      });

      if (!result.ok) {
        toast.add({
          title: "Could not create the space",
          description: result.error,
          type: "error",
        });
        return false;
      }

      setSpaces((current) => [result.data, ...current]);
      setOptions((current) => [
        { id: result.data.id, name: result.data.name, color: result.data.color },
        ...current,
      ]);
      toast.add({ title: "Space created", description: result.data.name });
      return true;
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateSpace = async (values: SpaceFormValues) => {
    if (!editingSpace) return false;

    setBusy(true);
    try {
      const result = await updateSpace({
        id: editingSpace.id,
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

      replaceSpace(result.data);
      toast.add({ title: "Space updated", description: result.data.name });
      return true;
    } finally {
      setBusy(false);
    }
  };

  const handleToggleFavorite = async (space: Space) => {
    const nextFavorite = !space.favorite;

    setSpaces((current) =>
      current.map((item) =>
        item.id === space.id ? { ...item, favorite: nextFavorite } : item,
      ),
    );

    const result = await toggleSpaceFavorite(space.id);

    if (!result.ok) {
      setSpaces((current) =>
        current.map((item) =>
          item.id === space.id ? { ...item, favorite: space.favorite } : item,
        ),
      );
      toast.add({
        title: "Could not update the favourite",
        description: result.error,
        type: "error",
      });
      return;
    }

    replaceSpace(result.data);
  };

  const handleDuplicateSpace = async (space: Space) => {
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

      setSpaces((current) => [result.data, ...current]);
      setOptions((current) => [
        { id: result.data.id, name: result.data.name, color: result.data.color },
        ...current,
      ]);
      toast.add({ title: "Space duplicated", description: result.data.name });
    } finally {
      setBusy(false);
    }
  };

  const handleArchiveSpace = async (space: Space) => {
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

    setSpaces((current) =>
      current.map((item) =>
        item.id === space.id
          ? { ...item, archived: nextArchived, updatedAt: new Date() }
          : item,
      ),
    );

    toast.add({
      title: nextArchived ? "Space archived" : "Space restored",
      description: space.name,
    });
  };

  const handleDeleteSpace = async () => {
    if (!deleteTarget) return;

    setBusy(true);
    try {
      const result = await deleteSpace(deleteTarget.id);

      if (!result.ok) {
        toast.add({
          title: "Could not delete the space",
          description: result.error,
          type: "error",
        });
        return;
      }

      setSpaces((current) =>
        current.filter((space) => space.id !== deleteTarget.id),
      );
      setOptions((current) =>
        current.filter((option) => option.id !== deleteTarget.id),
      );
      toast.add({ title: "Space deleted", description: deleteTarget.name });
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  };

  /* ── page actions ─────────────────────────────────────────────────────── */

  const openPageDialog = (spaceId: number | null) => {
    setPageDialogSpaceId(spaceId);
    setPageDialogOpen(true);
  };

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

      toast.add({ title: "Page created", description: result.data.title });
      router.push(`/pages/${result.data.spaceId}/${result.data.id}`);
      return true;
    } finally {
      setBusy(false);
    }
  };

  const spaceCount = visibleSpaces.length;

  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 pb-10">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              All Spaces
            </h1>
            <p className="text-sm text-muted-foreground">
              {spaceCount} {spaceCount === 1 ? "space" : "spaces"}
            </p>
          </div>

          <Button
            onClick={() => {
              setEditingSpace(null);
              setSpaceDialogOpen(true);
            }}
            className="h-9 gap-1.5 rounded-xl"
          >
            <Plus className="size-4" />
            New Space
          </Button>
        </header>

        <SpacesToolbar
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
          sort={sort}
          onSortChange={setSort}
          view={view}
          onViewChange={setView}
        />

        {visibleSpaces.length === 0 ? (
          spaces.length === 0 ? (
            <Empty className="border border-dashed border-border/80 bg-card/40 py-14">
              <EmptyHeader>
                <EmptyMedia
                  variant="icon"
                  className="size-11 rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
                >
                  <FolderPlus />
                </EmptyMedia>
                <EmptyTitle>No spaces yet</EmptyTitle>
                <EmptyDescription>
                  Spaces are the top-level folders of your workspace. Create one
                  to start grouping pages, notes and plans together.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  onClick={() => {
                    setEditingSpace(null);
                    setSpaceDialogOpen(true);
                  }}
                  className="gap-1.5 rounded-xl"
                >
                  <Plus className="size-4" />
                  New Space
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <Empty className="border border-dashed border-border/80 bg-card/40 py-14">
              <EmptyHeader>
                <EmptyMedia
                  variant="icon"
                  className="size-11 rounded-2xl bg-muted text-muted-foreground"
                >
                  <SearchX />
                </EmptyMedia>
                <EmptyTitle>No spaces match this view</EmptyTitle>
                <EmptyDescription>
                  Try a different filter, clear the search or create a new
                  space.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                  className="gap-1.5 rounded-xl"
                >
                  <LayoutGrid />
                  Show all spaces
                </Button>
              </EmptyContent>
            </Empty>
          )
        ) : view === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleSpaces.map((space) => (
              <SpaceCard
                key={space.id}
                space={space}
                canManage={space.accessRole === "owner"}
                onToggleFavorite={(target) => void handleToggleFavorite(target)}
                onRename={(target) => {
                  setEditingSpace(target);
                  setSpaceDialogOpen(true);
                }}
                onChangeColor={(target) => {
                  setEditingSpace(target);
                  setSpaceDialogOpen(true);
                }}
                onAddPage={(target) => openPageDialog(target.id)}
                onInvite={(target) => setMembersSpace(target)}
                onDuplicate={(target) => void handleDuplicateSpace(target)}
                onArchive={(target) => void handleArchiveSpace(target)}
                onDelete={(target) => setDeleteTarget(target)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {visibleSpaces.map((space) => (
              <SpaceListRow
                key={space.id}
                space={space}
                canManage={space.accessRole === "owner"}
                onToggleFavorite={(target) => void handleToggleFavorite(target)}
                onRename={(target) => {
                  setEditingSpace(target);
                  setSpaceDialogOpen(true);
                }}
                onChangeColor={(target) => {
                  setEditingSpace(target);
                  setSpaceDialogOpen(true);
                }}
                onAddPage={(target) => openPageDialog(target.id)}
                onInvite={(target) => setMembersSpace(target)}
                onDuplicate={(target) => void handleDuplicateSpace(target)}
                onArchive={(target) => void handleArchiveSpace(target)}
                onDelete={(target) => setDeleteTarget(target)}
              />
            ))}
          </div>
        )}
      </div>

      <SpaceDialog
        key={editingSpace?.id ?? "space-create"}
        open={spaceDialogOpen}
        onOpenChange={setSpaceDialogOpen}
        space={editingSpace}
        busy={busy}
        onSubmit={(values) =>
          editingSpace ? handleUpdateSpace(values) : handleCreateSpace(values)
        }
      />

      <PageDialog
        key={`page-create-${pageDialogSpaceId ?? "any"}`}
        open={pageDialogOpen}
        onOpenChange={setPageDialogOpen}
        spaces={options}
        defaultSpaceId={pageDialogSpaceId}
        busy={busy}
        onSubmit={handleCreatePage}
      />

      <SpaceMembersSheet
        key={membersSpace?.id ?? "members"}
        open={membersSpace !== null}
        onOpenChange={(open) => {
          if (!open) setMembersSpace(null);
        }}
        space={membersSpace}
        onChanged={() => {
          if (!membersSpace) return;
          router.refresh();
        }}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this space?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.name}” and every page inside it will be
              permanently deleted. This cannot be undone.
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
