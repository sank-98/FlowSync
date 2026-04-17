const request = require('supertest');
const { app } = require('../server');

describe('security hardening', () => {
  it('sends security headers', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('rejects suspicious SQL-like payload', async () => {
    const res = await request(app)
      .post('/api/ai-chat')
      .set('x-csrf-token', 'test')
      .send({ message: 'drop table users;' });

    expect([400, 403]).toContain(res.statusCode);
  });
});
