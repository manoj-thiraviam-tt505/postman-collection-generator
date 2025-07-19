/**
 * @fileoverview Extension entry point.
 */

import * as zcode from 'zcode';

/**
 * Activate function to activate the extension for a single client.
 */
export async function activate() {

  // Your extension code.\
  // Extension api reference: https://learn.zoho.com/portal/zohocorp/manual/extensions-development-for-zoho-code-ide/article/introduction
  zcode.window.showInformationMessage('Gracious! Extension activated.');
}
