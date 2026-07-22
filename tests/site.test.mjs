import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import {
  consolidateExhibitors,
  exhibitorMatchesIndexedTag,
  normalizeKey,
  photosForVenue,
  prioritizeExhibitorsWithPhotos,
} from "../lib/waic.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("ships the requested navigation and four application surfaces", async () => {
  const [header, overview, insights, agent, admin] = await Promise.all([
    read("components/site-header.tsx"),
    read("app/overview/page.tsx"),
    read("app/insights/page.tsx"),
    read("app/agent/page.tsx"),
    read("app/admin/page.tsx"),
  ]);

  assert.match(header, /2026 WAIC 展会总览/);
  assert.match(header, /Sara 参展心得分享/);
  assert.match(header, /展商速查/);
  assert.doesNotMatch(header, /Agent/);
  assert.match(overview, /OverviewPage/);
  assert.match(insights, /InsightsPage/);
  assert.match(agent, /ExhibitorFinderPage/);
  assert.match(admin, /AdminPage/);
});

test("keeps the data index complete and links insight cards to published exhibitors", async () => {
  const [exhibitors, photos, index, insights] = await Promise.all([
    read("public/data/exhibitors.json").then(JSON.parse),
    read("public/data/photo_matches.json").then(JSON.parse),
    read("public/data/agent-index.json").then(JSON.parse),
    read("public/data/insights.json").then(JSON.parse),
  ]);

  assert.equal(exhibitors.length, 980);
  assert.equal(index.length, exhibitors.length);
  assert.equal(photos.matches.length, 185);
  for (const tag of ["整机方案", "大模型", "具身智能", "医疗健康", "智能体", "AI芯片", "教育", "智能终端"]) {
    assert.ok(index.some((item) => item.tags.includes(tag)), `${tag} should match at least one exhibitor`);
  }

  const ids = new Set(consolidateExhibitors(exhibitors).map((item) => item.id));
  const sections = insights.chapters.flatMap((chapter) => chapter.sections);
  assert.equal(insights.chapters.length, 3);
  for (const section of sections) {
    for (const id of section.featuredExhibitorIds ?? []) {
      assert.ok(ids.has(id), `${id} should resolve to a published exhibitor card`);
    }
  }
  const agentTools = sections.find((section) => section.kicker === "Agent 工具");
  assert.equal(agentTools?.featuredPhotoIndexes?.["exhibitor-0645"], 1);
});

