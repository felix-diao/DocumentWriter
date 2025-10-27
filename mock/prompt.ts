import type { Request, Response } from 'express';
import type { PromptTemplate } from '@/services/prompt';

// 模拟数据
let promptData: PromptTemplate[] = [
  {
    id: '1',
    name: '正式演讲开场白',
    content: `尊敬的各位领导、各位来宾：
大家好！
今天，我非常荣幸能够站在这里，就{主题}向大家做汇报。{背景介绍}。接下来，我将从以下几个方面进行阐述：`,
    category: 'speech',
    description: '适用于正式场合的演讲开场白，语气庄重',
    variables: ['主题', '背景介绍'],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: '工作报告框架',
    content: `关于{报告主题}的工作报告

一、工作概况
{工作概况内容}

二、主要成绩
1. {成绩1}
2. {成绩2}
3. {成绩3}

三、存在问题
{问题分析}

四、下一步工作计划
{工作计划}`,
    category: 'report',
    description: '标准工作报告模板，包含完整框架',
    variables: ['报告主题', '工作概况内容', '成绩1', '成绩2', '成绩3', '问题分析', '工作计划'],
    isActive: true,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
  {
    id: '3',
    name: '通知标准格式',
    content: `关于{通知事项}的通知

各相关单位：
根据{依据或背景}，现就{具体事项}通知如下：

一、{要点1}
二、{要点2}
三、{要点3}

请各单位高度重视，认真落实。

特此通知。

{发文单位}
{发文日期}`,
    category: 'notice',
    description: '正式通知文件标准格式',
    variables: ['通知事项', '依据或背景', '具体事项', '要点1', '要点2', '要点3', '发文单位', '发文日期'],
    isActive: true,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'),
  },
  {
    id: '4',
    name: '调研报告结构',
    content: `{调研主题}调研报告

一、调研背景与目的
{背景描述}

二、调研方法
本次调研采用{调研方法}，共调研{调研对象}。

三、调研发现
（一）基本情况
{基本情况}

（二）主要特点
1. {特点1}
2. {特点2}
3. {特点3}

四、问题分析
{问题分析内容}

五、对策建议
1. {建议1}
2. {建议2}
3. {建议3}`,
    category: 'research',
    description: '标准调研报告结构模板',
    variables: ['调研主题', '背景描述', '调研方法', '调研对象', '基本情况', '特点1', '特点2', '特点3', '问题分析内容', '建议1', '建议2', '建议3'],
    isActive: true,
    createdAt: new Date('2024-01-04'),
    updatedAt: new Date('2024-01-04'),
  },
  {
    id: '5',
    name: '政策建议格式',
    content: `关于{建议主题}的建议

一、问题提出
{问题背景和现状}

二、问题分析
（一）{问题维度1}
（二）{问题维度2}

三、具体建议
1. {建议措施1}
   具体做法：{具体做法1}

2. {建议措施2}
   具体做法：{具体做法2}

3. {建议措施3}
   具体做法：{具体做法3}

四、预期效果
{预期效果描述}`,
    category: 'suggestion',
    description: '政策建议标准格式',
    variables: ['建议主题', '问题背景和现状', '问题维度1', '问题维度2', '建议措施1', '具体做法1', '建议措施2', '具体做法2', '建议措施3', '具体做法3', '预期效果描述'],
    isActive: true,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
  },
  {
    id: '6',
    name: '会议纪要模板',
    content: `{会议名称}会议纪要

时间：{会议时间}
地点：{会议地点}
主持：{主持人}
参会人员：{参会人员}
记录：{记录人}

一、会议议题
{议题内容}

二、讨论内容
{讨论要点}

三、会议决议
1. {决议1}
2. {决议2}
3. {决议3}

四、任务分工
{任务分工明细}`,
    category: 'meeting',
    description: '会议纪要标准模板',
    variables: ['会议名称', '会议时间', '会议地点', '主持人', '参会人员', '记录人', '议题内容', '讨论要点', '决议1', '决议2', '决议3', '任务分工明细'],
    isActive: false,
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

