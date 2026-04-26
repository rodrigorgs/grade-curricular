import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { Course } from '../types';

function CourseNode({ id, data, selected }: NodeProps<Course>) {
  return (
    <div
      className={`course-node course-node--${data.status} ${selected ? 'is-selected' : ''}`}
      data-course-id={id}
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
