import { useMemo } from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { isValidPrerequisite, maxSemester, minSemester } from '../lib/curriculumRules';
import { useCurriculumStore } from '../store/curriculumStore';
import type { Course, CourseDraft } from '../types';

const emptyCourse = (semester: number): CourseDraft => ({
  code: 'NOVA',
  name: 'Nova disciplina',
  semester,
  workload: 60,
  prerequisites: [],
  status: 'planejada',
});

export function CurriculumTable() {
  const courses = useCurriculumStore((state) => state.courses);
  const selectedCourseId = useCurriculumStore((state) => state.selectedCourseId);
  const selectCourse = useCurriculumStore((state) => state.selectCourse);
  const addCourse = useCurriculumStore((state) => state.addCourse);
  const updateCourse = useCurriculumStore((state) => state.updateCourse);
  const removeCourse = useCurriculumStore((state) => state.removeCourse);
  const setPrerequisites = useCurriculumStore((state) => state.setPrerequisites);
  const reset = useCurriculumStore((state) => state.reset);

  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const maxSemester = Math.max(...courses.map((course) => course.semester), 1);

  const columns = useMemo<ColumnDef<Course>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Codigo',
        cell: ({ row, getValue }) => (
          <input
            value={getValue<string>()}
            onChange={(event) => updateCourse(row.original.id, { code: event.target.value })}
            aria-label={`Codigo de ${row.original.name}`}
          />
        ),
      },
      {
        accessorKey: 'name',
        header: 'Disciplina',
        cell: ({ row, getValue }) => (
          <input
            value={getValue<string>()}
            onChange={(event) => updateCourse(row.original.id, { name: event.target.value })}
            aria-label={`Nome de ${row.original.code}`}
          />
        ),
      },
      {
        accessorKey: 'semester',
        header: 'Sem.',
        cell: ({ row, getValue }) => (
          <input
            className="table-input--number"
            min={minSemester}
            max={maxSemester}
            type="number"
            value={getValue<number>()}
            onChange={(event) =>
              updateCourse(row.original.id, { semester: Number(event.target.value) || 1 })
            }
            aria-label={`Semestre de ${row.original.name}`}
          />
        ),
      },
      {
        accessorKey: 'workload',
        header: 'Carga h.',
        cell: ({ row, getValue }) => (
          <input
            className="table-input--number"
            min={15}
            max={240}
            step={15}
            type="number"
            value={getValue<number>()}
            onChange={(event) =>
              updateCourse(row.original.id, { workload: Number(event.target.value) || 60 })
            }
            aria-label={`Carga horaria de ${row.original.name}`}
          />
        ),
      },
      {
        accessorKey: 'prerequisites',
        header: 'Pre-requisitos',
        cell: ({ row, getValue }) => {
          const current = getValue<string[]>();
          return (
            <select
              multiple
              value={current}
              onChange={(event) => {
                const selected = Array.from(event.target.selectedOptions, (option) => option.value);
                setPrerequisites(row.original.id, selected);
              }}
              aria-label={`Pre-requisitos de ${row.original.name}`}
            >
              {courses
                .filter((course) => course.id !== row.original.id)
                .map((course) => {
                  const isCurrent = current.includes(course.id);
                  const isValid = isValidPrerequisite(courses, row.original.id, course.id);

                  return (
                    <option value={course.id} key={course.id} disabled={!isCurrent && !isValid}>
                      {course.code} - {course.name}
                    </option>
                  );
                })}
            </select>
          );
        },
      },
      {
        accessorKey: 'nature',
        header: 'Natureza',
        cell: ({ row, getValue }) => (
          <input
            value={getValue<string | undefined>() ?? ''}
            onChange={(event) => updateCourse(row.original.id, { nature: event.target.value })}
            aria-label={`Natureza de ${row.original.name}`}
          />
        ),
      },
      {
        accessorKey: 'category',
        header: 'Categoria',
        cell: ({ row, getValue }) => (
          <input
            value={getValue<string | undefined>() ?? ''}
            onChange={(event) => updateCourse(row.original.id, { category: event.target.value })}
            aria-label={`Categoria de ${row.original.name}`}
          />
        ),
      },
      {
        accessorKey: 'department',
        header: 'Departamento',
        cell: ({ row, getValue }) => (
          <input
            value={getValue<string | undefined>() ?? ''}
            onChange={(event) => updateCourse(row.original.id, { department: event.target.value })}
            aria-label={`Departamento de ${row.original.name}`}
          />
        ),
      },
      {
        accessorKey: 'syllabus',
        header: 'Ementa',
        cell: ({ row, getValue }) => (
          <input
            value={getValue<string | undefined>() ?? ''}
            onChange={(event) => updateCourse(row.original.id, { syllabus: event.target.value })}
            aria-label={`Ementa de ${row.original.name}`}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <button
            className="icon-button icon-button--danger"
            type="button"
            onClick={() => removeCourse(row.original.id)}
            aria-label={`Remover ${row.original.name}`}
            title="Remover disciplina"
          >
            <Trash2 size={16} />
          </button>
        ),
      },
    ],
    [courses, removeCourse, setPrerequisites, updateCourse],
  );

  const table = useReactTable({
    data: courses,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <section className="table-panel" aria-label="Tabela de edicao da grade">
      <div className="panel-toolbar">
        <div>
          <h2>Disciplinas</h2>
          <p>
            {courses.length} disciplinas, {courses.reduce((total, course) => total + course.workload, 0)} horas
          </p>
        </div>
        <div className="panel-toolbar__actions">
          <button type="button" onClick={() => addCourse(emptyCourse(maxSemester))}>
            <Plus size={16} />
            Adicionar
          </button>
          <button type="button" className="button-secondary" onClick={reset}>
            <RotateCcw size={16} />
            Resetar grade
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                className={row.original.id === selectedCourseId ? 'is-selected' : ''}
                key={row.id}
                onClick={() => selectCourse(row.original.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="selected-details">
        {selectedCourseId && courseById.get(selectedCourseId) ? (
          <>
            <strong>{courseById.get(selectedCourseId)?.name}</strong>
            <span>
              Pre-requisitos:{' '}
              {courseById.get(selectedCourseId)?.prerequisites.length
                ? courseById
                    .get(selectedCourseId)
                    ?.prerequisites.map((id) => courseById.get(id)?.code ?? id)
                    .join(', ')
                : 'nenhum'}
            </span>
          </>
        ) : (
          <span>Selecione uma disciplina no fluxograma ou na tabela.</span>
        )}
      </div>
    </section>
  );
}
