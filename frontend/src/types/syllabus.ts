export interface Unit {
  id: string;
  subject_code: string;
  unit_number: number; // Strictly 1 to 5
  title: string;
  topics: string[];
  summary?: string;
  created_at: string;
}

export interface Subject {
  code: string;
  name: string;
  branch_code: string;
  semester: number;
  syllabus_markdown?: string;
  is_active: boolean;
  units?: Unit[];
}

export interface Branch {
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export interface SyllabusTree {
  branch: Branch;
  semester: number;
  subjects: Subject[];
}
