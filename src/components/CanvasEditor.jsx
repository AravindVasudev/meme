import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect } from 'react-konva';
import useImage from 'use-image';

const TextNode = ({ shapeProps, isSelected, onSelect, onChange }) => {
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <React.Fragment>
      <Text
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        {...shapeProps}
        draggable
        onDragEnd={(e) => {
          onChange({
            ...shapeProps,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          // transformer is changing scale of the node
          // and NOT its width or height, but in text scaling font size is better
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // we will reset it back
          node.scaleX(1);
          node.scaleY(1);
          
          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            // set minimal value
            fontSize: Math.max(5, shapeProps.fontSize * scaleX),
            width: Math.max(5, node.width() * scaleX),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            // limit resize
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']}
        />
      )}
    </React.Fragment>
  );
};

export default function CanvasEditor({ imageUrl, texts, selectedTextId, onSelectText, onUpdateText, stageRef, onImageDrop }) {
  const [image] = useImage(imageUrl, 'anonymous');
  const [containerSize, setContainerSize] = useState({ width: 500, height: 500 });
  const containerRef = useRef(null);

  // Resize canvas to fit container visually while maintaining logic
  useEffect(() => {
    const checkSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const checkDeselect = (e) => {
    // deselect when clicked on empty area (either stage or background rect/image)
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.getName() === 'bg';
    if (clickedOnEmpty) {
      onSelectText(null);
    }
  };

  let scale = 1;
  let stageWidth = containerSize.width;
  let stageHeight = containerSize.height;

  if (image) {
    scale = Math.min(containerSize.width / image.width, containerSize.height / image.height);
    stageWidth = image.width * scale;
    stageHeight = image.height * scale;
  }

  // To allow perfectly native resolution export in MemeGenerator.jsx
  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.nativeScale = scale;
    }
  }, [scale, stageRef]);

  return (
    <div 
      className="canvas-area glass-panel" 
      ref={containerRef} 
      style={{ width: '100%', height: '100%', minHeight: '400px' }}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files[0];
        if (file && onImageDrop) {
          onImageDrop(file);
        }
      }}
    >
      <Stage
        width={stageWidth}
        height={stageHeight}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={checkDeselect}
        onTouchStart={checkDeselect}
        ref={stageRef}
        style={{ cursor: 'crosshair', backgroundColor: '#ffffff' }}
      >
        <Layer>
          {/* White Background Default */}
          {!image && (
            <Rect
              x={0}
              y={0}
              width={stageWidth / scale}
              height={stageHeight / scale}
              fill="#ffffff"
              name="bg"
            />
          )}
          {image && (
            <KonvaImage
              image={image}
              x={0}
              y={0}
              width={image.width}
              height={image.height}
              name="bg"
            />
          )}

          {texts.map((text, i) => {
            return (
              <TextNode
                key={text.id}
                shapeProps={text}
                isSelected={text.id === selectedTextId}
                onSelect={() => {
                  onSelectText(text.id);
                }}
                onChange={(newAttrs) => {
                  onUpdateText(text.id, newAttrs);
                }}
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
