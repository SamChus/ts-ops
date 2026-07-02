import type { Channel, Message } from "amqplib";
import { amqpManager } from "../config/amqp";

export interface QueueMessage {
  readonly content: Buffer;
  ack(): void;
  nack(allUpTo?: boolean, requeue?: boolean): void;
}

export interface QueueChannel {
  assertQueue(
    queueName: string,
    options?: { durable?: boolean },
  ): Promise<void>;
  prefetch(count: number): void;
  consume(
    queueName: string,
    handler: (message: QueueMessage | null) => void | Promise<void>,
  ): Promise<void>;
}

export interface MessageBroker {
  createChannel(): Promise<QueueChannel>;
  close(): Promise<void>;
}

class RabbitMqQueueMessage implements QueueMessage {
  constructor(
    private readonly message: Message,
    private readonly channel: Channel,
  ) {}

  get content(): Buffer {
    return this.message.content;
  }

  ack(): void {
    this.channel.ack(this.message);
  }

  nack(allUpTo = false, requeue = true): void {
    this.channel.nack(this.message, allUpTo, requeue);
  }
}

class RabbitMqQueueChannel implements QueueChannel {
  constructor(private readonly channel: Channel) {}

  async assertQueue(
    queueName: string,
    options?: { durable?: boolean },
  ): Promise<void> {
    await this.channel.assertQueue(queueName, options);
  }

  prefetch(count: number): void {
    this.channel.prefetch(count);
  }

  async consume(
    queueName: string,
    handler: (message: QueueMessage | null) => void | Promise<void>,
  ): Promise<void> {
    await this.channel.consume(queueName, async (message) => {
      const wrapped = message
        ? new RabbitMqQueueMessage(message, this.channel)
        : null;
      await handler(wrapped);
    });
  }
}

class RabbitMqMessageBroker implements MessageBroker {
  async createChannel(): Promise<QueueChannel> {
    const channel = await amqpManager.createChannel();
    return new RabbitMqQueueChannel(channel);
  }

  async close(): Promise<void> {
    await amqpManager.close();
  }
}

export const messageBroker: MessageBroker = new RabbitMqMessageBroker();
