import { useSyncExternalStore } from 'react';
import { getMessages, subscribe } from '../state/messages.js';

/** Toast messages over the map (loading states and errors). */
export default function Messages() {
  const messages = useSyncExternalStore(subscribe, getMessages);
  return (
    <div id="messages" aria-live="polite">
      {messages.map(({ id, text, type }) => (
        <p
          key={id}
          className={`message message--${type}`}
          role={type === 'error' ? 'alert' : undefined}
        >
          {text}
        </p>
      ))}
    </div>
  );
}
