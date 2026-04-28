import { memo } from 'react';
import type { NodeProps } from 'reactflow';

export type SemesterNodeData = {
  semester: number;
  workload: number;
};

function SemesterNode({ data }: NodeProps<SemesterNodeData>) {
  return (
    <div className="semester-node">
      {data.semester}º semestre ({data.workload}h)
    </div>
  );
}

export default memo(SemesterNode);
