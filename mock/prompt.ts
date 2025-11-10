import type { Request, Response } from 'express';
import type { PromptTemplate } from '@/services/prompt';

// 模拟数据
let promptData: PromptTemplate[] = [
  {
    id: '1',
    name: '通知',
    content: `
   

    你正在撰写一份《通知》，这是下行文，用于批转、转发公文，传达要求下级机关办理和需要有关单位周知或者执行的事项，任免人员。

## 通知写作要点：
1. **标题构成**：发文机关 + 事由 + （紧急/重要/补充/联合）通知
   - 事由要一目了然，概括核心内容
   - 批转性："关于批转《××关于××的报告》的通知"
   - 转发性："关于转发《××关于××的通知》的通知"

2. **主送机关**：
   - 不能遗漏受文单位
   - 可写在正文内，但通知一般必须有主送机关
   - 如无主送机关应改用通告或公告

3. **正文结构**：
   - **缘由段**：交代发文的原因、意图和目的（1-2段）
   - **事项段**：逐条列明通知事项，使用"一、二、三"或"（一）（二）（三）"
   - **要求段**：明确受文单位应如何办理，提出具体要求和措施

4. **写作规范**：
   - 事项要具体明确，条理清楚
   - 措施方法要切实可行
   - 针对性强，评价符合实际
   - 贯彻意见要切合本地区（单位）具体情况
   - 语言准确简明，避免模糊不清
   - 结尾常用："特此通知" 或 "请认真贯彻执行"

   ## 输入信息： 发文机关：{发文机关} 事由：{事由} 紧急程度：{紧急程度} 发文形式：{发文形式} 主送机关：{主送机关} 抄送机关：{抄送机关} 正文：{正文} 发文单位：{发文单位} 发文日期：{发文日期}

  ## 输出要求：
  正文要体现：
  - 第一段：发文缘由（为什么发这个通知）
  - 中间段：分条列出通知事项（每项要具体、可操作）
  - 最后段：提出要求和时限
  - 结尾用"特此通知"
`,
    category: 'notice',
    description: '事项性通知|批转性通知|转发性通知|指示性通知|任命通知',
    variables: ['发文机关', '事由', '紧急程度', '发文形式', '主送机关', '抄送机关', '正文', '发文单位', '发文日期'],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: '通报',
    content: `你正在撰写一份《通报》，这是下行文，用于表彰先进、批评错误、传达重要精神或者情况。

## 通报写作要点：

1. **导语部分**：
   - 简要概括主题（时间、地点、人物、事件）
   - 一句话说清"通报什么事"

2. **事实和决定部分**：
   - **事实要详写**：交待来龙去脉，过程要完整
     * 表扬性：突出先进事迹、典型做法、显著成效
     * 批评性：说明违规事实、造成后果、性质认定
     * 情况性：客观陈述事件全过程
   - **决定要简洁**：表彰/批评决定要准确、明确

3. **要求部分**：
   - **原则性写法**：
     * 对受表彰单位：再接再厉、继续发扬
     * 对其他单位：学习先进、对照检查
   - **具体性写法**：
     * 工作部署，分条分项
     * 可操作的整改措施

4. **写作规范**：
   - 事件的典型性（有代表意义、警示作用）
   - 定性的准确性（功过是非要公正客观）
   - 要求的科学性（切实可行、可检验）
   - 语言的色彩性（表扬用褒义、批评用贬义，情况用平实）

## 输入信息：
主题：{主题} 事件时间：{事件时间} 事件地点：{事件地点} 事件人物：{事件人物} 事件内容：{事件内容} 事件结果：{事件结果} 事件要求：{事件要求}

## 输出要求：
正文结构：
1. 导语：用一段概括事件
2. 事实部分：详细叙述，分2-3段
3. 决定部分：1段简明扼要
4. 要求部分：分条列出（2-4条）
5. 结尾："特此通报"`,
    category: 'bulletin',
    description: '表扬性通报|批评性通报|情况性通报',
    variables: ['主题', '事件时间', '事件地点', '事件人物', '事件内容', '事件结果', '事件要求'],
    isActive: true,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
  {
    id: '3',
    name: '请示',
    content: `你正在撰写一份《请示》，这是上行文，用于向上级机关请求指示、批准。

## 请示写作要点：

1. **请示缘由**：
   - 说理要充分明了
   - 阐述背景、原因、依据
   - 与请示事项要有合理、严密的逻辑性
   - 引用政策法规要准确

2. **请求事项**：
   - 要具体、明确、条项清楚
   - 不超出审批机关的职权范围
   - 如有多项，用"一、二、三"分列
   - 每项都要可操作、可批复

3. **结语**：
   - "特此请示，请予批准"
   - "特此请示，请予批示"
   - "以上请示如无不妥，请批转各地区、各部门研究执行"
   - 避免用感情色彩的"？！"等

4. **写作规范**（重要）：
   - **一事一报**：一份请示只请示一件事
   - **不能多头请示**：主送机关只能一个（其他用抄送）
   - **不得抄送下级机关**
   - **不要越级请示**（特殊情况除外）
   - **不与报告混用**（不能夹带请示事项在报告里）

5. **必须包含签发人**：
   - 请示是上行文，必须标注签发人

## 输入信息：
请示缘由：{请示缘由} 请求事项：{请求事项} 结语：{结语}

## 输出要求：
JSON必须包含 "签发人" 字段！
正文结构：
1. 第一段：请示缘由（为什么要请示）
2. 第二段：具体情况说明
3. 第三段：请示事项（明确请求什么）
4. 结尾：使用规范结语`,
    category: 'request',
    description: '请示',
    variables: ['请示缘由', '请求事项', '结语'],
    isActive: true,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
  },
  {
    id: '4',
    name: '报告',
    content: `你正在撰写一份《报告》，这是上行文，用于向上级机关汇报工作、反映情况、回复询问。

## 报告写作要点：

1. **开头部分**：
   - 写明发文依据、缘由
   - "根据××要求" 或 "现将××情况报告如下"

2. **主体部分**：
   
   **呈报性报告**（纯汇报，不提建议）：
   - 汇报工作：成绩、做法、经验、问题
   - 反映问题：情况、影响、原因
   - 答复询问：针对性回复
   
   **呈转性报告**（汇报+建议）：
   - 在汇报基础上，提出意见建议
   - 请求上级批转执行

3. **结尾部分**：
   - 呈报性报告："特此报告"
   - 呈转性报告："以上报告，如无不妥，请批转××贯彻执行"

4. **写作规范**：
   - **反映情况要真实**：数据准确，客观公正
   - **中心内容要突出**：重点明确，详略得当
   - **不能夹带请示事项**：报告就是报告，不能在报告里请示
   - 如有请示必须另文，用《请示》文种

5. **与请示的区别**：
   - 报告：汇报工作、陈述情况，不要求批复
   - 请示：请求指示、请求批准，必须有批复才能执行

## 输入信息：
报告主题：{报告主题} 背景描述：{背景描述} 报告概况内容：{报告概况内容} 报告要求：{报告要求} 

## 输出要求：
正文结构：
1. 开头：依据缘由（1段）
2. 主体：分项汇报（2-4段或分条）
   - 呈报性：客观陈述即可
   - 呈转性：最后要提建议
3. 结尾：使用对应的规范结语

注意：检查正文中是否有请示性语句，如有必须删除！`,
    category: 'report',
    description: '呈报性报告|呈转性报告',
    variables: ['报告主题', '背景描述', '报告概况内容', '报告要求', '报告内容'],
    isActive: true,
    createdAt: new Date('2024-01-04'),
    updatedAt: new Date('2024-01-04'),
  },
  {
    id: '5',
    name: '函',
    content: `你正在撰写一份《函》，用于不相隶属机关之间商洽工作、询问和答复问题、请求批准和答复审批事项。

## 函的写作要点：

1. **发函缘由**：
   - 针对问题，说明缘由
   - 切忌铺陈繁冗，要简明扼要

2. **事项部分**：
   - 直陈其事，言简意赅
   - 不借题发挥、不大发议论
   - 商洽性：提出商洽的具体事项
   - 询问性：明确询问的问题
   - 答复性：针对来函逐项答复
   - 告知性：清楚告知相关情况

3. **结语**：
   - 商洽函："妥否，请函复" 或 "请予支持为盼"
   - 询问函："特此函询，请予函复"
   - 答复函："特此函复"
   - 告知函："特此函告"

4. **写作规范**：
   - 措词得体，用语尊重、诚恳
   - 谨慎、谦和，不能指令性口吻
   - 语气平和，既不卑也不亢
   - 内容单一，一函一事

5. **函的特点**：
   - 平行文，机关之间平等协商
   - 不具有强制性
   - 灵活性强，使用广泛

## 输入信息：
发函缘由：{发函缘由} 事项：{事项} 结语：{结语}

## 输出要求：
正文结构：
1. 第一段：发函缘由（为什么发函）
2. 第二段：具体事项（商洽/询问/答复/告知的内容）
3. 结尾：使用对应类型的规范结语

注意：语气要平和得体，不能用命令式！`,
    category: 'letter',
    description: '商洽函|询问函|答复函|告知函',
    variables: ['发函缘由', '事项', '结语'],
    isActive: true,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  },
  {
    id: '6',
    name: '会议纪要',
    content: `你正在撰写一份《会议纪要》，用于记载、传达会议情况和议定事项。

## 会议纪要写作要点：

1. **开头部分**：
   简介会议概况，**强烈建议关键信息齐全**：
   - 会议届次（如"第X次办公会议"）
   - 会议目的、任务
   - 开会时间、地点
   - 会议主持人
   - 参加和列席人员
   - 会议主要成果

2. **主体部分**（根据会议类型选择）：
   
   **概括式**（党委专题学习会议）：
   - 高度概括会议内容
   - 提炼核心精神和要求
   
   **分项式**（日常办公会议）：
   - 按议题分项叙述
   - 每项包括：讨论情况 + 形成决定
   
   **发言记录式**（工程例会、座谈会）：
   - 记录重要发言
   - 归纳共同意见
   
   **条款式**（重要决策会议）：
   - 用条款形式列出决定事项
   - 每条一个具体决定

3. **结尾部分**：
   - 提出希望、号召
   - 要求贯彻执行会议精神
   - 也可不写

4. **写作规范**：
   - 标题："XX会议纪要" 或 "XX关于XX会议纪要"
   - 不用主送机关（如需发文可加"主送"）
   - 叙述用第三人称
   - 内容要准确，观点要明确
   - 必须经主持人审核

## 输入信息：
会议名称：{会议名称} 会议时间：{会议时间} 会议地点：{会议地点} 主持人：{主持人} 参会人员：{参会人员} 记录人：{记录人} 议题内容：{议题内容} 讨论要点：{讨论要点}

## 输出要求：
- 标题直接用"XX会议纪要"
- 可以不填"主送机关"（或填空数组）
- 正文按选定的内容风格组织：
  * 第一段：会议概况（时间地点人物事件）
  * 中间段：会议内容（按选定风格）
  * 最后段：会议要求（可选）`,
    category: 'meeting',
    description: '概括式|分项式|发言记录式|条款式',
    variables: ['会议名称', '会议时间', '会议地点', '主持人', '参会人员', '记录人', '议题内容', '讨论要点'],
    isActive: true,
    createdAt: new Date('2024-01-06'),
    updatedAt: new Date('2024-01-06'),
  },
  {
    id: '6',
    name: '会议纪要',
    content: `你正在撰写一份《会议纪要》，用于记载、传达会议情况和议定事项。

## 会议纪要写作要点：

1. **开头部分**：
   简介会议概况，**强烈建议关键信息齐全**：
   - 会议届次（如"第X次办公会议"）
   - 会议目的、任务
   - 开会时间、地点
   - 会议主持人
   - 参加和列席人员
   - 会议主要成果

2. **主体部分**（根据会议类型选择）：
   
   **概括式**（党委专题学习会议）：
   - 高度概括会议内容
   - 提炼核心精神和要求
   
   **分项式**（日常办公会议）：
   - 按议题分项叙述
   - 每项包括：讨论情况 + 形成决定
   
   **发言记录式**（工程例会、座谈会）：
   - 记录重要发言
   - 归纳共同意见
   
   **条款式**（重要决策会议）：
   - 用条款形式列出决定事项
   - 每条一个具体决定

3. **结尾部分**：
   - 提出希望、号召
   - 要求贯彻执行会议精神
   - 也可不写

4. **写作规范**：
   - 标题："XX会议纪要" 或 "XX关于XX会议纪要"
   - 不用主送机关（如需发文可加"主送"）
   - 叙述用第三人称
   - 内容要准确，观点要明确
   - 必须经主持人审核

## 输入信息：
会议名称：{会议名称} 会议时间：{会议时间} 会议地点：{会议地点} 主持人：{主持人} 参会人员：{参会人员} 记录人：{记录人} 议题内容：{议题内容} 讨论要点：{讨论要点}

## 输出要求：
- 标题直接用"XX会议纪要"
- 可以不填"主送机关"（或填空数组）
- 正文按选定的内容风格组织：
  * 第一段：会议概况（时间地点人物事件）
  * 中间段：会议内容（按选定风格）
  * 最后段：会议要求（可选）`,
    category: 'meeting',
    description: '概括式|分项式|发言记录式|条款式',
    variables: ['会议名称', '会议时间', '会议地点', '主持人', '参会人员', '记录人', '议题内容', '讨论要点'],
    isActive: true,
    createdAt: new Date('2024-01-06'),
    updatedAt: new Date('2024-01-06'),
  },
];

// 获取所有 Prompt
function getPrompts(req: Request, res: Response) {
  const { name, category, isActive, current = 1, pageSize = 10 } = req.query;

  let filteredData = [...promptData];

  // 按名称搜索
  if (name) {
    filteredData = filteredData.filter((item) =>
      item.name.toLowerCase().includes((name as string).toLowerCase()),
    );
  }

  // 按分类筛选
  if (category) {
    filteredData = filteredData.filter((item) => item.category === category);
  }

  // 按启用状态筛选
  if (isActive !== undefined) {
    const activeStatus = isActive === 'true' || isActive === true;
    filteredData = filteredData.filter((item) => item.isActive === activeStatus);
  }

  // 分页
  const startIndex = (Number(current) - 1) * Number(pageSize);
  const endIndex = startIndex + Number(pageSize);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  return res.json({
    data: paginatedData,
    total: filteredData.length,
    success: true,
  });
}

// 获取单个 Prompt
function getPromptById(req: Request, res: Response) {
  const { id } = req.params;
  const prompt = promptData.find((item) => item.id === id);

  if (!prompt) {
    return res.status(404).json({
      success: false,
      errorMessage: 'Prompt not found',
    });
  }

  return res.json({
    data: prompt,
    success: true,
  });
}

// 创建 Prompt
function createPrompt(req: Request, res: Response) {
  const newPrompt: PromptTemplate = {
    ...req.body,
    id: Date.now().toString(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  promptData.unshift(newPrompt);

  return res.json({
    data: newPrompt,
    success: true,
  });
}

// 更新 Prompt
function updatePrompt(req: Request, res: Response) {
  const { id } = req.params;
  const index = promptData.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      errorMessage: 'Prompt not found',
    });
  }

  promptData[index] = {
    ...promptData[index],
    ...req.body,
    id,
    updatedAt: new Date(),
  };

  return res.json({
    data: promptData[index],
    success: true,
  });
}

