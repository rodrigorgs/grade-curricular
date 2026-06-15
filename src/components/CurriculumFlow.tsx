import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dagre from 'dagre';
import ReactFlow, {
  Background,
  Connection,
  Controls,
  type Edge,
  type Node,
  type NodeDragHandler,
  type NodeTypes,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import { BarChart3, X } from 'lucide-react';
import CourseNode from './CourseNode';
import SemesterNode, { type SemesterNodeData } from './SemesterNode';
import { useCurriculumStore } from '../store/curriculumStore';
import type { Course } from '../types';

type FlowNodeData = Course | SemesterNodeData;

const nodeWidth = 170;
const nodeHeight = 64;
const semesterWidth = 190;
const semesterGap = 14;
const topOffset = 72;
const complementaryWorkload = 200;
const extensionWorkload = 320;

const nodeTypes: NodeTypes = {
  course: CourseNode,
  semester: SemesterNode,
};

const walkGraph = (startId: string, adjacency: Map<string, string[]>) => {
  const visited = new Set<string>();
  const pending = [...(adjacency.get(startId) ?? [])];

  while (pending.length > 0) {
    const nextId = pending.pop();
    if (!nextId || visited.has(nextId)) continue;

    visited.add(nextId);
    pending.push(...(adjacency.get(nextId) ?? []));
  }

  return visited;
};

const getDepartment = (course: Course) => {
  if (course.department?.trim()) return course.department.trim().toUpperCase();

  const code = course.code.trim().toUpperCase();
  const prefix = code.match(/^[A-Z]+/)?.[0];
  return prefix || 'SEM DEPTO.';
};

const isOptionalCourse = (course: Course) => course.nature?.trim().toUpperCase() === 'OP';

const buildLayout = (courses: Course[]): { nodes: Node<FlowNodeData>[]; edges: Edge[] } => {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'LR', nodesep: 42, ranksep: 70 });

  courses.forEach((course) => {
    graph.setNode(course.id, { width: nodeWidth, height: nodeHeight });
  });

  courses.forEach((course) => {
    course.prerequisites.forEach((prerequisite) => {
      graph.setEdge(prerequisite, course.id);
    });
  });

  dagre.layout(graph);

  const bySemester = new Map<number, Course[]>();
  courses.forEach((course) => {
    bySemester.set(course.semester, [...(bySemester.get(course.semester) ?? []), course]);
  });

  const nodes = courses.map((course) => {
    const semesterCourses = bySemester.get(course.semester) ?? [];
    const order = [...semesterCourses].sort((a, b) => {
      const aNode = graph.node(a.id);
      const bNode = graph.node(b.id);
      return (aNode?.y ?? 0) - (bNode?.y ?? 0) || a.name.localeCompare(b.name);
    });
    const row = order.findIndex((item) => item.id === course.id);

    return {
      id: course.id,
      type: 'course',
      data: course,
      position: {
        x: (course.semester - 1) * (semesterWidth + semesterGap) + 30,
        y: topOffset + Math.max(row, 0) * (nodeHeight + 28),
      },
    };
  });

  const edges = courses.flatMap((course) =>
    course.prerequisites.map((prerequisite) => ({
      id: `${prerequisite}-${course.id}`,
      source: prerequisite,
      target: course.id,
      animated: true,
      className: 'course-edge',
    })),
  );

  return { nodes, edges };
};

