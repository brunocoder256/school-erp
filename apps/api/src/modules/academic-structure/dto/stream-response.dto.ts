/**
 * Stable public stream shape. Streams belong to an academic class.
 */
export type StreamResponse = {
  id: string;
  name: string;
  code: string;
  capacity: number | null;
  isActive: boolean;
  classId: string;
  createdAt: Date;
  updatedAt: Date;
};
