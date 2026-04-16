import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import CanvasEditor from './CanvasEditor';
import ControlPanel from './ControlPanel';

const INITIAL_TEXTS = [
  {
    id: uuidv4(),
    text: 'TOP TEXT',
    x: 50,
    y: 20,
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
    x: 50,
    y: 400,
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
  const stageRef = useRef(null);

  // When adding text, place it in the center.
  const handleAddText = () => {
    const newText = {
      id: uuidv4(),
      text: 'NEW TEXT',
      x: 100,
      y: 100,
      fontSize: 40,
      fill: '#ffffff',
      stroke: '#000000',
      strokeWidth: 2,
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

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBackgroundImageUrl(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = () => {
    if (!stageRef.current) return;
    // Deselect text so transformer handles are not in the screenshot
    setSelectedTextId(null);

    // Wait for state update to clear transformer, then export
    setTimeout(() => {
      const uri = stageRef.current.toDataURL({ pixelRatio: 2 }); // High-res export
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
      />
    </div>
  );
}
