import type { Course } from '../types';

export const minSemester = 1;
export const maxSemester = 12;

export const clampSemester = (semester: number) =>
  Math.min(maxSemester, Math.max(minSemester, Math.round(semester) || minSemester));

export const getPrerequisiteIds = (courses: Course[], id: string) =>
  courses.find((course) => course.id === id)?.prerequisites ?? [];

export const hasPrerequisite = (
  courses: Course[],
  courseId: string,
  prerequisiteId: string,
  visited = new Set<string>(),
): boolean => {
  if (visited.has(courseId)) return false;
  visited.add(courseId);

  const prerequisites = getPrerequisiteIds(courses, courseId);
  if (prerequisites.includes(prerequisiteId)) return true;

  return prerequisites.some((id) => hasPrerequisite(courses, id, prerequisiteId, visited));
};

export const isValidPrerequisite = (
  courses: Course[],
  courseId: string,
  prerequisiteId: string,
) => {
  if (courseId === prerequisiteId) return false;

  const course = courses.find((item) => item.id === courseId);
  const prerequisite = courses.find((item) => item.id === prerequisiteId);
  if (!course || !prerequisite) return false;

  const comesBeforeCourse = prerequisite.semester < course.semester;
  const wouldCreateCycle = hasPrerequisite(courses, prerequisiteId, courseId);

  return comesBeforeCourse && !wouldCreateCycle;
};

export const sanitizePrerequisites = (
  courses: Course[],
  courseId: string,
  prerequisites: string[],
) =>
  Array.from(new Set(prerequisites)).filter((prerequisiteId) =>
    isValidPrerequisite(courses, courseId, prerequisiteId),
  );

export const getAllowedSemesterRange = (courses: Course[], courseId: string) => {
  const course = courses.find((item) => item.id === courseId);
  if (!course) return { min: minSemester, max: maxSemester };

  const prerequisiteSemesters = course.prerequisites
    .map((id) => courses.find((item) => item.id === id)?.semester)
    .filter((semester): semester is number => typeof semester === 'number');

  const dependentSemesters = courses
    .filter((item) => item.prerequisites.includes(courseId))
    .map((item) => item.semester);

  return {
    min: prerequisiteSemesters.length ? Math.max(...prerequisiteSemesters) + 1 : minSemester,
    max: dependentSemesters.length ? Math.min(...dependentSemesters) - 1 : maxSemester,
  };
};

export const resolveAllowedSemester = (
  courses: Course[],
  courseId: string,
  semester: number,
) => {
  const requested = clampSemester(semester);
  const range = getAllowedSemesterRange(courses, courseId);

  if (range.max < range.min) return range.min;
  return Math.min(range.max, Math.max(range.min, requested));
};

