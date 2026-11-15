import type {
  ExcalidrawArrowElement,
  ExcalidrawElement,
  ExcalidrawTextElement,
} from "@excalidraw/excalidraw/element/types";
import { AI_DIAGRAM_FONT_SIZE } from "@/lib/whiteboard/constants";
import type {
  AiDiagramEdge,
  AiDiagramKind,
  AiDiagramNode,
  AiDiagramShape,
  AiDiagramSpec,
} from "@/lib/whiteboard/types";

// Font family ids mirror the runtime constants from @excalidraw/excalidraw
// (FONT_FAMILY.Nunito). Declared locally so this module never pulls the
// Excalidraw runtime into server-side bundles.
const FONT_FAMILY_NUNITO = 6;

const ARROW_COLOR = "#b4532a";
const NODE_STROKE = "#4a3428";
const DIAGRAM_BACKGROUNDS = [
  "#fdf3e3",
  "#e8f6ef",
  "#e9effc",
  "#f6e8f8",
  "#fdeae4",
  "#eef7f6",
];

const NODE_WIDTH = 200;
const NODE_HEIGHT = 72;

let elementSeed = 0;

function nextSeed() {
  elementSeed += 1;
  return elementSeed * 97 + Math.floor(Math.random() * 100);
}

function buildBase(
  element: Record<string, unknown>,
  type: ExcalidrawElement["type"],
): ExcalidrawElement {
  const id = String(element.id ?? `diagram-${nextSeed()}`);
  const seed = nextSeed();

  const base: Record<string, unknown> = {
    ...(element as object),
    id,
    type,
    x: Number(element.x ?? 0),
    y: Number(element.y ?? 0),
    strokeColor: String(element.strokeColor ?? NODE_STROKE),
    backgroundColor: String(element.backgroundColor ?? "#ffffff"),
    fillStyle: (element.fillStyle as ExcalidrawElement["fillStyle"]) ?? "solid",
    strokeWidth: Number(element.strokeWidth ?? 2),
    strokeStyle: (element.strokeStyle as ExcalidrawElement["strokeStyle"]) ?? "solid",
    roundness: (element.roundness as ExcalidrawElement["roundness"]) ?? null,
    roughness: Number(element.roughness ?? 0),
    opacity: Number(element.opacity ?? 100),
    width: Number(element.width ?? 0),
    height: Number(element.height ?? 0),
    angle: Number(element.angle ?? 0),
    seed,
    version: Number(element.version ?? 1),
    versionNonce: Number(element.versionNonce ?? Math.floor(Math.random() * 1e9)),
    index: element.index ?? null,
    isDeleted: Boolean(element.isDeleted ?? false),
    groupIds: (element.groupIds as string[]) ?? [],
    frameId: (element.frameId as string | null) ?? null,
    boundElements: (element.boundElements as Array<{ type: string; id: string }> | null) ?? null,
    updated: Number(element.updated ?? Date.now()),
    link: (element.link as string | null) ?? null,
    locked: Boolean(element.locked ?? false),
  };

  return base as ExcalidrawElement;
}

function containerElement(input: {
  id: string;
  type: AiDiagramShape;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string;
}): ExcalidrawElement {
  const element: Record<string, unknown> = {
    id: input.id,
    type: input.type,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    backgroundColor: input.backgroundColor,
    fillStyle: "solid",
    strokeColor: NODE_STROKE,
    strokeWidth: 2,
    strokeStyle: "solid",
  };

  const container = buildBase(element, input.type);
  if (input.type === "rectangle") {
    const rounded = container as unknown as { roundness: { type: string } };
    rounded.roundness = { type: "rounded" };
  }

  return container;
}

function textElement(input: {
  id: string;
  containerId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}): ExcalidrawTextElement {
  const element: Record<string, unknown> = {
    id: input.id,
    type: "text",
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    text: input.text,
    originalText: input.text,
    fontSize: AI_DIAGRAM_FONT_SIZE,
    fontFamily: FONT_FAMILY_NUNITO,
    textAlign: "center",
    verticalAlign: "middle",
    containerId: input.containerId,
    autoResize: true,
    lineHeight: 1.2 as ExcalidrawTextElement["lineHeight"],
  };

  const text = buildBase(element, "text") as ExcalidrawTextElement;
  return text;
}

