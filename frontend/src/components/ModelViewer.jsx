import React, { useEffect, useRef, useState, Component } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const LOAD_TIMEOUT_MS = 30000;

/** Catches render-time errors inside the canvas so a bad model can't crash the whole page. */
class ViewerErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    console.error('3D viewer render error:', err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="viewer-message">
          <p className="error">Something went wrong rendering this model.</p>
          <button onClick={() => this.setState({ hasError: false })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function FitCameraOnce({ scene }) {
  const { camera } = useThree();
  const fitted = useRef(false);

  useEffect(() => {
    fitted.current = false;
  }, [scene]);

  useEffect(() => {
    if (fitted.current) return;
    const box = new THREE.Box3().setFromObject(scene);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3()).length() || 1;
    const center = box.getCenter(new THREE.Vector3());
    camera.position.copy(center.clone().add(new THREE.Vector3(size * 0.6, size * 0.45, size * 0.6)));
    camera.near = Math.max(size / 100, 0.01);
    camera.far = size * 100;
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    fitted.current = true;
  });

  return null;
}

/**
 * Self-contained lighting rig — deliberately avoids drei's <Stage>/<Environment>,
 * which fetch an HDR lighting map from a remote CDN. That external dependency
 * is a common cause of a viewer hanging forever on "Loading…": if that fetch
 * stalls (slow network, ad-blocker, corporate firewall), there's no visible
 * error, just an infinite spinner. Plain three.js lights need no network at all.
 */
function Lighting() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
      <directionalLight position={[-5, 3, -4]} intensity={0.35} />
      <hemisphereLight args={['#ffffff', '#444444', 0.35]} />
    </>
  );
}

export default function ModelViewer({ url }) {
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [scene, setScene] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setStatus('loading');
    setProgress(0);
    setErrorMsg('');
    setScene(null);

    const loader = new GLTFLoader();

    // Belt-and-braces: even if some unforeseen issue causes the load to
    // stall silently, this guarantees the user sees an error (with a retry
    // button) instead of a spinner that never resolves.
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        cancelled = true;
        setStatus('error');
        setErrorMsg('This is taking too long to load. Check your connection and try again.');
      }
    }, LOAD_TIMEOUT_MS);

    loader.load(
      url,
      (gltf) => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        setScene(gltf.scene);
        setStatus('ready');
      },
      (evt) => {
        if (cancelled || !evt.lengthComputable) return;
        setProgress(Math.round((evt.loaded / evt.total) * 100));
      },
      (err) => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        console.error('Failed to load GLB model:', err);
        setStatus('error');
        setErrorMsg('Failed to load this model file. It may be corrupted or missing.');
      }
    );

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [url, attempt]);

  if (!url) return null;

  return (
    <div className="model-viewer">
      {status === 'loading' && (
        <div className="viewer-message">
          <div className="loader-spinner" />
          <p className="muted">{progress > 0 ? `Loading… ${progress}%` : 'Loading…'}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="viewer-message">
          <p className="error">{errorMsg}</p>
          <button onClick={() => setAttempt((a) => a + 1)}>Retry</button>
        </div>
      )}

      {status === 'ready' && scene && (
        <ViewerErrorBoundary>
          <Canvas shadows camera={{ fov: 45, position: [3, 2, 3] }} dpr={[1, 2]}>
            <primitive object={scene} />
            <Lighting />
            <FitCameraOnce scene={scene} />
            <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
          </Canvas>
        </ViewerErrorBoundary>
      )}
    </div>
  );
}
