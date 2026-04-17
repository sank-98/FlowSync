const EventEmitter = require('events');
const { PubSub } = require('@google-cloud/pubsub');

const DEFAULT_TOPICS = [
  'anomaly-detection',
  'user-routes',
  'crowd-alerts',
  'metrics-export',
  'simulation-updates',
];
const MAX_MESSAGE_HISTORY = 100;

class CloudPubSubService {
  constructor(options = {}) {
    this.enabled = options.enabled ?? process.env.CLOUD_PUBSUB_ENABLED === 'true';
    this.projectId = options.projectId || process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCP_PROJECT_ID;
    this.pubsub = this.enabled ? new PubSub({ projectId: this.projectId || undefined }) : null;
    this.topics = options.topics || DEFAULT_TOPICS;
    this.fallbackBus = new EventEmitter();
    this.messageHistory = new Map();
    this.subscriptionPool = new Map();
  }

  addToHistory(topicName, payload, attributes = {}, messageId) {
    const current = this.messageHistory.get(topicName) || [];
    const entry = {
      messageId: messageId || `local-${Date.now()}`,
      topic: topicName,
      payload,
      attributes,
      publishedAt: new Date().toISOString(),
    };
    current.push(entry);
    this.messageHistory.set(topicName, current.slice(-MAX_MESSAGE_HISTORY));
    return entry.messageId;
  }

  async publishMessage(topicName, payload, attributes = {}) {
    const body = Buffer.from(JSON.stringify(payload));

    if (!this.pubsub) {
      const messageId = this.addToHistory(topicName, payload, attributes);
      this.fallbackBus.emit(topicName, payload);
      return messageId;
    }

    const topic = this.pubsub.topic(topicName);
    const messageId = await topic.publishMessage({ data: body, attributes });
    this.addToHistory(topicName, payload, attributes, messageId);
    return messageId;
  }

  async subscribeToTopic(topicName, handler) {
    if (!this.pubsub) {
      this.fallbackBus.on(topicName, handler);
      return { topicName, mode: 'local' };
    }

    const subscriptionName = `${topicName}-flowsync`;
    const topic = this.pubsub.topic(topicName);
    let subscription = this.subscriptionPool.get(subscriptionName);
    if (!subscription) {
      [subscription] = await topic.subscription(subscriptionName).get({ autoCreate: true });
      this.subscriptionPool.set(subscriptionName, subscription);
    }

    subscription.on('message', async (message) => {
      try {
        await this.messageHandler(message, handler);
        this.acknowledgeMessage(message);
      } catch (error) {
        this.handleMessageError(error, message);
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

  getMessages(topicName) {
    if (!topicName) {
      return [];
    }
    return this.messageHistory.get(topicName) || [];
  }

  acknowledgeMessage(message) {
    if (message && typeof message.ack === 'function') {
      message.ack();
      return true;
    }
    return false;
  }

  handleMessageError(error, message) {
    if (message && typeof message.nack === 'function') {
      message.nack();
    }
    return {
      handled: true,
      error: error?.message || 'unknown pubsub error',
    };
  }

  isEnabled() {
    return Boolean(this.pubsub);
  }
}

module.exports = { CloudPubSubService, DEFAULT_TOPICS };
