import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { initialCourses } from '../data/initialCourses';
import {
  clampSemester,
  resolveAllowedSemester,
  sanitizePrerequisites,
} from '../lib/curriculumRules';
import type { Course, CourseDraft } from '../types';

type CurriculumState = {
  courses: Course[];
  selectedCourseId: string | null;
  selectCourse: (id: string | null) => void;
  addCourse: (course: CourseDraft) => void;
  importCourses: (courses: Course[]) => void;
  updateCourse: (id: string, changes: Partial<CourseDraft>) => void;
  removeCourse: (id: string) => void;
  moveCourseToSemester: (id: string, semester: number) => void;
  setPrerequisites: (id: string, prerequisites: string[]) => void;
  reset: () => void;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const createId = (course: CourseDraft, existingIds: string[]) => {
  const base = slugify(course.code || course.name) || 'disciplina';
  if (!existingIds.includes(base)) return base;

  let suffix = 2;
  while (existingIds.includes(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
};

export const useCurriculumStore = create<CurriculumState>()(
  persist(
    (set) => ({
      courses: initialCourses,
      selectedCourseId: null,
      selectCourse: (id) => set({ selectedCourseId: id }),
      addCourse: (course) =>
        set((state) => {
          const id = createId(course, state.courses.map((item) => item.id));
          const semester = clampSemester(course.semester);
          const newCourse = { ...course, id, semester };
          const nextCourses = [...state.courses, newCourse];

          return {
            courses: nextCourses.map((item) =>
              item.id === id
                ? {
                    ...item,
                    prerequisites: sanitizePrerequisites(nextCourses, id, item.prerequisites),
                  }
                : item,
            ),
            selectedCourseId: id,
          };
        }),
      importCourses: (courses) =>
        set(() => {
          const nextCourses = courses.map((course) => ({
            ...course,
            semester: clampSemester(course.semester),
          }));

          return {
            courses: nextCourses.map((course) => ({
              ...course,
              prerequisites: sanitizePrerequisites(nextCourses, course.id, course.prerequisites),
            })),
            selectedCourseId: null,
          };
        }),
      updateCourse: (id, changes) =>
        set((state) => {
          const requestedSemester =
            typeof changes.semester === 'number'
              ? resolveAllowedSemester(state.courses, id, changes.semester)
              : undefined;

          const nextCourses = state.courses.map((course) =>
            course.id === id
              ? {
                  ...course,
                  ...changes,
                  ...(requestedSemester ? { semester: requestedSemester } : {}),
                }
              : course,
          );

          return {
            courses: nextCourses.map((course) => ({
              ...course,
              prerequisites: sanitizePrerequisites(nextCourses, course.id, course.prerequisites),
            })),
          };
        }),
      removeCourse: (id) =>
        set((state) => ({
          courses: state.courses
            .filter((course) => course.id !== id)
            .map((course) => ({
              ...course,
              prerequisites: course.prerequisites.filter((prerequisite) => prerequisite !== id),
            })),
          selectedCourseId: state.selectedCourseId === id ? null : state.selectedCourseId,
        })),
      moveCourseToSemester: (id, semester) =>
        set((state) => {
          const allowedSemester = resolveAllowedSemester(state.courses, id, semester);

          return {
            courses: state.courses.map((course) =>
              course.id === id ? { ...course, semester: allowedSemester } : course,
            ),
          };
        }),
      setPrerequisites: (id, prerequisites) =>
        set((state) => ({
          courses: state.courses.map((course) =>
            course.id === id
              ? {
                  ...course,
                  prerequisites: sanitizePrerequisites(state.courses, id, prerequisites),
                }
              : course,
          ),
        })),
      reset: () => set({ courses: initialCourses, selectedCourseId: null }),
    }),
    {
      name: 'curriculum',
      partialize: (state) => ({ courses: state.courses }),
    },
  ),
);
