import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import CanvasEditor from './CanvasEditor';
import ControlPanel from './ControlPanel';

const INITIAL_TEXTS = [];

// layerOrder: index 0 = bottom-most layer, last = top-most on canvas
const INITIAL_LAYER_ORDER = [];

export default function MemeGenerator() {
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(null);
  const [texts, setTexts] = useState(INITIAL_TEXTS);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [canvasDim, setCanvasDim] = useState({ width: 600, height: 400 });
  const stageRef = useRef(null);
  
  // Advanced features state
  const [isCropping, setIsCropping] = useState(false);
  const [cropRect, setCropRect] = useState(null);
  const [insertedImages, setInsertedImages] = useState([]);
  const [selectedInsertedImageId, setSelectedInsertedImageId] = useState(null);

  // Unified layer ordering
  const [layerOrder, setLayerOrder] = useState(INITIAL_LAYER_ORDER);

  // Draw tool state
  const [drawLines, setDrawLines] = useState([]);
  const [activeDrawTool, setActiveDrawTool] = useState(null); // 'pen', 'square', 'rect', 'circle', 'ellipse', 'triangle'
  const [brushSize, setBrushSize] = useState(5);
  const [brushColor, setBrushColor] = useState('#ff0000');
  const [brushFillColor, setBrushFillColor] = useState('transparent');

  // Filter state
  const [activeFilter, setActiveFilter] = useState('none');

  // Background color state
  const [backgroundColor, setBackgroundColor] = useState('#2d2d2d');

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

  const handleDeleteText = (id) => {
    setTexts(prev => prev.filter(t => t.id !== id));
    setLayerOrder(prev => prev.filter(l => l.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const processImageFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target.result;
        
        const img = new Image();
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
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    processImageFile(file);
  };

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
    setDrawLines(prev => prev.map(line => ({
      ...line,
      points: line.points.map((val, i) => i % 2 === 0 ? val - cropRect.x : val - cropRect.y),
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
      setDrawLines(prev => prev.map(line => ({
        ...line,
        points: line.points.map((val, i) => i % 2 === 1 ? val + yOffset : val),
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

  const handleDeleteInsertedImage = (id) => {
    setInsertedImages(prev => prev.filter(img => img.id !== id));
    setLayerOrder(prev => prev.filter(l => l.id !== id));
    if (selectedInsertedImageId === id) setSelectedInsertedImageId(null);
  };

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
    } else if (type === 'image') {
      setSelectedInsertedImageId(id);
      setSelectedTextId(null);
    }
  };

  const handleSetDrawingMode = (tool) => {
    setActiveDrawTool(tool);
    // Deselect other things when drawing
    if (tool) {
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
    setDrawLines(prev => prev.map(line => {
      const newPoints = [];
      for (let i = 0; i < line.points.length; i += 2) {
        newPoints.push(oldHeight - line.points[i + 1]); // new x
        newPoints.push(line.points[i]);                   // new y
      }
      return { ...line, points: newPoints };
    }));
  };

  // === CLEAR DRAW LINES ===
  const handleClearDrawLines = () => {
    setDrawLines([]);
  };

  // === KEYBOARD SHORTCUTS ===
  useEffect(() => {
    const handleKeyDown = (e) => {
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
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTextId, selectedInsertedImageId, handleDeleteText, handleDeleteInsertedImage]);

  return (
    <div className="app-container">
      <CanvasEditor 
        imageUrl={backgroundImageUrl}
        texts={texts}
        selectedTextId={selectedTextId}
        onUpdateText={handleUpdateText}
        stageRef={stageRef}
        onImageDrop={processImageFile}
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
        drawLines={drawLines}
        onDrawLinesChange={setDrawLines}
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
        onImageUpload={handleImageUpload}
        onAddText={handleAddText}
        onUpdateText={handleUpdateText}
        onDeleteText={handleDeleteText}
        onDownload={handleDownload}
        maxFontSize={Math.max(200, Math.floor(canvasDim.height / 2))}
        // Background color
        backgroundColor={backgroundColor}
        onBackgroundColorChange={setBackgroundColor}
        // Resolution
        canvasDim={canvasDim}
        onCanvasDimChange={setCanvasDim}
        hasBackgroundImage={!!backgroundImageUrl}
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
        // Draw
        activeDrawTool={activeDrawTool}
        onSetActiveDrawTool={handleSetDrawingMode}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        brushColor={brushColor}
        onBrushColorChange={setBrushColor}
        brushFillColor={brushFillColor}
        onBrushFillColorChange={setBrushFillColor}
        onClearDrawLines={handleClearDrawLines}
        // Rotate
        onRotate={handleRotate}
        // Filter
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />
    </div>
  );
}
