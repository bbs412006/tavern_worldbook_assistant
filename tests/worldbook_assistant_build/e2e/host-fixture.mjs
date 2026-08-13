const globals = globalThis;
globals.$ = globals.jQuery;

const createEntries = count => Array.from({ length: count }, (_, index) => ({
  uid: index + 1,
  name: `大型世界书条目 ${index + 1}`,
  comment: `大型世界书条目 ${index + 1}`,
  enabled: index % 5 !== 0,
  strategy: {
    type: index % 7 === 0 ? 'constant' : 'selective',
    keys: [`关键词${index + 1}`, '移动端测试'],
    keys_secondary: { logic: 'and_any', keys: [] },
    scan_depth: 'same_as_global',
  },
  position: { type: 'before_character_definition', role: 'system', depth: 4, order: index + 1 },
  content: `这是第 ${index + 1} 个条目的正文内容。`.repeat(12),
  probability: 100,
  recursion: { prevent_incoming: false, prevent_outgoing: false, delay_until: null },
  effect: { sticky: null, cooldown: null, delay: null },
}));

const worldbooks = {
  '大型世界书 A': createEntries(120),
  '大型世界书 B': createEntries(120).map(entry => ({ ...entry, uid: entry.uid + 1000, name: `第二世界书条目 ${entry.uid}` })),
};
const clone = value => structuredClone(value);
const scriptVariables = {
  worldbook_assistant_state_v1: {
    last_worldbook: '大型世界书 A',
    theme: 'ocean',
    glass_mode: false,
    show_ai_chat: false,
    panel_mode: 'editor',
    tag_filter: { selected_ids: [], logic: 'or', match_mode: 'descendants' },
    worldbook_tags: { definitions: [], assignments: {} },
    ai_api_config: { mode: 'tavern', use_main_api: true, apiurl: '', key: '', model: '', temperature: 1, max_tokens: 4096 },
    sort: { mode: 'view', reassign_uid: false },
    multi_edit: { enabled: true, sync_extra_json: false },
    tag_editor: { delete_parent_mode: 'promote' },
    cross_copy: { last_source_worldbook: '', last_target_worldbook: '', use_draft_source_when_current: true, snapshot_before_apply: true, desktop_left_width: 320, controls_collapsed: true, workspace_tools_expanded: false },
  },
};

Object.assign(globals, {
  getScriptId: () => 'worldbook-host-e2e',
  getVariables: () => scriptVariables,
  replaceVariables: variables => Object.assign(scriptVariables, variables),
  getWorldbookNames: () => Object.keys(worldbooks),
  getWorldbook: async name => clone(worldbooks[name] ?? []),
  updateWorldbookWith: async (name, updater) => {
    worldbooks[name] = clone(updater(clone(worldbooks[name] ?? [])));
    return clone(worldbooks[name]);
  },
  replaceWorldbook: async (name, entries) => { worldbooks[name] = clone(entries); },
  createWorldbook: async name => { worldbooks[name] = []; },
  deleteWorldbook: async name => { delete worldbooks[name]; return true; },
  createWorldbookEntries: async (name, entries) => { worldbooks[name] = [...(worldbooks[name] ?? []), ...clone(entries)]; },
  getGlobalWorldbookNames: () => [],
  rebindGlobalWorldbooks: async () => {},
  getCharWorldbookNames: () => ({ primary: null, additional: [] }),
  getChatWorldbookName: () => null,
  getCurrentCharacter: () => null,
  getCurrentChatId: () => 'host-e2e-chat',
  getChatMessages: () => [],
  eventOn: () => ({ stop() {} }),
  tavern_events: { WORLD_INFO_ACTIVATED: 'WORLD_INFO_ACTIVATED', WORLDINFO_UPDATED: 'WORLDINFO_UPDATED', CHAT_CHANGED: 'CHAT_CHANGED' },
  iframe_events: { STREAM_TOKEN_RECEIVED_FULLY: 'STREAM_TOKEN_RECEIVED_FULLY' },
  toastr: { success() {}, info() {}, warning() {}, error() {} },
  generateRaw: async () => '[]',
  getModelList: async () => [],
  importRawWorldbook: async () => new Response('', { status: 200 }),
  replaceScriptInfo: () => {},
  replaceScriptButtons: () => {},
  errorCatched: fn => (...args) => { try { return fn(...args); } catch (error) { console.error(error); } },
  confirm: () => true,
  prompt: () => null,
  SillyTavern: { getCurrentChatId: () => 'host-e2e-chat' },
});

globals.__WB_E2E_ERRORS__ = [];
window.addEventListener('error', event => globals.__WB_E2E_ERRORS__.push(String(event.error ?? event.message)));
window.addEventListener('unhandledrejection', event => globals.__WB_E2E_ERRORS__.push(String(event.reason)));

await import('../../../dist/worldbook_assistant_build/index.js');
globals.__WB_E2E_READY__ = true;
