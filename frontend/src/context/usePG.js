import { useContext } from "react";
import { PGContext } from "./pg-context-value";

export function usePG() {
  const context = useContext(PGContext);
  if (!context) throw new Error("usePG must be used inside PGProvider");
  return context;
}
