// Runs only in the synthetic Safari preview. Prepares the real Finder controls
// and reports their state. Opening the picker and choosing rows use OS input.
const theme = new URLSearchParams(location.search).get("finder-qa");
const width = () => document.querySelector(".ear-adjustment select");
const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function prepare() {
  document.documentElement.dataset.siteTheme = theme;
  for (let attempt = 0; !width() && attempt < 45; attempt++) {
    const mark = [...document.querySelectorAll(".ear-tool button")].find(button => button.textContent.includes("Mark peak at"));
    mark?.click();
    await pause(250);
  }
  const select = width();
  if (!select) throw new Error("The Finder did not mark a peak");
  const details = document.querySelector(".ear-adjustment-width");
  details.open = true;
  const q = details.querySelector("input");
  q.focus();
  q.value = "5.25";
  q.blur();
  await pause(250);
  select.scrollIntoView({block: "center"});

  const box = element => {
    const r = element.getBoundingClientRect();
    return [r.left, r.top, r.width, r.height];
  };
  const input = document.querySelector(".ear-adjustment input[type=number]");
  const keys = [];
  document.addEventListener("keydown", event => {
    if (!event.isTrusted) return;
    keys.push(event.key);
    if (keys.length > 20) keys.shift();
  }, true);
  for (let attempt = 0; attempt < 600; attempt++) {
    const s = width();
    const params = new URLSearchParams({state: JSON.stringify({
      theme, ua: navigator.userAgent, open: s.matches(":open"), value: s.value,
      appearance: getComputedStyle(s).appearance,
      focused: document.activeElement === s, keys,
      width: box(s), frequency: box(input), viewport: [innerWidth, innerHeight],
      visualViewport: [visualViewport.width, visualViewport.height, visualViewport.scale],
      window: [screenX, screenY, outerWidth, outerHeight],
      options: [...s.options].map(o => ({text: o.label, value: o.value, disabled: o.disabled, selected: o.selected, focused: o === document.activeElement, box: box(o)})),
    })});
    const response = await fetch("/__finder_qa_state?" + params, {cache: "no-store"});
    if (response.headers.get("X-Finder-QA-Center")) {
      s.scrollIntoView({block: "center", inline: "nearest"});
    }
    await pause(450);
  }
}
void prepare();
