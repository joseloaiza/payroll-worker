export interface MessagingClient {
  /** Sends a message and expects a response (RPC pattern, often complex with ASB). */
  send<T = any, R = any>(
    pattern: string,
    data: T,
    queueName: string,
  ): Promise<R>;

  /** Sends a single message (Fire-and-forget pattern). */
  emit<T = any>(pattern: string, data: T, queueName: string): Promise<void>;

  /** * Sends multiple messages as a batch (Fire-and-forget pattern).
   * Reduces network requests and improves throughput.
   */
  emitBatch<T = any>(
    pattern: string,
    data: T[],
    queueName: string,
  ): Promise<void>;

  /** Subscribes to a pattern or queue and executes a handler for each message. */
  subscribe<T = any>(
    pattern: string,
    handler: (data: T) => Promise<void>,
  ): Promise<void>;
}
