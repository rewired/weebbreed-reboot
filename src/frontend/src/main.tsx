import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const Root = () => {
  return <div>WeedBreed dashboard placeholder</div>;
};

const mount = document.getElementById('root');

if (mount) {
  const root = createRoot(mount);
  root.render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
}
