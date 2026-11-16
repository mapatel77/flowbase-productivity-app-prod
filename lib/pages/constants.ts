/** Limits shared by the server actions and the dialogs that call them. */
export const SPACE_NAME_MAX_LENGTH = 80;
export const SPACE_DESCRIPTION_MAX_LENGTH = 240;
export const PAGE_TITLE_MAX_LENGTH = 120;
export const PAGE_DESCRIPTION_MAX_LENGTH = 280;

/** Debounce window for the page editor autosave. */
export const PAGE_SAVE_DEBOUNCE_MS = 1_200;

/** How much text can be sent through AI Refine in one go. */
export const PAGE_SELECTION_MAX_LENGTH = 6_000;

/** How long a space counts as "recently opened". */
export const RECENT_SPACE_WINDOW_DAYS = 7;

/** How many page titles are carried to the client for search. */
export const MAX_PAGE_TITLES_PER_SPACE = 200;
