process.env.NODE_ENV = 'test';
process.env.CSRF_ENABLED = 'false';
process.env.ENFORCE_HTTPS = 'false';
process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({
  project_id: 'flowsync-test',
  private_key: '-----BEGIN PRIVATE KEY-----\\nTEST\\n-----END PRIVATE KEY-----\\n',
  client_email: 'flowsync-test@example.com',
});
process.env.FIREBASE_DATABASE_URL = 'https://flowsync-test.firebaseio.com';

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(() => ({})),
  },
  firestore: jest.fn(() => ({})),
}));
