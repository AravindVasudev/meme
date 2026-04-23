import React, { useRef, useEffect, useState } from 'react';
import Konva from 'konva';
import { Stage, Layer, Image as KonvaImage, Text, Transformer, Rect, Line, Circle, Ellipse, RegularPolygon } from 'react-konva';
import useImage from 'use-image';

// === Custom Filters ===
const SepiaFilter = (imageData) => {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
    data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
    data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
  }
};

const WarmFilter = (imageData) => {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, data[i] + 25);
    data[i + 1] = Math.min(255, data[i + 1] + 10);
    data[i + 2] = Math.max(0, data[i + 2] - 20);
  }
};

const CoolFilter = (imageData) => {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, data[i] - 15);
    data[i + 1] = Math.min(255, data[i + 1] + 5);
    data[i + 2] = Math.min(255, data[i + 2] + 30);
  }
};

const FILTER_CONFIGS = {
  none: { filters: [], props: {} },
  grayscale: { filters: [Konva.Filters.Grayscale], props: {} },
  sepia: { filters: [SepiaFilter], props: {} },
  vivid: { filters: [Konva.Filters.Contrast, Konva.Filters.Brighten], props: { contrast: 40, brightness: 0.05 } },
  warm: { filters: [WarmFilter], props: {} },
  cool: { filters: [CoolFilter], props: {} },
  invert: { filters: [Konva.Filters.Invert], props: {} },
};

