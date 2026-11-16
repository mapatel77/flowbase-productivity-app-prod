import { Layers } from "lucide-react";
import { connection } from "next/server";
import { notFound } from "next/navigation";

import { getSpaceData, getSpaceOptions } from "@/app/pages/actions";
import { SpaceView } from "@/components/pages/space-view";

export const maxDuration = 30;

type SpaceRouteProps = {
  params: Promise<{ spaceId: string }>;
};

/** A single space with the list of pages it contains. */
export default async function SpaceRoute({ params }: SpaceRouteProps) {
  await connection();

  const { spaceId } = await params;
  const id = Number(spaceId);

  if (!Number.isInteger(id) || id <= 0) notFound();

  const [spaceResult, optionsResult] = await Promise.all([
    getSpaceData(id),
    getSpaceOptions(),
  ]);

  if (!spaceResult.ok) notFound();

  return (
    <SpaceView
      initialSpace={spaceResult.data.space}
      initialPages={spaceResult.data.pages}
      spaceOptions={optionsResult.ok ? optionsResult.data : []}
    />
  );
}
