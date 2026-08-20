import { useCallback, useSyncExternalStore } from "react";
import type { DeckProvider } from "./DeckProvider";

export function useDeckSnapshot(provider: DeckProvider) {
  const subscribe = useCallback(
    (listener: () => void) => provider.subscribe(listener),
    [provider],
  );
  const getSnapshot = useCallback(() => provider.getSnapshot(), [provider]);

  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );
}
