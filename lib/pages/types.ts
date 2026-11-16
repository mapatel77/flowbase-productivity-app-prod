import type { JSONContent } from "@tiptap/core";

import type { ColorToken } from "@/lib/calendar/colors";

/** The JSON document persisted by Tiptap. */
export type PageDocument = JSONContent;

/** How the current viewer can interact with a space. */
export const SPACE_ROLES = ["owner", "editor", "viewer"] as const;

export type SpaceRole = (typeof SPACE_ROLES)[number];

/** The starting point a page is created from. */
export const PAGE_TEMPLATES = [
  "blank",
  "project-plan",
  "meeting-notes",
  "prd",
  "research-notes",
  "task-plan",
] as const;

export type PageTemplate = (typeof PAGE_TEMPLATES)[number];

/** Sort options offered on the spaces grid. */
export const SPACE_SORTS = [
  "recently-updated",
  "name",
  "most-pages",
  "favorites",
] as const;

export type SpaceSort = (typeof SPACE_SORTS)[number];

/** Filter tabs offered on the spaces grid. */
export const SPACE_FILTERS = ["all", "favourite", "recent", "archived"] as const;

export type SpaceFilter = (typeof SPACE_FILTERS)[number];

/** A space member, including pending invites that have no account yet. */
export type SpaceMember = {
  /** `null` for the owner entry; member row id for invited collaborators. */
  id: number | null;
  userId: number | null;
  name: string;
  email: string;
  role: SpaceRole;
  status: "active" | "pending";
  color: ColorToken;
};

/** The signed-in person viewing the Pages & Spaces module. */
export type SpaceViewer = {
  id: number;
  name: string;
  email: string;
  color: ColorToken;
};

/** A top-level folder that owns a list of pages. */
export type Space = {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  color: ColorToken;
  favorite: boolean;
  archived: boolean;
  lastOpenedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** The current viewer's access level for this space. */
  accessRole: SpaceRole;
  /** Number of pages that are not archived. */
  pageCount: number;
  /** Number of favourited pages inside the space. */
  favoritePageCount: number;
  /** Titles of the active pages, used by the "search spaces or pages" input. */
  pageTitles: string[];
  members: SpaceMember[];
};

/** A single document inside a space. */
export type SpacePage = {
  id: number;
  spaceId: number;
  userId: number;
  title: string;
  template: PageTemplate;
  description: string | null;
  content: PageDocument;
  plainText: string;
  favorite: boolean;
  archived: boolean;
  commentsCount: number;
  linkedTasksCount: number;
  lastEditedById: number | null;
  /** Display name of the last editor, resolved for the "Updated By" column. */
  lastEditedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SpacesData = {
  viewer: SpaceViewer;
  spaces: Space[];
};

export type SpaceDetail = {
  viewer: SpaceViewer;
  space: Space;
  pages: SpacePage[];
};

export type PageDetail = {
  viewer: SpaceViewer;
  space: Space;
  page: SpacePage;
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type PageSaveResult = {
  updatedAt: Date;
  title: string;
  plainText: string;
};
