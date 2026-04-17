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
  // Layer management
  insertedImages = [],
  selectedInsertedImageId,
  onSelectInsertedImage,
  onDeleteInsertedImage,
  onDuplicateLayer,
  layerOrder = [],
  onMoveLayer,
  onSelectLayer,
  // Draw
  // Rotate
  onRotate,
  // Filter
  activeFilter,
  onFilterChange,
  backgroundColor,
  onBackgroundColorChange,
  // Resolution
  canvasDim,
  onCanvasDimChange,
  hasBackgroundImage,
  // Draw
  activeDrawTool,
  onSetActiveDrawTool,
  brushSize,
  onBrushSizeChange,
  brushColor,
  onBrushColorChange,
  brushFillColor,
  onBrushFillColorChange,
  onClearDrawLines,
}) {
  const [showEmojiPickerFor, setShowEmojiPickerFor] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showResolution, setShowResolution] = useState(false);
  const [showDraw, setShowDraw] = useState(false);
  const [activeAdvancedTool, setActiveAdvancedTool] = useState(null);
  
  // Space/padding state
  const [spacePosition, setSpacePosition] = useState('bottom');
  const [spacePercent, setSpacePercent] = useState(20);
  const [spaceColor, setSpaceColor] = useState('#000000');

  const handleToolToggle = (tool) => {
    if (activeAdvancedTool === tool) {
      setActiveAdvancedTool(null);
      if (tool === 'crop' && isCropping) onCropCancel();
    } else {
      // Deactivate current tool first
      if (isCropping) onCropCancel();
      setActiveAdvancedTool(tool);
      if (tool === 'crop') onCropStart();
    }
    // Disable drawing mode when entering advanced tools
    if (activeDrawTool) onSetActiveDrawTool(null);
  };

  // Display layers top-to-bottom (reverse of layerOrder array since last = top)
  const displayLayers = [...layerOrder].reverse();

  const renderLayerCard = (layer, displayIndex) => {
    const isTopmost = displayIndex === 0;
    const isBottommost = displayIndex === displayLayers.length - 1;

    if (layer.type === 'text') {
      const item = texts.find(t => t.id === layer.id);
      if (!item) return null;
      const isSelected = item.id === selectedTextId;
      const textIndex = texts.indexOf(item);

      return (
        <div 
          key={item.id} 
          className={`layer-card flex-col gap-2 p-4 ${isSelected ? 'layer-card-selected' : ''}`}
          onClick={() => { if (!isSelected) onSelectLayer(item.id, 'text'); }}
        >
          {/* Layer header row */}
          <div className="flex gap-2 items-center">
            <span className="layer-type-badge layer-type-text" title="Text Layer">T</span>
            <input 
              type="text" 
              className="input-control" 
              value={item.text} 
              onChange={(e) => onUpdateText(item.id, { text: e.target.value })}
              placeholder={`Text Layer ${textIndex + 1}`}
              style={{ flex: 1 }}
            />
            <button 
              className="btn btn-icon" 
              onClick={(e) => { e.stopPropagation(); setShowEmojiPickerFor(showEmojiPickerFor === item.id ? null : item.id); }}
              title="Insert Emoji"
              style={{ fontSize: '0.9rem' }}
            >
              😀
            </button>
            <button 
              className="btn btn-icon btn-danger" 
              onClick={(e) => { e.stopPropagation(); onDeleteText(item.id); }}
              title="Delete Layer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
            <button 
              className="btn btn-icon" 
              onClick={(e) => { e.stopPropagation(); onDuplicateLayer(item.id, 'text'); }}
              title="Duplicate Layer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <div className="layer-reorder-btns">
              <button 
                className="btn btn-icon layer-move-btn" 
                onClick={(e) => { e.stopPropagation(); onMoveLayer(item.id, 'up'); }}
                disabled={isTopmost}
                title="Move Up (Front)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>
              </button>
              <button 
                className="btn btn-icon layer-move-btn" 
                onClick={(e) => { e.stopPropagation(); onMoveLayer(item.id, 'down'); }}
                disabled={isBottommost}
                title="Move Down (Back)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
            </div>
          </div>

          {/* Emoji picker dropdown */}
          {showEmojiPickerFor === item.id && (
            <div style={{
              position: 'relative',
              zIndex: 10,
              background: 'var(--bg-color)',
              border: '1px solid var(--border-color)',
              padding: '0.5rem',
              borderRadius: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '0.2rem',
              boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
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

          {/* Expanded controls when selected */}
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
      );
    } else if (layer.type === 'image') {
      const imgData = insertedImages.find(img => img.id === layer.id);
      if (!imgData) return null;
      const isSelected = imgData.id === selectedInsertedImageId;
      const imgName = imgData.name || 'Image';
      // Truncate long filenames
      const displayName = imgName.length > 18 ? imgName.substring(0, 15) + '…' : imgName;

      return (
        <div 
          key={imgData.id}
          className={`layer-card flex-col gap-2 p-4 ${isSelected ? 'layer-card-selected' : ''}`}
          onClick={() => { if (!isSelected) onSelectLayer(imgData.id, 'image'); }}
        >
          <div className="flex gap-2 items-center">
            <span className="layer-type-badge layer-type-image" title="Image Layer">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </span>
            <img 
              src={imgData.src} 
              alt={displayName}
              className="layer-image-thumb"
            />
            <span className="layer-image-name" title={imgName}>{displayName}</span>
            <button 
              className="btn btn-icon btn-danger" 
              onClick={(e) => { e.stopPropagation(); onDeleteInsertedImage(imgData.id); }}
              title="Delete Layer"
              style={{ marginLeft: 'auto' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
            <button 
              className="btn btn-icon" 
              onClick={(e) => { e.stopPropagation(); onDuplicateLayer(imgData.id, 'image'); }}
              title="Duplicate Layer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <div className="layer-reorder-btns">
              <button 
                className="btn btn-icon layer-move-btn" 
                onClick={(e) => { e.stopPropagation(); onMoveLayer(imgData.id, 'up'); }}
                disabled={isTopmost}
                title="Move Up (Front)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>
              </button>
              <button 
                className="btn btn-icon layer-move-btn" 
                onClick={(e) => { e.stopPropagation(); onMoveLayer(imgData.id, 'down'); }}
                disabled={isBottommost}
                title="Move Down (Back)"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
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
        <div>
          <label className="label">Background Color</label>
          <div className="flex items-center gap-3">
            <input 
              type="color" 
              value={backgroundColor} 
              onChange={(e) => onBackgroundColorChange(e.target.value)}
              className="w-full h-10 cursor-pointer"
              title="Change canvas background color"
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              {backgroundColor.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {!hasBackgroundImage && (
        <div style={{ marginTop: '0.5rem' }}>
          <button 
            className={`btn w-full ${showResolution ? 'btn-primary' : ''}`}
            onClick={() => setShowResolution(!showResolution)}
            style={{ justifyContent: 'space-between', padding: '0.75rem 1rem' }}
          >
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <path d="M7 3v18"></path>
                <path d="M3 7h18"></path>
                <path d="M17 3v18"></path>
                <path d="M3 17h18"></path>
              </svg>
              Canvas Resolution
            </span>
            <svg 
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
              style={{ transform: showResolution ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {showResolution && (
            <div className="advanced-tool-panel" style={{ marginTop: '0.5rem' }}>
              <div className="flex gap-2 items-center" style={{ marginBottom: '1rem' }}>
                <div className="flex-col w-full">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Width</span>
                  <input 
                    type="number" 
                    className="input-control" 
                    value={canvasDim.width} 
                    onChange={(e) => onCanvasDimChange(prev => ({ ...prev, width: Number(e.target.value) }))}
                  />
                </div>
                <span style={{ marginTop: '1.2rem', color: 'var(--text-secondary)' }}>×</span>
                <div className="flex-col w-full">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Height</span>
                  <input 
                    type="number" 
                    className="input-control" 
                    value={canvasDim.height} 
                    onChange={(e) => onCanvasDimChange(prev => ({ ...prev, height: Number(e.target.value) }))}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <button className="btn btn-sm" onClick={() => onCanvasDimChange({ width: 600, height: 600 })}>1:1 Square</button>
                <button className="btn btn-sm" onClick={() => onCanvasDimChange({ width: 600, height: 900 })}>2:3 Story</button>
                <button className="btn btn-sm" onClick={() => onCanvasDimChange({ width: 800, height: 600 })}>4:3 Classic</button>
                <button className="btn btn-sm" onClick={() => onCanvasDimChange({ width: 900, height: 600 })}>3:2 Photo</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unified Layers Section */}
      <div className="flex justify-between items-center">
        <h3 style={{ fontSize: '1.2rem' }}>Layers</h3>
        <button className="btn" onClick={onAddText}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Add Text
        </button>
      </div>

      <div className="flex-col gap-2" style={{ marginTop: '0.5rem' }}>
        {displayLayers.map((layer, idx) => renderLayerCard(layer, idx))}
        {displayLayers.length === 0 && (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>
            No layers yet. Add text or insert an image!
          </div>
        )}
      </div>

      <hr style={{ borderColor: 'var(--border-color)', margin: '1rem 0' }} />

      {/* Draw Section */}
      <div>
        <button 
          className={`btn w-full ${showDraw ? 'btn-primary' : ''}`}
          onClick={() => {
            setShowDraw(!showDraw);
            if (!showDraw) {
              setShowAdvanced(false);
              setShowResolution(false);
            }
          }}
          style={{ justifyContent: 'space-between', padding: '0.75rem 1rem' }}
        >
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
              <path d="M2 2l7.586 7.586"></path>
              <circle cx="11" cy="11" r="2"></circle>
            </svg>
            Draw & Shapes
          </span>
          <svg 
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
            style={{ transform: showDraw ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {showDraw && (
          <div className="advanced-panel" style={{ marginTop: '0.5rem' }}>
            <div className="flex-col gap-4">
              {/* Tool Selector */}
              <div className="flex flex-wrap gap-2">
                <button 
                  className={`btn btn-icon ${activeDrawTool === 'pen' ? 'btn-primary' : ''}`} 
                  onClick={() => onSetActiveDrawTool(activeDrawTool === 'pen' ? null : 'pen')}
                  title="Pen Tool"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path></svg>
                </button>
                <button 
                  className={`btn btn-icon ${activeDrawTool === 'square' ? 'btn-primary' : ''}`} 
                  onClick={() => onSetActiveDrawTool(activeDrawTool === 'square' ? null : 'square')}
                  title="Square Tool"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="5" width="14" height="14" rx="1" ry="1" />
                  </svg>
                </button>
                <button 
                  className={`btn btn-icon ${activeDrawTool === 'rect' ? 'btn-primary' : ''}`} 
                  onClick={() => onSetActiveDrawTool(activeDrawTool === 'rect' ? null : 'rect')}
                  title="Rectangle Tool"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="6" width="18" height="12" rx="1" ry="1" />
                  </svg>
                </button>
                <button 
                  className={`btn btn-icon ${activeDrawTool === 'circle' ? 'btn-primary' : ''}`} 
                  onClick={() => onSetActiveDrawTool(activeDrawTool === 'circle' ? null : 'circle')}
                  title="Circle Tool"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                </button>
                <button 
                  className={`btn btn-icon ${activeDrawTool === 'ellipse' ? 'btn-primary' : ''}`} 
                  onClick={() => onSetActiveDrawTool(activeDrawTool === 'ellipse' ? null : 'ellipse')}
                  title="Ellipse Tool"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="12" cy="12" rx="9" ry="6" />
                  </svg>
                </button>
                <button 
                  className={`btn btn-icon ${activeDrawTool === 'triangle' ? 'btn-primary' : ''}`} 
                  onClick={() => onSetActiveDrawTool(activeDrawTool === 'triangle' ? null : 'triangle')}
                  title="Triangle Tool"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 4L4 18h16L12 4z" />
                  </svg>
                </button>
                <button className="btn btn-icon btn-danger" onClick={onClearDrawLines} title="Clear All Drawings">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>

              {activeDrawTool && (
                <div className="flex-col gap-3 p-3 glass-panel-dark" style={{ borderRadius: '8px' }}>
                  <div className="flex justify-between items-center">
                    <label className="label" style={{ marginBottom: 0 }}>Stroke Width [{brushSize}px]</label>
                    <input type="range" min="1" max="50" value={brushSize} onChange={(e) => onBrushSizeChange(Number(e.target.value))} style={{ width: '100px' }} />
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-col w-full">
                      <label className="label">Stroke Color</label>
                      <input type="color" value={brushColor} onChange={(e) => onBrushColorChange(e.target.value)} className="w-full" />
                    </div>
                    <div className="flex-col w-full">
                      <label className="label">Fill Color</label>
                      <div className="flex gap-2 items-center">
                        <input 
                          type="color" 
                          value={brushFillColor === 'transparent' ? '#ffffff' : brushFillColor} 
                          onChange={(e) => onBrushFillColorChange(e.target.value)} 
                          disabled={brushFillColor === 'transparent'}
                          className="w-full"
                          style={{ opacity: brushFillColor === 'transparent' ? 0.3 : 1 }}
                        />
                        <button 
                          className={`btn btn-xs ${brushFillColor === 'transparent' ? 'btn-primary' : ''}`}
                          onClick={() => onBrushFillColorChange(brushFillColor === 'transparent' ? '#ffffff' : 'transparent')}
                          style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}
                        >
                          {brushFillColor === 'transparent' ? 'Fill Off' : 'Fill On'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
              if (isCropping) onCropCancel();
              if (isDrawingMode) onSetDrawingMode(false);
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
            {/* Tool buttons — 2 rows of 3 */}
            <div className="flex-col gap-2" style={{ marginTop: '0.75rem' }}>
              <div className="flex gap-2">
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
                <button
                  className="btn w-full advanced-tool-btn"
                  onClick={onRotate}
                  title="Rotate 90° clockwise"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                  Rotate
                </button>
                <button
                  className={`btn w-full advanced-tool-btn ${activeAdvancedTool === 'filter' ? 'btn-primary' : ''}`}
                  onClick={() => handleToolToggle('filter')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                  </svg>
                  Filters
                </button>
              </div>
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
                    <select className="input-control" value={spacePosition} onChange={(e) => setSpacePosition(e.target.value)}>
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="both">Both (Top & Bottom)</option>
                    </select>
                  </div>
                  <div className="flex-col">
                    <label className="label">Padding Size [{spacePercent}%]</label>
                    <input type="range" min="10" max="100" step="5" value={spacePercent} onChange={(e) => setSpacePercent(Number(e.target.value))} />
                  </div>
                  <div className="flex-col">
                    <label className="label">Background Color</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={spaceColor} onChange={(e) => setSpaceColor(e.target.value)} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{spaceColor}</span>
                    </div>
                  </div>
                  <button className="btn btn-primary w-full" onClick={() => { onAddSpace({ position: spacePosition, percent: spacePercent, color: spaceColor }); setActiveAdvancedTool(null); }}>
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
                  Select an image to add as a new layer on the canvas.
                </p>
                <label className="btn btn-primary w-full" style={{ cursor: 'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Choose Image
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { onInsertImage(e); setActiveAdvancedTool(null); }} />
                </label>
              </div>
            )}


            {/* Filters Panel */}
            {activeAdvancedTool === 'filter' && (
              <div className="advanced-tool-panel">
                <div className="flex-col gap-2">
                  <label className="label">Photo Filter</label>
                  <select 
                    className="input-control" 
                    value={activeFilter} 
                    onChange={(e) => onFilterChange(e.target.value)}
                  >
                    <option value="none">None</option>
                    <option value="grayscale">Grayscale</option>
                    <option value="sepia">Sepia</option>
                    <option value="vivid">Vivid</option>
                    <option value="warm">Warm Tone</option>
                    <option value="cool">Cool Tone</option>
                    <option value="invert">Invert</option>
                  </select>
                </div>
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
