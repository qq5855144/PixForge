import { memo } from 'react';
import { ArrowDown, ArrowUp, Check, Crop, Download, ImageIcon, MoreHorizontal, RotateCcw, RotateCw, X } from 'lucide-react';
import { EMPTY_EDITS, formatBytes } from '@/image/formats';
import type { Edits, ImageItem, Rotation } from '@/types';

type RowActions = {
  remove: (id: string) => void;
  move: (id: string, offset: number) => void;
  reorder: (from: string, to: string) => void;
  edit: (id: string, edits: Edits, undo?: boolean) => void;
  toggle: (id: string) => void;
  preview: (id: string) => void;
  crop: (id: string) => void;
  download: (item: ImageItem) => void;
};

const statusLabels = { pending: '待处理', processing: '处理中', completed: '已完成', error: '失败' };

function rotate(edits: Edits): Edits {
  const rotation = (edits.rotation + 90) % 360 as Rotation;
  if (!edits.crop) return { rotation };
  const { x, y, width, height } = edits.crop.region;
  const aspect = edits.crop.aspect;
  return { rotation, crop: { ...edits.crop, aspect: aspect && 1 / aspect,
    region: { x: Math.max(0, 1 - y - height), y: x, width: height, height: width } } };
}

const FileRow = memo(function FileRow({ item, actions, locked, canMoveUp, canMoveDown, cropMode }: {
  item: ImageItem;
  actions: RowActions;
  locked: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  cropMode: boolean;
}) {
  return (
    <li className="file-row" data-excluded={item.excluded || undefined} draggable={!locked}
      onDragStart={event => {
        event.dataTransfer.setData('text/x-pixforge-item', item.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={event => {
        if (locked || !event.dataTransfer.types.includes('text/x-pixforge-item')) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={event => {
        if (locked) return;
        const source = event.dataTransfer.getData('text/x-pixforge-item');
        if (source && source !== item.id) { event.preventDefault(); actions.reorder(source, item.id); }
      }}>
      <input type="checkbox" className="file-select" aria-label={`选择 ${item.source.name}`} checked={!item.excluded}
        onChange={() => actions.toggle(item.id)} disabled={locked} />
      <button type="button" className="file-thumb" onClick={() => actions.preview(item.id)} aria-label={`预览 ${item.source.name}`}>
        {item.thumbnail ? <img src={item.thumbnail} alt="" draggable={false} loading="lazy" decoding="async"
          style={{ transform: `rotate(${item.edits.rotation}deg)` }} /> : <ImageIcon size={19} />}
      </button>
      <div className="file-detail">
        <strong title={item.source.name}>{item.source.name}</strong>
        <span>{item.info && `${item.info.width} × ${item.info.height} · `}{formatBytes(item.source.size)}
          {item.info?.animated ? ' · 动画' : ''}{item.edits.crop ? ' · 已设裁剪' : ''}
        </span>
        {item.result && <span className="file-result">{item.status !== 'completed' ? '上次结果 ' : ''}
          {item.result.width} × {item.result.height} · {formatBytes(item.result.blob.size)}
        </span>}
        {item.error && <span className="file-error">{item.error}</span>}
      </div>
      <span className="file-status" data-status={item.status}>
        {item.status === 'completed' && <Check size={13} />}{statusLabels[item.status]}
      </span>
      {cropMode && <button className="icon-button row-crop" disabled={locked} onClick={() => actions.crop(item.id)} aria-label={`裁剪 ${item.source.name}`} title="裁剪"><Crop size={17} /></button>}
      <details className="row-menu" onClick={event => {
        if ((event.target as HTMLElement).closest('button')) event.currentTarget.open = false;
      }}>
        <summary className="icon-button" aria-label={`${item.source.name} 操作`}><MoreHorizontal size={20} /></summary>
        <div className="menu-content">
          {!cropMode && <button disabled={locked} onClick={() => actions.crop(item.id)}><Crop size={15} />裁剪</button>}
          <button disabled={locked} onClick={() => actions.edit(item.id, rotate(item.edits))}><RotateCw size={15} />旋转</button>
          {item.undo && <button disabled={locked} onClick={() => actions.edit(item.id, item.undo!, true)}><RotateCcw size={15} />撤销编辑</button>}
          {(item.edits.crop || item.edits.rotation > 0) && <button disabled={locked} onClick={() => actions.edit(item.id, EMPTY_EDITS)}><RotateCcw size={15} />重置编辑</button>}
          {item.result && <button disabled={locked} onClick={() => actions.download(item)}><Download size={15} />保存</button>}
          <button disabled={locked || !canMoveUp} onClick={() => actions.move(item.id, -1)}><ArrowUp size={15} />上移</button>
          <button disabled={locked || !canMoveDown} onClick={() => actions.move(item.id, 1)}><ArrowDown size={15} />下移</button>
          <button disabled={locked} onClick={() => actions.remove(item.id)}><X size={15} />移除</button>
        </div>
      </details>
    </li>
  );
});

export function FileList({ items, actions, locked, cropMode }: {
  items: ImageItem[];
  actions: RowActions;
  locked: boolean;
  cropMode: boolean;
}) {
  return <ul className="file-list">
    {items.map((item, index) => <FileRow key={item.id} item={item} actions={actions} locked={locked}
      canMoveUp={index > 0} canMoveDown={index + 1 < items.length} cropMode={cropMode} />)}
  </ul>;
}
