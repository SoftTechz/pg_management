import { useEffect, useState } from "react";
import { getAllPGs } from "@/services/pg_service";

import { PGContext } from "./pg-context-value";
const SELECTED_PG_KEY = "selectedPgId";

export function PGProvider({ children }) {
  const [pgs, setPgs] = useState([]);
  const [selectedPgId, setSelectedPgId] = useState(
    () => localStorage.getItem(SELECTED_PG_KEY) || "",
  );

  useEffect(() => {
    getAllPGs()
      .then((items) => {
        const activePGs = (items || []).filter((pg) => pg.is_active !== false);
        setPgs(activePGs);
        if (!localStorage.getItem(SELECTED_PG_KEY) && activePGs[0]) {
          setSelectedPgId(activePGs[0].pg_id);
          localStorage.setItem(SELECTED_PG_KEY, activePGs[0].pg_id);
        }
      })
      .catch(() => setPgs([]));
  }, []);

  const selectPG = (pgId) => {
    setSelectedPgId(pgId);
    localStorage.setItem(SELECTED_PG_KEY, pgId);
    window.location.reload();
  };

  const selectedPG = pgs.find((pg) => pg.pg_id === selectedPgId) || null;
  return (
    <PGContext.Provider
      value={{ pgs, selectedPgId, selectedPG, selectPG, setPgs }}
    >
      {children}
    </PGContext.Provider>
  );
}
