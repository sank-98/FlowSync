describe('server startup', () => {
  let app;
  let start;
  let googleServices;

  beforeEach(() => {
    jest.resetModules();
    ({ app, start, googleServices } = require('../server'));
    jest.spyOn(googleServices.cloudLogger, 'logInfo').mockImplementation(() => {});
    jest.spyOn(googleServices.cloudLogger, 'logError').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('binds server to 0.0.0.0 and starts simulation interval after listen', () => {
    const fakeServer = { on: jest.fn() };
    const listenSpy = jest.spyOn(app, 'listen').mockImplementation((port, host, callback) => {
      callback();
      return fakeServer;
    });
    const intervalSpy = jest.spyOn(global, 'setInterval').mockReturnValue(1);

    const server = start();

    expect(server).toBe(fakeServer);
    expect(listenSpy).toHaveBeenCalledWith(expect.any(Number), '0.0.0.0', expect.any(Function));
    expect(intervalSpy).toHaveBeenCalledTimes(1);
    expect(googleServices.cloudLogger.logInfo).toHaveBeenCalledWith(
      'Starting FlowSync server',
      expect.objectContaining({ host: '0.0.0.0' })
    );
    expect(googleServices.cloudLogger.logInfo).toHaveBeenCalledWith(
      expect.stringContaining('http://0.0.0.0:'),
      expect.objectContaining({ host: '0.0.0.0' })
    );
    expect(fakeServer.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  test('logs startup errors emitted by the server listener', () => {
    let capturedErrorHandler;
    const fakeServer = {
      on: jest.fn((eventName, handler) => {
        if (eventName === 'error') {
          capturedErrorHandler = handler;
        }
      }),
    };

    jest.spyOn(app, 'listen').mockImplementation((port, host, callback) => {
      callback();
      return fakeServer;
    });
    jest.spyOn(global, 'setInterval').mockReturnValue(1);

    start();

    const startupError = new Error('EADDRINUSE');
    capturedErrorHandler(startupError);

    expect(googleServices.cloudLogger.logError).toHaveBeenCalledWith(
      'Server startup failed',
      startupError,
      expect.objectContaining({ host: '0.0.0.0' })
    );
  });
});
