import type { SimulationEvent } from '../../../shared/domain.js';

interface EventListProps {
  events: SimulationEvent[];
}

export function EventList({ events }: EventListProps): JSX.Element {
  return (
    <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '0.5rem', border: '1px solid #1e293b' }}>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {events.map((event) => (
          <li key={`${event.type}-${event.ts}-${event.tick}`} style={{ marginBottom: '0.5rem' }}>
            <strong>{event.type}</strong>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {new Date(event.ts).toLocaleTimeString()} · tick {event.tick}
            </div>
            {event.payload && (
              <pre style={{ margin: 0, fontSize: '0.75rem', background: '#1e293b', padding: '0.25rem' }}>
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
