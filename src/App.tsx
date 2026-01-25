import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/store/AppState";
import AppLayout from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import AICommandPage from "./pages/AICommandPage";
import SQLEditorPage from "./pages/SQLEditorPage";
import SchemaPage from "./pages/SchemaPage";
import ConnectionPage from "./pages/ConnectionPage";
import DatabasePage from "./pages/DatabasePage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/ai" element={<AICommandPage />} />
              <Route path="/sql-editor" element={<SQLEditorPage />} />
              <Route path="/schema" element={<SchemaPage />} />
              <Route path="/connection" element={<ConnectionPage />} />
              <Route path="/database" element={<DatabasePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
