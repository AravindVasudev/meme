import React, { useState } from 'react';

const EMOJIS = ['😀','😂','😍','😎','😢','😡','👍','🎉','🔥','💯','😁','😘','🤔','😭','💀','🤡','👽','💩','✨','👀'];

export default function ControlPanel({ 
  texts, 
  selectedTextId, 
  onSelectText, 
  onImageUpload, 
  onAddText, 
  onUpdateText, 
  onDeleteText,
  onDownload,
  maxFontSize = 200,
  // Advanced features
  onCropStart,
  onCropApply,
  onCropCancel,
  isCropping,
  onAddSpace,
  onInsertImage,
}) {
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeAdvancedTool, setActiveAdvancedTool] = useState(null); // 'crop' | 'space' | 'insert'
  
  // Space/padding state
  const [spacePosition, setSpacePosition] = useState('bottom'); // 'top' | 'bottom' | 'both'
  const [spacePercent, setSpacePercent] = useState(20);
  const [spaceColor, setSpaceColor] = useState('#000000');

  const handleToolToggle = (tool) => {
    if (activeAdvancedTool === tool) {
      setActiveAdvancedTool(null);
      if (tool === 'crop' && isCropping) {
        onCropCancel();
      }
    } else {
      // Cancel crop if switching away
      if (isCropping) {
        onCropCancel();
      }
      setActiveAdvancedTool(tool);
      if (tool === 'crop') {
        onCropStart();
      }
    }
  };

  return (
    <div className="control-panel flex-col gap-4 p-6 glass-panel">
      
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
              <div className="flex gap-2" style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="input-control" 
                  value={item.text} 
                  onChange={(e) => onUpdateText(item.id, { text: e.target.value })}
                  placeholder={`Text Layer ${index + 1}`}
                />
                <button 
                  className="btn btn-icon" 
                  onClick={(e) => { e.stopPropagation(); setShowEmojiPickerFor(showEmojiPickerFor === item.id ? null : item.id); }}
                  title="Insert Emoji"
                >
                  😀
                </button>
                <button 
                  className="btn btn-icon btn-danger" 
                  onClick={(e) => { e.stopPropagation(); onDeleteText(item.id); }}
                  title="Delete Layer"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
                
                {showEmojiPickerFor === item.id && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    zIndex: 10,
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '0.2rem',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                    marginTop: '0.2rem'
                  }}>
                    {EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        className="btn btn-icon"
                        style={{ border: 'none', background: 'transparent', fontSize: '1.2rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateText(item.id, { text: item.text + emoji });
                          setShowEmojiPickerFor(null);
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isSelected && (
                <div className="flex-col gap-4" style={{ marginTop: '0.5rem' }}>

                  {/* Font Type */}
                  <div className="flex-col w-full">
                    <label className="label">Font Family</label>
                    <select 
                      className="input-control" 
                      value={item.fontFamily || 'Impact, Arial'} 
                      onChange={(e) => onUpdateText(item.id, { fontFamily: e.target.value })}
                    >
                      <option value="Impact, Arial">Impact</option>
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="Times New Roman, serif">Times New Roman</option>
                      <option value="Courier New, monospace">Courier New</option>
                      <option value="Comic Sans MS, cursive">Comic Sans MS</option>
                      <option value="Verdana, sans-serif">Verdana</option>
                    </select>
                  </div>
                  
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
                        max={maxFontSize} 
                        value={item.fontSize} 
                        onChange={(e) => onUpdateText(item.id, { fontSize: Number(e.target.value) })}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between">
                        <label className="label">Outline Width [{Math.round(item.strokeWidth)}px]</label>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max={Math.max(10, Math.floor(maxFontSize * 0.1))} 
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

      <hr style={{ borderColor: 'var(--border-color)', margin: '1rem 0' }} />

      {/* Advanced Section */}
      <div>
        <button 
          className={`btn w-full ${showAdvanced ? 'btn-primary' : ''}`}
          onClick={() => {
            setShowAdvanced(!showAdvanced);
            if (showAdvanced) {
              // Closing advanced — cancel any active tool
              if (isCropping) onCropCancel();
              setActiveAdvancedTool(null);
            }
          }}
          style={{ justifyContent: 'space-between', padding: '0.75rem 1rem' }}
        >
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Advanced
          </span>
          <svg 
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
            style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {showAdvanced && (
          <div className="advanced-panel">
            {/* Tool buttons row */}
            <div className="flex gap-2" style={{ marginTop: '0.75rem' }}>
              <button
                className={`btn w-full advanced-tool-btn ${activeAdvancedTool === 'crop' ? 'btn-primary' : ''}`}
                onClick={() => handleToolToggle('crop')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"></path>
                  <path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"></path>
                </svg>
                Crop
              </button>
              <button
                className={`btn w-full advanced-tool-btn ${activeAdvancedTool === 'space' ? 'btn-primary' : ''}`}
                onClick={() => handleToolToggle('space')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="3" y1="15" x2="21" y2="15"></line>
                </svg>
                Space
              </button>
              <button
                className={`btn w-full advanced-tool-btn ${activeAdvancedTool === 'insert' ? 'btn-primary' : ''}`}
                onClick={() => handleToolToggle('insert')}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                Insert
              </button>
            </div>

            {/* Crop Panel */}
            {activeAdvancedTool === 'crop' && (
              <div className="advanced-tool-panel">
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  Drag on the canvas to select the crop area, then click Apply.
                </p>
                <div className="flex gap-2">
                  <button className="btn btn-primary w-full" onClick={() => { onCropApply(); setActiveAdvancedTool(null); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Apply Crop
                  </button>
                  <button className="btn w-full" onClick={() => { onCropCancel(); setActiveAdvancedTool(null); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Space/Padding Panel */}
            {activeAdvancedTool === 'space' && (
              <div className="advanced-tool-panel">
                <div className="flex-col gap-4">
                  <div className="flex-col">
                    <label className="label">Position</label>
                    <select 
                      className="input-control" 
                      value={spacePosition} 
                      onChange={(e) => setSpacePosition(e.target.value)}
                    >
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="both">Both (Top & Bottom)</option>
                    </select>
                  </div>

                  <div className="flex-col">
                    <label className="label">Padding Size [{spacePercent}%]</label>
                    <input 
                      type="range" 
                      min="10" 
                      max="100" 
                      step="5"
                      value={spacePercent} 
                      onChange={(e) => setSpacePercent(Number(e.target.value))}
                    />
                  </div>

                  <div className="flex-col">
                    <label className="label">Background Color</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={spaceColor} 
                        onChange={(e) => setSpaceColor(e.target.value)}
                      />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{spaceColor}</span>
                    </div>
                  </div>

                  <button 
                    className="btn btn-primary w-full" 
                    onClick={() => { 
                      onAddSpace({ position: spacePosition, percent: spacePercent, color: spaceColor });
                      setActiveAdvancedTool(null); 
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Apply Padding
                  </button>
                </div>
              </div>
            )}

            {/* Insert Image Panel */}
            {activeAdvancedTool === 'insert' && (
              <div className="advanced-tool-panel">
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  Select an image to add as a new layer on the canvas. You can drag and resize it.
                </p>
                <label className="btn btn-primary w-full" style={{ cursor: 'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Choose Image
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: 'none' }}
                    onChange={(e) => { 
                      onInsertImage(e); 
                      setActiveAdvancedTool(null); 
                    }}
                  />
                </label>
              </div>
            )}
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
