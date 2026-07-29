import type { Metadata } from "next";
import { Suspense } from "react";
import { PipelinePageClient } from "./PipelinePageClient";

export const metadata: Metadata = { title: "Pipeline" };

export default function PipelinePage() {
  return (
    <Suspense fallback={null}>
      <PipelinePageClient />
    </Suspense>
  );
}
