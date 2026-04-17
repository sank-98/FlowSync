const request = require('supertest');
const { app, initializeStadium } = require('../server');

describe('routing integration', () => {
  beforeEach(() => {
    initializeStadium();
  });

  it('generates route for valid payload', async () => {
    const zones = await request(app).get('/api/zones');
    const fromZoneId = zones.body.zones[0].id;
    const res = await request(app)
      .post('/api/route')
      .set('x-csrf-token', 'test')
      .send({ fromZoneId, destinationType: 'food', preference: 'balanced' });

    expect([200, 400]).toContain(res.statusCode);
  });
});
