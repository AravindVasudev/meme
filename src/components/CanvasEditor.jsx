import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect } from 'react-konva';
import useImage from 'use-image';

const TextNode = ({ shapeProps, isSelected, onSelect, onChange, canvasWidth, canvasHeight, scale }) => {
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
        dragBoundFunc={(pos) => {
          if (!shapeRef.current) return pos;
          const node = shapeRef.current;
          const boxWidth = node.width() * node.scaleX() * scale;
          const boxHeight = node.height() * node.scaleY() * scale;

          const maxStageWidth = canvasWidth * scale;
          const maxStageHeight = canvasHeight * scale;

          let newX = pos.x;
          let newY = pos.y;

          if (newX < 0) newX = 0;
          if (newX > maxStageWidth - boxWidth) newX = maxStageWidth - boxWidth;
          if (boxWidth > maxStageWidth) newX = 0;

          if (newY < 0) newY = 0;
          if (newY > maxStageHeight - boxHeight) newY = maxStageHeight - boxHeight;
          if (boxHeight > maxStageHeight) newY = 0;

          return { x: newX, y: newY };
        }}
        onDragEnd={(e) => {
          onChange({
            ...shapeProps,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          node.scaleX(1);
          node.scaleY(1);

          let newFontSize = shapeProps.fontSize;
          let newWidth = Math.max(5, node.width() * scaleX);

          // Detect if it was a proportional scale (corner) vs a side stretch (middle-left/right)
          // middle-left/right keep scaleY identical (1) and only change scaleX
          if (scaleX !== 1 && scaleY !== 1) {
            newFontSize = Math.max(5, shapeProps.fontSize * scaleX);
          } else if (scaleX === 1 && scaleY !== 1) {
            newFontSize = Math.max(5, shapeProps.fontSize * scaleY);
          }

          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            fontSize: newFontSize,
            width: newWidth,
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            const maxW = canvasWidth * scale;
            const maxH = canvasHeight * scale;

            if (newBox.width < 5 || newBox.height < 5) return oldBox;

            // If completely inside, return it
            if (newBox.x >= 0 && newBox.y >= 0 && newBox.x + newBox.width <= maxW && newBox.y + newBox.height <= maxH) {
              return newBox;
            }

            // Clamp newBox instead of rigidly rejecting to prevent permanent freezing
            let res = { ...newBox };
            if (res.x < 0) { res.width = res.width + res.x; res.x = 0; }
            if (res.y < 0) { res.height = res.height + res.y; res.y = 0; }
            if (res.x + res.width > maxW) { res.width = maxW - res.x; }
            if (res.y + res.height > maxH) { res.height = maxH - res.y; }

            if (res.width < 5 || res.height < 5) return oldBox;
            return res;
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

  const DEFAULT_WIDTH = 600;
  const DEFAULT_HEIGHT = 400;
  let scale = 1;
  let stageWidth = containerSize.width;
  let stageHeight = containerSize.height;

  if (image) {
    scale = Math.min(containerSize.width / image.width, containerSize.height / image.height);
    stageWidth = image.width * scale;
    stageHeight = image.height * scale;
  } else if (containerSize.width > 0 && containerSize.height > 0) {
    scale = Math.min(containerSize.width / DEFAULT_WIDTH, containerSize.height / DEFAULT_HEIGHT) * 0.95;
    stageWidth = DEFAULT_WIDTH * scale;
    stageHeight = DEFAULT_HEIGHT * scale;
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
      style={{ width: '100%', height: '100%' }}
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
        style={{ cursor: 'crosshair' }}
      >
        <Layer>
          {/* Grey Background Default */}
          {!image && (
            <Rect
              x={0}
              y={0}
              width={DEFAULT_WIDTH}
              height={DEFAULT_HEIGHT}
              fill="#808080"
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
            const currentWidth = image ? image.width : DEFAULT_WIDTH;
            const currentHeight = image ? image.height : DEFAULT_HEIGHT;
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
                canvasWidth={currentWidth}
                canvasHeight={currentHeight}
                scale={scale}
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
