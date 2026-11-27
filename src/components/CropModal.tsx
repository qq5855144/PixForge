import { useEffect, useState } from 'react';
import { RotateCw } from 'lucide-react';
import type { CropShape, Edits, ImageItem, Region, Rotation } from '@/types';
import { ImageClient } from '@/image/client';
import { centeredRegion } from '@/image/crop';
import { CustomCropper } from './CustomCropper';
import { Modal } from './Modal';

const ratios = [
  { label: '自由', value: undefined }, { label: '1:1', value: 1 }, { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 }, { label: '16:9', value: 16 / 9 }, { label: '9:16', value: 9 / 16 },
];

export default function CropModal({ item, onClose, onConfirm }: {
  item: ImageItem;
  onClose: () => void;
  onConfirm: (edits: Edits) => void;
}) {
  const [rotation, setRotation] = useState(item.edits.rotation);
  const [shape, setShape] = useState<CropShape>(item.edits.crop?.shape || 'rect');
  const [radius, setRadius] = useState(item.edits.crop?.radius || 0);
  const [aspect, setAspect] = useState(item.edits.crop?.aspect);
  const [region, setRegion] = useState<Region | undefined>(item.edits.crop?.region);
  const [preview, setPreview] = useState<{ url: string; width: number; height: number; rotation: Rotation }>();
  const [error, setError] = useState('');

  useEffect(() => {
    const client = new ImageClient();
    const request = new AbortController();
    let url: string | undefined;
    client.preview(item.source, 1800, { rotation }, request.signal).then(result => {
      if (request.signal.aborted) return;
      url = URL.createObjectURL(result.blob);
      const { width, height } = result.info;
      const swapped = rotation === 90 || rotation === 270;
      setPreview({ url, width: swapped ? height : width, height: swapped ? width : height, rotation });
    }).catch(error => {
      if (!request.signal.aborted) setError(error instanceof Error ? error.message : '无法加载裁剪预览');
    });
    return () => {
      request.abort();
      client.close();
      if (url) URL.revokeObjectURL(url);
    };
  }, [item.source, rotation]);

  const shown = preview?.rotation === rotation ? preview : undefined;
  const current = shown && (region || centeredRegion(shown.width, shown.height, aspect));

  function rotate() {
    if (region) {
      const { x, y, width, height } = region;
      setRegion({ x: Math.max(0, 1 - y - height), y: x, width: height, height: width });
    }
    if (aspect) setAspect(1 / aspect);
    setError('');
    setRotation((rotation + 90) % 360 as Rotation);
  }

  return (
    <Modal title="裁剪图片" onClose={onClose} className="editor-modal" action={
      <button className="primary" disabled={!current} onClick={() => {
        if (current) onConfirm({ rotation, crop: { region: current, shape, radius, aspect } });
      }}>应用</button>
    }>
      {shown && current ? <CustomCropper imageUrl={shown.url} width={shown.width} height={shown.height} region={current}
        aspect={aspect} shape={shape} radius={radius} onChange={setRegion} /> :
        <p className="editor-loading" role="status">{error || '正在准备裁剪预览…'}</p>}
      <div className="editor-controls">
        <div className="control-row">
          <button className="button" onClick={rotate} disabled={!shown}><RotateCw size={16} />旋转</button>
          <button className="button" aria-pressed={shape === 'round'} onClick={() => setShape(shape === 'round' ? 'rect' : 'round')}>
            {shape === 'round' ? '椭圆' : '矩形'}
          </button>
          {current && shown && <span className="dimension-label">{Math.round(current.width * shown.width)} × {Math.round(current.height * shown.height)} px</span>}
        </div>
        <div className="choice-row" aria-label="裁剪比例">
          {ratios.map(option => <button key={option.label} className="mini-button" aria-pressed={aspect === option.value}
            onClick={() => { setAspect(option.value); setRegion(undefined); }}>{option.label}</button>)}
        </div>
        {shape === 'rect' && <label className="range-row">圆角 <input type="range" min="0" max="100" value={radius}
          onChange={event => setRadius(Number(event.target.value))} /><output>{radius}%</output></label>}
      </div>
    </Modal>
  );
}
