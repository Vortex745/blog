import { NextRequest, NextResponse } from 'next/server';

const NVIDIA_API_KEY = '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';
const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';

export async function POST(request: NextRequest) {
    try {
        const { content } = await request.json();

        if (!content || content.trim().length === 0) {
            return NextResponse.json({ error: '文章内容不能为空' }, { status: 400 });
        }

        if (content.trim().length < 10) {
            return NextResponse.json({ error: '文章内容太短，至少需要10个字符' }, { status: 400 });
        }

        const systemPrompt = `你是一位资深的中文写作润色专家，拥有丰富的编辑经验和语言学背景。请按照以下八个维度，全面深入地润色用户提供的文章：

## 润色维度

### 1. 语法准确
- 修正所有语法错误、错别字、标点符号误用
- 确保主谓一致、时态统一
- 纠正用词不当、搭配错误
- 修正量词、介词、连词的误用

### 2. 简洁清晰
- 删除不必要的修饰词、冗余表达和重复内容
- 简化过于复杂的句型结构
- 消除歧义表述，确保每句话都指向明确
- 用精炼的方式传递同等信息量

### 3. 一致连贯
- 统一全文的语气和风格（正式/半正式/轻松）
- 统一专业术语的使用，前后保持一致
- 在段落和观点之间添加自然过渡
- 确保逻辑链条完整，论述层层递进

### 4. 流畅可读
- 优化段落结构，确保信息分布合理
- 控制句子长度，长短交替形成节奏感
- 将被动句式转为主动句式（在合适的地方）
- 确保阅读体验顺畅，不产生理解障碍

### 5. 词汇多样
- 替换文中重复出现的词汇，使用近义词或更精准的表达
- 提升用词的表达力和感染力
- 避免口水话和套话，选用更有力度的词汇
- 在保持可读性的前提下适度使用高级词汇

### 6. 增强吸引力
- 根据文章类型（技术/生活/评论等）适当添加修辞手法
- 增强论述的说服力和感染力
- 优化文章的开头和结尾，使其更有吸引力
- 使关键论点更加突出、掷地有声

### 7. 上下文适应
- 考虑目标读者群体，调整表述的深度和风格
- 注意文化语境的适当性
- 避免任何形式的偏见或不当表述
- 确保技术内容的准确性不被润色破坏

### 8. 原创道德
- 严格保留文章的核心含义和作者观点
- 不添加原文中没有的新信息或新观点
- 不改变文章的立场和论证方向
- 保留作者的个人风格特色，润色而非改写

## 输出要求

请严格按照以下JSON格式返回结果，不要返回任何JSON以外的内容：
{
  "polishedContent": "润色后的完整文章内容",
  "report": {
    "grammar": "语法准确方面的具体修改（如：修正了X处语法错误，纠正了X个错别字）",
    "clarity": "简洁清晰方面的具体修改（如：精简了X处冗余表达，简化了X个复杂句型）",
    "coherence": "一致连贯方面的具体修改（如：统一了术语用法，添加了X处过渡衔接）",
    "readability": "流畅可读方面的具体修改（如：优化了X处句式结构，改善了段落节奏）",
    "vocabulary": "词汇多样方面的具体修改（如：替换了X处重复用词，提升了表达力）",
    "engagement": "吸引力方面的具体修改（如：强化了X处论述，优化了开头/结尾）",
    "summary": "50字以内的总结，概括本次润色的整体效果和主要提升"
  }
}

## 重要规则
- 必须完整保留原文的 Markdown 格式（标题、列表、代码块、链接、图片等）
- 代码块（\`\`\`包裹的内容）内部不做任何修改
- 如果原文已经质量很高，也要返回上述格式，在report中如实说明
- 确保返回的是合法的、可解析的JSON
- polishedContent 中不要包含 JSON 转义以外的反斜杠`;

        const response = await fetch(NVIDIA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${NVIDIA_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'meta/llama-3.1-70b-instruct',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `请按照八个润色维度，全面润色以下文章：\n\n${content}` },
                ],
                temperature: 0.25,
                max_tokens: 4096,
                top_p: 0.85,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('NVIDIA API Error:', response.status, errorText);
            return NextResponse.json(
                { error: `AI 服务暂时不可用 (${response.status})，请稍后再试` },
                { status: 502 }
            );
        }

        const data = await response.json();
        const aiMessage = data?.choices?.[0]?.message?.content;

        if (!aiMessage) {
            return NextResponse.json(
                { error: 'AI 返回了空结果，请重试' },
                { status: 500 }
            );
        }

        // Try to parse the JSON response from the AI
        try {
            // Extract JSON from the response (in case there's extra text around it)
            const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
            const fallbackReport = {
                grammar: '已检查语法与拼写',
                clarity: '已优化简洁清晰度',
                coherence: '已统一风格与术语',
                readability: '已提升流畅可读性',
                vocabulary: '已丰富词汇表达',
                engagement: '已增强文章吸引力',
                summary: '文章润色完成',
            };

            if (!jsonMatch) {
                return NextResponse.json({
                    polishedContent: aiMessage.trim(),
                    report: fallbackReport,
                });
            }

            const parsed = JSON.parse(jsonMatch[0]);
            return NextResponse.json({
                polishedContent: parsed.polishedContent || aiMessage.trim(),
                report: {
                    grammar: parsed.report?.grammar || fallbackReport.grammar,
                    clarity: parsed.report?.clarity || fallbackReport.clarity,
                    coherence: parsed.report?.coherence || fallbackReport.coherence,
                    readability: parsed.report?.readability || fallbackReport.readability,
                    vocabulary: parsed.report?.vocabulary || fallbackReport.vocabulary,
                    engagement: parsed.report?.engagement || fallbackReport.engagement,
                    summary: parsed.report?.summary || fallbackReport.summary,
                },
            });
        } catch {
            return NextResponse.json({
                polishedContent: aiMessage.trim(),
                report: {
                    grammar: '已检查语法与拼写',
                    clarity: '已优化简洁清晰度',
                    coherence: '已统一风格与术语',
                    readability: '已提升流畅可读性',
                    vocabulary: '已丰富词汇表达',
                    engagement: '已增强文章吸引力',
                    summary: '文章润色完成',
                },
            });
        }
    } catch (error: any) {
        console.error('Polish API Error:', error);
        return NextResponse.json(
            { error: error.message || '润色服务出错，请稍后再试' },
            { status: 500 }
        );
    }
}
