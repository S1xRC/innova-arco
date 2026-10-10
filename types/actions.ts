export type ActionStatus = "idle" | "success" | "error";

/**
 * Shape returned by every Server Action so it can be consumed by
 * React's `useActionState` without additional glue code.
 */
export interface ActionState {
  status: ActionStatus;
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const initialActionState: ActionState = { status: "idle" };
