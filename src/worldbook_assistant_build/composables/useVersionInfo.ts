import { computed, ref } from 'vue';
import {
  APP_VERSION,
  VERSION_BRANCH,
  VERSION_REPO_OWNER,
  VERSION_REPO_NAME,
  buildVersionImportUrl,
  compareSemver,
  normalizeVersionTag,
} from '../domain/version';
import type { VersionInfo } from '../domain/types';

export function useVersionInfo(buildCommit: string, buildTime: string) {
  const latestVersionName = ref('');
  const latestVersionCommit = ref('');
  const latestVersionCheckedAt = ref(0);
  const latestVersionUrl = ref('');
  const versionCheckLoading = ref(false);
  const versionCheckError = ref('');

  const versionInfo = computed<VersionInfo>(() => ({
    version: APP_VERSION,
    branch: VERSION_BRANCH,
    commit: buildCommit,
    build_time: buildTime,
    latest_version: latestVersionName.value,
    latest_commit: latestVersionCommit.value,
    latest_checked_at: latestVersionCheckedAt.value,
    latest_url: latestVersionUrl.value,
  }));

  async function copyVersionImportUrl(): Promise<void> {
    const url = latestVersionUrl.value || buildVersionImportUrl();
    try {
      await navigator.clipboard?.writeText(url);
      toastr.success('已复制固定版本导入链接');
    } catch {
      window.prompt('复制这个固定版本导入链接', url);
    }
  }

  async function checkLatestVersion(): Promise<void> {
    if (versionCheckLoading.value) {
      return;
    }
    versionCheckLoading.value = true;
    versionCheckError.value = '';
    try {
      const endpoint = `https://api.github.com/repos/${VERSION_REPO_OWNER}/${VERSION_REPO_NAME}/tags?per_page=100`;
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`GitHub HTTP ${response.status}`);
      }
      const tags = await response.json() as Array<{ name?: string; commit?: { sha?: string } }>;
      const versionTags = tags
        .map(tag => ({
          name: normalizeVersionTag(String(tag.name || '')),
          sha: String(tag.commit?.sha || '').slice(0, 12),
        }))
        .filter(tag => /^\d+\.\d+\.\d+$/.test(tag.name))
        .sort((left, right) => compareSemver(right.name, left.name));
      const latest = versionTags[0];
      if (!latest) {
        throw new Error('GitHub 未找到语义版本标签');
      }
      latestVersionName.value = latest.name;
      latestVersionCommit.value = latest.sha;
      latestVersionUrl.value = buildVersionImportUrl(latest.name);
      latestVersionCheckedAt.value = Date.now();
      if (compareSemver(latest.name, APP_VERSION) <= 0) {
        toastr.success(`当前已是最新版本（v${APP_VERSION}）`);
      } else {
        toastr.info(`发现新版本 v${latest.name}，可复制固定版本链接更新`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      versionCheckError.value = message;
      toastr.error(`检查更新失败: ${message}`);
    } finally {
      versionCheckLoading.value = false;
    }
  }

  return {
    versionInfo,
    versionCheckLoading,
    versionCheckError,
    checkLatestVersion,
    copyVersionImportUrl,
  };
}
