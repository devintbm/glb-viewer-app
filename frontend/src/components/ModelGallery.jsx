import React from 'react';
import { Link } from 'react-router-dom';

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ModelGallery({ models }) {
  if (!models.length) {
    return (
      <div className="empty-state">
        <p>No models yet.</p>
        <p className="muted">Upload one from the admin dashboard to see it here.</p>
      </div>
    );
  }

  return (
    <div className="gallery-grid">
      {models.map((m) => (
        <Link to={`/model/${m.id}`} key={m.id} className="gallery-card">
          <div className="gallery-card-thumb">
            <span className="cube-icon">◆</span>
          </div>
          <div className="gallery-card-body">
            <h3>{m.name}</h3>
            {m.description && <p className="muted">{m.description}</p>}
            <div className="gallery-card-meta">
              <span>{formatSize(m.file_size)}</span>
              <span>{new Date(m.uploaded_at).toLocaleDateString()}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
