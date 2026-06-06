"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useState } from "react";
import { ToastProvider } from "@/components/Toast";
import FirstVisitTutorial from "@/components/FirstVisitTutorial";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud"
);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <ConvexProvider client={convex}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {children}
          <FirstVisitTutorial />
        </ToastProvider>
      </QueryClientProvider>
    </ConvexProvider>
  );
}
