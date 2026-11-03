import { useCallback, useEffect, useRef, useState } from 'react';

const hasFiles = (event) => event.dataTransfer?.types.includes('Files');

/**
 * Opening a file in one pane, by its file dialog or by dropping a file on the pane. The
 * file is only read in the browser; nothing is uploaded.
 * @param {(file: File) => void} onOpen
 * @param {import('react').RefObject<HTMLElement>} targetRef - the pane that accepts drops.
 * @returns {{inputRef: import('react').RefObject<HTMLInputElement>,
 *   onInputChange: (event: Event) => void, choose: () => void, dragging: boolean}}
 *   Render a hidden file input with inputRef and onInputChange; choose() opens its dialog.
 */
export function useFileOpener(onOpen, targetRef) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return undefined;
    // dragenter/dragleave also fire for every child element, so count them.
    let depth = 0;
    const onEnter = (event) => {
      if (!hasFiles(event)) return;
      depth += 1;
      setDragging(true);
    };
    const onLeave = (event) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onOver = (event) => {
      // Without preventDefault the pane would not accept the drop.
      if (hasFiles(event)) event.preventDefault();
    };
    const onDrop = (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      const [file] = event.dataTransfer.files;
      if (file) onOpen(file);
    };
    target.addEventListener('dragenter', onEnter);
    target.addEventListener('dragleave', onLeave);
    target.addEventListener('dragover', onOver);
    target.addEventListener('drop', onDrop);
    return () => {
      target.removeEventListener('dragenter', onEnter);
      target.removeEventListener('dragleave', onLeave);
      target.removeEventListener('dragover', onOver);
      target.removeEventListener('drop', onDrop);
    };
  }, [onOpen, targetRef]);

  const onInputChange = useCallback(
    (event) => {
      const [file] = event.target.files;
      // Reset, so choosing the same file again still fires change.
      event.target.value = '';
      if (file) onOpen(file);
    },
    [onOpen],
  );

  const choose = useCallback(() => inputRef.current?.click(), []);

  return { inputRef, onInputChange, choose, dragging };
}

/**
 * Stop the browser from opening a file that is dropped outside the panes (it would leave
 * the app). Drops on a pane are handled by that pane's useFileOpener.
 */
export function useFileDropGuard() {
  useEffect(() => {
    const guard = (event) => {
      if (hasFiles(event)) event.preventDefault();
    };
    window.addEventListener('dragover', guard);
    window.addEventListener('drop', guard);
    return () => {
      window.removeEventListener('dragover', guard);
      window.removeEventListener('drop', guard);
    };
  }, []);
}
