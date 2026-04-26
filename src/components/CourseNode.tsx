import { memo, type CSSProperties } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { Course } from '../types';

const categoryPalette = ['#e7efff', '#e6f5ee', '#fff4de', '#fbe9f1', '#e6f6f8', '#ede9ff'];

const normalizeCategory = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getCategoryColor = (category?: string) => {
  if (!category?.trim()) return '#f4f7f9';

  const normalized = normalizeCategory(category);
  const hash = Array.from(normalized).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return categoryPalette[hash % categoryPalette.length];
};

function CourseNode({ id, data, selected }: NodeProps<Course>) {
  const style = {
    '--course-category-color': getCategoryColor(data.category),
  } as CSSProperties;

  return (
    <div
      className={`course-node ${selected ? 'is-selected' : ''}`}
      data-course-id={id}
      style={style}
    >
      <Handle type="target" position={Position.Left} className="course-node__handle" />
      <div className="course-node__title">
        {data.code} - {data.name} ({data.workload}h)
      </div>
      <Handle type="source" position={Position.Right} className="course-node__handle" />
    </div>
  );
}

export default memo(CourseNode);
