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

export default function CanvasEditor({ imageUrl, texts, selectedTextId, onSelectText, onUpdateText, stageRef }) {
  const [image] = useImage(imageUrl, 'anonymous');
  const [stageSize, setStageSize] = useState({ width: 500, height: 500 });
  const containerRef = useRef(null);

  // Resize canvas to fit container visually while maintaining logic
  useEffect(() => {
    const checkSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = containerRef.current.offsetHeight;
        setStageSize({ width, height });
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

  // Calculate image rendering size to fit canvas or cover
  let imgWidth = stageSize.width;
  let imgHeight = stageSize.height;
  let imgX = 0;
  let imgY = 0;

  if (image) {
    const scale = Math.min(stageSize.width / image.width, stageSize.height / image.height);
    imgWidth = image.width * scale;
    imgHeight = image.height * scale;
    imgX = (stageSize.width - imgWidth) / 2;
    imgY = (stageSize.height - imgHeight) / 2;
  }

  return (
    <div className="canvas-area glass-panel" ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '400px' }}>
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        onMouseDown={checkDeselect}
        onTouchStart={checkDeselect}
        ref={stageRef}
        style={{ cursor: 'crosshair', backgroundColor: '#ffffff' }}
      >
        <Layer>
          {/* White Background Default */}
          <Rect
            x={0}
            y={0}
            width={stageSize.width}
            height={stageSize.height}
            fill="#ffffff"
            name="bg"
          />
          {image && (
            <KonvaImage
              image={image}
              x={imgX}
              y={imgY}
              width={imgWidth}
              height={imgHeight}
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