function arrowElement(input: {
  id: string;
  fromId: string;
  toId: string;
  from: PositionedNode;
  to: PositionedNode;
}): ExcalidrawArrowElement | null {
  const startX = input.from.x + input.from.width / 2;
  const startY = input.from.y + input.from.height / 2;
  const endX = input.to.x + input.to.width / 2;
  const endY = input.to.y + input.to.height / 2;
  const dx = endX - startX;
  const dy = endY - startY;

  const element: Record<string, unknown> = {
    id: input.id,
    type: "arrow",
    x: startX,
    y: startY,
    width: Math.abs(dx),
    height: Math.abs(dy),
    strokeColor: ARROW_COLOR,
    backgroundColor: "#ffffff",
    fillStyle: "solid",
    strokeWidth: 2,
    strokeStyle: "solid",
    roundness: null,
    roughness: 0,
    opacity: 100,
    angle: 0,
    seed: nextSeed(),
    version: 1,
    versionNonce: Math.floor(Math.random() * 1e9),
    index: null,
    isDeleted: false,
    groupIds: [],
    frameId: null,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    // Excalidraw 0.18 stores linear-element points as [x, y] TUPLES
    // (pointFrom returns a tuple, and restore reads points[i][0]). Using
    // {x, y} objects makes restore compute undefined - undefined → NaN
    // geometry, which breaks the arrows on every reload.
    points: [
      [0, 0],
      [dx, dy],
    ] as unknown as ExcalidrawArrowElement["points"],
    startBinding: { elementId: input.fromId, focus: 0, gap: 6 },
    endBinding: { elementId: input.toId, focus: 0, gap: 6 },
    startArrowhead: null,
    endArrowhead: "arrow",
    elbowed: false,
    lastCommittedPoint: null,
  };

  const arrow = buildBase(element, "arrow") as ExcalidrawArrowElement;
  return arrow;
}

export type PositionedNode = {
  node: AiDiagramNode;
  x: number;
  y: number;
  width: number;
  height: number;
};

