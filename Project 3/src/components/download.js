/**
 * Give the user a text file to save (a Blob URL on a temporary link; nothing is uploaded).
 * @param {string} text
 * @param {string} fileName
 * @param {string} [type] - media type.
 */
export function download(text, fileName, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
