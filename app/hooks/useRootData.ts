import { useMatches } from "@remix-run/react";

interface RootData {
  shopStatus: {
    plan: string | null;
    setup_completed: boolean;
    subscription_status: string | null;
    end_date: string | null;
  };
}

export function useRootData() {
  const matches = useMatches();
  const rootMatch = matches.find((match) => match.data && 'apiKey' in match.data);
  const rootData = rootMatch?.data as RootData | undefined;

  return {
    setupCompleted: rootData?.shopStatus?.setup_completed ?? false,
    shopStatus: rootData?.shopStatus ?? null,
  };
}