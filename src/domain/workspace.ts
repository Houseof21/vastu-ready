/**
 * Shared client–realtor workspace. Both parties can add homes, comment, react,
 * compare, and coordinate tours. Realtor private notes are NEVER visible to the
 * client — `clientView` strips them, and the client UI only ever reads through it.
 */

export type WorkspaceActor = "realtor" | "client";

export type Reaction = "love" | "like" | "pass";

export const REACTION_LABEL: Record<Reaction, string> = {
  love: "Love it",
  like: "Interested",
  pass: "Pass",
};

export type WorkspaceComment = {
  id: string;
  by: WorkspaceActor;
  authorName: string;
  text: string;
  at: number;
};

export type SharedHome = {
  propertyId: string;
  addedBy: WorkspaceActor;
  at: number;
  comments: WorkspaceComment[];
  reactions: Partial<Record<WorkspaceActor, Reaction>>;
};

export type TourStatus = "proposed" | "confirmed" | "completed";

export const TOUR_STATUS_LABEL: Record<TourStatus, string> = {
  proposed: "Proposed",
  confirmed: "Confirmed",
  completed: "Completed",
};

export type Tour = {
  id: string;
  propertyId: string;
  by: WorkspaceActor;
  proposedFor: string; // ISO date/time the tour is proposed for
  status: TourStatus;
  note?: string;
  at: number;
};

export type WorkspaceTask = {
  id: string;
  title: string;
  done: boolean;
  by: WorkspaceActor;
  at: number;
};

export type PrivateNote = {
  id: string;
  text: string;
  at: number;
};

export type Workspace = {
  id: string;
  clientName: string;
  realtorName: string;
  sharedHomes: SharedHome[];
  tours: Tour[];
  tasks: WorkspaceTask[];
  /** Realtor-only — stripped by clientView, never sent to a client surface. */
  realtorPrivateNotes: PrivateNote[];
  createdAt: number;
};

export type ClientWorkspaceView = Omit<Workspace, "realtorPrivateNotes">;

export function newWorkspace(id: string, clientName: string, realtorName: string): Workspace {
  return {
    id,
    clientName,
    realtorName,
    sharedHomes: [],
    tours: [],
    tasks: [],
    realtorPrivateNotes: [],
    createdAt: Date.now(),
  };
}

/** The ONLY shape a client surface may read. Private notes are removed. */
export function clientView(ws: Workspace): ClientWorkspaceView {
  // Exclude realtorPrivateNotes by destructuring it out.
  const { realtorPrivateNotes: _private, ...rest } = ws;
  void _private;
  return rest;
}
