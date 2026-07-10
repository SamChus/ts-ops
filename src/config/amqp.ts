import amqp, { type ChannelModel, type Channel } from "amqplib";

const AMQP_URL = process.env.AMQP_URL || "amqp://rabbitmq:5672";
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000;

class AMQPManager {
  private connection: ChannelModel | null = null;

  async connect(): Promise<ChannelModel> {
    if (this.connection) return this.connection;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const conn = await amqp.connect(AMQP_URL);
        console.log(`Connected to RabbitMQ at ${AMQP_URL}`);

        conn.on("error", () => {
          console.warn("RabbitMQ connection error, clearing cached connection");
          this.connection = null;
        });

        conn.on("close", () => {
          console.warn(
            "RabbitMQ connection closed, clearing cached connection",
          );
          this.connection = null;
        });

        this.connection = conn;
        return conn;
      } catch (error) {
        const left = MAX_RETRIES - attempt;
        console.warn(
          `RabbitMQ connect failed. Retrying in ${RETRY_DELAY_MS / 1000}s... (${left} left)`,
        );
        if (left === 0) {
          throw new Error("Failed to connect to RabbitMQ after retries");
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }

    throw new Error("Failed to connect to RabbitMQ");
  }

  async createChannel(): Promise<Channel> {
    const conn = await this.connect();
    return conn.createChannel();
  }

  async close(): Promise<void> {
    if (!this.connection) return;
    await this.connection.close();
    this.connection = null;
  }
}

export const amqpManager = new AMQPManager();
