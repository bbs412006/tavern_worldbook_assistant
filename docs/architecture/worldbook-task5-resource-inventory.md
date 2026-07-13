# Worldbook Task 5 resource inventory

| Resource | Owner | Created / resumed | Cleanup | Classification |
| --- | --- | --- | --- | --- |
| Browse `IntersectionObserver` | `useWorkspaceActivity` | Main workspace active and sentinel attached | Disconnect on suspend/dispose; reused on resume | Visible-only, component-owned |
| Mounted-window `resize` listener | `useWorkspaceActivity` | Active workspace with mounted owner window | Remove on suspend, target change, and dispose | Visible-only, component-owned |
| Coalesced layout frame | `useWorkspaceActivity` / `useCoalescedFrame` | Active resize event or workspace resume | Cancel on suspend/dispose; one pending frame maximum | Visible-only, component-owned |
| Pane resize document/window listeners | `App.vue` pane resize session | Pointer-down starts a real pane resize | `stopPaneResize`; persist only when a session existed | Visible-only, interaction-owned |
| Content resize pointer listeners/capture/frame/styles | `App.vue` content resize session | Content resize handle pointer-down | Explicit stop on pointer up/cancel, workspace suspend, and unmount | Visible-only, interaction-owned |
| Content top-drag pointer listeners/capture/frame | `App.vue` content top-drag session | Mobile content top handle pointer-down | Explicit stop on pointer up/cancel, workspace suspend, and unmount | Visible-only, interaction-owned |
| Host data events, persistence, and AI subscriptions | `App.vue` component lifecycle | App mount or generation start | Existing component/generation teardown only; never visibility-gated | Always-active correctness resources |

Workspace suspension gates only layout, observation, animation-frame, and active interaction work. It does not gate data synchronization, persistence watchers, host events, or AI streams.
