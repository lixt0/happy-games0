export async function onRequestPost({ request, env }) {
  const key = env.OPENROUTER_KEY;
  if (!key) return json({ error: 'AI 未配置' }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ error: '请求格式错误' }, 400); }
  const { dynasty, nameA, nameB, matchups } = body;
  if (!matchups || !dynasty) return json({ error: '缺少参数' }, 400);

  const systemPrompt = `你是"华夏大乱斗"的AI历史裁判。两位玩家穿越到【${dynasty.name}】朝代（${dynasty.desc}），各自从英雄池中选将组建朝廷，在10个职位上对决。

你的任务：逐局评判胜负，给出比分和分析。必须全程使用中文输出。

评判标准（优先级从高到低）：
1. 朝代适配性：该人物在此朝代背景下是否如鱼得水
2. 职位匹配度：人物核心能力是否匹配职位需求
3. 实际能力：历史功绩与才能
4. 阵容协同：与己方其他位置的配合

输出格式（严格遵守，全部用中文）：
对每一局，输出：
## 【职位名称】玩家A选人 vs 玩家B选人
比分：X.X:Y.Y
分析：（2-3句话，结合历史典故，说书人风格，生动有趣）

十局全部评判完毕后，输出：
## 终局总结
| 职位 | 玩家A选人 | 玩家B选人 | 比分 |
| --- | --- | --- | --- |
| 先锋 | 张三 | 李四 | 6.0:4.0 |
| 后勤 | 王五 | 赵六 | 3.5:6.5 |
（按上述示例严格输出十行数据表，每行四个单元，比分单元内只写 X.X:Y.Y，中间用英文冒号不带空格）

**最终比分：XX.X : YY.Y**
**胜者：玩家X（昵称）**

（一段100字左右的总结，点评双方阵容优劣，语言诙谐）

关键规则（必须严格遵守）：
- 每局比分 X.X 与 Y.Y 之和必须正好等于 10（如 7.0:3.0、6.5:3.5、5.0:5.0），任何情况下两数相加都得 10，绝不可为 12 或其它
- 胜者得分范围 6.0-10.0，败者得分范围 0.0-4.0，平局为 5.0:5.0，精确到小数点后 1 位
- 比分单元内只能用英文半角冒号 ":"，禁止使用中文冒号、空格、破折号或"vs"
- 全部输出必须使用中文，禁止英文
- 不要以名气大小论英雄，要看实际能力和职位匹配
- 不要编造不存在的历史事件
- 语言风格：说书人，可用"话说""且看""妙哉""好一个"等`;

  const matchupText = matchups.map((m, i) =>
    `${i + 1}. 【${m.position}】（${m.desc}）
   玩家A「${nameA}」选择：${m.heroA.name}（${m.heroA.era}，${m.heroA.tags.join('/')}）
     属性：政${m.heroA.stats.politics} 武${m.heroA.stats.military} 谋${m.heroA.stats.strategy} 交${m.heroA.stats.diplomacy} 文${m.heroA.stats.literature} 魅${m.heroA.stats.charm}
   玩家B「${nameB}」选择：${m.heroB.name}（${m.heroB.era}，${m.heroB.tags.join('/')}）
     属性：政${m.heroB.stats.politics} 武${m.heroB.stats.military} 谋${m.heroB.stats.strategy} 交${m.heroB.stats.diplomacy} 文${m.heroB.stats.literature} 魅${m.heroB.stats.charm}`
  ).join('\n\n');

  const userPrompt = `朝代背景：${dynasty.name}（${dynasty.desc}）
朝代加成：${Object.entries(dynasty.bonus).map(([k, v]) => `${k}+${v}`).join('、')}

玩家A：${nameA}
玩家B：${nameB}

十局对决：
${matchupText}

请逐局评判，最后给出总评。`;

  let upstream;
  for (let attempt = 0; attempt < 5; attempt++) {
    upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': 'https://happygames.pages.dev',
        'X-Title': '华夏大乱斗',
      },
      body: JSON.stringify({
        model: 'inclusionai/ling-3.0-flash:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 8192,
        stream: true,
      }),
    });
    if (upstream.status === 429 && attempt < 4) {
      await new Promise(r => setTimeout(r, 8000 * (attempt + 1)));
      continue;
    }
    break;
  }

  if (!upstream.ok) {
    const t = await upstream.text().catch(() => '');
    return json({ error: `OpenRouter ${upstream.status}: ${t.slice(0, 200)}` }, 502);
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
