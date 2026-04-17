const EventEmitter = require('events');
const { PubSub } = require('@google-cloud/pubsub');

const DEFAULT_TOPICS = [
  'anomaly-detection',
  'user-routes',
  'crowd-alerts',
  'metrics-export',
  'simulation-updates',
];

class CloudPubSubService {
  constructor(options = {}) {
    this.enabled = options.enabled ?? process.env.CLOUD_PUBSUB_ENABLED === 'true';
    this.projectId = options.projectId || process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCP_PROJECT_ID;
    this.pubsub = this.enabled ? new PubSub({ projectId: this.projectId || undefined }) : null;
    this.topics = options.topics || DEFAULT_TOPICS;
    this.fallbackBus = new EventEmitter();
  }

  async publishMessage(topicName, payload, attributes = {}) {
    const body = Buffer.from(JSON.stringify(payload));

    if (!this.pubsub) {
      this.fallbackBus.emit(topicName, payload);
      return `local-${Date.now()}`;
    }

    const topic = this.pubsub.topic(topicName);
    return topic.publishMessage({ data: body, attributes });
  }

  async subscribeToTopic(topicName, handler) {
    if (!this.pubsub) {
      this.fallbackBus.on(topicName, handler);
      return { topicName, mode: 'local' };
    }

    const subscriptionName = `${topicName}-flowsync`;
    const topic = this.pubsub.topic(topicName);
    const [subscription] = await topic.subscription(subscriptionName).get({ autoCreate: true });

    subscription.on('message', async (message) => {
      try {
        await this.messageHandler(message, handler);
        message.ack();
      } catch (error) {
        message.nack();
      }
    });

    return { topicName, subscriptionName };
  }

  async messageHandler(message, handler) {
    const payload = JSON.parse(message.data.toString('utf-8'));
    return handler(payload, message.attributes || {});
  }

  async listTopics() {
    if (!this.pubsub) {
      return this.topics;
    }

    const [topics] = await this.pubsub.getTopics();
    return topics.map((topic) => topic.name.split('/').pop());
  }

  isEnabled() {
    return Boolean(this.pubsub);
  }
}

module.exports = { CloudPubSubService, DEFAULT_TOPICS };
