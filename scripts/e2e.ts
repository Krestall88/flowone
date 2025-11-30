import { setTimeout as delay } from "node:timers/promises";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_PASSWORD ?? "password";

type Json = Record<string, any>;

async function fetchJson(url: string, options: RequestInit = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request to ${url} failed: ${res.status} ${res.statusText}\n${text}`);
  }
  return res.json();
}

function collectCookies(headers: Headers): string[] {
  const getSetCookie = (headers as any).getSetCookie;
  if (typeof getSetCookie === "function") {
    const values = getSetCookie.call(headers);
    if (Array.isArray(values)) {
      return values.map((cookie: string) => cookie.split(";")[0]);
    }
  }

  const rawFn = (headers as any).raw;
  if (typeof rawFn === "function") {
    const rawHeaders = rawFn.call(headers) as Record<string, string[]> | undefined;
    const list = rawHeaders?.["set-cookie"] ?? [];
    if (Array.isArray(list)) {
      return list.map((cookie) => cookie.split(";")[0]);
    }
  }

  const single = headers.get("set-cookie");
  return single ? [single.split(";")[0]] : [];
}

function mergeCookies(existing: string[], incoming: string[]): string {
  const jar = new Map<string, string>();
  for (const cookie of [...existing, ...incoming]) {
    if (!cookie) continue;
    const idx = cookie.indexOf("=");
    if (idx === -1) continue;
    const name = cookie.slice(0, idx).trim();
    const value = cookie.slice(idx + 1).trim();
    jar.set(name, value);
  }
  return Array.from(jar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

class ApiClient {
  private constructor(public readonly email: string, private readonly cookie: string) {}

  static async login(email: string, password: string) {
    const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`, {
      headers: { accept: "application/json" },
    });
    const csrfData = await csrfRes.json();
    const csrfCookies = collectCookies(csrfRes.headers);

    const form = new URLSearchParams();
    form.append("csrfToken", csrfData.csrfToken);
    form.append("email", email);
    form.append("password", password);
    form.append("callbackUrl", "/workflow");
    form.append("json", "true");

    const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials?json=true`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: csrfCookies.join("; "),
      },
      body: form.toString(),
      redirect: "manual",
    });

    if (loginRes.status >= 400) {
      const text = await loginRes.text();
      throw new Error(`Login failed for ${email}: ${loginRes.status} ${text}`);
    }

    const loginCookies = collectCookies(loginRes.headers);
    const cookie = mergeCookies(csrfCookies, loginCookies);
    return new ApiClient(email, cookie);
  }

  private async request<T = Json>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers ?? {});
    headers.set("cookie", this.cookie);
    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Request ${init.method ?? "GET"} ${path} failed: ${res.status} ${res.statusText}\n${text}`);
    }
    return (await res.json()) as T;
  }

  get<T = Json>(path: string) {
    return this.request<T>(path, { method: "GET" });
  }

  post<T = Json>(path: string, body: Json) {
    return this.request<T>(path, { method: "POST", body: JSON.stringify(body) });
  }

  patch<T = Json>(path: string, body: Json) {
    return this.request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
  }
}

async function main() {
  console.log("[E2E] Logging in users...");
  const director = await ApiClient.login("director@example.com", PASSWORD);
  const head = await ApiClient.login("head@example.com", PASSWORD);
  const accountant = await ApiClient.login("accountant@example.com", PASSWORD);

  console.log("[E2E] Fetching users list...");
  const { users } = await director.get<{ users: { id: number; email: string }[] }>("/api/users");
  console.log("[E2E] Users:", users);
  const findUserId = (email: string) => {
    const found = users.find((user) => user.email === email);
    if (!found) throw new Error(`User ${email} not found`);
    return found.id;
  };

  const headId = findUserId("head@example.com");
  const accountantId = findUserId("accountant@example.com");
  const directorId = findUserId("director@example.com");

  console.log("[E2E] Creating document...");
  const createPayload = {
    title: "Автотестовая служебка",
    body: "Сценарий E2E проверяет маршруты",
    recipientId: accountantId,
    responsibleId: directorId,
    stages: [
      {
        assigneeId: headId,
        action: "approve",
        instruction: "Проверить корректность",
      },
      {
        assigneeId: accountantId,
        action: "review",
        instruction: "Можно пропустить, если нет замечаний",
        canSkip: true,
      },
      {
        assigneeId: directorId,
        action: "sign",
        instruction: "Финальное утверждение",
        commentRequired: true,
      },
    ],
    watchers: [directorId],
  };

  const createResponse = await director.post<{ document: any }>("/api/documents", createPayload);
  const document = createResponse.document;
  const stageTasks = document.tasks.filter((task: any) => task.step > 0);

  console.log(
    `[E2E] Document #${document.id} создан, задач: ${stageTasks.length} =>`,
    stageTasks.map((task: any) => ({ id: task.id, step: task.step, action: task.action, assigneeId: task.assigneeId })),
  );

  const sessionsByUserId = new Map<number, ApiClient>([
    [headId, head],
    [accountantId, accountant],
    [directorId, director],
  ]);

  const decisions: { decision: "complete" | "skip"; comment: string }[] = [
    { decision: "complete", comment: "Проверено" },
    { decision: "skip", comment: "Нет замечаний" },
    { decision: "complete", comment: "Подписано" },
  ];

  for (const [index, task] of stageTasks.entries()) {
    const session = sessionsByUserId.get(task.assigneeId);
    if (!session) {
      throw new Error(`Нет сессии для пользователя ${task.assigneeId}`);
    }
    const { decision, comment } = decisions[index] ?? { decision: "complete", comment: "Auto" };
    console.log(`  - этап ${task.step} (${task.action}) → ${decision}`);
    await session.patch(`/api/tasks/${task.id}`, {
      decision,
      comment,
    });
    // небольшой таймаут чтобы не перегружать dev-сервер
    await delay(200);
  }

  console.log("[E2E] Проверяем финальное состояние...");
  const docsResponse = await director.get<{ documents: any[] }>("/api/documents");
  const finalDocument = docsResponse.documents.find((doc) => doc.id === document.id);
  if (!finalDocument) {
    throw new Error("Документ не найден после сценария");
  }

  console.log(JSON.stringify({
    id: finalDocument.id,
    status: finalDocument.status,
    currentStep: finalDocument.currentStep,
    taskStatuses: finalDocument.tasks.map((task: any) => ({ step: task.step, status: task.status })),
  }, null, 2));
}

main().catch((error) => {
  console.error("[E2E] Ошибка сценария", error);
  process.exit(1);
});
