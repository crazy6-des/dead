import { apiClient, hasApiBaseUrl } from "./apiClient.js";
import { createSpace, createSpacePage, createSpaceRequest, SPACE_STATUSES } from "../features/spaces/spaceContract.js";

const DEV_SPACES = [
  createSpace({ id: "space-1", title: "Building in public", host: "S Team", status: SPACE_STATUSES.LIVE, participants: ["maya", "nia"] }),
  createSpace({ id: "space-2", title: "Late night creators", host: "Maya Okafor", status: SPACE_STATUSES.SCHEDULED, startAt: "Tonight" }),
];

export function createApiSpaceAdapter(client = apiClient) {
  return {
    list(request = {}) {
      return client.get("/api/spaces", request).then((page) => createSpacePage((page?.items || []).map(createSpace), page?.nextCursor || null));
    },
    create(input) {
      return client.post("/api/spaces", createSpaceRequest(input)).then(createSpace);
    },
    join(id) { return client.post("/api/spaces/" + encodeURIComponent(id) + "/join"); },
    leave(id) { return client.post("/api/spaces/" + encodeURIComponent(id) + "/leave"); },
  };
}

export function createDevSpaceAdapter(seed = DEV_SPACES) {
  const spaces = [...seed];
  return {
    list() { return Promise.resolve(createSpacePage(spaces)); },
    create(input) {
      const space = createSpace({ ...input, id: "space-" + Date.now(), status: SPACE_STATUSES.SCHEDULED });
      spaces.push(space);
      return Promise.resolve(space);
    },
    join(id) { return Promise.resolve({ ok: true, id, joined: true }); },
    leave(id) { return Promise.resolve({ ok: true, id, joined: false }); },
  };
}

export function createSpaceAdapter({ client = apiClient, devSeed = DEV_SPACES } = {}) {
  return hasApiBaseUrl() ? createApiSpaceAdapter(client) : createDevSpaceAdapter(devSeed);
}

export const spaceService = createSpaceAdapter();
