import * as firebase from 'firebase-admin';
import { join } from 'path';

const serviceAccount = join(__dirname, 'server-service.json');

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
});

export const firebaseAdmin = firebase;
