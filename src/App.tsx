import { useState, useEffect } from 'react';
import type { ResolvedDocument } from '@/types/resolved.types';
import { IdmlDocument } from '@/components/IdmlDocument';
import { useViewportWidth } from '@/hooks/useViewportWidth';

const loadFromFile = (file: File): Promise<ResolvedDocument> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try { resolve(JSON.parse(e.target!.result as string)); }
      catch { reject(new Error('Invalid JSON')); }
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });

export default function App() {
  const [doc, setDoc]     = useState<ResolvedDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const viewportWidth     = useViewportWidth();

  // Drag-and-drop support
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    try   { setDoc(await loadFromFile(file)); setError(null); }
    catch { setError('Could not load file — make sure it is a .resolved.json'); }
  };

  // File picker fallback
  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try   { setDoc(await loadFromFile(file)); setError(null); }
    catch { setError('Could not load file'); }
  };

  if (doc) {
    return (
      <div>
        {/* Toolbar */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: '#1e1e1e', color: '#fff', padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: 16, fontSize: 13,
        }}>
          <strong>IDML Renderer</strong>
          <span style={{ opacity: 0.5 }}>
            {doc.pages.length} page(s) · {doc.pageWidth.toFixed(0)} × {doc.pageHeight.toFixed(0)} px
          </span>
          <button
            onClick={() => setDoc(null)}
            style={{ marginLeft: 'auto', cursor: 'pointer', padding: '4px 10px' }}
          >
            Load another
          </button>
        </div>

        {/* Scrollable canvas */}
        <div style={{ paddingTop: 48 }}>
          <IdmlDocument document={doc} targetWidth={viewportWidth} />
        </div>
      </div>
    );
  }

  // Empty state — drop zone
  return (
    <div
      onDrop={onDrop}
      onDragOver={e => e.preventDefault()}
      style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
        border: '2px dashed #aaa', margin: 24, borderRadius: 12,
        color: '#555',
      }}
    >
      <div style={{ fontSize: 48 }}>📄</div>
      <p style={{ fontSize: 18, fontWeight: 600 }}>Drop a <code>.resolved.json</code> here</p>
      <p style={{ fontSize: 13, opacity: 0.6 }}>
        Generate it first with: <code>npm start your-file.idml</code>
      </p>
      <label style={{
        marginTop: 8, padding: '8px 20px', background: '#333', color: '#fff',
        borderRadius: 6, cursor: 'pointer', fontSize: 13,
      }}>
        Or pick a file
        <input type="file" accept=".json" onChange={onPick} style={{ display: 'none' }} />
      </label>
      {error && <p style={{ color: 'red', fontSize: 13 }}>{error}</p>}
    </div>
  );
}
