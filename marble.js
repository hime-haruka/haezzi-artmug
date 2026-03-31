const HEADER_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHczfdI7vi843IX-3bACE2MeWycFLo86RLb5dLAY7i0ADdlfGXsVnFqp1trjTX8-rCSGZG0FrinNpO/pub?gid=1732506224&single=true&output=csv";

const CONTENT_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHczfdI7vi843IX-3bACE2MeWycFLo86RLb5dLAY7i0ADdlfGXsVnFqp1trjTX8-rCSGZG0FrinNpO/pub?gid=219785009&single=true&output=csv";

const FIXED_FLOOR_IMAGE =
  "https://lh3.googleusercontent.com/d/1K-NxC9QOBE0ubbXQXRY-hQ8D5GPUiq90";

const portfolioContainer = document.getElementById("portfolioContainer");

function convertGoogleDriveUrl(url) {
  if (!url) return "";
  const trimmed = String(url).trim();
  if (!trimmed) return "";
  if (trimmed.includes("lh3.googleusercontent.com/d/")) return trimmed;
  const fileMatch = trimmed.match(/\/file\/d\/([^/]+)/);
  if (fileMatch && fileMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${fileMatch[1]}`;
  }
  return trimmed;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }
      row.push(cell);
      cell = "";
      if (row.some((v) => String(v).trim() !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((v) => String(v).trim() !== "")) {
      rows.push(row);
    }
  }

  if (!rows.length) return [];

  const headers = rows[0].map((h) => String(h).trim());

  return rows.slice(1).map((values) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = String(values[index] ?? "").trim();
    });
    return item;
  });
}

async function fetchCSV(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("CSV load error");
  const text = await res.text();
  return parseCSV(text);
}

function normalizeHeaders(rows) {
  return rows
    .map((r) => ({
      order: Number(r.order) || 9999,
      category: (r.category || "").trim(),
      headerImg: convertGoogleDriveUrl(r.header_img || "")
    }))
    .filter((i) => i.category && i.headerImg)
    .sort((a, b) => a.order - b.order);
}

function normalizeContents(rows) {
  return rows
    .map((r) => ({
      category: (r.category || "").trim(),
      order: Number(r.order) || 9999,
      imgUrl: convertGoogleDriveUrl(r.img_url || "")
    }))
    .filter((i) => i.category && i.imgUrl)
    .sort((a, b) => a.order - b.order);
}

function groupContentsByCategory(items) {
  const map = new Map();
  items.forEach((i) => {
    if (!map.has(i.category)) map.set(i.category, []);
    map.get(i.category).push(i);
  });
  return map;
}

function createElement(tag, cls) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  return el;
}

function createSlider(headerItem, slides) {
  const sliderShell = createElement("div", "slider-shell");

  const prevBtn = createElement("button", "slider-btn");
  prevBtn.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
    <path d="m3.86 8.753 5.482 4.796c.646.566 1.658.106 1.658-.753V3.204a1 1 0 0 0-1.659-.753l-5.48 4.796a1 1 0 0 0 0 1.506z"/>
  </svg>
  `;

  const nextBtn = createElement("button", "slider-btn");
  nextBtn.innerHTML = `
  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
    <path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/>
  </svg>
  `;

  const sliderFrame = createElement("div", "slider-frame");
  const sliderMeta = createElement("div", "slider-meta");

  if (!slides.length) {
    const empty = createElement("div", "empty-box");
    empty.textContent = "등록된 이미지가 없습니다.";
    sliderFrame.appendChild(sliderMeta);
    sliderFrame.appendChild(empty);
    sliderMeta.textContent = "0 / 0";
    prevBtn.disabled = true;
    nextBtn.disabled = true;
  } else {
    const viewport = createElement("div", "slider-viewport");
    const track = createElement("div", "slider-track");

    let index = 0;
    let lock = false;

    slides.forEach((s, i) => {
      const slide = createElement("div", "slider-slide");

      const link = document.createElement("a");
      link.className = "slider-slide-link";
      link.href = s.imgUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      const img = document.createElement("img");
      img.className = "slider-image";
      img.src = s.imgUrl;
      img.loading = i === 0 ? "eager" : "lazy";

      link.appendChild(img);
      slide.appendChild(link);
      track.appendChild(slide);
    });

    function update(anim = true) {
      track.style.transition = anim
        ? "transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)"
        : "none";
      track.style.transform = `translateX(-${index * 100}%)`;
      sliderMeta.textContent = `${index + 1} / ${slides.length}`;
      prevBtn.disabled = index === 0;
      nextBtn.disabled = index === slides.length - 1;

      if (!anim) {
        requestAnimationFrame(() => {
          track.style.transition =
            "transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)";
        });
      }
    }

    function move(i) {
      if (lock) return;
      if (i < 0 || i >= slides.length || i === index) return;
      lock = true;
      index = i;
      update(true);
      setTimeout(() => (lock = false), 560);
    }

    prevBtn.onclick = () => move(index - 1);
    nextBtn.onclick = () => move(index + 1);

    viewport.appendChild(track);
    sliderFrame.appendChild(sliderMeta);
    sliderFrame.appendChild(viewport);

    update(false);
  }

  sliderShell.appendChild(prevBtn);
  sliderShell.appendChild(sliderFrame);
  sliderShell.appendChild(nextBtn);

  return sliderShell;
}

function createSection(headerItem, grouped) {
  const section = createElement("section", "portfolio-section");

  const headerWrap = createElement("div", "section-header");
  const img = document.createElement("img");
  img.src = headerItem.headerImg;
  headerWrap.appendChild(img);

  const slides = grouped.get(headerItem.category) || [];
  const slider = createSlider(headerItem, slides);

  const floor = createElement("div", "section-floor");
  const floorImg = document.createElement("img");
  floorImg.src = FIXED_FLOOR_IMAGE;
  floor.appendChild(floorImg);

  section.appendChild(headerWrap);
  section.appendChild(slider);
  section.appendChild(floor);

  return section;
}

function render(headers, grouped) {
  portfolioContainer.innerHTML = "";
  headers.forEach((h) => {
    portfolioContainer.appendChild(createSection(h, grouped));
  });
}

async function init() {
  const [hRows, cRows] = await Promise.all([
    fetchCSV(HEADER_SHEET_CSV_URL),
    fetchCSV(CONTENT_SHEET_CSV_URL)
  ]);

  const headers = normalizeHeaders(hRows);
  const contents = normalizeContents(cRows);
  const grouped = groupContentsByCategory(contents);

  render(headers, grouped);
}

init();