import { getApp, getApps } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

const app = getApps().length ? getApp() : undefined;

export const firebaseAuth = app ? getAuth(app) : getAuth();
export const firestore = app ? getFirestore(app) : getFirestore();
