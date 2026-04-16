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

export default function MemeGenerator() {
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(null);
  const [texts, setTexts] = useState(INITIAL_TEXTS);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const [canvasDim, setCanvasDim] = useState({ width: 600, height: 400 });
  const stageRef = useRef(null);

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
    setSelectedTextId(newText.id);
  };

  const handleUpdateText = (id, newProps) => {
    setTexts(prev => prev.map(t => t.id === id ? { ...t, ...newProps } : t));
  };

  const handleDeleteText = (id) => {
    setTexts(prev => prev.filter(t => t.id !== id));
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

  return (
    <div className="app-container">
      <CanvasEditor 
        imageUrl={backgroundImageUrl}
        texts={texts}
        selectedTextId={selectedTextId}
        onSelectText={setSelectedTextId}
        onUpdateText={handleUpdateText}
        stageRef={stageRef}
        onImageDrop={processImageFile}
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
      />
    </div>
  );
}
