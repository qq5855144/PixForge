import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw } from 'lucide-react';
import { formatBytes } from '@/image/formats';
import { cleanSvg } from '@/image/svg';
import type { ImageItem } from '@/types';
import { isSvg } from '@/image/formats';
import { Modal } from './Modal';

export default function PreviewModal({ item, onClose, onNavigate }: {
  item: ImageItem;
  onClose: () => void;
  onNavigate?: (direction: number) => void;
}) {
  const [source, setSource] = useState('');
  const [zoom, setZoom] = useState(1);
  const [view, setView] = useState<'original' | 'result' | 'both'>(item.result ? 'both' : 'original');

  useEffect(() => {
    let closed = false;
    let url: string | undefined;
    const resolve = isSvg(item.source) ? cleanSvg(item.source) : Promise.resolve(item.source);
    resolve.then(blob => {
      if (closed) return;
      url = URL.createObjectURL(blob);
      setSource(url);
    }).catch(() => { if (!closed) setSource(item.thumbnail || ''); });
    return () => {
      closed = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [item.source, item.thumbnail]);

  const result = item.result;
  const changeZoom = (delta: number) => setZoom(value => Math.min(4, Math.max(1, value + delta)));
  return (
    <Modal title="图片预览" onClose={onClose} className="preview-modal">
      <div className="preview-description">
        <strong title={item.source.name}>{item.source.name}</strong>
        <span>{item.info && `${item.info.width} × ${item.info.height} · `}{formatBytes(item.source.size)}</span>
      </div>
      <div className="preview-toolbar">
        <div className="choice-row">
          {result && (['original', 'result', 'both'] as const).map(key =>
            <button key={key} className="mini-button" aria-pressed={view === key} onClick={() => setView(key)}>
              {{ original: '原图', result: '结果', both: '对比' }[key]}
            </button>)}
        </div>
        <div className="choice-row">
          <button className="icon-button" onClick={() => changeZoom(-.25)} aria-label="缩小" disabled={zoom === 1}><Minus size={17} /></button>
          <button className="mini-button" onClick={() => setZoom(1)} aria-label="重置缩放"><RotateCcw size={13} /> {Math.round(zoom * 100)}%</button>
          <button className="icon-button" onClick={() => changeZoom(.25)} aria-label="放大" disabled={zoom === 4}><Plus size={17} /></button>
        </div>
      </div>
      <div className="preview-area" data-compare={view === 'both'} onKeyDown={event => {
        if (event.key === 'ArrowLeft') onNavigate?.(-1);
        if (event.key === 'ArrowRight') onNavigate?.(1);
      }}>
        {view !== 'result' && <figure className="preview-pane"><figcaption>原图 · {formatBytes(item.source.size)}</figcaption>
          <div className="preview-image">{source ? <img src={source} alt="原图" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }} />
            : <span>预览暂不可用</span>}</div>
        </figure>}
        {view !== 'original' && result && <figure className="preview-pane">
          <figcaption>结果 · {result.width} × {result.height} · {formatBytes(result.blob.size)}</figcaption>
          <div className="preview-image"><img src={result.url} alt="处理结果" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }} /></div>
        </figure>}
      </div>
      {onNavigate && <div className="preview-nav">
        <button className="button" onClick={() => onNavigate(-1)}><ChevronLeft size={16} />上一张</button>
        <button className="button" onClick={() => onNavigate(1)}>下一张<ChevronRight size={16} /></button>
      </div>}
    </Modal>
  );
}
