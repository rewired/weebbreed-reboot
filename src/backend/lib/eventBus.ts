import { Subject } from 'rxjs';
import type { SimulationEvent } from '../../shared/domain.js';

export class EventBus {
  private readonly subject = new Subject<SimulationEvent>();

  public publish(event: SimulationEvent): void {
    this.subject.next(event);
  }

  public get events() {
    return this.subject.asObservable();
  }
}

export const eventBus = new EventBus();