// === Text Node ===
const TextNode = ({ shapeProps, isSelected, onSelect, onChange, canvasWidth, canvasHeight, scale }) => {
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected && shapeRef.current && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
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
          onChange({ ...shapeProps, x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          let newFontSize = shapeProps.fontSize;
          let newWidth = Math.max(5, node.width() * scaleX);
          if (scaleX !== 1 && scaleY !== 1) {
            newFontSize = Math.max(5, shapeProps.fontSize * scaleX);
          } else if (scaleX === 1 && scaleY !== 1) {
            newFontSize = Math.max(5, shapeProps.fontSize * scaleY);
          }
          onChange({ ...shapeProps, x: node.x(), y: node.y(), fontSize: newFontSize, width: newWidth });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            const maxW = canvasWidth * scale;
            const maxH = canvasHeight * scale;
            if (newBox.width < 5 || newBox.height < 5) return oldBox;
            if (newBox.x >= 0 && newBox.y >= 0 && newBox.x + newBox.width <= maxW && newBox.y + newBox.height <= maxH) return newBox;
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

// === Inserted Image Node ===
const InsertedImageNode = ({ imageData, isSelected, onSelect, onChange }) => {
  const shapeRef = useRef();
  const trRef = useRef();
  const [img] = useImage(imageData.src, 'anonymous');

  useEffect(() => {
    if (isSelected && shapeRef.current && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
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
        onDragEnd={(e) => { onChange({ x: e.target.x(), y: e.target.y() }); }}
        onTransformEnd={() => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            x: node.x(), y: node.y(),
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

// === Drawing Node ===
const DrawingLayerNode = ({ lines }) => {
  return (
    <React.Fragment>
      {lines.map((item, i) => {
        if (item.type === 'path') {
          return (
            <Line
              key={i}
              points={item.points}
              stroke={item.stroke}
              strokeWidth={item.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={item.globalCompositeOperation || 'source-over'}
              listening={false}
            />
          );
        } else if (item.type === 'rect' || item.type === 'square') {
          return <Rect key={i} {...item} listening={false} />;
        } else if (item.type === 'circle') {
          return <Circle key={i} {...item} listening={false} />;
        } else if (item.type === 'ellipse') {
          return <Ellipse key={i} {...item} listening={false} />;
        } else if (item.type === 'triangle') {
          return <RegularPolygon key={i} {...item} sides={3} listening={false} />;
        }
        return null;
      })}
    </React.Fragment>
  );
};

// === Crop Overlay ===
const CropOverlay = ({ canvasWidth, canvasHeight, cropRect, onCropRectChange, scale }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const cropRectRef = useRef();
  const trRef = useRef();

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
    if (isDrawing) { setIsDrawing(false); setStartPos(null); }
  };

  return (
    <React.Fragment>
      <Rect x={0} y={0} width={canvasWidth} height={canvasHeight} fill="rgba(0,0,0,0.4)" listening={false} />
      <Rect
        x={0} y={0} width={canvasWidth} height={canvasHeight} fill="transparent"
        listening={!cropRect || isDrawing}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}
      />
      {cropRect && (
        <React.Fragment>
          <Rect
            ref={cropRectRef} name="cropSelection"
            x={cropRect.x} y={cropRect.y} width={cropRect.width} height={cropRect.height}
            fill="rgba(139, 92, 246, 0.15)" stroke="#8b5cf6"
            strokeWidth={2 / scale} dash={[8 / scale, 4 / scale]}
            draggable={!isDrawing} listening={!isDrawing}
            onDragEnd={(e) => {
              const node = e.target;
              onCropRectChange({
                ...cropRect,
                x: Math.max(0, Math.min(node.x(), canvasWidth - cropRect.width)),
                y: Math.max(0, Math.min(node.y(), canvasHeight - cropRect.height)),
              });
            }}
            onTransformEnd={() => {
              const node = cropRectRef.current;
              const sx = node.scaleX(); const sy = node.scaleY();
              node.scaleX(1); node.scaleY(1);
              onCropRectChange({
                x: Math.max(0, node.x()), y: Math.max(0, node.y()),
                width: Math.min(Math.max(5, node.width() * sx), canvasWidth - Math.max(0, node.x())),
                height: Math.min(Math.max(5, node.height() * sy), canvasHeight - Math.max(0, node.y())),
              });
            }}
          />
          {!isDrawing && (
            <Transformer ref={trRef} rotateEnabled={false}
              enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
              boundBoxFunc={(oldBox, newBox) => (newBox.width < 5 || newBox.height < 5) ? oldBox : newBox}
            />
          )}
        </React.Fragment>
      )}
    </React.Fragment>
  );
};

// === Draw Overlay ===
const DrawOverlay = ({ canvasWidth, canvasHeight, brushColor, brushSize, brushFillColor, scale, activeDrawTool, onDrawEnd }) => {
  const [isCurrentlyDrawing, setIsCurrentlyDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);
  const isFreehandTool = activeDrawTool === 'pen' || activeDrawTool === 'eraser';

  const getCanvasPos = (e) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    return { x: pos.x / scale, y: pos.y / scale };
  };

  const handleMouseDown = (e) => {
    const pos = getCanvasPos(e);
    setIsCurrentlyDrawing(true);
    setStartPos(pos);

    if (isFreehandTool) {
      setCurrentPath([pos.x, pos.y]);
    } else {
      setPreviewItem({
        type: activeDrawTool,
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        radius: 0,
        radiusX: 0,
        radiusY: 0,
        stroke: brushColor,
        strokeWidth: brushSize,
        fill: brushFillColor,
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!isCurrentlyDrawing || !startPos) return;
    const pos = getCanvasPos(e);

    if (isFreehandTool) {
      setCurrentPath(prev => [...prev, pos.x, pos.y]);
    } else {
      const dx = pos.x - startPos.x;
      const dy = pos.y - startPos.y;

      let newItem = { ...previewItem };

      if (activeDrawTool === 'rect' || activeDrawTool === 'square') {
        let w = dx;
        let h = dy;
        if (activeDrawTool === 'square') {
          const side = Math.max(Math.abs(w), Math.abs(h));
          w = w >= 0 ? side : -side;
          h = h >= 0 ? side : -side;
        }
        newItem = { ...newItem, x: startPos.x, y: startPos.y, width: w, height: h };
      } else if (activeDrawTool === 'circle') {
        const radius = Math.sqrt(dx * dx + dy * dy);
        newItem = { ...newItem, x: startPos.x, y: startPos.y, radius };
      } else if (activeDrawTool === 'ellipse') {
        newItem = { ...newItem, x: startPos.x, y: startPos.y, radiusX: Math.abs(dx), radiusY: Math.abs(dy) };
      } else if (activeDrawTool === 'triangle') {
        const radius = Math.sqrt(dx * dx + dy * dy);
        const rotation = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        newItem = { ...newItem, x: startPos.x, y: startPos.y, radius, rotation };
      }

      setPreviewItem(newItem);
    }
  };

  const handleMouseUp = () => {
    if (isFreehandTool) {
      if (currentPath.length >= 2) {
        onDrawEnd({
          type: 'path',
          points: currentPath,
          stroke: activeDrawTool === 'eraser' ? '#000000' : brushColor,
          strokeWidth: brushSize,
          globalCompositeOperation: activeDrawTool === 'eraser' ? 'destination-out' : 'source-over',
        });
      }
      setCurrentPath([]);
    } else if (previewItem) {
      onDrawEnd(previewItem);
      setPreviewItem(null);
    }
    setIsCurrentlyDrawing(false);
    setStartPos(null);
  };

  return (
    <React.Fragment>
      {isFreehandTool && currentPath.length >= 2 && (
        <Line
          points={currentPath}
          stroke={activeDrawTool === 'eraser' ? '#000000' : brushColor}
          strokeWidth={brushSize}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          globalCompositeOperation={activeDrawTool === 'eraser' ? 'destination-out' : 'source-over'}
          listening={false}
        />
      )}
      {previewItem && (
        <React.Fragment>
          {previewItem.type === 'rect' || previewItem.type === 'square' ? (
            <Rect {...previewItem} listening={false} />
          ) : previewItem.type === 'circle' ? (
            <Circle {...previewItem} listening={false} />
          ) : previewItem.type === 'ellipse' ? (
            <Ellipse {...previewItem} listening={false} />
          ) : previewItem.type === 'triangle' ? (
            <RegularPolygon {...previewItem} sides={3} listening={false} />
          ) : null}
        </React.Fragment>
      )}
      <Rect
        x={0} y={0} width={canvasWidth} height={canvasHeight} fill="transparent"
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}
      />
    </React.Fragment>
  );
};

// === Main Canvas Editor ===
export default function CanvasEditor({
  imageUrl, texts, selectedTextId, onSelectLayer, onUpdateText, stageRef,
  isCropping, cropRect, onCropRectChange,
  insertedImages = [], selectedInsertedImageId, onUpdateInsertedImage,
  layerOrder = [],
  drawingLayers = [], selectedDrawingLayerId, onUpdateDrawingLayer,
  activeDrawTool, brushSize, brushColor, brushFillColor,
  activeFilter = 'none', backgroundColor = '#2d2d2d', canvasDim = { width: 600, height: 400 },
}) {
  const [image] = useImage(imageUrl, 'anonymous');
  const [containerSize, setContainerSize] = useState({ width: 500, height: 500 });
  const containerRef = useRef(null);
  const bgImageRef = useRef(null);

  useEffect(() => {
    const checkSize = () => {
      if (containerRef.current) {
        setContainerSize({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
      }
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  useEffect(() => {
    if (bgImageRef.current && image) {
      bgImageRef.current.cache();
      bgImageRef.current.getLayer()?.batchDraw();
    }
  }, [image, activeFilter]);

  const checkDeselect = (e) => {
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.getName() === 'bg';
    if (clickedOnEmpty) {
      onSelectLayer(null, null);
    }
  };

  const DEFAULT_WIDTH = canvasDim.width;
  const DEFAULT_HEIGHT = canvasDim.height;
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

  useEffect(() => {
    if (stageRef.current) { stageRef.current.nativeScale = scale; }
  }, [scale, stageRef]);

  const currentWidth = image ? image.width : DEFAULT_WIDTH;
  const currentHeight = image ? image.height : DEFAULT_HEIGHT;

  const filterConfig = FILTER_CONFIGS[activeFilter] || FILTER_CONFIGS.none;
  const isInteractive = !isCropping && !activeDrawTool;

  const handleDrawEnd = (newItem) => {
    if (!selectedDrawingLayerId || !onUpdateDrawingLayer) return;
    const layer = drawingLayers.find(dl => dl.id === selectedDrawingLayerId);
    if (layer) {
      onUpdateDrawingLayer(selectedDrawingLayerId, [...layer.lines, newItem]);
    }
  };

  return (
    <div
      className="canvas-area glass-panel" ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    >
      <Stage
        width={stageWidth} height={stageHeight}
        scaleX={scale} scaleY={scale}
        onMouseDown={isInteractive ? checkDeselect : undefined}
        onTouchStart={isInteractive ? checkDeselect : undefined}
        ref={stageRef}
        style={{ cursor: isCropping || activeDrawTool ? 'crosshair' : 'default' }}
      >
        <Layer>
          <Rect
            x={0} y={0}
            width={currentWidth} height={currentHeight}
            fill={backgroundColor}
            name="bg"
          />

          {image && (
            <KonvaImage
              ref={bgImageRef}
              image={image}
              x={0} y={0}
              width={image.width} height={image.height}
              name="bg"
              filters={filterConfig.filters}
              {...filterConfig.props}
            />
          )}
        </Layer>

        {layerOrder.map((layer) => {
          if (layer.type === 'text') {
            const text = texts.find(t => t.id === layer.id);
            if (!text) return null;
            return (
              <Layer key={`text-${text.id}`}>
                <TextNode
                  shapeProps={text}
                  isSelected={text.id === selectedTextId}
                  onSelect={() => onSelectLayer(text.id, 'text')}
                  onChange={(newAttrs) => onUpdateText(text.id, newAttrs)}
                  canvasWidth={currentWidth}
                  canvasHeight={currentHeight}
                  scale={scale}
                />
              </Layer>
            );
          }

          if (layer.type === 'image') {
            const imgData = insertedImages.find(img => img.id === layer.id);
            if (!imgData) return null;
            return (
              <Layer key={`image-${imgData.id}`}>
                <InsertedImageNode
                  imageData={imgData}
                  isSelected={imgData.id === selectedInsertedImageId}
                  onSelect={() => onSelectLayer(imgData.id, 'image')}
                  onChange={(newAttrs) => { if (onUpdateInsertedImage) onUpdateInsertedImage(imgData.id, newAttrs); }}
                  canvasWidth={currentWidth}
                  canvasHeight={currentHeight}
                  scale={scale}
                />
              </Layer>
            );
          }

          if (layer.type === 'drawing') {
            const drawLayer = drawingLayers.find(dl => dl.id === layer.id);
            if (!drawLayer) return null;
            return (
              <Layer key={`drawing-${drawLayer.id}`}>
                <DrawingLayerNode lines={drawLayer.lines} />
              </Layer>
            );
          }

          return null;
        })}

        {activeDrawTool && (
          <Layer>
            <DrawOverlay
              canvasWidth={currentWidth}
              canvasHeight={currentHeight}
              brushColor={brushColor}
              brushSize={brushSize}
              brushFillColor={brushFillColor}
              scale={scale}
              activeDrawTool={activeDrawTool}
              onDrawEnd={handleDrawEnd}
            />
          </Layer>
        )}

        {isCropping && (
          <Layer>
            <CropOverlay
              canvasWidth={currentWidth}
              canvasHeight={currentHeight}
              cropRect={cropRect}
              onCropRectChange={onCropRectChange}
              scale={scale}
            />
          </Layer>
        )}
      </Stage>
    </div>
  );
}