export function CurriculumFlow() {
  const courses = useCurriculumStore((state) => state.courses);
  const selectedCourseId = useCurriculumStore((state) => state.selectedCourseId);
  const selectCourse = useCurriculumStore((state) => state.selectCourse);
  const moveCourseToSemester = useCurriculumStore((state) => state.moveCourseToSemester);
  const setPrerequisites = useCurriculumStore((state) => state.setPrerequisites);
  const [hoveredCourseId, setHoveredCourseId] = useState<string | null>(null);
  const [showStats, setShowStats] = useState(false);
  const clearHighlightTimeout = useRef<number | null>(null);
  const maxSemester = Math.max(...courses.map((course) => course.semester), 1);
  const semesters = useMemo(
    () => Array.from({ length: Math.max(maxSemester, 8) }, (_, index) => index + 1),
    [maxSemester],
  );

  const layout = useMemo(() => buildLayout(courses), [courses]);
  const semesterWorkload = useMemo(() => {
    const workloadMap = new Map<number, number>();
    courses.forEach((course) => {
      const current = workloadMap.get(course.semester) ?? 0;
      workloadMap.set(course.semester, current + course.workload);
    });
    return workloadMap;
  }, [courses]);
  const semesterNodes = useMemo<Node<FlowNodeData>[]>(
    () =>
      semesters.map((semester) => ({
        id: `semester-${semester}`,
        type: 'semester',
        data: {
          semester,
          workload: semesterWorkload.get(semester) ?? 0,
        },
        position: {
          x: (semester - 1) * (semesterWidth + semesterGap) + 30,
          y: 10,
        },
        draggable: false,
        selectable: false,
        connectable: false,
        deletable: false,
      })),
    [semesterWorkload, semesters],
  );
  const flowNodes = useMemo(
    () => [...semesterNodes, ...layout.nodes],
    [layout.nodes, semesterNodes],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layout.edges);
  const highlightIds = useMemo(() => {
    if (!hoveredCourseId) return null;

    const dependents = new Map<string, string[]>();
    const prerequisites = new Map<string, string[]>();

    courses.forEach((course) => {
      prerequisites.set(course.id, course.prerequisites);
      course.prerequisites.forEach((prerequisiteId) => {
        dependents.set(prerequisiteId, [...(dependents.get(prerequisiteId) ?? []), course.id]);
      });
    });

    return new Set([
      hoveredCourseId,
      ...walkGraph(hoveredCourseId, dependents),
      ...walkGraph(hoveredCourseId, prerequisites),
    ]);
  }, [courses, hoveredCourseId]);

  const highlightedSummary = useMemo(() => {
    if (!highlightIds) return null;

    const selectedCourses = courses.filter((course) => highlightIds.has(course.id));
    const workload = selectedCourses.reduce((total, course) => total + course.workload, 0);

    return {
      courseCount: selectedCourses.length,
      workload,
    };
  }, [courses, highlightIds]);

  const curriculumStats = useMemo(() => {
    const departmentWorkload = new Map<string, number>();
    let requiredWorkload = 0;
    let optionalWorkload = 0;

    courses.forEach((course) => {
      if (isOptionalCourse(course)) {
        optionalWorkload += course.workload;
      } else {
        requiredWorkload += course.workload;
      }

      const department = getDepartment(course);
      departmentWorkload.set(department, (departmentWorkload.get(department) ?? 0) + course.workload);
    });

    return {
      requiredWorkload,
      optionalWorkload,
      complementaryWorkload,
      extensionWorkload,
      totalWorkload:
        requiredWorkload + optionalWorkload + complementaryWorkload + extensionWorkload,
      departmentRows: [...departmentWorkload.entries()].sort(([a], [b]) => a.localeCompare(b)),
    };
  }, [courses]);
  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const selectedCourseDetails = useMemo(() => {
    if (!selectedCourseId) return null;

    const course = courseById.get(selectedCourseId);
    if (!course) return null;

    return {
      course,
      department: getDepartment(course),
      prerequisites: course.prerequisites
        .map((id) => courseById.get(id))
        .filter((item): item is Course => Boolean(item)),
      dependents: courses.filter((item) => item.prerequisites.includes(course.id)),
    };
  }, [courseById, courses, selectedCourseId]);

  const nodesWithSelection = useMemo(
    () =>
      flowNodes.map((node) => {
        if (node.type === 'semester') return node;

        const isHighlighted = highlightIds?.has(node.id) ?? false;
        const isDimmed = Boolean(highlightIds && !isHighlighted);

        return {
          ...node,
          className: [
            isHighlighted ? 'is-graph-highlighted' : '',
            isDimmed ? 'is-graph-dimmed' : '',
          ]
            .filter(Boolean)
            .join(' '),
          selected: node.id === selectedCourseId,
        };
      }),
    [flowNodes, highlightIds, selectedCourseId],
  );

  const edgesWithHighlight = useMemo(
    () =>
      layout.edges.map((edge) => {
        const isHighlighted =
          Boolean(highlightIds?.has(edge.source)) && Boolean(highlightIds?.has(edge.target));
        const isDimmed = Boolean(highlightIds && !isHighlighted);

        return {
          ...edge,
          animated: isHighlighted || !highlightIds,
          className: [
            'course-edge',
            isHighlighted ? 'is-graph-highlighted' : '',
            isDimmed ? 'is-graph-dimmed' : '',
          ]
            .filter(Boolean)
            .join(' '),
        };
      }),
    [highlightIds, layout.edges],
  );

  useEffect(() => {
    setNodes(nodesWithSelection);
    setEdges(edgesWithHighlight);
  }, [edgesWithHighlight, nodesWithSelection, setEdges, setNodes]);

  const onNodeDragStop = useCallback<NodeDragHandler>(
    (_event, node) => {
      if (node.type !== 'course') return;

      const semester = Math.max(
        1,
        Math.round((node.position.x - 30) / (semesterWidth + semesterGap)) + 1,
      );
      moveCourseToSemester(node.id, semester);
    },
    [moveCourseToSemester],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target) return;

      const target = courses.find((course) => course.id === connection.target);
      if (!target || target.prerequisites.includes(connection.source)) return;

      setPrerequisites(target.id, [...target.prerequisites, connection.source]);
    },
    [courses, setPrerequisites],
  );

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      deletedEdges.forEach((edge) => {
        const target = courses.find((course) => course.id === edge.target);
        if (!target) return;
        setPrerequisites(
          target.id,
          target.prerequisites.filter((prerequisite) => prerequisite !== edge.source),
        );
      });
    },
    [courses, setPrerequisites],
  );

  const cancelScheduledClear = useCallback(() => {
    if (clearHighlightTimeout.current !== null) {
      window.clearTimeout(clearHighlightTimeout.current);
      clearHighlightTimeout.current = null;
    }
  }, []);

  const highlightCourse = useCallback((id: string) => {
    cancelScheduledClear();
    setHoveredCourseId((currentId) => (currentId === id ? currentId : id));
  }, [cancelScheduledClear]);

  const clearHighlight = useCallback(() => {
    cancelScheduledClear();
    setHoveredCourseId((currentId) => (currentId === null ? currentId : null));
  }, [cancelScheduledClear]);

  const scheduleClearHighlight = useCallback(() => {
    if (clearHighlightTimeout.current !== null) return;

    clearHighlightTimeout.current = window.setTimeout(() => {
      clearHighlightTimeout.current = null;
      setHoveredCourseId(null);
    }, 120);
  }, []);

  useEffect(
    () => () => {
      if (clearHighlightTimeout.current !== null) {
        window.clearTimeout(clearHighlightTimeout.current);
      }
    },
    [],
  );

  return (
    <section
      className="flow-panel"
      aria-label="Fluxograma da grade curricular"
      onMouseLeave={clearHighlight}
      onPointerMove={(event) => {
        const courseNode = (event.target as Element).closest<HTMLElement>('.course-node');
        const courseId = courseNode?.dataset.courseId;

        if (courseId) {
          highlightCourse(courseId);
        } else {
          scheduleClearHighlight();
        }
      }}
    >
      {highlightedSummary ? (
        <div className="flow-highlight-summary" role="status" aria-live="polite">
          <strong>{highlightedSummary.workload}h</strong>
          <span>
            {highlightedSummary.courseCount} disciplina
            {highlightedSummary.courseCount > 1 ? 's' : ''} destacada
            {highlightedSummary.courseCount > 1 ? 's' : ''}
          </span>
        </div>
      ) : null}
      {selectedCourseDetails ? (
        <aside className="flow-course-details" aria-label="Detalhes da disciplina selecionada">
          <div className="flow-course-details__header">
            <div>
              <p>{selectedCourseDetails.course.code}</p>
              <h2>{selectedCourseDetails.course.name}</h2>
            </div>
            <button
              type="button"
              className="flow-course-details__close"
              onClick={() => selectCourse(null)}
              aria-label="Fechar detalhes da disciplina"
              title="Fechar detalhes"
            >
              x
            </button>
          </div>
          <dl className="flow-course-details__grid">
            <div>
              <dt>Semestre</dt>
              <dd>{selectedCourseDetails.course.semester}º</dd>
            </div>
            <div>
              <dt>Carga horaria</dt>
              <dd>{selectedCourseDetails.course.workload}h</dd>
            </div>
            <div>
              <dt>Natureza</dt>
              <dd>{selectedCourseDetails.course.nature || 'Nao informada'}</dd>
            </div>
            <div>
              <dt>Categoria</dt>
              <dd>{selectedCourseDetails.course.category || 'Nao informada'}</dd>
            </div>
            <div>
              <dt>Departamento</dt>
              <dd>{selectedCourseDetails.department}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{selectedCourseDetails.course.status}</dd>
            </div>
          </dl>
          <div className="flow-course-details__section">
            <h3>Ementa</h3>
            <p>{selectedCourseDetails.course.syllabus || 'Nao informada'}</p>
          </div>
          <div className="flow-course-details__section">
            <h3>Pre-requisitos</h3>
            {selectedCourseDetails.prerequisites.length > 0 ? (
              <ul>
                {selectedCourseDetails.prerequisites.map((course) => (
                  <li key={course.id}>
                    {course.code} - {course.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhum</p>
            )}
          </div>
          <div className="flow-course-details__section">
            <h3>Desbloqueia</h3>
            {selectedCourseDetails.dependents.length > 0 ? (
              <ul>
                {selectedCourseDetails.dependents.map((course) => (
                  <li key={course.id}>
                    {course.code} - {course.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhuma disciplina</p>
            )}
          </div>
        </aside>
      ) : null}
      <button
        type="button"
        className="flow-stats-toggle"
        onClick={() => setShowStats((current) => !current)}
        aria-controls="flow-stats-panel"
        aria-expanded={showStats}
        aria-label={showStats ? 'Esconder estatisticas' : 'Exibir estatisticas'}
        title={showStats ? 'Esconder estatisticas' : 'Exibir estatisticas'}
      >
        {showStats ? <X size={17} /> : <BarChart3 size={17} />}
      </button>
      {showStats ? (
        <aside
          className="flow-stats"
          id="flow-stats-panel"
          aria-label="Estatisticas da grade curricular"
        >
          <h2>Estatisticas</h2>
          <dl className="flow-stats__totals">
            <div>
              <dt>CH obrigatoria</dt>
              <dd>{curriculumStats.requiredWorkload}h</dd>
            </div>
            <div>
              <dt>CH optativa</dt>
              <dd>{curriculumStats.optionalWorkload}h</dd>
            </div>
            <div>
              <dt>CH complementar</dt>
              <dd>{curriculumStats.complementaryWorkload}h</dd>
            </div>
            <div>
              <dt>CH de extensao</dt>
              <dd>{curriculumStats.extensionWorkload}h</dd>
            </div>
            <div>
              <dt>CH total</dt>
              <dd>{curriculumStats.totalWorkload}h</dd>
            </div>
          </dl>
          <div className="flow-stats__departments">
            <h3>Por departamento</h3>
            <dl>
              {curriculumStats.departmentRows.map(([department, workload]) => (
                <div key={department}>
                  <dt>{department}</dt>
                  <dd>{workload}h</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      ) : null}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.35}
        maxZoom={1.4}
        panOnScroll
        zoomOnScroll={false}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={(_event, node) => selectCourse(node.id)}
        onPaneClick={() => {
          selectCourse(null);
          clearHighlight();
        }}
        deleteKeyCode={['Backspace', 'Delete']}
        nodesDraggable
      >
        <Background gap={24} size={1} />
        <Controls />
      </ReactFlow>
    </section>
  );
}