test("publishes every field-note image and browser-compatible video", async () => {
  const [insights, component, exhibitors, researchPayload] = await Promise.all([
    read("public/data/insights.json").then(JSON.parse),
    read("components/insights-page.tsx"),
    read("public/data/exhibitors.json").then(JSON.parse),
    read("public/data/exhibitor_research.json").then(JSON.parse),
  ]);
  const sections = insights.chapters.flatMap((chapter) => chapter.sections);
  const media = sections.flatMap((section) => section.media ?? []);
  const images = media.filter((item) => item.type === "image");
  const videos = media.filter((item) => item.type === "video");

  assert.equal(images.length, 33);
  assert.equal(videos.length, 2);
  assert.ok(media.every((item) => item.alt && item.caption));
  await Promise.all(media.map((item) => access(new URL(`public${item.src}`, root))));
  await Promise.all(videos.map((item) => access(new URL(`public${item.poster}`, root))));
  assert.ok(videos.every((item) => item.src.endsWith(".mp4")));
  assert.match(component, /<video[\s\S]*controls[\s\S]*playsInline[\s\S]*preload="metadata"/);

  const serialized = JSON.stringify(insights);
  assert.match(serialized, /Starfy 星仔/);
  assert.match(serialized, /Disbrief/);
  assert.match(serialized, /ReCOgnAIze/);
  assert.doesNotMatch(serialized, /strafy|Disvrief|ReCOGnALze/);

  const byId = new Map(exhibitors.map((item) => [item.id, item]));
  assert.equal(byId.get("exhibitor-0456")?.shortName, "智元机器人 / AGIBOT");
  assert.equal(byId.get("exhibitor-0136")?.shortName, "Starfy 星仔 / BEINGBEING");
  assert.equal(byId.get("exhibitor-0222")?.company, "北京新栈创新科技有限公司 / VibeKeys");
  assert.equal(byId.get("exhibitor-0854")?.shortName, "Disbrief / Software Object");

  const researchById = new Map(
    researchPayload.records.flatMap((record) =>
      record.sourceRecordIds.map((id) => [id, record]),
    ),
  );
  assert.match(researchById.get("exhibitor-0136")?.productSummary ?? "", /Starfy 星仔/);
  assert.match(researchById.get("exhibitor-0222")?.productSummary ?? "", /VibeKeys/);
  assert.match(researchById.get("exhibitor-0854")?.productSummary ?? "", /Agent 团队/);

  const mediaBySrc = new Map(media.map((item) => [item.src, item]));
  assert.match(mediaBySrc.get("/media/insights/images/17-starfy-product.webp")?.caption ?? "", /家庭记忆/);
  assert.match(mediaBySrc.get("/media/insights/images/18-starfy-launch.webp")?.caption ?? "", /孩子端/);
  assert.match(mediaBySrc.get("/media/insights/images/19-starfy-sales.webp")?.caption ?? "", /家长端/);
  assert.match(mediaBySrc.get("/media/insights/images/22-knonii-demo.webp")?.caption ?? "", /世界昆虫展/);
});

test("keeps every matched photo available in the published archive", async () => {
  const photoMatches = await read("public/data/photo_matches.json").then(JSON.parse);
  const photoPaths = photoMatches.matches.flatMap((match) => match.photos);

  assert.equal(photoPaths.length, 322);
  const photosByCompany = new Map(photoMatches.matches.map((match) => [match.company, match.photos]));
  assert.deepEqual(
    photosByCompany.get("北京新栈创新科技有限公司 / VibeKeys"),
    ["assets/photos/ec762b17ec5d18.jpg"],
  );
  assert.ok(
    photosByCompany
      .get("自然映射（深圳）科技有限公司 / Natural Mapping (Shenzhen) Technology Co., Ltd.")
      ?.includes("assets/photos/cc2b8fd067ea74.jpg"),
  );
  await Promise.all(
    photoPaths.map((path) => access(new URL(`public/archive/${path}`, root))),
  );

  const publishedMatches = photoMatches.matches.filter((match) => match.photoSources?.length);
  assert.equal(publishedMatches.length, 3);
  assert.ok(publishedMatches.every((match) => match.confidence === "high"));
  assert.ok(publishedMatches.every((match) => match.photoSources.every((source) => source.url)));
});

