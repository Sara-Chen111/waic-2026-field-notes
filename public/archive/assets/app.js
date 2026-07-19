(() => {
  "use strict";

  const els = {
    search: document.querySelector("#search-input"),
    hall: document.querySelector("#hall-filter"),
    industry: document.querySelector("#industry-filter"),
    subfield: document.querySelector("#subfield-filter"),
    clear: document.querySelector("#clear-filters"),
    emptyClear: document.querySelector("#empty-clear"),
    filterShell: document.querySelector(".filter-shell"),
    filterToggle: document.querySelector("#filter-toggle"),
    filterContent: document.querySelector("#filter-content"),
    grid: document.querySelector("#exhibitor-grid"),
    activeFilters: document.querySelector("#active-filters"),
    loading: document.querySelector("#loading-state"),
    empty: document.querySelector("#empty-state"),
    error: document.querySelector("#error-state"),
    errorMessage: document.querySelector("#error-message"),
    visibleCount: document.querySelector("#visible-count"),
    totalCount: document.querySelector("#total-count"),
    statExhibitors: document.querySelector("#stat-exhibitors"),
    statHalls: document.querySelector("#stat-halls"),
    statPhotos: document.querySelector("#stat-photos"),
    detailDialog: document.querySelector("#detail-dialog"),
    detailDialogTitle: document.querySelector("#detail-dialog-title"),
    detailDialogContent: document.querySelector("#detail-dialog-content"),
    detailDialogClose: document.querySelector("#detail-dialog-close"),
    lightbox: document.querySelector("#photo-lightbox"),
    lightboxImage: document.querySelector("#lightbox-image"),
    lightboxCaption: document.querySelector("#lightbox-caption"),
    lightboxCount: document.querySelector("#lightbox-count"),
    lightboxClose: document.querySelector(".lightbox__close"),
    lightboxPrev: document.querySelector(".lightbox__nav--prev"),
    lightboxNext: document.querySelector(".lightbox__nav--next")
  };

  const state = {
    exhibitors: [],
    filtered: [],
    photosByCompany: new Map(),
    detailId: null,
    filtersCollapsed: false,
    lightboxPhotos: [],
    lightboxCompany: "",
    lightboxIndex: 0
  };

  const first = (source, keys, fallback = "") => {
    for (const key of keys) {
      const value = source?.[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return fallback;
  };

  const list = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean).map(String);
    if (value === undefined || value === null || value === "") return [];
    return String(value)
      .split(/[、,，;；/|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const text = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean).join("、");
    if (value === undefined || value === null) return "";
    return String(value).trim();
  };

  const escapeHtml = (value) =>
    text(value).replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        })[char]
    );

  const normalizeKey = (value) =>
    text(value)
      .toLocaleLowerCase("zh-CN")
      .replace(/[\s·•\-—_（）()【】[\].,，。&]/g, "");

  const extractExhibitors = (payload) => {
    if (Array.isArray(payload)) return payload;
    return (
      payload?.exhibitors ||
      payload?.records ||
      payload?.data ||
      payload?.items ||
      []
    );
  };

  const normalizeExhibitor = (raw, index) => {
    const company = text(
      first(raw, [
        "company",
        "companyName",
        "company_name",
        "exhibitor",
        "exhibitorName",
        "name",
        "公司名称",
        "企业名称",
        "展商名称"
      ])
    );
    const companyEn = text(
      first(raw, [
        "companyEn",
        "company_en",
        "englishName",
        "english_name",
        "公司英文名",
        "英文名称"
      ])
    );
    const hall = text(
      first(raw, [
        "hall",
        "hallName",
        "hall_name",
        "venue",
        "pavilion",
        "展馆",
        "场馆"
      ])
    );
    const booth = text(
      first(raw, [
        "booth",
        "boothNo",
        "booth_no",
        "boothNumber",
        "展位",
        "展位号"
      ])
    );
    const industry = text(
      first(raw, [
        "industry",
        "industryCategory",
        "industry_category",
        "category",
        "行业分类",
        "行业"
      ])
    );
    const subfield = text(
      first(raw, [
        "subfield",
        "subField",
        "sub_field",
        "segment",
        "sector",
        "细分领域",
        "细分类别"
      ])
    );
    const description = text(
      first(raw, [
        "description",
        "introduction",
        "intro",
        "companyIntroduction",
        "company_introduction",
        "公司简介",
        "简介"
      ])
    );
    const product = text(
      first(raw, [
        "product",
        "products",
        "business",
        "businessDescription",
        "business_description",
        "productDescription",
        "product_description",
        "主营业务",
        "产品",
        "产品介绍",
        "业务介绍"
      ])
    );
    const address = text(first(raw, ["address", "location", "地址", "所在地"]));
    const investors = text(
      first(raw, [
        "investors",
        "shareholders",
        "investor",
        "投资方",
        "投资机构",
        "股东",
        "投资/股东"
      ])
    );
    const financing = text(
      first(raw, [
        "financing",
        "latestFinancing",
        "latest_financing",
        "融资情况",
        "最新融资"
      ])
    );
    const notes = text(first(raw, ["notes", "note", "remark", "remarks", "备注"]));
    const website = text(first(raw, ["website", "site", "url", "官网"]));
    const tags = list(first(raw, ["tags", "keywords", "标签", "关键词"], []));
    const sourceId = text(first(raw, ["id", "exhibitorId", "exhibitor_id"]));
    const sequence = text(first(raw, ["sequence", "序号"])) || String(index + 1);

    return {
      id: `exhibitor-${index + 1}`,
      sourceId,
      sequence,
      company: company || `未命名展商 ${index + 1}`,
      companyEn,
      hall,
      booth,
      industry,
      subfield,
      description,
      product,
      address,
      investors,
      financing,
      notes,
      website,
      tags,
      raw
    };
  };

  const normalizePhotoPayload = (payload) => {
    const matches = Array.isArray(payload)
      ? payload
      : payload?.matches || payload?.data || payload?.records || [];
    const map = new Map();

    matches.forEach((match) => {
      const company = text(first(match, ["company", "companyName", "company_name", "公司名称"]));
      if (!company) return;

      const photos = list(first(match, ["photos", "images", "photoPaths", "photo_paths"], []));
      const businessInfo = first(
        match,
        ["photoBusinessInfo", "photo_business_info", "businessInfo", "business_info"],
        []
      );
      const normalizedInfo = (Array.isArray(businessInfo) ? businessInfo : [])
        .map((item) => ({
          photo: text(first(item, ["photo", "image", "path"])),
          title: text(first(item, ["title", "product", "business", "产品名称", "业务名称"])),
          description: text(first(item, ["description", "intro", "text", "简介"])),
          evidence: text(first(item, ["evidence", "visibleText", "visible_text", "依据"]))
        }))
        .filter((item) => item.title || item.description || item.evidence);

      map.set(normalizeKey(company), {
        company,
        photos,
        businessInfo: normalizedInfo,
        confidence: text(first(match, ["confidence", "matchConfidence", "match_confidence"]))
      });
    });

    return map;
  };

  const fetchJson = async (path) => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`${path} 返回 ${response.status}`);
    return response.json();
  };

  const loadData = async () => {
    const fallback = window.WAIC_FALLBACK_DATA || {};
    const hasFallback = extractExhibitors(fallback.exhibitors).length > 0;

    if (location.protocol === "file:" && hasFallback) {
      return {
        exhibitors: fallback.exhibitors,
        photoMatches: fallback.photoMatches || { matches: [] }
      };
    }

    try {
      const [exhibitors, photoMatches] = await Promise.all([
        fetchJson("data/exhibitors.json"),
        fetchJson("data/photo_matches.json")
      ]);
      return { exhibitors, photoMatches };
    } catch (error) {
      if (hasFallback) {
        console.warn("JSON 数据读取失败，已切换至本地 JS 回退。", error);
        return {
          exhibitors: fallback.exhibitors,
          photoMatches: fallback.photoMatches || { matches: [] }
        };
      }
      throw error;
    }
  };

  const uniqueSorted = (values) =>
    [...new Set(values.map(text).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "zh-CN", { numeric: true })
    );

  const fillSelect = (select, values, defaultLabel) => {
    const current = select.value;
    select.replaceChildren(new Option(defaultLabel, ""));
    uniqueSorted(values).forEach((value) => select.add(new Option(value, value)));
    if ([...select.options].some((option) => option.value === current)) select.value = current;
  };

  const populateFilters = () => {
    fillSelect(els.hall, state.exhibitors.map((item) => item.hall), "全部展馆");
    fillSelect(els.industry, state.exhibitors.map((item) => item.industry), "全部行业");
    fillSelect(els.subfield, state.exhibitors.map((item) => item.subfield), "全部领域");
  };

  const applyFilters = () => {
    const keyword = normalizeKey(els.search.value);
    const hall = els.hall.value;
    const industry = els.industry.value;
    const subfield = els.subfield.value;

    state.filtered = state.exhibitors.filter((item) => {
      const photoMatch = state.photosByCompany.get(normalizeKey(item.company));
      const businessText = photoMatch?.businessInfo
        .map((info) => `${info.title} ${info.description} ${info.evidence}`)
        .join(" ");
      const haystack = normalizeKey(
        [
          item.company,
          item.companyEn,
          item.hall,
          item.booth,
          item.industry,
          item.subfield,
          item.description,
          item.product,
          item.address,
          item.investors,
          item.financing,
          item.notes,
          item.tags.join(" "),
          businessText
        ].join(" ")
      );

      return (
        (!keyword || haystack.includes(keyword)) &&
        (!hall || item.hall === hall) &&
        (!industry || item.industry === industry) &&
        (!subfield || item.subfield === subfield)
      );
    });

    if (state.detailId && !state.filtered.some((item) => item.id === state.detailId)) {
      closeDetails();
    }

    render();
  };

  const cardDetail = (item, photoMatch) => {
    const facts = [
      ["展馆", item.hall],
      ["展位", item.booth],
      ["行业", item.industry],
      ["细分", item.subfield],
      ["注册地点", item.address],
      ["投资 / 股东", item.investors],
      ["最新融资", item.financing],
      ["官网", item.website]
    ].filter(([, value]) => value);

    const photoHtml = photoMatch?.photos?.length
      ? `
        <section class="photo-section" aria-labelledby="photos-${escapeHtml(item.id)}">
          <p class="detail-label" id="photos-${escapeHtml(item.id)}">现场影像 · ${photoMatch.photos.length} 张</p>
          <div class="photo-grid">
            ${photoMatch.photos
              .map(
                (photo, index) => `
                  <button
                    class="photo-button"
                    type="button"
                    data-photo-company="${escapeHtml(item.company)}"
                    data-photo-index="${String(index + 1).padStart(2, "0")}"
                    data-photo-position="${index}"
                    aria-label="查看 ${escapeHtml(item.company)} 第 ${index + 1} 张现场照片"
                  >
                    <img
                      src="${escapeHtml(encodeURI(photo))}"
                      alt="${escapeHtml(item.company)} 现场照片 ${index + 1}"
                      loading="lazy"
                    >
                  </button>`
              )
              .join("")}
          </div>
        </section>`
      : "";

    const businessHtml = photoMatch?.businessInfo?.length
      ? `
        <section class="business-section" aria-labelledby="business-${escapeHtml(item.id)}">
          <p class="detail-label" id="business-${escapeHtml(item.id)}">照片中的业务 / 产品信息</p>
          <p class="business-note">以下内容来自现场照片中的可见文字，仅作为观展线索。</p>
          <div class="business-list">
            ${photoMatch.businessInfo
              .map(
                (info) => `
                  <article class="business-item">
                    ${info.title ? `<h4>${escapeHtml(info.title)}</h4>` : ""}
                    ${info.description ? `<p>${escapeHtml(info.description)}</p>` : ""}
                    ${info.evidence ? `<small>照片可见信息：${escapeHtml(info.evidence)}</small>` : ""}
                  </article>`
              )
              .join("")}
          </div>
        </section>`
      : "";

    return `
      <div class="detail-columns">
        <div>
          ${
            item.description
              ? `<div class="detail-block">
                  <p class="detail-label">企业简介</p>
                  <p class="detail-copy">${escapeHtml(item.description)}</p>
                </div>`
              : ""
          }
          ${
            item.product
              ? `<div class="detail-block">
                  <p class="detail-label">业务 / 产品</p>
                  <p class="detail-copy">${escapeHtml(item.product)}</p>
                </div>`
              : ""
          }
          ${
            item.notes
              ? `<div class="detail-block">
                  <p class="detail-label">备注</p>
                  <p class="detail-copy">${escapeHtml(item.notes)}</p>
                </div>`
              : ""
          }
          ${
            !item.description && !item.product && !item.notes
              ? `<div class="detail-block">
                  <p class="detail-label">档案备注</p>
                  <p class="detail-copy">当前表格未提供更详细的企业介绍，可通过展馆、展位与分类信息继续定位。</p>
                </div>`
              : ""
          }
        </div>
        ${
          facts.length
            ? `<dl class="fact-list">
                ${facts
                  .map(
                    ([label, value]) =>
                      `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
                  )
                  .join("")}
              </dl>`
            : ""
        }
      </div>
      ${photoHtml}
      ${businessHtml}`;
  };

  const cardHtml = (item, index) => {
    const photoMatch = state.photosByCompany.get(normalizeKey(item.company));
    const tags = uniqueSorted([item.industry, item.subfield, ...item.tags]).slice(0, 4);
    const displaySequence = /^\d+$/.test(item.sequence)
      ? item.sequence.padStart(3, "0")
      : item.sequence;
    const photoBadge = photoMatch?.photos?.length
      ? `<span class="photo-badge">现场图 ${photoMatch.photos.length}</span>`
      : "";

    return `
      <article class="exhibitor-card" data-exhibitor-id="${escapeHtml(item.id)}">
        <button
          class="card-toggle"
          type="button"
          aria-expanded="false"
          aria-haspopup="dialog"
        >
          <span class="card-index">${escapeHtml(displaySequence || index + 1)}</span>
          <span class="card-summary">
            <span class="card-kicker">
              ${item.hall ? `<span>${escapeHtml(item.hall)}</span>` : ""}
              ${item.booth ? `<span>${escapeHtml(item.booth)}</span>` : ""}
              ${!item.hall && !item.booth ? "<span>展商档案</span>" : ""}
            </span>
            <h3>${escapeHtml(item.company)}</h3>
            ${item.companyEn ? `<span class="company-en">${escapeHtml(item.companyEn)}</span>` : ""}
            <span class="card-tags">
              ${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
              ${photoBadge}
            </span>
          </span>
          <span class="card-action" aria-hidden="true">
            <small>查看档案</small>
            <span>＋</span>
          </span>
        </button>
      </article>`;
  };

  const renderChips = () => {
    const chips = [
      ["keyword", "关键词", els.search.value.trim()],
      ["hall", "展馆", els.hall.value],
      ["industry", "行业", els.industry.value],
      ["subfield", "细分", els.subfield.value]
    ].filter(([, , value]) => value);

    els.activeFilters.innerHTML = chips
      .map(
        ([type, label, value]) => `
          <span class="filter-chip">
            ${escapeHtml(label)}：${escapeHtml(value)}
            <button type="button" data-clear-filter="${type}" aria-label="移除${escapeHtml(label)}筛选">×</button>
          </span>`
      )
      .join("");
    els.clear.disabled = chips.length === 0;
  };

  const render = () => {
    els.grid.innerHTML = state.filtered.map(cardHtml).join("");
    els.visibleCount.textContent = state.filtered.length.toLocaleString("zh-CN");
    els.totalCount.textContent = state.exhibitors.length.toLocaleString("zh-CN");
    els.empty.hidden = state.filtered.length !== 0;
    els.grid.hidden = state.filtered.length === 0;
    renderChips();
  };

  const setFiltersCollapsed = (collapsed) => {
    state.filtersCollapsed = collapsed;
    els.filterShell.classList.toggle("is-collapsed", collapsed);
    els.filterContent.hidden = collapsed;
    els.filterToggle.setAttribute("aria-expanded", String(!collapsed));
    els.filterToggle.title = collapsed ? "展开筛选面板" : "收起筛选面板";
    els.filterToggle.querySelector(".sr-only").textContent = els.filterToggle.title;
  };

  const closeDetails = () => {
    state.detailId = null;
    if (els.detailDialog.open) els.detailDialog.close();
  };

  const showDetails = (id) => {
    const item = state.exhibitors.find((exhibitor) => exhibitor.id === id);
    if (!item) return;
    const photoMatch = state.photosByCompany.get(normalizeKey(item.company));
    const tags = uniqueSorted([item.industry, item.subfield, ...item.tags]).slice(0, 5);

    state.detailId = id;
    els.detailDialogTitle.textContent = item.company;
    els.detailDialogContent.innerHTML = `
      <div class="detail-dialog__identity">
        <div>
          ${
            item.companyEn
              ? `<p class="detail-dialog__english">${escapeHtml(item.companyEn)}</p>`
              : ""
          }
          <p class="detail-dialog__location">
            ${escapeHtml([item.hall, item.booth].filter(Boolean).join(" · ") || "WAIC 2026 参展商")}
          </p>
        </div>
        ${
          tags.length
            ? `<div class="card-tags detail-dialog__tags">${tags
                .map((tag) => `<span>${escapeHtml(tag)}</span>`)
                .join("")}</div>`
            : ""
        }
      </div>
      ${cardDetail(item, photoMatch)}
    `;

    els.detailDialogContent.querySelectorAll("img").forEach((image) => {
      image.addEventListener(
        "error",
        () => {
          image.closest(".photo-button")?.remove();
        },
        { once: true }
      );
    });
    els.detailDialog.showModal();
  };

  const clearFilters = () => {
    els.search.value = "";
    els.hall.value = "";
    els.industry.value = "";
    els.subfield.value = "";
    applyFilters();
  };

  const showLightbox = (company, index) => {
    const match = state.photosByCompany.get(normalizeKey(company));
    if (!match?.photos?.length) return;
    state.lightboxPhotos = match.photos;
    state.lightboxCompany = company;
    state.lightboxIndex = Number(index);
    updateLightbox();
    els.lightbox.showModal();
  };

  const updateLightbox = () => {
    const photo = state.lightboxPhotos[state.lightboxIndex];
    els.lightboxImage.src = encodeURI(photo);
    els.lightboxImage.alt = `${state.lightboxCompany} 现场照片 ${state.lightboxIndex + 1}`;
    els.lightboxCaption.textContent = `${state.lightboxCompany} · 世博展览馆现场记录`;
    els.lightboxCount.textContent = `${String(state.lightboxIndex + 1).padStart(2, "0")} / ${String(
      state.lightboxPhotos.length
    ).padStart(2, "0")}`;
    els.lightboxPrev.disabled = state.lightboxIndex === 0;
    els.lightboxNext.disabled = state.lightboxIndex === state.lightboxPhotos.length - 1;
  };

  const moveLightbox = (step) => {
    const next = state.lightboxIndex + step;
    if (next < 0 || next >= state.lightboxPhotos.length) return;
    state.lightboxIndex = next;
    updateLightbox();
  };

  const bindEvents = () => {
    let searchTimer;
    els.search.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(applyFilters, 120);
    });

    [els.hall, els.industry, els.subfield].forEach((select) =>
      select.addEventListener("change", applyFilters)
    );
    els.clear.addEventListener("click", clearFilters);
    els.emptyClear.addEventListener("click", clearFilters);
    els.filterToggle.addEventListener("click", () =>
      setFiltersCollapsed(!state.filtersCollapsed)
    );

    els.activeFilters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-clear-filter]");
      if (!button) return;
      const controls = {
        keyword: els.search,
        hall: els.hall,
        industry: els.industry,
        subfield: els.subfield
      };
      controls[button.dataset.clearFilter].value = "";
      applyFilters();
    });

    els.grid.addEventListener("click", (event) => {
      const toggle = event.target.closest(".card-toggle");
      if (!toggle) return;
      const card = toggle.closest(".exhibitor-card");
      const id = card.dataset.exhibitorId;
      showDetails(id);
    });

    els.detailDialogContent.addEventListener("click", (event) => {
      const photoButton = event.target.closest(".photo-button");
      if (!photoButton) return;
      showLightbox(photoButton.dataset.photoCompany, photoButton.dataset.photoPosition);
    });

    document.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        els.search.focus();
      }
      if (els.lightbox.open && event.key === "ArrowLeft") moveLightbox(-1);
      if (els.lightbox.open && event.key === "ArrowRight") moveLightbox(1);
    });

    els.detailDialogClose.addEventListener("click", closeDetails);
    els.detailDialog.addEventListener("close", () => {
      state.detailId = null;
    });
    els.detailDialog.addEventListener("click", (event) => {
      if (event.target === els.detailDialog) closeDetails();
    });
    els.lightboxClose.addEventListener("click", () => els.lightbox.close());
    els.lightboxPrev.addEventListener("click", () => moveLightbox(-1));
    els.lightboxNext.addEventListener("click", () => moveLightbox(1));
    els.lightbox.addEventListener("click", (event) => {
      if (event.target === els.lightbox) els.lightbox.close();
    });
  };

  const initialize = async () => {
    bindEvents();

    try {
      const payload = await loadData();
      state.exhibitors = extractExhibitors(payload.exhibitors).map(normalizeExhibitor);
      state.photosByCompany = normalizePhotoPayload(payload.photoMatches);

      if (!state.exhibitors.length) {
        throw new Error("data/exhibitors.json 中没有可显示的展商记录");
      }

      populateFilters();
      els.statExhibitors.textContent = state.exhibitors.length.toLocaleString("zh-CN");
      els.statHalls.textContent = uniqueSorted(state.exhibitors.map((item) => item.hall))
        .length.toLocaleString("zh-CN");
      els.statPhotos.textContent = [...state.photosByCompany.values()]
        .reduce((total, item) => total + item.photos.length, 0)
        .toLocaleString("zh-CN");
      els.loading.hidden = true;
      applyFilters();
    } catch (error) {
      console.error(error);
      els.loading.hidden = true;
      els.error.hidden = false;
      els.errorMessage.textContent =
        location.protocol === "file:"
          ? "本地数据回退尚未生成。请补齐 assets/data-fallback.js，或通过本地静态服务器打开本页面。"
          : `请确认 data/exhibitors.json 与 data/photo_matches.json 可访问。${error.message || ""}`;
    }
  };

  initialize();
})();
