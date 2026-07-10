from pathlib import Path

root = Path(__file__).resolve().parents[1]
index = (root / 'src/worldbook_assistant_build/index.ts').read_text(encoding='utf-8')

checks = {
    'debug renderer exists': 'function renderDebugDiagnostic(' in index,
    'debug renderer targets panel body': 'PANEL_BODY_ID' in index and 'data-wb-debug-diagnostic' in index,
    'debug report includes build metadata': '__WB_ASSISTANT_BUILD_COMMIT__' in index and '__WB_ASSISTANT_BUILD_TIME__' in index,
    'vue errors are captured': 'app.config.errorHandler' in index,
    'mount errors are captured': "renderDebugDiagnostic('mount'" in index,
    'window errors are captured': "addEventListener('error'" in index,
    'promise rejections are captured': "addEventListener('unhandledrejection'" in index,
    'debug listeners are cleaned up': 'removeDebugDiagnostics();' in index,
}

for name, ok in checks.items():
    print(('PASS' if ok else 'FAIL'), name)
if not all(checks.values()):
    raise SystemExit(1)
