import React, { useEffect, useState } from 'react';
import { api } from '../api';
import ModelGallery from '../components/ModelGallery';

export default function Home() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .list()
      .then(setModels)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1>3D Model Library</h1>
        <p className="muted">Browse and view GLB models in your browser.</p>
      </div>
      {loading && <p className="muted">Loading models…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && <ModelGallery models={models} />}
    </div>
  );
}
