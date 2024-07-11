/**
 * Copies the text passed as param to the system clipboard
 * Check if using HTTPS and navigator.clipboard is available
 * Then uses standard clipboard API, otherwise uses fallback
 *
 * Inspired by: https://stackoverflow.com/questions/71873824/copy-text-to-clipboard-cannot-read-properties-of-undefined-reading-writetext
 * and https://forum.figma.com/t/write-to-clipboard-from-custom-plugin/11860/12
 *
 * @param content - The content to be copied to the clipboard
 */
function copyToClipboard(content: string) {
    // If the context is secure and clipboard API is available, use it
    if (
        window.isSecureContext &&
        typeof navigator?.clipboard?.writeText === 'function'
    ) {
        navigator.clipboard.writeText(content).then(function () {
        // Notify the user that the text has been copied
        console.log("Tokens copied to clipboard");
        }, function (err) {
        console.error('Could not copy text: ', err);
        });
    }
    // Otherwise, use the unsecured fallback
    else {
        unsecuredCopyToClipboard(content);
    }
}

/**
 * Unsecured fallback for copying text to clipboard
 * @param text - The text to be copied to the clipboard
 */
function unsecuredCopyToClipboard(text: string) {
    // Create a textarea element
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);

    // Focus and select the textarea content
    textArea.focus();
    textArea.select();

    // Attempt to copy the text to the clipboard
    try {
        document.execCommand('copy');
    } catch (e) {
        console.error('Unable to copy content to clipboard!', e);
    }

    // Remove the textarea element from the DOM
    document.body.removeChild(textArea);
}

export default copyToClipboard;