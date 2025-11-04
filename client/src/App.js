import React from 'react';
import Desktop from './components/system7/Desktop';
import MenuBar from './components/system7/MenuBar';

function App() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-s7-pattern" data-testid="desktop-container">
      <MenuBar />
      <Desktop />
    </div>
  );
}

export default App;
