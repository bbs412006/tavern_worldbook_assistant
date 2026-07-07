export function buildConfigSystemPrompt(
  entries: WorldbookEntry[],
  customPrompt = '',
  forceDefault = false,
): string {
  if (!forceDefault && customPrompt.trim()) {
    return customPrompt;
  }
  const names = [...new Set(entries.map(e => e.name))].map(n => `"${n}"`).join(', ');

  return `你是世界书条目配置助手。根据用户的自然语言指令，输出对应的JSON配置。

## 可用条目
${names || '无'}

## JSON Schema
每个配置对象的可用字段如下（只包含需要修改的字段，name必填）：
{
  "name": "str! 必须精确匹配上方条目名",
  "new_name": "str 重命名条目",
  "enabled": "bool",
  "strategy_type": "constant(蓝灯常驻) | selective(绿灯关键词)",
  "keys": ["str 主要关键词"],
  "keys_secondary": ["str 次要关键词"],
  "keys_secondary_logic": "and_any | and_all | not_all | not_any",
  "scan_depth": "int | 'same_as_global'",
  "position_type": "before_character_definition(角色定义之前) | after_character_definition(角色定义之后) | before_example_messages(示例消息前) | after_example_messages(示例消息后) | before_author_note(作者注释之前) | after_author_note(作者注释之后) | at_depth(指定深度)",
  "position_order": "int 排序顺序",
  "position_depth": "int 深度(at_depth时)",
  "position_role": "system | assistant | user",
  "prevent_incoming": "bool 不可递归",
  "prevent_outgoing": "bool 防止进一步递归",
  "probability": "int 0-100",
  "sticky": "int|null 黏性",
  "cooldown": "int|null 冷却"
}

## 思考步骤（内部思考，不要输出思考过程，直接输出结果）
1. 识别用户提到了哪些条目（精确匹配"可用条目"中的名称）
2. 识别每个条目需要修改什么设置（蓝灯/绿灯、位置、顺序、递归等）
3. 如果用户给条目起了新名字，使用new_name字段
4. 只输出有变更的字段，不要输出未提及的字段
5. 注意：同名条目只需写一次，修改会自动应用到所有同名条目

## 输出格式
将结果包裹在 <worldbook_config></worldbook_config> 中，内容为纯JSON数组，无注释无markdown。

<worldbook_config>
[{"name":"现有条目名","new_name":"新名字","strategy_type":"constant","position_type":"before_character_definition","position_order":1,"prevent_incoming":true,"prevent_outgoing":true}]
</worldbook_config>`;
}

export interface ExtractJsonArrayResult {
  ok: boolean;
  json: string;
}

export function stripAiReasoningBlocks(value: string): string {
  return value
    .replace(/<(?:thinking|Think)>[\s\S]*?<\/(?:thinking|Think)>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

export function cleanupJsonArrayText(value: string): string {
  return value
    .replace(/```(?:json)?\s*/g, '')
    .replace(/```\s*/g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/,\s*([}\]])/g, '$1')
    .trim();
}

export function extractJsonArray(responseText: string): ExtractJsonArrayResult {
  const cleaned = stripAiReasoningBlocks(responseText);
  let json = '';
  const startTag = '<worldbook_config>';
  const endTag = '</worldbook_config>';
  const lastStart = cleaned.lastIndexOf(startTag);
  const lastEnd = cleaned.lastIndexOf(endTag);
  if (lastStart !== -1 && lastEnd !== -1 && lastEnd > lastStart) {
    json = cleaned.substring(lastStart + startTag.length, lastEnd).trim();
  } else {
    const codeBlockMatch = cleaned.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (codeBlockMatch) {
      json = codeBlockMatch[1];
    } else {
      const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*?"name"[\s\S]*?\}\s*\]/);
      if (arrayMatch) {
        json = arrayMatch[0];
      }
    }
  }
  return {
    ok: Boolean(json),
    json: cleanupJsonArrayText(json),
  };
}
