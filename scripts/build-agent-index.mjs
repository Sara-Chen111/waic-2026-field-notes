import { readFile, writeFile } from "node:fs/promises";

const source = new URL("../../data/exhibitors.json", import.meta.url);
const output = new URL("../public/data/agent-index.json", import.meta.url);
const exhibitors = JSON.parse(await readFile(source, "utf8"));

const rules = [
  ["整机方案", /整机|一体机|终端|工作站|服务器|机器人本体|硬件平台/i],
  ["大模型", /大模型|基础模型|语言模型|LLM|多模态|生成式AI/i],
  ["智能体", /Agent|智能体|智能助手|自动化/i],
  ["具身智能", /具身|机器人|灵巧手|人形|四足/i],
  ["AI芯片", /芯片|GPU|NPU|算力|半导体|处理器/i],
  ["行业方案", /解决方案|行业应用|企业服务|平台/i],
  ["智能终端", /眼镜|耳机|穿戴|终端|手机|PC|相机/i],
  ["医疗健康", /医疗|健康|康复|脑机|睡眠/i],
  ["教育", /教育|学习|儿童|课堂/i],
];

const index = exhibitors.map((item) => {
  const text = [item.industry, item.subfield, item.business, item.notes].join(" ");
  const tags = [item.industry, item.subfield, ...rules.filter(([, re]) => re.test(text)).map(([tag]) => tag)]
    .filter(Boolean)
    .filter((tag, position, values) => values.indexOf(tag) === position);
  return {
    id: item.id,
    company: item.company,
    shortName: item.shortName || "",
    venue: item.venue,
    booth: item.booth,
    industry: item.industry,
    subfield: item.subfield,
    business: item.business,
    tags,
  };
});

await writeFile(output, `${JSON.stringify(index)}\n`);
console.log(`Generated ${index.length} tagged exhibitors.`);