// 删除 Prompt
function deletePrompt(req: Request, res: Response) {
  const { id } = req.params;
  const index = promptData.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      errorMessage: 'Prompt not found',
    });
  }

  promptData.splice(index, 1);

  return res.json({
    success: true,
  });
}

// 批量删除
function batchDeletePrompts(req: Request, res: Response) {
  const { ids } = req.body;

  if (!Array.isArray(ids)) {
    return res.status(400).json({
      success: false,
      errorMessage: 'Invalid ids parameter',
    });
  }

  promptData = promptData.filter((item) => !ids.includes(item.id));

  return res.json({
    success: true,
  });
}

// 按分类获取
function getPromptsByCategory(req: Request, res: Response) {
  const { category } = req.params;
  const filtered = promptData.filter((item) => item.category === category);

  return res.json({
    data: filtered,
    success: true,
  });
}

// 切换启用状态
function togglePromptActive(req: Request, res: Response) {
  const { id } = req.params;
  const { isActive } = req.body;
  const index = promptData.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({
      success: false,
      errorMessage: 'Prompt not found',
    });
  }

  promptData[index].isActive = isActive;
  promptData[index].updatedAt = new Date();

  return res.json({
    success: true,
  });
}

export default {
  'GET /api/prompts': getPrompts,
  'GET /api/prompts/:id': getPromptById,
  'POST /api/prompts': createPrompt,
  'PUT /api/prompts/:id': updatePrompt,
  'DELETE /api/prompts/:id': deletePrompt,
  'DELETE /api/prompts/batch': batchDeletePrompts,
  'GET /api/prompts/category/:category': getPromptsByCategory,
  'PATCH /api/prompts/:id/toggle': togglePromptActive,
};

