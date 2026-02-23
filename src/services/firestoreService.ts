import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
    serverTimestamp,
    type Timestamp,
} from "firebase/firestore";
import { db, auth } from "@/firebaseConfig";

// ── Types ─────────────────────────────────────────────────────

export interface SimulationDoc {
    id: string;
    title: string;
    problem: string;
    problem_class: string;
    problem_label: string;
    parameters: Record<string, number>;
    createdAt: Timestamp | null;
}

// ── Helpers ───────────────────────────────────────────────────

function getUserSimulationsRef() {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    return collection(db, "users", uid, "simulations");
}

// ── CRUD ──────────────────────────────────────────────────────

/** Save a simulation under the current user */
export async function saveSimulation(data: {
    title: string;
    problem: string;
    problem_class: string;
    problem_label: string;
    parameters: Record<string, number>;
}): Promise<string> {
    const colRef = getUserSimulationsRef();
    const docRef = await addDoc(colRef, {
        ...data,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
}

/** Fetch all simulations for the current user, newest first */
export async function getUserSimulations(): Promise<SimulationDoc[]> {
    const colRef = getUserSimulationsRef();
    const q = query(colRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<SimulationDoc, "id">),
    }));
}

/** Delete a simulation by ID */
export async function deleteSimulation(simulationId: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    const docRef = doc(db, "users", uid, "simulations", simulationId);
    await deleteDoc(docRef);
}
