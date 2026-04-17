import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect, Group } from 'react-konva';
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

// Inserted Image Node (draggable + resizable)
const InsertedImageNode = ({ imageData, isSelected, onSelect, onChange, canvasWidth, canvasHeight, scale }) => {
  const shapeRef = useRef();
  const trRef = useRef();
  const [img] = useImage(imageData.src, 'anonymous');

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  if (!img) return null;

  return (
    <React.Fragment>
      <KonvaImage
        image={img}
        x={imageData.x}
        y={imageData.y}
        width={imageData.width}
        height={imageData.height}
        rotation={imageData.rotation || 0}
        draggable
        ref={shapeRef}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({
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
          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

// Crop overlay component
const CropOverlay = ({ canvasWidth, canvasHeight, cropRect, onCropRectChange, scale }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const cropRectRef = useRef();
  const trRef = useRef();

  // Attach transformer only after drawing is finished and crop rect is finalized
  useEffect(() => {
    if (cropRect && !isDrawing && trRef.current && cropRectRef.current) {
      trRef.current.nodes([cropRectRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [cropRect, isDrawing]);

  const getCanvasPos = (e) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    return {
      x: Math.max(0, Math.min(pos.x / scale, canvasWidth)),
      y: Math.max(0, Math.min(pos.y / scale, canvasHeight)),
    };
  };

  const handleMouseDown = (e) => {
    // Don't start a new draw if clicking on the crop rect itself (let transformer handle it)
    if (e.target.name && e.target.name() === 'cropSelection') return;
    const pos = getCanvasPos(e);
    setIsDrawing(true);
    setStartPos(pos);
    onCropRectChange(null);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !startPos) return;
    const pos = getCanvasPos(e);
    onCropRectChange({
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      width: Math.abs(pos.x - startPos.x),
      height: Math.abs(pos.y - startPos.y),
    });
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setStartPos(null);
    }
  };

  return (
    <React.Fragment>
      {/* Visual-only dark overlay (no interaction) */}
      <Rect
        x={0}
        y={0}
        width={canvasWidth}
        height={canvasHeight}
        fill="rgba(0,0,0,0.4)"
        listening={false}
      />

      {/* Interaction surface for drawing crop selection — stays listening throughout the drag */}
      <Rect
        x={0}
        y={0}
        width={canvasWidth}
        height={canvasHeight}
        fill="transparent"
        listening={!cropRect || isDrawing}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      />

      {/* Crop selection rectangle */}
      {cropRect && (
        <React.Fragment>
          <Rect
            ref={cropRectRef}
            name="cropSelection"
            x={cropRect.x}
            y={cropRect.y}
            width={cropRect.width}
            height={cropRect.height}
            fill="rgba(139, 92, 246, 0.15)"
            stroke="#8b5cf6"
            strokeWidth={2 / scale}
            dash={[8 / scale, 4 / scale]}
            draggable={!isDrawing}
            listening={!isDrawing}
            onDragEnd={(e) => {
              const node = e.target;
              onCropRectChange({
                ...cropRect,
                x: Math.max(0, Math.min(node.x(), canvasWidth - cropRect.width)),
                y: Math.max(0, Math.min(node.y(), canvasHeight - cropRect.height)),
              });
            }}
            onTransformEnd={(e) => {
              const node = cropRectRef.current;
              const scaleX = node.scaleX();
              const scaleY = node.scaleY();
              node.scaleX(1);
              node.scaleY(1);
              onCropRectChange({
                x: Math.max(0, node.x()),
                y: Math.max(0, node.y()),
                width: Math.min(Math.max(5, node.width() * scaleX), canvasWidth - Math.max(0, node.x())),
                height: Math.min(Math.max(5, node.height() * scaleY), canvasHeight - Math.max(0, node.y())),
              });
            }}
          />
          {/* Only show transformer handles after drawing is complete */}
          {!isDrawing && (
            <Transformer
              ref={trRef}
              rotateEnabled={false}
              enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) return oldBox;
                return newBox;
              }}
            />
          )}
        </React.Fragment>
      )}
    </React.Fragment>
  );
};

export default function CanvasEditor({ 
  imageUrl, texts, selectedTextId, onSelectText, onUpdateText, stageRef, onImageDrop,
  // Advanced props
  isCropping, cropRect, onCropRectChange,
  insertedImages = [], selectedInsertedImageId, onSelectInsertedImage, onUpdateInsertedImage, onDeleteInsertedImage,
}) {
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
      if (onSelectInsertedImage) onSelectInsertedImage(null);
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
        onMouseDown={!isCropping ? checkDeselect : undefined}
        onTouchStart={!isCropping ? checkDeselect : undefined}
        ref={stageRef}
        style={{ cursor: isCropping ? 'crosshair' : 'default' }}
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

          {/* Inserted image layers */}
          {insertedImages.map((imgData) => {
            const currentWidth = image ? image.width : DEFAULT_WIDTH;
            const currentHeight = image ? image.height : DEFAULT_HEIGHT;
            return (
              <InsertedImageNode
                key={imgData.id}
                imageData={imgData}
                isSelected={imgData.id === selectedInsertedImageId}
                onSelect={() => {
                  if (onSelectInsertedImage) onSelectInsertedImage(imgData.id);
                  onSelectText(null);
                }}
                onChange={(newAttrs) => {
                  if (onUpdateInsertedImage) onUpdateInsertedImage(imgData.id, newAttrs);
                }}
                canvasWidth={currentWidth}
                canvasHeight={currentHeight}
                scale={scale}
              />
            );
          })}

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
                  if (onSelectInsertedImage) onSelectInsertedImage(null);
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

          {/* Crop overlay */}
          {isCropping && (
            <CropOverlay
              canvasWidth={image ? image.width : DEFAULT_WIDTH}
              canvasHeight={image ? image.height : DEFAULT_HEIGHT}
              cropRect={cropRect}
              onCropRectChange={onCropRectChange}
              scale={scale}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
