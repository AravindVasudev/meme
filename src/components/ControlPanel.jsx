import React from 'react';

export default function ControlPanel({ 
  texts, 
  selectedTextId, 
  onSelectText, 
  onImageUpload, 
  onAddText, 
  onUpdateText, 
  onDeleteText,
  onDownload 
}) {

  return (
    <div className="flex-col gap-4 p-6 glass-panel" style={{ overflowY: 'auto' }}>
      
      {/* Top Actions */}
      <div className="flex flex-col gap-4">
        <div>
          <label className="label">Upload Image</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={onImageUpload} 
            className="input-control" 
            style={{ padding: '0.4rem' }}
          />
        </div>
      </div>

      <hr style={{ borderColor: 'var(--border-color)', margin: '1rem 0' }} />

      {/* Text Settings */}
      <div className="flex justify-between items-center">
        <h3 style={{ fontSize: '1.2rem' }}>Text Layers</h3>
        <button className="btn" onClick={onAddText}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add Text
        </button>
      </div>

      <div className="flex-col gap-4" style={{ marginTop: '1rem' }}>
        {texts.map((item, index) => {
          const isSelected = item.id === selectedTextId;
          return (
            <div 
              key={item.id} 
              className={`flex-col gap-2 p-4 ${isSelected ? 'selected' : ''}`}
              style={{ 
                border: isSelected ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                borderRadius: '8px',
                background: isSelected ? 'rgba(139, 92, 246, 0.1)' : 'rgba(0,0,0,0.2)',
                transition: 'all 0.2s'
              }}
              onClick={() => { if (!isSelected) onSelectText(item.id) }}
            >
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="input-control" 
                  value={item.text} 
                  onChange={(e) => onUpdateText(item.id, { text: e.target.value })}
                  placeholder={`Text Layer ${index + 1}`}
                />
                <button 
                  className="btn btn-icon btn-danger" 
                  onClick={(e) => { e.stopPropagation(); onDeleteText(item.id); }}
                  title="Delete Layer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
              </div>

              {isSelected && (
                <div className="flex-col gap-4" style={{ marginTop: '0.5rem' }}>
                  
                  {/* Colors */}
                  <div className="flex gap-4">
                    <div className="flex-col w-full">
                      <label className="label">Fill Color</label>
                      <input 
                        type="color" 
                        value={item.fill} 
                        onChange={(e) => onUpdateText(item.id, { fill: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <div className="flex-col w-full">
                      <label className="label">Stroke Color</label>
                      <input 
                        type="color" 
                        value={item.stroke} 
                        onChange={(e) => onUpdateText(item.id, { stroke: e.target.value })}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Sliders */}
                  <div className="flex-col gap-2">
                    <div>
                      <div className="flex justify-between">
                        <label className="label">Font Size [{Math.round(item.fontSize)}px]</label>
                      </div>
                      <input 
                        type="range" 
                        min="10" 
                        max="200" 
                        value={item.fontSize} 
                        onChange={(e) => onUpdateText(item.id, { fontSize: Number(e.target.value) })}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between">
                        <label className="label">Outline Width [{item.strokeWidth}px]</label>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="10" 
                        value={item.strokeWidth} 
                        onChange={(e) => onUpdateText(item.id, { strokeWidth: Number(e.target.value) })}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between">
                        <label className="label">Opacity [{Math.round(item.opacity * 100)}%]</label>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.05"
                        value={item.opacity} 
                        onChange={(e) => onUpdateText(item.id, { opacity: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="flex gap-2">
                    <button 
                      className={`btn w-full ${item.fontStyle.includes('bold') ? 'btn-primary' : ''}`}
                      onClick={() => {
                        const isBold = item.fontStyle.includes('bold');
                        const newStyle = isBold ? item.fontStyle.replace('bold', '').trim() : item.fontStyle + ' bold';
                        onUpdateText(item.id, { fontStyle: newStyle || 'normal' });
                      }}
                      style={{ fontWeight: 'bold' }}
                    >
                      B
                    </button>
                    <button 
                      className={`btn w-full ${item.fontStyle.includes('italic') ? 'btn-primary' : ''}`}
                      onClick={() => {
                        const isItalic = item.fontStyle.includes('italic');
                        const newStyle = isItalic ? item.fontStyle.replace('italic', '').trim() : item.fontStyle + ' italic';
                        onUpdateText(item.id, { fontStyle: newStyle || 'normal' });
                      }}
                      style={{ fontStyle: 'italic' }}
                    >
                      I
                    </button>
                  </div>

                </div>
              )}
            </div>
          )
        })}
        {texts.length === 0 && (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>
            No text layers. Add one above!
          </div>
        )}
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
        <button className="btn btn-primary w-full" style={{ padding: '1rem', fontSize: '1.1rem' }} onClick={onDownload}>
          Generate Meme
        </button>
      </div>

    </div>
  )
}
