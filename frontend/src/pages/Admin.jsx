import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import ModelViewer from '../components/ModelViewer';

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Admin() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // upload form state
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [progress, setProgress] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef();

  // editing state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const [previewId, setPreviewId] = useState(null);

  const refresh = () => api.list().then(setModels).catch((e) => setError(e.message));

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  function pickFile(f) {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.glb')) {
      setError('Only .glb files are supported');
      return;
    }
    setError(null);
    setFile(f);
    if (!name) setName(f.name.replace(/\.glb$/i, ''));
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file || !name.trim()) {
      setError('A file and a name are required');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name.trim());
    formData.append('description', description);
    formData.append('tags', tags);

    try {
      setProgress(0);
      await api.upload(formData, setProgress);
      setFile(null);
      setName('');
      setDescription('');
      setTags('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setProgress(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this model? This cannot be undone.')) return;
    try {
      await api.remove(id);
      if (previewId === id) setPreviewId(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(m) {
    setEditingId(m.id);
    setEditName(m.name);
    setEditDescription(m.description || '');
  }

  async function saveEdit(id) {
    try {
      await api.update(id, { name: editName, description: editDescription });
      setEditingId(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p className="muted">Upload and manage your GLB model library.</p>
      </div>

      {error && <p className="error">{error}</p>}

      <section className="upload-panel">
        <h2>Upload a new model</h2>
        <form onSubmit={handleUpload}>
          <div
            className={`dropzone ${dragOver ? 'dropzone-active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pickFile(e.dataTransfer.files[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".glb"
              hidden
              onChange={(e) => pickFile(e.target.files[0])}
            />
            {file ? (
              <p>{file.name} ({formatSize(file.size)})</p>
            ) : (
              <p>Drag & drop a .glb file here, or click to browse</p>
            )}
          </div>

          <div className="form-row">
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vintage Robot" required />
            </label>
          </div>
          <div className="form-row">
            <label>
              Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={2} />
            </label>
          </div>
          <div className="form-row">
            <label>
              Tags
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="comma, separated, tags" />
            </label>
          </div>

          {progress !== null && (
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          )}

          <button type="submit" disabled={progress !== null}>
            {progress !== null ? `Uploading… ${progress}%` : 'Upload model'}
          </button>
        </form>
      </section>

      <section>
        <h2>Existing models ({models.length})</h2>
        {loading && <p className="muted">Loading…</p>}
        {!loading && !models.length && <p className="muted">No models uploaded yet.</p>}

        <div className="admin-table">
          {models.map((m) => (
            <div className="admin-row" key={m.id}>
              <div className="admin-row-main">
                {editingId === m.id ? (
                  <div className="edit-fields">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} />
                    <div className="row-actions">
                      <button onClick={() => saveEdit(m.id)}>Save</button>
                      <button className="btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <strong>{m.name}</strong>
                      {m.description && <p className="muted">{m.description}</p>}
                      <span className="admin-meta">{formatSize(m.file_size)} · uploaded {new Date(m.uploaded_at).toLocaleDateString()}</span>
                    </div>
                    <div className="row-actions">
                      <button className="btn-secondary" onClick={() => setPreviewId(previewId === m.id ? null : m.id)}>
                        {previewId === m.id ? 'Hide preview' : 'Preview'}
                      </button>
                      <button className="btn-secondary" onClick={() => startEdit(m)}>Edit</button>
                      <button className="btn-danger" onClick={() => handleDelete(m.id)}>Delete</button>
                    </div>
                  </>
                )}
              </div>
              {previewId === m.id && (
                <div className="admin-preview">
                  <ModelViewer url={api.fileUrl(m.id)} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
