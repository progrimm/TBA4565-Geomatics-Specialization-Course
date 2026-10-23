import { useEffect, useRef } from 'react';
import { Ion, Viewer } from 'cesium';

const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
if (ionToken) Ion.defaultAccessToken = ionToken;

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const viewer = new Viewer(containerRef.current);
    // Destroy on unmount so StrictMode's double-mount doesn't leak a WebGL context.
    return () => viewer.destroy();
  }, []);

  return <div ref={containerRef} className="globe" />;
}
