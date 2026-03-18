import { EventEmitter } from 'events'
import { IMPlatform } from './types'

export class IMGatewayManager extends EventEmitter {
  async sendNotificationWithMedia(platform: IMPlatform, text: string): Promise<boolean> {
    return true
  }
}
