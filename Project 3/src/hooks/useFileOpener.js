import { useCallback, useEffect, useState } from 'react';

/** id of the one file input (in FileOpener); the other "choose" buttons click it. */
export const FILE_INPUT_ID = 'splat-file';

/**
 * Opening a file by file dialog or by dropping it anywhere on the page. The file
 * is only read in the browser; nothing is uploaded.
 * @param {(file: File) => void} onOpen
 * @returns {{onInputChange: (event: Event) => void, choose: () => void, dragging: boolean}}
 */
export function useFileOpener(onOpen) {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    // dragenter/dragleave also fire for every child element, so count them.
    let depth = 0;
    const hasFiles = (event) => event.dataTransfer?.types.includes('Files');
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
      // Without preventDefault the browser would open the file itself.
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
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [onOpen]);

  const onInputChange = useCallback(
    (event) => {
      const [file] = event.target.files;
      // Reset, so choosing the same file again still fires change.
      event.target.value = '';
      if (file) onOpen(file);
    },
    [onOpen],
  );

  const choose = useCallback(() => document.getElementById(FILE_INPUT_ID)?.click(), []);

  return { onInputChange, choose, dragging };
}
