export type CourseStatus = 'planejada' | 'em-curso' | 'concluida';

export type Course = {
  id: string;
  code: string;
  name: string;
  semester: number;
  workload: number;
  prerequisites: string[];
  status: CourseStatus;
  nature?: string;
  category?: string;
};

export type CourseDraft = Omit<Course, 'id'>;
