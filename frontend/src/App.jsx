import AppRouter from "./app/router";
import { PGProvider } from "./context/PGContext";

function App() {
  return (
    <PGProvider>
      <AppRouter />
    </PGProvider>
  );
}

export default App;
