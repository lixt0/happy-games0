import { json, whoami } from '../feixingqi/_shared.js';

export async function onRequestPost({ request, env }) {
  const username = await whoami(request, env);
  if (!username) return json({ error: '请先登录' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }
  const attributes = String(body.attributes || '').slice(0, 240);
  if (!attributes) return json({ error: '缺少出生属性' }, 400);
  if (!env.OPENROUTER_KEY) return json({ error: 'AI 服务未配置' }, 503);
  try {
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENROUTER_KEY}`,
        'HTTP-Referer': 'https://happygames.pages.dev',
        'X-Title': '模拟人生',
      },
      body: JSON.stringify({
        model: 'inclusionai/ling-3.0-flash:free',
        stream: true,
        messages: [
          { role: 'system', content: '你是中文人生模拟器的随机推演 AI。根据玩家出生属性，随机生成完整人生。严格按以下六个标题输出，每个标题独占一行：\n【童年】\n【少年】\n【青年】\n【中年】\n【晚年】\n【人生总评】\n前五段各写 130 到 180 字，必须包含：该阶段发生的具体事件、事件对人物的影响、它如何改变下一阶段。事件与结果必须符合属性倾向，但不要重复套路，并体现偶然转机或波折。最后一段写死亡时的人生总结，开头必须是“人生评分：NN。”，NN 为 0 到 100 的整数。不要输出属性数值、列表或任何标题外的内容。' },
          { role: 'user', content: `出生属性：${attributes}。请开始随机推演。` },
        ],
        temperature: 1,
        max_tokens: 8192,
      }),
      });
      if (response.status !== 429 || attempt === 2) break;
      await new Promise(resolve => setTimeout(resolve, 2500 * (attempt + 1)));
    }
    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => '');
      return json({ error: `OpenRouter ${response.status}: ${detail.slice(0, 240)}` }, 502);
    }
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    return json({ error: `AI 推演请求失败: ${String(error.message || error).slice(0, 160)}` }, 502);
  }
}
