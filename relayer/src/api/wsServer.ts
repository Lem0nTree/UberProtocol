import { WebSocketServer, WebSocket } from 'ws';
import config from '../config';
import logger from '../utils/logger';

export class WSServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor() {
    this.wss = new WebSocketServer({ port: config.api.wsPort });
    this.setupServer();
  }

  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('New WebSocket client connected');
      this.clients.add(ws);

      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error', error);
        this.clients.delete(ws);
      });

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: 'CONNECTED',
          message: 'Connected to UberProtocol Relayer',
          timestamp: Date.now(),
        })
      );
    });

    logger.info(`WebSocket server listening on port ${config.api.wsPort}`);
  }

  /**
   * Broadcast new bid to all connected clients
   */
  broadcastNewBid(intentHash: string, bid: any): void {
    const message = JSON.stringify({
      type: 'NEW_BID',
      data: {
        intentHash,
        bid,
      },
      timestamp: Date.now(),
    });

    this.broadcast(message);
  }

  /**
   * Broadcast job posted to all connected clients
   */
  broadcastJobPosted(intentHash: string, job: any): void {
    const message = JSON.stringify({
      type: 'JOB_POSTED',
      data: {
        intentHash,
        job,
      },
      timestamp: Date.now(),
    });

    this.broadcast(message);
  }

  /**
   * Broadcast job settled to all connected clients
   */
  broadcastJobSettled(intentHash: string, txHash: string): void {
    const message = JSON.stringify({
      type: 'JOB_SETTLED',
      data: {
        intentHash,
        txHash,
      },
      timestamp: Date.now(),
    });

    this.broadcast(message);
  }

  /**
   * Broadcast message to all connected clients
   */
  private broadcast(message: string): void {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    logger.debug('Broadcasted message to clients', {
      clientCount: this.clients.size,
    });
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

export default WSServer;

