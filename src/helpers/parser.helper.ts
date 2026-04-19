import { GeometricBounds, ItemTransform, Leading } from "@/types/idml.types";

export const toArray = <T>(val: T | T[] | undefined): T[] => {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
};

export const str = (v: string | undefined): string | undefined =>
  v !== undefined && v !== '' ? v : undefined;

export const num = (v: string | undefined): number | undefined =>
  v !== undefined && v !== '' ? parseFloat(v) : undefined;

export const parseLeading = (v: string | undefined): Leading | undefined => {
  if (!v) return undefined;
  if (v === 'Auto') return 'Auto';
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
};




