import { ZodIssue } from "zod";

export type InsufficientStockItem = {
  supplyId: string;
  name: string;
  available: number;
};

export type ActionSuccess<T> = { success: true; data: T };
export type ActionFailure = {
  success: false;
  error: string | ZodIssue[];
  /** Structured short-stock details for bulk checkout (optional). */
  insufficient?: InsufficientStockItem[];
  /** Supply ids that no longer exist for this site (optional). */
  missing?: string[];
};
export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export function success<T>(data: T): ActionSuccess<T> {
  return { success: true, data };
}

export function failure(
  error: string | ZodIssue[],
  extras?: {
    insufficient?: InsufficientStockItem[];
    missing?: string[];
  }
): ActionFailure {
  return {
    success: false,
    error,
    ...(extras?.insufficient ? { insufficient: extras.insufficient } : {}),
    ...(extras?.missing ? { missing: extras.missing } : {}),
  };
}
