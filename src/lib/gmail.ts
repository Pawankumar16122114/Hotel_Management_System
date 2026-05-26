/**
 * Gmail Integration Helpers using the Google Workspace REST API
 */

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  from?: string;
  subject?: string;
  date?: string;
  body?: string;
}

/**
 * Base64 URL safe encoder
 */
function base64urlEncode(str: string): string {
  // Use block safe unicode base64 encoding
  const base64 = btoa(unescape(encodeURIComponent(str)));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Helper to parse headers from a Gmail Message payload
 */
function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : '';
}

/**
 * Send an email via Gmail API
 */
export async function sendGmailEmail(
  accessToken: string,
  to: string,
  subject: string,
  bodyHtml: string
): Promise<boolean> {
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=utf-8`,
    `MIME-Version: 1.0`,
    '',
    bodyHtml
  ];

  const emailRaw = emailLines.join('\r\n');
  const base64Email = base64urlEncode(emailRaw);

  try {
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: base64Email,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Failed to send mail via Gmail API:', errText);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * List recent messages matching a query
 */
export async function listGmailMessages(
  accessToken: string,
  query: string = 'Hostel',
  maxResults: number = 8
): Promise<GmailMessage[]> {
  try {
    const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.warn('Could not list message keys matching query.');
      return [];
    }

    const data = await response.json();
    if (!data.messages || data.messages.length === 0) {
      return [];
    }

    // Fetch individual messages details in parallel-safe sequential blocks
    const results: GmailMessage[] = [];
    for (const msg of data.messages) {
      try {
        const detailResponse = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (detailResponse.ok) {
          const detail = await detailResponse.json();
          const p = detail.payload;
          const headers = p && p.headers ? p.headers : [];
          results.push({
            id: detail.id,
            threadId: detail.threadId,
            snippet: detail.snippet,
            from: getHeader(headers, 'From'),
            subject: getHeader(headers, 'Subject'),
            date: getHeader(headers, 'Date'),
          });
        }
      } catch (err) {
        console.error(`Error loading detail for message ${msg.id}`, err);
      }
    }
    return results;
  } catch (error) {
    console.error('Error fetching Gmail list:', error);
    return [];
  }
}
