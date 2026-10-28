import { PlaceholderView } from "@/components/placeholder-view";
import { getNavItem } from "@/lib/navigation";

export default function PagesPage() {
  return <PlaceholderView item={getNavItem("/pages")} />;
}
