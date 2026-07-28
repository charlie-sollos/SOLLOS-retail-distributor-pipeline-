import { Suspense } from "react";
import { PipelinePageClient } from "./PipelinePageClient";

export default function PipelinePage() {
  return (
    <Suspense fallback={null}>
      <PipelinePageClient />
    </Suspense>
  );
}
