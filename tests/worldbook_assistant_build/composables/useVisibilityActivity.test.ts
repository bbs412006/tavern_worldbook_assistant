import { effectScope, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';

import {
  useVisibilityActivity,
  type VisibilityResource,
} from '../../../src/worldbook_assistant_build/composables/useVisibilityActivity';

function createResource(): VisibilityResource {
  return {
    resume: vi.fn(),
    suspend: vi.fn(),
    dispose: vi.fn(),
  };
}

describe('useVisibilityActivity', () => {
  it('creates and resumes once when initially active', () => {
    const scope = effectScope();
    const active = ref(true);
    const resource = createResource();
    const create = vi.fn(() => resource);
    let owner!: ReturnType<typeof useVisibilityActivity>;

    scope.run(() => {
      owner = useVisibilityActivity(active, create);
    });

    expect(create).toHaveBeenCalledTimes(1);
    expect(resource.resume).toHaveBeenCalledTimes(1);
    expect(resource.suspend).not.toHaveBeenCalled();
    expect(owner.resource.value).toBe(resource);

    scope.stop();
  });

  it('suspends and resumes the same resource as visibility changes', () => {
    const scope = effectScope();
    const active = ref(true);
    const resource = createResource();
    const create = vi.fn(() => resource);

    scope.run(() => useVisibilityActivity(active, create));
    active.value = false;
    active.value = true;

    expect(create).toHaveBeenCalledTimes(1);
    expect(resource.suspend).toHaveBeenCalledTimes(1);
    expect(resource.resume).toHaveBeenCalledTimes(2);

    scope.stop();
  });

  it('does not create duplicate resources across twenty cycles', () => {
    const scope = effectScope();
    const active = ref(false);
    const resource = createResource();
    const create = vi.fn(() => resource);

    scope.run(() => useVisibilityActivity(active, create));
    for (let cycle = 0; cycle < 20; cycle += 1) {
      active.value = true;
      active.value = false;
    }

    expect(create).toHaveBeenCalledTimes(1);
    expect(resource.resume).toHaveBeenCalledTimes(20);
    expect(resource.suspend).toHaveBeenCalledTimes(20);

    scope.stop();
  });

  it('disposes once when the owning scope stops', () => {
    const scope = effectScope();
    const active = ref(true);
    const resource = createResource();

    scope.run(() => useVisibilityActivity(active, () => resource));
    scope.stop();
    scope.stop();

    expect(resource.dispose).toHaveBeenCalledTimes(1);
  });

  it('does not resume after manual dispose', () => {
    const scope = effectScope();
    const active = ref(true);
    const resource = createResource();
    let owner!: ReturnType<typeof useVisibilityActivity>;

    scope.run(() => {
      owner = useVisibilityActivity(active, () => resource);
    });
    owner.dispose();
    active.value = false;
    active.value = true;

    expect(resource.dispose).toHaveBeenCalledTimes(1);
    expect(resource.resume).toHaveBeenCalledTimes(1);
    expect(resource.suspend).not.toHaveBeenCalled();
    expect(owner.resource.value).toBeNull();

    scope.stop();
    expect(resource.dispose).toHaveBeenCalledTimes(1);
  });
});
