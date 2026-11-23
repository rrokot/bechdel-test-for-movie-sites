// Chrome Web Store API v2 upload flow used by scripts/publish.ts. Credentials
// come from the environment; see docs/releasing.md.

const POLL_INTERVAL_MS = 5_000;
const POLL_ATTEMPTS = 60;
const API_ORIGIN = 'https://chromewebstore.googleapis.com';

const requireEnv = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureOk = async (response: Response, action: string) => {
  if (!response.ok) throw new Error(`${action} failed: HTTP ${response.status} ${await response.text()}`);
  return response;
};

const pollUntil = async <T>(read: () => Promise<T>, isDone: (value: T) => boolean) => {
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    const value = await read();
    if (isDone(value)) return value;
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Gave up waiting after ${POLL_ATTEMPTS} attempts`);
};

// Authenticated with a short-lived access token of a service account, issued in
// CI through Workload Identity Federation.
export const publishChrome = async (archive: Uint8Array<ArrayBuffer>) => {
  const itemPath = `publishers/${requireEnv('CWS_PUBLISHER_ID')}/items/${requireEnv('CWS_ITEM_ID')}`;
  const authHeaders = { Authorization: `Bearer ${requireEnv('CWS_ACCESS_TOKEN')}` };

  type UploadState = 'SUCCEEDED' | 'IN_PROGRESS' | 'FAILED' | 'NOT_FOUND' | 'UPLOAD_STATE_UNSPECIFIED';
  const upload = await (await ensureOk(await fetch(`${API_ORIGIN}/upload/v2/${itemPath}:upload`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/zip' },
    body: archive,
  }), 'Chrome upload')).json() as { uploadState: UploadState; crxVersion?: string };

  let state = upload.uploadState;
  if (state === 'IN_PROGRESS') {
    ({ lastAsyncUploadState: state } = await pollUntil(
      async () => (await ensureOk(await fetch(`${API_ORIGIN}/v2/${itemPath}:fetchStatus`, { headers: authHeaders }), 'Chrome status'))
        .json() as Promise<{ lastAsyncUploadState: UploadState }>,
      ({ lastAsyncUploadState }) => lastAsyncUploadState !== 'IN_PROGRESS',
    ));
  }
  if (state !== 'SUCCEEDED') throw new Error(`Chrome upload ended as ${state}`);
  console.log(`Chrome Web Store: uploaded version ${upload.crxVersion ?? '?'}`);

  const published = await (await ensureOk(await fetch(`${API_ORIGIN}/v2/${itemPath}:publish`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ publishType: 'DEFAULT_PUBLISH' }),
  }), 'Chrome publish')).json() as { state: string; warningInfo?: unknown };

  if (published.warningInfo) console.warn('Chrome Web Store warnings:', JSON.stringify(published.warningInfo));
  if (!['PENDING_REVIEW', 'STAGED', 'PUBLISHED'].includes(published.state)) {
    throw new Error(`Chrome submission ended as ${published.state}`);
  }
  console.log(`Chrome Web Store: submission is ${published.state}`);
};
