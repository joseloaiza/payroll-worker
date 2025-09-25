export interface MessagingClient {
  connect(): Promise<void>;
  subscribe(queue: string, handler: (msg: any) => Promise<void>): Promise<void>;
  publish(queue: string, message: any): Promise<void>;
}