function layoutLayered(
  nodes: AiDiagramNode[],
  edges: AiDiagramEdge[],
): PositionedNode[] {
  const ids = new Set(nodes.map((node) => node.id));
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  for (const node of nodes) {
    outgoing.set(node.id, []);
    incoming.set(node.id, []);
  }

  for (const edge of edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) continue;
    outgoing.get(edge.from)?.push(edge.to);
    incoming.get(edge.to)?.push(edge.from);
  }

  // Level = distance from roots (nodes without incoming edges). Iterative
  // relaxation keeps this safe when the graph has cycles.
  const level = new Map<string, number>();
  for (const node of nodes) level.set(node.id, 0);

  for (let pass = 0; pass < nodes.length; pass += 1) {
    let changed = false;
    for (const node of nodes) {
      for (const parent of incoming.get(node.id) ?? []) {
        const parentLevel = level.get(parent) ?? 0;
        if (parentLevel >= (level.get(node.id) ?? 0)) {
          level.set(node.id, parentLevel + 1);
          changed = true;
        }
      }
    }
    if (!changed) break;
  }

  const columnWidth = NODE_WIDTH + 140;
  const rowHeight = NODE_HEIGHT + 48;

  // Each level becomes one column; siblings inside a column are stacked with
  // vertical breathing room instead of sitting on the same coordinates.
  const levels = new Map<number, AiDiagramNode[]>();
  for (const node of nodes) {
    const depth = level.get(node.id) ?? 0;
    const bucket = levels.get(depth) ?? [];
    bucket.push(node);
    levels.set(depth, bucket);
  }

  const positioned: PositionedNode[] = [];
  for (const depth of [...levels.keys()].sort((a, b) => a - b)) {
    const column = levels.get(depth) ?? [];
    const verticalCentering = -((column.length - 1) / 2) * rowHeight;
    column.forEach((node, rowIndex) => {
      positioned.push({
        node,
        x: depth * columnWidth,
        y: verticalCentering + rowIndex * rowHeight + 320,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    });
  }

  return positioned;
}

function layoutMindmap(
  nodes: AiDiagramNode[],
  edges: AiDiagramEdge[],
): PositionedNode[] {
  if (nodes.length === 0) return [];

  // The hub is whichever node the model connects the most arrows from, since
  // the nodes array order does not reliably put the topic first.
  const center = nodes.reduce((best, node) => {
    const count = (id: string) => edges.filter((edge) => edge.from === id).length;
    return count(node.id) > count(best.id) ? node : best;
  }, nodes[0]!);
  const children = nodes.filter((node) => node.id !== center.id);

  // Give children a wider circle as the branch count grows so labels never
  // overlap.
  const radius = Math.max(260, children.length * 46);
  const positioned: PositionedNode[] = [
    { node: center, x: 0, y: 0, width: NODE_WIDTH, height: NODE_HEIGHT },
  ];

  children.forEach((child, index) => {
    const angle = (index / Math.max(children.length, 1)) * Math.PI * 2 - Math.PI / 2;
    positioned.push({
      node: child,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.8,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  return positioned;
}

function layoutArchitecture(nodes: AiDiagramNode[]): PositionedNode[] {
  const groups = new Map<string, AiDiagramNode[]>();
  for (const node of nodes) {
    const key = node.group?.trim() || "ungrouped";
    const bucket = groups.get(key) ?? [];
    bucket.push(node);
    groups.set(key, bucket);
  }

  const columnWidth = NODE_WIDTH + 140;
  const rowHeight = NODE_HEIGHT + 40;
  const positioned: PositionedNode[] = [];

  // One column per service group, nodes stacked inside their column.
  [...groups.values()].forEach((groupNodes, groupIndex) => {
    const columnX = groupIndex * columnWidth + 40;
    groupNodes.forEach((node, rowIndex) => {
      positioned.push({
        node,
        x: columnX,
        y: rowIndex * rowHeight + 40,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
    });
  });

  return positioned;
}

export function buildDiagramElements(
  spec: AiDiagramSpec,
  kind: AiDiagramKind,
  options: { offsetX?: number; offsetY?: number } = {},
): ExcalidrawElement[] {
  // Some kinds come back from the model with no connections at all. For those
  //, synthesize arrows so the diagram is never a pile of disconnected boxes:
  // a hub-and-spoke for mind maps, a linear chain for everything else.
  const nodeIds = new Set(spec.nodes.map((node) => node.id));
  let edges = spec.edges.filter(
    (edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to) && edge.from !== edge.to,
  );
  if (edges.length === 0 && spec.nodes.length >= 2) {
    edges =
      kind === "mindmap"
        ? spec.nodes
            .slice(1)
            .map((node) => ({ from: spec.nodes[0]!.id, to: node.id, label: "" }))
        : spec.nodes
            .slice(0, -1)
            .map((node, index) => ({
              from: node.id,
              to: spec.nodes[index + 1]?.id ?? "",
              label: "",
            }));
  }

  const positioned =
    kind === "mindmap"
      ? layoutMindmap(spec.nodes, edges)
      : kind === "architecture"
        ? layoutArchitecture(spec.nodes)
        : layoutLayered(spec.nodes, edges);

  const positionedById = new Map(positioned.map((entry) => [entry.node.id, entry]));
  const offsetX = options.offsetX ?? 0;
  const offsetY = options.offsetY ?? 0;
  const elements: ExcalidrawElement[] = [];

  positioned.forEach((entry, index) => {
    const { node, x, y, width, height } = entry;
    const elementX = x + offsetX;
    const elementY = y + offsetY;

    const container = containerElement({
      id: node.id,
      type:
        node.shape === "diamond" ? "diamond" : node.shape === "ellipse" ? "ellipse" : "rectangle",
      x: elementX,
      y: elementY,
      width,
      height,
      backgroundColor: DIAGRAM_BACKGROUNDS[index % DIAGRAM_BACKGROUNDS.length],
    });

    const text = textElement({
      id: `${node.id}-text`,
      containerId: node.id,
      x: elementX + 12,
      y: elementY + 12,
      width: Math.max(width - 24, 40),
      height: Math.max(height - 24, 24),
      text: node.label,
    });

    const containerWithBinding = container as unknown as ExcalidrawElement & {
      boundElements?: Array<{ type: string; id: string }> | null;
    };
    containerWithBinding.boundElements = [{ type: "text", id: `${node.id}-text` }];

    elements.push(containerWithBinding, text);
  });

  // Track which arrows touch which node so the nodes can list them in their
  // boundElements — Excalidraw only treats a binding as valid when the bound
  // shape acknowledges the arrow.
  const arrowRefsByNode = new Map<string, Array<{ type: string; id: string }>>();

  for (const edge of edges) {
    const from = positionedById.get(edge.from);
    const to = positionedById.get(edge.to);
    if (!from || !to) continue;

    const arrow = arrowElement({
      id: `ai-arrow-${edge.from}-${edge.to}`,
      fromId: edge.from,
      toId: edge.to,
      from,
      to,
    });
    if (!arrow) continue;

    elements.push(arrow);
    for (const nodeId of [edge.from, edge.to]) {
      const refs = arrowRefsByNode.get(nodeId) ?? [];
      refs.push({ type: "arrow", id: arrow.id });
      arrowRefsByNode.set(nodeId, refs);
    }
  }

  // Attach the arrow references (the text binding is already on the container).
  for (const element of elements) {
    const refs = arrowRefsByNode.get(element.id);
    if (!refs?.length) continue;
    const patchable = element as unknown as {
      boundElements?: Array<{ type: string; id: string }> | null;
    };
    patchable.boundElements = [...(patchable.boundElements ?? []), ...refs];
  }

  return elements;
}

export function createStickyNote(input: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string;
  textColor: string;
  text: string;
}): ExcalidrawElement[] {
  const container = containerElement({
    id: input.id,
    type: "rectangle",
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    backgroundColor: input.backgroundColor,
  });

  const text = textElement({
    id: `${input.id}-text`,
    containerId: input.id,
    x: input.x + 12,
    y: input.y + 12,
    width: Math.max(input.width - 24, 40),
    height: Math.max(input.height - 24, 24),
    text: input.text,
  });

  const containerWithBinding = container as unknown as ExcalidrawElement & {
    boundElements?: Array<{ type: string; id: string }> | null;
    customData?: Record<string, unknown>;
  };
  containerWithBinding.boundElements = [{ type: "text", id: `${input.id}-text` }];
  containerWithBinding.customData = { kind: "sticky" };

  const stickyText = text as ExcalidrawTextElement & { strokeColor?: string };
  stickyText.strokeColor = input.textColor;

  return [containerWithBinding, text];
}
