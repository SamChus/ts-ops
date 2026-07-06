import amqp, { type ChannelModel, type Channel } from "amqplib";

const AMQP_URL = process.env.AMQP_URL || "amqp://127.0.0.1:5672";

class AMQPManager {
  private connection: ChannelModel | null = null;
  private connectionPromise: Promise<ChannelModel> | null = null;

  async getConnection(retries = 10, delay = 3000): Promise<ChannelModel> {
    if (this.connection) return this.connection;
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = this.connect(retries, delay);

    try {
      this.connection = await this.connectionPromise;
      return this.connection;
    } finally {
      this.connectionPromise = null;
    }
  }

  private async connect(retries: number, delay: number): Promise<ChannelModel> {
    let attempts = retries;

    while (attempts > 0) {
      try {
        const conn = await amqp.connect(AMQP_URL);
        console.log(`Broker connection established at ${AMQP_URL}.`);

        conn.on("error", (err: Error) => {
          console.error("Connection error, clearing instance...", err);
          this.connection = null;
        });

        conn.on("close", () => {
          console.warn("Connection closed, clearing instance...");
          this.connection = null;
        });

        return conn;
      } catch (err) {
        attempts--;
        if (attempts === 0) {
          console.error("Connection attempts exhausted.");
          throw err;
        }
        console.warn(
          `Connection failed. Retrying in ${delay / 1000}s... (${attempts} left)`,
        );
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error("Could not connect to RabbitMQ");
  }

  async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }

  async createChannel(): Promise<Channel> {
    const conn = await this.getConnection();
    return conn.createChannel();
  }
}

export const amqpManager = new AMQPManager();
