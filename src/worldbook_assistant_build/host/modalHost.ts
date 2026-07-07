import { stopHostPointerEvents } from './hostBridge';

export function shieldModalHostEvent(event: Event): void {
  stopHostPointerEvents(event);
}
