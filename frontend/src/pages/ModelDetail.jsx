import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import ModelViewer from '../components/ModelViewer';

export default function ModelDetail() {
  const { id } = useParams();
  const [model, setModel] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(id)
      .then(setModel)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!model) return <div className="page"><p className="muted">Loading…</p></div>;

  return (
    <div className="page">
      <Link to="/" className="back-link">← Back to library</Link>
      <div className="detail-layout">
        <ModelViewer url={api.fileUrl(id)} />
        <div className="detail-info">
          <h1>{model.name}</h1>
          {model.description && <p>{model.description}</p>}
          <dl>
            <dt>File size</dt>
            <dd>{(model.file_size / (1024 * 1024)).toFixed(2)} MB</dd>
            <dt>Uploaded</dt>
            <dd>{new Date(model.uploaded_at).toLocaleString()}</dd>
            {model.tags && (
              <>
                <dt>Tags</dt>
                <dd>{model.tags}</dd>
              </>
            )}
          </dl>
          <p className="muted hint">Drag to rotate · Scroll to zoom · Right-click to pan</p>
        </div>
      </div>
    </div>
  );
}
