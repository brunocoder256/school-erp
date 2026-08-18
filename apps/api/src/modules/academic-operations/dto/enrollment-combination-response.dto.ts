/**
 * Public subject combination assignment shape for an academic enrollment.
 * `subjects` is the combination's expected subject set; `enrolledSubjectIds`
 * is the set actually enrolled for the enrollment (only combination subjects
 * offered and allocated to the enrollment's context).
 */
export type EnrollmentCombinationResponse = {
  enrollmentId: string;
  subjectCombinationId: string | null;
  code: string | null;
  name: string | null;
  subjects: string[];
  enrolledSubjectIds: string[];
};