test("publishes reviewed unmatched photos as Expo cards without invented booths", async () => {
  const [exhibitors, photoPayload] = await Promise.all([
    read("public/data/exhibitors.json").then(JSON.parse),
    read("public/data/photo_matches.json").then(JSON.parse),
  ]);
  const addedIds = Array.from({ length: 17 }, (_, index) =>
    `exhibitor-${String(964 + index).padStart(4, "0")}`,
  );
  const added = exhibitors.filter((item) => addedIds.includes(item.id));

  assert.equal(added.length, 17);
  assert.ok(added.every((item) => item.venue === "世博展览馆"));
  assert.ok(added.every((item) => item.booth === ""));
  assert.ok(added.every((item) => item.shortName && item.business));

  const originals = new Set(
    photoPayload.matches.flatMap((item) => item.originalPhotos ?? []),
  );
  for (const filename of [
    "AI devices.JPG",
    "EFORT.JPG",
    "hongkong tech.JPG",
    "ropet｜肉派派-1.JPG",
    "ropet｜肉派派-2.JPG",
    "二一三科技.JPG",
    "云生集团.JPG",
    "优必选-1.JPG",
    "优必选-2.JPG",
    "华光宏-总.JPG",
    "卓誉科技.JPG",
    "智师益友-1.JPG",
    "智师益友-总.JPG",
    "枭兔科技.JPG",
    "深圳福田-1.JPG",
    "深圳福田-总.JPG",
    "潜脑科技-1.JPG",
    "潜脑科技-2.JPG",
    "相加智能.JPG",
    "科搭codar.JPG",
    "自然映射-2.JPG",
    "自然映射.JPG",
    "蔚瀚.JPG",
    "西岑科创小镇-总.JPG",
    "金蝶-总.JPG",
    "首形.JPG",
  ]) {
    assert.ok(
      [...originals].some((path) => path.endsWith(`/${filename}`)),
      `${filename} should be assigned to a card`,
    );
  }

  assert.deepEqual(photoPayload.unmatched.map((item) => item.group), ["展会-总"]);
  assert.ok(![...originals].some((path) => path.includes("/展会-总/")));

  const zhishi = exhibitors.find((item) => item.id === "exhibitor-0828");
  const jingan = exhibitors.find((item) => item.id === "exhibitor-0980");
  assert.equal(zhishi?.shortName, "智师益友");
  assert.equal(jingan?.shortName, "静安AI应用示范区");
  assert.ok(!exhibitors.some((item) => item.company.includes("上海库帕斯科技")));
  assert.ok(!exhibitors.some((item) => item.company.includes("上海恩捷科技")));
  assert.ok(!exhibitors.some((item) => item.company.includes("国海证券股份")));
});

test("consolidates cross-venue duplicates into the Expo record with every booth", async () => {
  const exhibitors = await read("public/data/exhibitors.json").then(JSON.parse);
  const consolidated = consolidateExhibitors(exhibitors);
  const miniMax = consolidated.find((item) => item.id === "exhibitor-0001");
  const enflame = consolidated.find((item) => item.id === "exhibitor-0235");
  const tengyun = consolidated.find((item) => item.id === "exhibitor-0366");
  const kingsoft = consolidated.find((item) => item.id === "exhibitor-0822");

  assert.equal(consolidated.length, 953);
  assert.equal(miniMax?.venue, "世博展览馆");
  assert.equal(miniMax?.booth, "H1-A801 / X1A-501-07");
  assert.deepEqual(miniMax?.mergedExhibitorIds, ["exhibitor-0001", "exhibitor-0018"]);
  assert.equal(enflame?.booth, "H2-C117 / Z1A-601");
  assert.equal(tengyun?.booth, "H4-111 / Z2B-303");
  assert.equal(kingsoft?.booth, "H1-C811 / X1A-501-01");
  assert.ok(!consolidated.some((item) => item.id === "exhibitor-0018"));
  assert.ok(!consolidated.some((item) => ["exhibitor-0248", "exhibitor-0405", "exhibitor-0862"].includes(item.id)));
});

test("prioritizes photo cards without disturbing order inside each group", () => {
  const exhibitors = [
    { id: "without-1" },
    { id: "with-1" },
    { id: "without-2" },
    { id: "with-2" },
  ];
  const ordered = prioritizeExhibitorsWithPhotos(
    exhibitors,
    (item) => item.id.startsWith("with-"),
  );

  assert.deepEqual(ordered.map((item) => item.id), ["with-1", "with-2", "without-1", "without-2"]);
});

test("uses each photo match venue instead of restricting photos to the Expo", () => {
  const match = { company: "示例公司", photos: ["example.jpg"], venues: ["西岸会场"] };

  assert.deepEqual(photosForVenue(match, "西岸会场"), ["example.jpg"]);
  assert.deepEqual(photosForVenue(match, "世博展览馆"), []);
});

