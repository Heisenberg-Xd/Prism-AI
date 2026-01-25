import React, { useState } from 'react';
import { useAppState } from '@/store/AppState';
import MenuBar from './MenuBar';
import Sidebar from './Sidebar';
import OutputPanel from './OutputPanel';
import CreateDatabaseModal from '@/components/modals/CreateDatabaseModal';
import CreateTableModal from '@/components/modals/CreateTableModal';
import CreateViewModal from '@/components/modals/CreateViewModal';
import CreateIndexModal from '@/components/modals/CreateIndexModal';
import ConfirmDropDatabaseModal from '@/components/modals/ConfirmDropDatabaseModal';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { state, dispatch } = useAppState();
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [outputHeight, setOutputHeight] = useState(180);

  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingOutput, setIsResizingOutput] = useState(false);

  const handleSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);

    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const onMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth + (e.clientX - startX);
      if (newWidth >= 180 && newWidth <= 500) {
        setSidebarWidth(newWidth);
      }
    };

    const onMouseUp = () => {
      setIsResizingSidebar(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleOutputResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingOutput(true);

    const startY = e.clientY;
    const startHeight = outputHeight;

    const onMouseMove = (e: MouseEvent) => {
      const newHeight = startHeight - (e.clientY - startY);
      if (newHeight >= 100 && newHeight <= 400) {
        setOutputHeight(newHeight);
      }
    };

    const onMouseUp = () => {
      setIsResizingOutput(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className={`h-full flex flex-col ${state.ui.theme}`}>
      <MenuBar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {state.ui.panels.sidebar && (
          <>
            <div style={{ width: sidebarWidth }} className="flex-shrink-0">
              <Sidebar />
            </div>
            <div
              className={`resizer resizer-h ${isResizingSidebar ? 'active' : ''}`}
              onMouseDown={handleSidebarResize}
            />
          </>
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main workspace */}
          <div className="flex-1 overflow-hidden">
            {children}
          </div>

          {/* Output panel */}
          {state.ui.panels.output && (
            <>
              <div
                className={`resizer resizer-v ${isResizingOutput ? 'active' : ''}`}
                onMouseDown={handleOutputResize}
              />
              <div style={{ height: outputHeight }} className="flex-shrink-0">
                <OutputPanel />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {state.ui.activeModal === 'create-database' && <CreateDatabaseModal />}
      {state.ui.activeModal === 'create-table' && <CreateTableModal />}
      {state.ui.activeModal === 'create-view' && <CreateViewModal />}
      {state.ui.activeModal === 'create-index' && <CreateIndexModal />}
      {state.ui.activeModal === 'confirm-drop-database' && <ConfirmDropDatabaseModal />}
    </div>
  );
}
