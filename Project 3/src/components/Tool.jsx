import { useState } from 'react';
import { isToolOpen, setToolOpen } from '../state/toolState.js';

/**
 * A collapsible panel section (native <details>), open by default. Whether it is open is
 * remembered per tool, also across panes.
 * @param {{id: string, title: string, defaultOpen?: boolean,
 *   children: import('react').ReactNode}} props
 */
export default function Tool({ id, title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(() => isToolOpen(id, defaultOpen));
  return (
    <details
      className="tool"
      open={open}
      onToggle={(event) => {
        setToolOpen(id, event.currentTarget.open);
        setOpen(event.currentTarget.open);
      }}
    >
      <summary className="tool__summary">
        <h2 className="tool__title" id={`${id}-heading`}>
          {title}
        </h2>
      </summary>
      <div className="tool__body">{children}</div>
    </details>
  );
}
