import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/shell";
import { useAct1 } from "@/lib/act1-state";
import { RealAct1Rankings } from "@/components/act1-rankings";

export const Route = createFileRoute("/rankings")({
  head: () => ({
    meta: [
      { title: "Where you're born — Olympic medals per capita & GDP" },
      { name: "description", content: "Olympic medal rankings normalised by population and GDP." },
      { property: "og:title", content: "Where you're born — medals per capita & GDP" },
      { property: "og:description", content: "Olympic medal rankings normalised by population and GDP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Rankings,
});

function Rankings() {
  const { editions } = useAct1();
  return <div><PageHeader title="Where you're born" subtitle="Divide medals by people or money and the giants shrink. Small, rich countries rise." /><RealAct1Rankings editions={editions} /></div>;
}

