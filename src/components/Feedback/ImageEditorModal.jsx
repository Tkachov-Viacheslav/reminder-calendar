import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Pencil,
  Square,
  ShieldAlert,
  Undo2,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { Modal, Button } from '../ui';

const COLORS = [
  { label: 'Червоний', value: '#ef4444' },
  { label: 'Жовтий', value: '#eab308' },
  { label: 'Синій', value: '#3b82f6' },
  { label: 'Чорний', value: '#0f172a' },
];

export function ImageEditorModal({ isOpen, imageFile, onClose, onSave }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('pen'); // 'pen' | 'rect' | 'censor'
  const [color, setColor] = useState('#ef4444');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState([]);
  const [imgElement, setImgElement] = useState(null);

  // Завантаження зображення у canvas
  useEffect(() => {
    if (!isOpen || !imageFile) return;

    const img = new Image();
    const url = URL.createObjectURL(imageFile);
    img.onload = () => {
      setImgElement(img);
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [isOpen, imageFile]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    const pos = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(pos);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    if (tool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(3, canvas.width / 250);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || history.length === 0) return;

    const currentPos = getCanvasCoords(e);

    if (tool === 'pen') {
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();
    } else {
      // Для прямокутника або цензури відновлюємо стан перед початком фігури
      ctx.putImageData(history[history.length - 1], 0, 0);
      const width = currentPos.x - startPos.x;
      const height = currentPos.y - startPos.y;

      if (tool === 'rect') {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(3, canvas.width / 250);
        ctx.strokeRect(startPos.x, startPos.y, width, height);
      } else if (tool === 'censor') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(startPos.x, startPos.y, width, height);
      }
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev, snapshot]);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const nextHistory = history.slice(0, -1);
    ctx.putImageData(nextHistory[nextHistory.length - 1], 0, 0);
    setHistory(nextHistory);
  };

  const handleClear = () => {
    if (!imgElement) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(imgElement, 0, 0);
    const initialSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([initialSnapshot]);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const originalName = imageFile?.name || 'screenshot.png';
      const cleanName = originalName.replace(/\.[^/.]+$/, '') + '-edited.png';
      const updatedFile = new File([blob], cleanName, { type: 'image/png' });
      onSave(updatedFile);
    }, 'image/png');
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Редагування скріншота"
      maxWidth="max-w-3xl"
    >
      <div className="p-3 space-y-3">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          {/* Tools */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTool('pen')}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-medium transition-colors ${
                tool === 'pen'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
              title="Маркер / Олівець"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Олівець</span>
            </button>

            <button
              type="button"
              onClick={() => setTool('rect')}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-medium transition-colors ${
                tool === 'rect'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
              title="Обвести прямокутником"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Рамка</span>
            </button>

            <button
              type="button"
              onClick={() => setTool('censor')}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1 font-medium transition-colors ${
                tool === 'censor'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
              title="Приховати конфіденційні дані"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Цензура</span>
            </button>
          </div>

          {/* Color Palette */}
          {tool !== 'censor' && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    color === c.value ? 'scale-110 border-indigo-500' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          )}

          {/* Undo / Clear Actions */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length <= 1}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              title="Скасувати останню дію"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Очистити всі позначки"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas Workspace */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center overflow-auto max-h-[60vh] select-none p-1">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="max-w-full max-h-[55vh] object-contain cursor-crosshair rounded touch-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Скасувати
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            icon={<Check className="w-3.5 h-3.5" />}
          >
            Зберегти зміни
          </Button>
        </div>
      </div>
    </Modal>
  );
}
