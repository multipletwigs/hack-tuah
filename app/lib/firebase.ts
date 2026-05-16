import * as admin from 'firebase-admin'

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function getFirebaseApp() {
  if (admin.apps.length) {
    return admin.app()
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: requiredEnv('FIREBASE_PROJECT_ID'),
      clientEmail: requiredEnv('FIREBASE_CLIENT_EMAIL'),
      privateKey: requiredEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    }),
  })
}

export function getDb() {
  return getFirebaseApp().firestore()
}
