import { ZodIssue } from "zod";

export type ActionSuccess<T> = { success: true; data: T };
export type ActionFailure = {
  success: false;
  error: string | ZodIssue[];
};
export type ActionResult<T> = ActionSuccess<T> | ActionFailure;

export function success<T>(data: T): ActionSuccess<T> {
  return { success: true, data };
}

export function failure(
  error: string | ZodIssue[]
): ActionFailure {
  return { success: false, error };
}