test("matches finder tags across every id merged into a card", () => {
  const tagsByExhibitorId = new Map([
    ["expo", ["大模型"]],
    ["other-venue", ["整机方案"]],
  ]);
  const exhibitor = { id: "expo", mergedExhibitorIds: ["expo", "other-venue"] };

  assert.equal(exhibitorMatchesIndexedTag(exhibitor, "整机方案", tagsByExhibitorId), true);
  assert.equal(exhibitorMatchesIndexedTag(exhibitor, "医疗健康", tagsByExhibitorId), false);
});

test("uses short names consistently and preserves corrected exhibitor details", async () => {
  const [card, dialog, overview, exhibitors, photoPayload, researchPayload] = await Promise.all([
    read("components/exhibitor-card.tsx"),
    read("components/exhibitor-dialog.tsx"),
    read("components/overview-page.tsx"),
    read("public/data/exhibitors.json").then(JSON.parse),
    read("public/data/photo_matches.json").then(JSON.parse),
    read("public/data/exhibitor_research.json").then(JSON.parse),
  ]);

  assert.match(card, /const displayName = exhibitor\.shortName \|\| company\.name/);
  assert.match(dialog, /const displayName = exhibitor\.shortName \|\| company\.name/);
  assert.match(dialog, /<h2 id="exhibitor-title">\{displayName\}<\/h2>/);
  assert.match(overview, /item\.company, item\.shortName, item\.venue/);
  assert.match(
    card,
    /exhibitor-card__placeholder[\s\S]*\{exhibitor\.venue\}[\s\S]*\{exhibitor\.booth\}[\s\S]*\{displayName\}[\s\S]*\{exhibitor\.business\}/,
  );

  const shortNames = exhibitors.map((item) => item.shortName).filter(Boolean);
  assert.equal(shortNames.length, 467);
  assert.ok(shortNames.every((name) => name !== "PDF未标注"));

  const photoMap = new Map(
    photoPayload.matches.map((item) => [normalizeKey(item.company), item]),
  );
  const withoutPhotos = exhibitors.filter((item) => {
    if (item.venue !== "世博展览馆") return true;
    const match = photoMap.get(normalizeKey(item.company));
    if (match?.venues?.length && !match.venues.includes(item.venue)) return true;
    return !match?.photos?.length;
  });
  assert.ok(withoutPhotos.length > 0);
  assert.ok(withoutPhotos.every((item) => item.business.trim()));

  const rongyin = exhibitors.find((item) => item.booth === "H4-FT B010");
  const rongyinPhotos = photoMap.get(normalizeKey(rongyin.company));
  const rongyinResearch = researchPayload.records.find(
    (item) => normalizeKey(item.company) === normalizeKey(rongyin.company),
  );
  assert.equal(rongyin.shortName, "绒音科技");
  assert.match(rongyin.business, /^儿童AI探索硬件/);
  assert.equal(rongyinPhotos.photos.length, 3);
  assert.match(rongyinResearch.productSummary, /^儿童AI探索硬件。/);
});

test("ships an automatic tag finder without chat or an orphaned model endpoint", async () => {
  const [finder, metadata, exampleEnv, worker] = await Promise.all([
    read("components/agent-page.tsx"),
    read("app/agent/page.tsx"),
    read(".env.example"),
    read("worker/index.ts"),
  ]);

  assert.match(finder, /aria-pressed=\{selectedTag === tag\}/);
  assert.match(finder, /exhibitorMatchesIndexedTag/);
  assert.match(finder, /prioritizeExhibitorsWithPhotos/);
  assert.match(finder, /filtered\.length === 0/);
  assert.match(finder, /ExhibitorDialog/);
  assert.doesNotMatch(finder, /<textarea|\/api\/agent|Agent 回答|本地检索/);
  assert.doesNotMatch(metadata, /Agent/);
  assert.doesNotMatch(exampleEnv, /DEEPSEEK/);
  assert.doesNotMatch(worker, /DEEPSEEK/);
  await assert.rejects(access(new URL("app/api/agent/route.ts", root)), { code: "ENOENT" });
});
