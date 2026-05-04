// @ts-nocheck
(function () {
  if (window.__chatgptExporterFormulaCopyLoaded) {
    return;
  }

  window.__chatgptExporterFormulaCopyLoaded = true;

  const FORMULA_COPY_TOAST_ID = "cge-formula-copy-toast";
  const FORMULA_COPY_ATTR = "data-cge-formula-copy";

  let formulaCopyScanTimer = 0;
  let formulaCopyToastTimer = 0;
  let formulaCopyOptions = null;

  function resolveOptions(options) {
    return options || formulaCopyOptions || {};
  }

  function enhanceFormulaCopyTargets(root = document.body, options) {
    const resolvedOptions = resolveOptions(options);
    const getTopLevelMathNodes = resolvedOptions.getTopLevelMathNodes;
    const extractMathSource = resolvedOptions.extractMathSource;

    if (!(root instanceof Element) || typeof getTopLevelMathNodes !== "function" || typeof extractMathSource !== "function") {
      return;
    }

    getTopLevelMathNodes(root).forEach((node) => {
      if (!(node instanceof HTMLElement)) {
        return;
      }

      const latex = extractMathSource(node);
      if (!latex) {
        return;
      }

      node.setAttribute(FORMULA_COPY_ATTR, "true");
      node.dataset.cgeFormulaLatex = latex;
      node.classList.add("cge-formula-copy-target");
      node.title = "点击复制公式 LaTeX";
    });
  }

  function scheduleFormulaCopyEnhancement(options) {
    if (options) {
      formulaCopyOptions = options;
    }

    if (formulaCopyScanTimer) {
      window.clearTimeout(formulaCopyScanTimer);
    }

    formulaCopyScanTimer = window.setTimeout(() => {
      formulaCopyScanTimer = 0;
      enhanceFormulaCopyTargets(document.body, formulaCopyOptions);
    }, 180);
  }

  async function copyTextToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function showFormulaCopyToast(anchor, message, tone = "success") {
    let toast = document.getElementById(FORMULA_COPY_TOAST_ID);
    if (!(toast instanceof HTMLElement)) {
      toast = document.createElement("div");
      toast.id = FORMULA_COPY_TOAST_ID;
      toast.className = "cge-formula-copy-toast";
      document.documentElement.append(toast);
    }

    const rect = anchor instanceof Element ? anchor.getBoundingClientRect() : null;
    toast.textContent = message;
    toast.dataset.tone = tone;
    toast.style.left = rect ? `${Math.min(window.innerWidth - 16, Math.max(16, rect.left + rect.width / 2))}px` : "50%";
    toast.style.top = rect ? `${Math.max(16, rect.top - 10)}px` : "24px";
    toast.classList.add("is-visible");

    if (formulaCopyToastTimer) {
      window.clearTimeout(formulaCopyToastTimer);
    }

    formulaCopyToastTimer = window.setTimeout(() => {
      formulaCopyToastTimer = 0;
      toast.classList.remove("is-visible");
    }, 1200);
  }

  function findFormulaCopyTarget(target) {
    if (!(target instanceof Element)) {
      return null;
    }

    const formula = target.closest(`[${FORMULA_COPY_ATTR}="true"]`);
    return formula instanceof HTMLElement ? formula : null;
  }

  function installFormulaCopyHandler(options) {
    formulaCopyOptions = options || formulaCopyOptions || {};

    document.addEventListener(
      "click",
      async (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }

        const formula = findFormulaCopyTarget(event.target);
        if (!formula) {
          return;
        }

        const extractMathSource = formulaCopyOptions && formulaCopyOptions.extractMathSource;
        const latex = formula.dataset.cgeFormulaLatex || (typeof extractMathSource === "function" ? extractMathSource(formula) : "");
        if (!latex) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        try {
          await copyTextToClipboard(latex);
          showFormulaCopyToast(formula, "公式已复制");
        } catch (error) {
          void error;
          showFormulaCopyToast(formula, "复制失败", "error");
        }
      },
      true,
    );
  }

  window.ChatGPTExporterFormulaCopy = {
    install: installFormulaCopyHandler,
    scheduleEnhancement: scheduleFormulaCopyEnhancement,
    enhance: enhanceFormulaCopyTargets,
  };
})();
