import { Subject } from 'rxjs';
import type { SimulationEventPayload } from '../../shared/types/simulation';

export class EventBus {
  private readonly subject = new Subject<SimulationEventPayload>();

  public emit(event: SimulationEventPayload): void {
    this.subject.next(event);
  }

  public onEvent() {
    return this.subject.asObservable();
  }
}

export const eventBus = new EventBus();
