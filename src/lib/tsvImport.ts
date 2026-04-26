import type { Course } from '../types';

export type TsvImportResult = {
  courses: Course[];
  skippedRows: number;
  warnings: string[];
};

const normalizeHeader = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const uniqueId = (base: string, usedIds: Set<string>) => {
  const fallback = slugify(base) || 'disciplina';
  let candidate = fallback;
  let suffix = 2;

  while (usedIds.has(candidate)) {
    candidate = `${fallback}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(candidate);
  return candidate;
};

const parseTsvRows = (text: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === '\t') {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  rows.push(row);

  return rows.filter((item) => item.some((value) => value.length > 0));
};

const findColumn = (headers: string[], candidates: string[]) =>
  headers.findIndex((header) => candidates.some((candidate) => header.includes(candidate)));

const splitPrerequisites = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const exportCoursesToTsv = (courses: Course[]): string => {
  const header = ['Semestre', 'id', 'Nome', 'CH', 'Pre-requisito', 'Natureza', 'Categoria', 'Departamento'];
  const idToCode = new Map(courses.map((c) => [c.id, c.code || c.id]));
  const rows = courses.map((course) => [
    String(course.semester),
    course.code || course.id,
    course.name,
    String(course.workload),
    course.prerequisites.map((id) => idToCode.get(id) ?? id).join(', '),
    course.nature ?? '',
    course.category ?? '',
    course.department ?? '',
  ]);
  return [header, ...rows].map((row) => row.join('\t')).join('\n');
};

export const parseCurriculumTsv = (text: string): TsvImportResult => {
  const rows = parseTsvRows(text);
  if (rows.length < 2) {
    return { courses: [], skippedRows: 0, warnings: ['Nenhuma linha de disciplina encontrada.'] };
  }

  const headers = rows[0].map(normalizeHeader);
  const semesterIndex = findColumn(headers, ['semestre']);
  const codeIndex = findColumn(headers, ['id', 'codigo', 'cod']);
  const nameIndex = findColumn(headers, ['nome', 'disciplina']);
  const workloadIndex = findColumn(headers, ['ch', 'cargahoraria']);
  const prerequisitesIndex = findColumn(headers, ['prerequisito']);
  const natureIndex = findColumn(headers, ['natureza']);
  const categoryIndex = findColumn(headers, ['categoria']);
  const departmentIndex = findColumn(headers, ['departamento', 'depto', 'department']);

  const required = [
    ['Semestre', semesterIndex],
    ['Nome', nameIndex],
    ['CH', workloadIndex],
  ] as const;

  const missing = required
    .filter(([, index]) => index < 0)
    .map(([label]) => label);

  if (missing.length > 0) {
    return {
      courses: [],
      skippedRows: 0,
      warnings: [`Colunas obrigatorias ausentes: ${missing.join(', ')}.`],
    };
  }

  const usedIds = new Set<string>();
  const codeToId = new Map<string, string>();
  const rawPrerequisites = new Map<string, string[]>();
  let skippedRows = 0;

  const courses = rows.slice(1).flatMap((row, index): Course[] => {
    const semester = Number(row[semesterIndex]);
    const name = row[nameIndex]?.trim();
    const workload = Number(row[workloadIndex]);

    if (!semester || !name || !workload) {
      skippedRows += 1;
      return [];
    }

    const sourceCode = codeIndex >= 0 ? row[codeIndex]?.trim() : '';
    const generatedCode = sourceCode || `OPT-${semester}-${index + 1}`;
    const id = uniqueId(sourceCode || `${generatedCode}-${name}`, usedIds);

    if (sourceCode) {
      codeToId.set(sourceCode.toUpperCase(), id);
    }

    rawPrerequisites.set(
      id,
      prerequisitesIndex >= 0 ? splitPrerequisites(row[prerequisitesIndex] ?? '') : [],
    );

    return [
      {
        id,
        code: generatedCode,
        name,
        semester,
        workload,
        prerequisites: [],
        status: 'planejada',
        nature: natureIndex >= 0 ? row[natureIndex] || undefined : undefined,
        category: categoryIndex >= 0 ? row[categoryIndex] || undefined : undefined,
        department: departmentIndex >= 0 ? row[departmentIndex] || undefined : undefined,
      },
    ];
  });

  const warnings: string[] = [];
  const coursesWithPrerequisites = courses.map((course) => {
    const prerequisites = (rawPrerequisites.get(course.id) ?? []).flatMap((code) => {
      const prerequisiteId = codeToId.get(code.toUpperCase());
      if (!prerequisiteId) {
        warnings.push(`Pre-requisito "${code}" nao encontrado para ${course.code}.`);
        return [];
      }
      return [prerequisiteId];
    });

    return { ...course, prerequisites };
  });

  return { courses: coursesWithPrerequisites, skippedRows, warnings };
};

