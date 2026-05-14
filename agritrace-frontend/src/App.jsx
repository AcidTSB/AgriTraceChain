import { AppRouter } from "./routes/AppRouter";
import { ApiEventBridge } from "./components/app/ApiEventBridge";
import { ToastViewport } from "./components/app/ToastViewport";

function App() {
  return (
    <>
      <ApiEventBridge />
      <AppRouter />
      <ToastViewport />
    </>
  );
}

export default App;
