import {
  onScopeDispose,
  shallowReadonly,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue';

export interface VisibilityResource {
  resume(): void;
  suspend(): void;
  dispose(): void;
}

export function useVisibilityActivity(
  active: MaybeRefOrGetter<boolean>,
  create: () => VisibilityResource,
): {
  readonly resource: Readonly<ShallowRef<VisibilityResource | null>>;
  dispose(): void;
} {
  const resource = shallowRef<VisibilityResource | null>(null);
  let disposed = false;

  const stop = watch(
    () => toValue(active),
    isActive => {
      if (disposed) {
        return;
      }
      if (isActive) {
        resource.value ??= create();
        resource.value.resume();
        return;
      }
      resource.value?.suspend();
    },
    { immediate: true, flush: 'sync' },
  );

  function dispose(): void {
    if (disposed) {
      return;
    }
    disposed = true;
    stop();
    resource.value?.dispose();
    resource.value = null;
  }

  onScopeDispose(dispose);

  return {
    resource: shallowReadonly(resource),
    dispose,
  };
}
