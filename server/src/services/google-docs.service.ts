import { google, type docs_v1, type drive_v3 } from 'googleapis';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { users } from '../db/schema.js';
import { decrypt, encrypt } from '../utils/crypto.js';
import { AppError } from '../middleware/error-handler.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

async function buildOAuth2Client(userId: number) {
  const user = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!user?.googleAccessToken) throw new AppError(403, 'Google account not connected');

  const oauth2Client = new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_CALLBACK_URL,
  );

  oauth2Client.setCredentials({
    access_token: decrypt(user.googleAccessToken),
    refresh_token: user.googleRefreshToken ? decrypt(user.googleRefreshToken) : undefined,
  });

  oauth2Client.on('tokens', (tokens) => {
    const updates: Record<string, string> = { updatedAt: new Date().toISOString() };
    if (tokens.access_token) updates.googleAccessToken = encrypt(tokens.access_token);
    if (tokens.refresh_token) updates.googleRefreshToken = encrypt(tokens.refresh_token);
    // Fire-and-forget token persistence — errors are non-fatal (next request will refresh again)
    db.update(users).set(updates).where(eq(users.id, userId)).run().catch(
      (err) => logger.error(err, 'Failed to persist refreshed Google tokens'),
    );
  });

  return oauth2Client;
}

async function getDriveClient(userId: number): Promise<drive_v3.Drive> {
  const auth = await buildOAuth2Client(userId);
  return google.drive({ version: 'v3', auth });
}

async function getClients(userId: number): Promise<{ docs: docs_v1.Docs; drive: drive_v3.Drive }> {
  const auth = await buildOAuth2Client(userId);
  return {
    docs: google.docs({ version: 'v1', auth }),
    drive: google.drive({ version: 'v3', auth }),
  };
}

export async function createDriveFolder(userId: number, name: string): Promise<string> {
  const drive = await getDriveClient(userId);

  const { data } = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  if (!data.id) throw new AppError(500, 'Failed to create Drive folder');
  return data.id;
}

export async function createDocFromMarkdown(
  userId: number,
  title: string,
  markdownContent: string,
  folderId?: string,
): Promise<{ docId: string; docUrl: string }> {
  const drive = await getDriveClient(userId);

  const parents = folderId ? [folderId] : undefined;

  const { data } = await drive.files.create({
    requestBody: {
      name: title,
      mimeType: 'application/vnd.google-apps.document',
      parents,
    },
    media: {
      mimeType: 'text/markdown',
      body: markdownContent,
    },
    fields: 'id,webViewLink',
  });

  if (!data.id) throw new AppError(500, 'Failed to create Google Doc');

  return {
    docId: data.id,
    docUrl: data.webViewLink ?? `https://docs.google.com/document/d/${data.id}/edit`,
  };
}

export async function getDocument(userId: number, docId: string): Promise<docs_v1.Schema$Document> {
  const { docs } = await getClients(userId);
  const { data } = await docs.documents.get({ documentId: docId });
  return data;
}

export async function addComment(
  userId: number,
  docId: string,
  content: string,
  quotedText: string,
): Promise<string> {
  const drive = await getDriveClient(userId);

  const { data } = await drive.comments.create({
    fileId: docId,
    fields: 'id',
    requestBody: {
      content,
      quotedFileContent: {
        mimeType: 'text/plain',
        value: quotedText,
      },
    },
  });

  return data.id ?? '';
}

export async function listComments(userId: number, docId: string): Promise<Array<{ id: string; content: string; quotedText: string }>> {
  const drive = await getDriveClient(userId);

  const { data } = await drive.comments.list({
    fileId: docId,
    fields: 'comments(id,content,quotedFileContent)',
    includeDeleted: false,
  });

  return (data.comments ?? []).map((c) => ({
    id: c.id ?? '',
    content: c.content ?? '',
    quotedText: c.quotedFileContent?.value ?? '',
  }));
}

export async function batchUpdate(
  userId: number,
  docId: string,
  requests: docs_v1.Schema$Request[],
): Promise<void> {
  const { docs } = await getClients(userId);

  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: { requests },
  });
}

export async function uploadImageToDrive(
  userId: number,
  folderId: string,
  fileName: string,
  imageBuffer: Buffer,
  mimeType: string,
): Promise<{ fileId: string; webContentLink: string }> {
  const drive = await getDriveClient(userId);

  const { data } = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: imageBuffer as unknown as string,
    },
    fields: 'id,webContentLink',
  });

  if (!data.id) throw new AppError(500, 'Failed to upload image');

  await drive.permissions.create({
    fileId: data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return {
    fileId: data.id,
    webContentLink: data.webContentLink ?? '',
  };
}

logger.debug('Google Docs service initialised');
