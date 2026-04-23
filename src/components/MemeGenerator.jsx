import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import CanvasEditor from './CanvasEditor';
import ControlPanel from './ControlPanel';

const INITIAL_TEXTS = [];

// layerOrder: index 0 = bottom-most layer, last = top-most on canvas
const INITIAL_LAYER_ORDER = [];
const INITIAL_CANVAS_DIM = { width: 600, height: 400 };
const INITIAL_BACKGROUND_COLOR = '#2d2d2d';
const CANVAS_PRESETS = [
  { label: '1:1 Square', width: 600, height: 600 },
  { label: '2:3 Story', width: 600, height: 900 },
  { label: '4:3 Classic', width: 800, height: 600 },
  { label: '3:2 Photo', width: 900, height: 600 },
];

export default function MemeGenerator() {
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(null);
  const [texts, setTexts] = useState(INITIAL_TEXTS);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [canvasDim, setCanvasDim] = useState(INITIAL_CANVAS_DIM);
  const [backgroundColor, setBackgroundColor] = useState(INITIAL_BACKGROUND_COLOR);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [setupCanvasDim, setSetupCanvasDim] = useState(INITIAL_CANVAS_DIM);
  const [setupBackgroundColor, setSetupBackgroundColor] = useState(INITIAL_BACKGROUND_COLOR);
  const stageRef = useRef(null);
  const setupImageInputRef = useRef(null);
  
  // Advanced features state
  const [isCropping, setIsCropping] = useState(false);
  const [cropRect, setCropRect] = useState(null);
  const [insertedImages, setInsertedImages] = useState([]);
  const [selectedInsertedImageId, setSelectedInsertedImageId] = useState(null);

  // Unified layer ordering
  const [layerOrder, setLayerOrder] = useState(INITIAL_LAYER_ORDER);

  // Draw tool state
  const [drawingLayers, setDrawingLayers] = useState([]); // [{ id, lines: [] }]
  const [selectedDrawingLayerId, setSelectedDrawingLayerId] = useState(null);
  const [activeDrawTool, setActiveDrawTool] = useState(null); // 'pen', 'eraser', 'square', 'rect', 'circle', 'ellipse', 'triangle'
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#ff0000');
  const [brushFillColor, setBrushFillColor] = useState('transparent');

  // Filter state
  const [activeFilter, setActiveFilter] = useState('none');

  // Background color state
  // The setup modal owns the initial choice; the editor only renders after that.
  const applyBlankCanvasSetup = () => {
    setCanvasDim({ ...setupCanvasDim });
    setBackgroundColor(setupBackgroundColor);
    setBackgroundImageUrl(null);
    setIsSetupComplete(true);
  };

  const processImageFile = (file) => new Promise((resolve) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onerror = () => resolve(false);
      reader.onload = (event) => {
        const url = event.target.result;

        const img = new Image();
        img.onerror = () => resolve(false);
        img.onload = () => {
          const newWidth = img.width;
          const newHeight = img.height;

          setCanvasDim((prevDim) => {
            const ratioX = newWidth / prevDim.width;
            const ratioY = newHeight / prevDim.height;
            const scaleRatio = Math.min(ratioX, ratioY);

            setTexts(prev => prev.map(t => {
              let nW = newWidth;
              let nX = 0;
              // Map vertical coordinate via relative percentage
              let yPercent = prevDim.height > 0 ? t.y / prevDim.height : 0.5;
              let nY = yPercent * newHeight;
              let nFontSize = t.fontSize * scaleRatio;

              if (nY < 0) nY = 0;
              // Guarantee it doesn't fall off the visual bottom frame by padding against estimated font height
              const padding = nFontSize * 1.5;
              if (nY > newHeight - padding) {
                 nY = Math.max(0, newHeight - padding);
              }

              return {
                ...t,
                x: nX,
                y: nY,
                width: nW,
                fontSize: nFontSize,
                strokeWidth: Math.max(1, t.strokeWidth * scaleRatio),
                align: 'center'
              };
            }));

            return { width: newWidth, height: newHeight };
          });

          setBackgroundImageUrl(url);
          resolve(true);
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
      return;
    }

    resolve(false);
  });

  // When adding text, place it in the center.
  const handleAddText = () => {
    const defaultFontSize = Math.max(10, Math.floor(canvasDim.height * 0.1));
    const newText = {
      id: uuidv4(),
      text: 'NEW TEXT',
      x: 0,
      y: canvasDim.height / 2 - defaultFontSize / 2,
      width: canvasDim.width,
      align: 'center',
      fontSize: defaultFontSize,
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: Math.max(1, Math.floor(canvasDim.height * 0.005)),
      fontStyle: 'normal',
      opacity: 1,
      fontFamily: 'Impact, Arial',
    };
    setTexts(prev => [...prev, newText]);
    setLayerOrder(prev => [...prev, { id: newText.id, type: 'text' }]);
    setSelectedTextId(newText.id);
    setSelectedInsertedImageId(null);
  };

  const handleUpdateText = (id, newProps) => {
    setTexts(prev => prev.map(t => t.id === id ? { ...t, ...newProps } : t));
  };

  const handleDeleteText = useCallback((id) => {
    setTexts(prev => prev.filter(t => t.id !== id));
    setLayerOrder(prev => prev.filter(l => l.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  }, [selectedTextId]);

  const handleDownload = () => {
    if (!stageRef.current) return;
    // Deselect everything so transformer handles are not in the screenshot
    setSelectedTextId(null);
    setSelectedInsertedImageId(null);
    setActiveDrawTool(null);

    // Wait for state update to clear transformer, then export
    setTimeout(() => {
      const exportScale = stageRef.current.nativeScale ? 1 / stageRef.current.nativeScale : 2;
      const uri = stageRef.current.toDataURL({ pixelRatio: exportScale }); // Native res export
      const link = document.createElement('a');
      link.download = `meme-${Date.now()}.png`;
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 100);
  };

  // === CROP HANDLERS ===
  const handleCropStart = () => {
    setIsCropping(true);
    setCropRect(null);
  };

  const handleCropApply = () => {
    if (!cropRect || cropRect.width < 2 || cropRect.height < 2) {
      setIsCropping(false);
      setCropRect(null);
      return;
    }

    // Adjust texts to new coordinate system
    setTexts(prev => prev.map(t => ({
      ...t,
      x: t.x - cropRect.x,
      y: t.y - cropRect.y,
    })));

    // Adjust inserted images to new coordinate system
    setInsertedImages(prev => prev.map(img => ({
      ...img,
      x: img.x - cropRect.x,
      y: img.y - cropRect.y,
    })));

    // Adjust draw lines
    setDrawingLayers(prev => prev.map(layer => ({
      ...layer,
      lines: layer.lines.map(line => ({
        ...line,
        points: line.points.map((val, i) => i % 2 === 0 ? val - cropRect.x : val - cropRect.y),
      }))
    })));

    // If there's a background image, re-render the cropped portion
    if (backgroundImageUrl) {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = cropRect.width;
        canvas.height = cropRect.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, cropRect.x, cropRect.y, cropRect.width, cropRect.height, 0, 0, cropRect.width, cropRect.height);
        setBackgroundImageUrl(canvas.toDataURL('image/png'));
        setCanvasDim({ width: cropRect.width, height: cropRect.height });
      };
      img.src = backgroundImageUrl;
    } else {
      setCanvasDim({ width: cropRect.width, height: cropRect.height });
    }

    setIsCropping(false);
    setCropRect(null);
  };

  const handleCropCancel = () => {
    setIsCropping(false);
    setCropRect(null);
  };

  // === ADD SPACE/PADDING HANDLER ===
  const handleAddSpace = ({ position, percent, color }) => {
    const paddingHeight = Math.round(canvasDim.height * (percent / 100));
    const newWidth = canvasDim.width;
    let newHeight = canvasDim.height;
    let yOffset = 0;

    if (position === 'top') {
      newHeight += paddingHeight;
      yOffset = paddingHeight;
    } else if (position === 'bottom') {
      newHeight += paddingHeight;
      yOffset = 0;
    } else if (position === 'both') {
      newHeight += paddingHeight * 2;
      yOffset = paddingHeight;
    }

    if (yOffset > 0) {
      setTexts(prev => prev.map(t => ({ ...t, y: t.y + yOffset })));
      setInsertedImages(prev => prev.map(img => ({ ...img, y: img.y + yOffset })));
      setDrawingLayers(prev => prev.map(layer => ({
        ...layer,
        lines: layer.lines.map(line => ({
          ...line,
          points: line.points.map((val, i) => i % 2 === 1 ? val + yOffset : val),
        }))
      })));
    }

    if (backgroundImageUrl) {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, newWidth, newHeight);
        ctx.drawImage(img, 0, yOffset, img.width, img.height);
        setBackgroundImageUrl(canvas.toDataURL('image/png'));
        setCanvasDim({ width: newWidth, height: newHeight });
      };
      img.src = backgroundImageUrl;
    } else {
      setCanvasDim({ width: newWidth, height: newHeight });
    }
  };

  // === INSERT IMAGE HANDLER ===
  const handleInsertImage = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target.result;
        const img = new window.Image();
        img.onload = () => {
          const maxW = canvasDim.width * 0.5;
          const maxH = canvasDim.height * 0.5;
          const scale = Math.min(maxW / img.width, maxH / img.height, 1);
          const w = img.width * scale;
          const h = img.height * scale;

          const newLayer = {
            id: uuidv4(),
            src: url,
            name: file.name,
            x: (canvasDim.width - w) / 2,
            y: (canvasDim.height - h) / 2,
            width: w,
            height: h,
            rotation: 0,
          };
          setInsertedImages(prev => [...prev, newLayer]);
          setLayerOrder(prev => [...prev, { id: newLayer.id, type: 'image' }]);
          setSelectedInsertedImageId(newLayer.id);
          setSelectedTextId(null);
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleUpdateInsertedImage = (id, newProps) => {
    setInsertedImages(prev => prev.map(img => img.id === id ? { ...img, ...newProps } : img));
  };

  const handleDeleteInsertedImage = useCallback((id) => {
    setInsertedImages(prev => prev.filter(img => img.id !== id));
    setLayerOrder(prev => prev.filter(l => l.id !== id));
    if (selectedInsertedImageId === id) setSelectedInsertedImageId(null);
  }, [selectedInsertedImageId]);

  const handleDuplicateLayer = (id, type) => {
    if (type === 'text') {
      const original = texts.find(t => t.id === id);
      if (!original) return;
      const newLayer = {
        ...original,
        id: uuidv4(),
        x: original.x + 20,
        y: original.y + 20,
      };
      setTexts(prev => [...prev, newLayer]);
      setLayerOrder(prev => {
        const idx = prev.findIndex(l => l.id === id);
        const newOrder = [...prev];
        newOrder.splice(idx + 1, 0, { id: newLayer.id, type: 'text' });
        return newOrder;
      });
      setSelectedTextId(newLayer.id);
      setSelectedInsertedImageId(null);
    } else if (type === 'image') {
      const original = insertedImages.find(img => img.id === id);
      if (!original) return;
      const newLayer = {
        ...original,
        id: uuidv4(),
        x: original.x + 20,
        y: original.y + 20,
      };
      setInsertedImages(prev => [...prev, newLayer]);
      setLayerOrder(prev => {
        const idx = prev.findIndex(l => l.id === id);
        const newOrder = [...prev];
        newOrder.splice(idx + 1, 0, { id: newLayer.id, type: 'image' });
        return newOrder;
      });
      setSelectedInsertedImageId(newLayer.id);
      setSelectedTextId(null);
    } else if (type === 'drawing') {
      const original = drawingLayers.find(dl => dl.id === id);
      if (!original) return;
      const newLayer = {
        ...original,
        id: uuidv4(),
      };
      setDrawingLayers(prev => [...prev, newLayer]);
      setLayerOrder(prev => {
        const idx = prev.findIndex(l => l.id === id);
        const newOrder = [...prev];
        newOrder.splice(idx + 1, 0, { id: newLayer.id, type: 'drawing' });
        return newOrder;
      });
      setSelectedDrawingLayerId(newLayer.id);
      setSelectedTextId(null);
      setSelectedInsertedImageId(null);
    }
  };

  // === LAYER REORDERING ===
  const handleMoveLayer = (id, direction) => {
    setLayerOrder(prev => {
      const idx = prev.findIndex(l => l.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const newOrder = [...prev];
      [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];
      return newOrder;
    });
  };

  const handleSelectLayer = (id, type) => {
    if (type === 'text') {
      setSelectedTextId(id);
      setSelectedInsertedImageId(null);
      setSelectedDrawingLayerId(null);
    } else if (type === 'image') {
      setSelectedInsertedImageId(id);
      setSelectedTextId(null);
      setSelectedDrawingLayerId(null);
    } else if (type === 'drawing') {
      setSelectedDrawingLayerId(id);
      setSelectedTextId(null);
      setSelectedInsertedImageId(null);
    } else {
      setSelectedTextId(null);
      setSelectedInsertedImageId(null);
      setSelectedDrawingLayerId(null);
    }
  };

  const handleAddDrawingLayer = () => {
    const newId = uuidv4();
    setDrawingLayers(prev => [...prev, { id: newId, lines: [] }]);
    setLayerOrder(prev => [...prev, { id: newId, type: 'drawing' }]);
    setSelectedDrawingLayerId(newId);
    setSelectedTextId(null);
    setSelectedInsertedImageId(null);
  };

  const handleSetDrawingMode = (tool) => {
    setActiveDrawTool(tool);
    if (tool) {
      // If no drawing layer selected, or we want a fresh one, could logic here
      // For now, if no drawing layer exists, create one
      if (!selectedDrawingLayerId) {
        const existingLayer = layerOrder.find(l => l.type === 'drawing');
        if (existingLayer) {
          setSelectedDrawingLayerId(existingLayer.id);
        } else {
          const newId = uuidv4();
          setDrawingLayers(prev => [...prev, { id: newId, lines: [] }]);
          setLayerOrder(prev => [...prev, { id: newId, type: 'drawing' }]);
          setSelectedDrawingLayerId(newId);
        }
      }
      setSelectedTextId(null);
      setSelectedInsertedImageId(null);
    }
  };

  // === ROTATE 90° CW ===
  const handleRotate = () => {
    const oldWidth = canvasDim.width;
    const oldHeight = canvasDim.height;
    const newWidth = oldHeight;
    const newHeight = oldWidth;

    if (backgroundImageUrl) {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.height;
        canvas.height = img.width;
        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        setBackgroundImageUrl(canvas.toDataURL('image/png'));
        setCanvasDim({ width: newWidth, height: newHeight });
      };
      img.src = backgroundImageUrl;
    } else {
      setCanvasDim({ width: newWidth, height: newHeight });
    }

    // Remap text positions: 90° CW → (x,y) → roughly (oldH-y, x)
    setTexts(prev => prev.map(t => ({
      ...t,
      x: 0,
      y: Math.min(Math.max(0, t.x), newHeight - t.fontSize * 1.5),
      width: newWidth,
      align: 'center',
    })));

    // Remap inserted images
    setInsertedImages(prev => prev.map(img => ({
      ...img,
      x: oldHeight - img.y - img.height,
      y: img.x,
    })));

    // Remap draw line points: (x,y) → (oldH-y, x)
    setDrawingLayers(prev => prev.map(layer => ({
      ...layer,
      lines: layer.lines.map(line => {
        const newPoints = [];
        for (let i = 0; i < line.points.length; i += 2) {
          newPoints.push(oldHeight - line.points[i + 1]); // new x
          newPoints.push(line.points[i]);                   // new y
        }
        return { ...line, points: newPoints };
      })
    })));
  };

  const handleDeleteDrawingLayer = useCallback((id) => {
    setDrawingLayers(prev => prev.filter(dl => dl.id !== id));
    setLayerOrder(prev => prev.filter(l => l.id !== id));
    if (selectedDrawingLayerId === id) setSelectedDrawingLayerId(null);
  }, [selectedDrawingLayerId]);

  // === KEYBOARD SHORTCUTS ===
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isSetupComplete) return;
      // Don't delete if we're typing in an input or textarea
      if (
        document.activeElement.tagName === 'INPUT' || 
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.isContentEditable
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedTextId) {
          handleDeleteText(selectedTextId);
        } else if (selectedInsertedImageId) {
          handleDeleteInsertedImage(selectedInsertedImageId);
        } else if (selectedDrawingLayerId) {
          handleDeleteDrawingLayer(selectedDrawingLayerId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isSetupComplete,
    selectedTextId,
    selectedInsertedImageId,
    selectedDrawingLayerId,
    handleDeleteText,
    handleDeleteInsertedImage,
    handleDeleteDrawingLayer,
  ]);

  return (
    <>
      <div className={`app-container ${!isSetupComplete ? 'app-container-locked' : ''}`}>
      <CanvasEditor 
        imageUrl={backgroundImageUrl}
        texts={texts}
        selectedTextId={selectedTextId}
        onUpdateText={handleUpdateText}
        stageRef={stageRef}
        // Advanced
        isCropping={isCropping}
        cropRect={cropRect}
        onCropRectChange={setCropRect}
        insertedImages={insertedImages}
        selectedInsertedImageId={selectedInsertedImageId}
        onSelectLayer={handleSelectLayer}
        onUpdateInsertedImage={handleUpdateInsertedImage}
        // Layer ordering
        layerOrder={layerOrder}
        // Draw
        drawingLayers={drawingLayers}
        selectedDrawingLayerId={selectedDrawingLayerId}
        onUpdateDrawingLayer={(id, lines) => setDrawingLayers(prev => prev.map(dl => dl.id === id ? { ...dl, lines } : dl))}
        activeDrawTool={activeDrawTool}
        brushSize={brushSize}
        brushColor={brushColor}
        brushFillColor={brushFillColor}
        // Filter
        activeFilter={activeFilter}
        backgroundColor={backgroundColor}
        canvasDim={canvasDim}
      />
      
      <ControlPanel 
        texts={texts}
        selectedTextId={selectedTextId}
        onSelectText={setSelectedTextId}
        onAddText={handleAddText}
        onUpdateText={handleUpdateText}
        onDeleteText={handleDeleteText}
        onDownload={handleDownload}
        maxFontSize={Math.max(200, Math.floor(canvasDim.height / 2))}
        // Advanced
        onCropStart={handleCropStart}
        onCropApply={handleCropApply}
        onCropCancel={handleCropCancel}
        isCropping={isCropping}
        onAddSpace={handleAddSpace}
        onInsertImage={handleInsertImage}
        // Layer management
        insertedImages={insertedImages}
        selectedInsertedImageId={selectedInsertedImageId}
        onSelectInsertedImage={setSelectedInsertedImageId}
        onDeleteInsertedImage={handleDeleteInsertedImage}
        onDuplicateLayer={handleDuplicateLayer}
        layerOrder={layerOrder}
        onMoveLayer={handleMoveLayer}
        onSelectLayer={handleSelectLayer}
        onAddDrawingLayer={handleAddDrawingLayer}
        // Draw
        drawingLayers={drawingLayers}
        selectedDrawingLayerId={selectedDrawingLayerId}
        onDeleteDrawingLayer={handleDeleteDrawingLayer}
        activeDrawTool={activeDrawTool}
        onSetActiveDrawTool={handleSetDrawingMode}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        brushColor={brushColor}
        onBrushColorChange={setBrushColor}
        brushFillColor={brushFillColor}
        onBrushFillColorChange={setBrushFillColor}
        // Rotate
        onRotate={handleRotate}
        // Filter
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
      </div>

      {!isSetupComplete && (
        <div className="setup-modal-overlay" role="presentation">
          <div className="setup-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="setup-modal-title">
            <div className="setup-modal-header">
              <p className="setup-kicker">First step</p>
              <h2 id="setup-modal-title">Pick your starting canvas</h2>
              <p className="setup-modal-copy">
                Upload a background image, or start with a blank canvas size and background color.
                If you want to change this later, just refresh the tool.
              </p>
            </div>

            <div className="setup-modal-grid">
              <section className="setup-choice-card">
                <div className="setup-choice-header">
                  <div>
                    <p className="setup-choice-kicker">Option 1</p>
                    <h3>Upload an image</h3>
                  </div>
                </div>
                <p className="setup-choice-copy">
                  The canvas will match the image dimensions and use it as the background.
                </p>
                <input
                  ref={setupImageInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const applied = await processImageFile(file);
                    if (applied) setIsSetupComplete(true);
                    e.target.value = '';
                  }}
                />
                <button
                  className="btn btn-primary setup-action-btn"
                  onClick={() => setupImageInputRef.current?.click()}
                >
                  Choose image
                </button>
              </section>

              <section className="setup-choice-card">
                <div className="setup-choice-header">
                  <div>
                    <p className="setup-choice-kicker">Option 2</p>
                    <h3>Blank canvas</h3>
                  </div>
                </div>
                <p className="setup-choice-copy">
                  Set a resolution and background color before you start editing.
                </p>

                <div className="setup-presets">
                  {CANVAS_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      className="btn setup-preset-btn"
                      onClick={() => setSetupCanvasDim({ width: preset.width, height: preset.height })}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="setup-dimensions">
                  <div className="flex-col">
                    <label className="label">Width</label>
                    <input
                      type="number"
                      min="100"
                      className="input-control"
                      value={setupCanvasDim.width}
                      onChange={(e) => {
                        const nextWidth = Math.max(100, Number(e.target.value) || 100);
                        setSetupCanvasDim((prev) => ({ ...prev, width: nextWidth }));
                      }}
                    />
                  </div>
                  <div className="setup-dimension-separator">×</div>
                  <div className="flex-col">
                    <label className="label">Height</label>
                    <input
                      type="number"
                      min="100"
                      className="input-control"
                      value={setupCanvasDim.height}
                      onChange={(e) => {
                        const nextHeight = Math.max(100, Number(e.target.value) || 100);
                        setSetupCanvasDim((prev) => ({ ...prev, height: nextHeight }));
                      }}
                    />
                  </div>
                </div>

                <div className="setup-color-row">
                  <div className="flex-col" style={{ flex: 1 }}>
                    <label className="label">Background Color</label>
                    <input
                      type="color"
                      value={setupBackgroundColor}
                      onChange={(e) => setSetupBackgroundColor(e.target.value)}
                      className="setup-color-input"
                    />
                  </div>
                  <div className="setup-color-value">{setupBackgroundColor.toUpperCase()}</div>
                </div>

                <button
                  className="btn btn-primary setup-action-btn"
                  onClick={applyBlankCanvasSetup}
                >
                  Start blank canvas
                </button>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
