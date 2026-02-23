import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut,
    type User,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebaseConfig";

/** Sign in with email + password */
export async function signInWithEmail(
    email: string,
    password: string
): Promise<User> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
}

/** Create account with email + password + display name, store profile in Firestore */
export async function signUpWithEmail(
    email: string,
    password: string,
    name: string
): Promise<User> {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });

    // Save user profile to Firestore
    await setDoc(doc(db, "users", result.user.uid), {
        name,
        email,
        createdAt: serverTimestamp(),
    });

    return result.user;
}

/** Sign out the current user */
export async function signOutUser(): Promise<void> {
    await signOut(auth);
}

/** Get the currently signed-in user (null if none) */
export function getCurrentUser(): User | null {
    return auth.currentUser;
}
