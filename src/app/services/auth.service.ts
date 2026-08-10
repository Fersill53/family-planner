import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, user, updateProfile, User } from '@angular/fire/auth';
import { Firestore, doc, setDoc, docData } from '@angular/fire/firestore';
import { Observable, of, switchMap } from 'rxjs';
import { FamilyMember } from '../models';

@Injectable({ providedIn: 'root' })
    export class AuthService {
        private auth = inject(Auth);
        private db = inject(Firestore);
        private injector = inject(Injector);

        /** Emits Firebase auth user (or null when logged out) */
        readonly user$: Observable <User | null> = user(this.auth);

        /** Emits Firestore profile for current user (or null) */
        readonly profile$: Observable<FamilyMember | null> = this.user$.pipe(
            switchMap(u =>
                u ? (docData(doc(this.db, 'users', u.uid)) as Observable<FamilyMember>) : of(null)
            )
        );

        async signup(
            email: string, password: string,
            displayName: string, language: 'en' | 'es' | 'uk', familyId: string
        ) {
            const cred = await createUserWithEmailAndPassword(this.auth, email, password);
            await updateProfile(cred.user, { displayName });

            const member: FamilyMember = {
                uid: cred.user.uid,
                displayName,
                language,
                familyId,
            };

            await runInInjectionContext(this.injector, () =>
                setDoc(doc(this.db, 'users', cred.user.uid), member)
            );
            return cred.user;
        }

        login(email: string, password: string) {
            return signInWithEmailAndPassword(this.auth, email, password);
        }

        logout() {
            return signOut(this.auth);
        }
    }