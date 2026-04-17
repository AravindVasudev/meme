import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import CanvasEditor from './CanvasEditor';
import ControlPanel from './ControlPanel';

const INITIAL_TEXTS = [
  {
    id: uuidv4(),
    text: 'TOP TEXT',
    x: 0,
    y: 20,
    width: 600,
    align: 'center',
    fontSize: 40,
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 2,
    fontStyle: 'normal',
    opacity: 1,
    fontFamily: 'Impact, Arial',
  },
  {
    id: uuidv4(),
    text: 'BOTTOM TEXT',
    x: 0,
    y: 340,
    width: 600,
    align: 'center',
    fontSize: 40,
    fill: '#ffffff',
    stroke: '#000000',
    strokeWidth: 2,
    fontStyle: 'normal',
    opacity: 1,
    fontFamily: 'Impact, Arial',
  }
];

// layerOrder: index 0 = bottom-most layer, last = top-most on canvas
const INITIAL_LAYER_ORDER = INITIAL_TEXTS.map(t => ({ id: t.id, type: 'text' }));

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
    // Deselect text so transformer handles are not in the screenshot
    setSelectedTextId(null);
    setSelectedInsertedImageId(null);

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
    let yOffset = 0; // How much to shift existing content down

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

    // Shift texts
    if (yOffset > 0) {
      setTexts(prev => prev.map(t => ({
        ...t,
        y: t.y + yOffset,
      })));

      // Shift inserted images
      setInsertedImages(prev => prev.map(img => ({
        ...img,
        y: img.y + yOffset,
      })));
    }

    // If there's a background image, compose a new image with padding
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
      // No background — just change dimensions (the canvas editor will handle the bg rect)
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
          // Scale inserted image to fit within canvas at max 50% of canvas size
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
    // Reset the input so the same file can be re-selected
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

  // === LAYER REORDERING ===
  // direction: 'up' = higher z-order (render on top), 'down' = lower z-order (render behind)
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

  // Helper to select any layer by id
  const handleSelectLayer = (id, type) => {
    if (type === 'text') {
      setSelectedTextId(id);
      setSelectedInsertedImageId(null);
    } else if (type === 'image') {
      setSelectedInsertedImageId(id);
      setSelectedTextId(null);
    }
  };

  return (
    <div className="app-container">
      <CanvasEditor 
        imageUrl={backgroundImageUrl}
        texts={texts}
        selectedTextId={selectedTextId}
        onSelectText={(id) => { setSelectedTextId(id); setSelectedInsertedImageId(null); }}
        onUpdateText={handleUpdateText}
        stageRef={stageRef}
        onImageDrop={processImageFile}
        // Advanced
        isCropping={isCropping}
        cropRect={cropRect}
        onCropRectChange={setCropRect}
        insertedImages={insertedImages}
        selectedInsertedImageId={selectedInsertedImageId}
        onSelectInsertedImage={(id) => { setSelectedInsertedImageId(id); setSelectedTextId(null); }}
        onUpdateInsertedImage={handleUpdateInsertedImage}
        // Layer ordering
        layerOrder={layerOrder}
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
        layerOrder={layerOrder}
        onMoveLayer={handleMoveLayer}
        onSelectLayer={handleSelectLayer}
      />
    </div>
  );
}
