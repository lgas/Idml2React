import { GeometricBounds, ItemTransform, Leading } from "@/types/idml.types";

export const toArray = <T>(val: T | T[] | undefined): T[] => {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
};

export const str = (v: string | undefined): string | undefined =>
  v !== undefined && v !== '' ? v : undefined;

export const num = (v: string | undefined): number | undefined =>
  v !== undefined && v !== '' ? parseFloat(v) : undefined;




