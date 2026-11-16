import { connection } from "next/server";
import { notFound } from "next/navigation";

import { getPageData, getSpaceOptions } from "@/app/pages/actions";
import { PageView } from "@/components/pages/page-view";

export const maxDuration = 30;

type PageRouteProps = {
  params: Promise<{ spaceId: string; pageId: string }>;
};

/** A single page with its full document and details. */
export default async function PageRoute({ params }: PageRouteProps) {
  await connection();

  const { spaceId, pageId } = await params;
  const space = Number(spaceId);
  const page = Number(pageId);

  if (!Number.isInteger(space) || space <= 0) notFound();
  if (!Number.isInteger(page) || page <= 0) notFound();

  const [pageResult, optionsResult] = await Promise.all([
    getPageData(space, page),
    getSpaceOptions(),
  ]);

  if (!pageResult.ok) notFound();

  return (
    <PageView
      initialSpace={pageResult.data.space}
      initialPage={pageResult.data.page}
      spaceOptions={optionsResult.ok ? optionsResult.data : []}
    />
  );
}
