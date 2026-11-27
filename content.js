/* يقرأ محتوى الموقع من ملفات data/*.json (تُعدَّل من لوحة التحكم) */
(function () {
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") e.textContent = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  function img(src, alt, extra) {
    var a = { loading: "lazy", decoding: "async", src: src, alt: alt || "" };
    Object.keys(extra || {}).forEach(function (k) { a[k] = extra[k]; });
    return el("img", a);
  }
  function load(name) {
    return fetch("data/" + name + "?v=" + Date.now()).then(function (r) {
      if (!r.ok) throw new Error(name);
      return r.json();
    });
  }

  function renderServices(d) {
    var box = document.getElementById("servicesList");
    if (!box) return;
    (d.items || []).forEach(function (it) {
      var c = el("div", { "class": "service-box" });
      c.appendChild(img(it.image, it.title));
      c.appendChild(el("h3", { text: it.title || "" }));
      c.appendChild(el("p", { text: it.text || "" }));
      box.appendChild(c);
    });
  }

  function renderGallery(d) {
    var list = document.getElementById("galleryList");
    if (!list) return;
    (d.albums || []).forEach(function (al, i) {
      var imgs = al.images || [];
      if (!imgs.length) return;
      var id = "gallery" + (i + 1);
      var item = el("div", { "class": "project-item" });
      item.addEventListener("click", function () { openGallery(id); });
      item.appendChild(img(imgs[0], al.title || "", { "class": "cover" }));
      item.appendChild(el("div", { "class": "project-overlay", html: "لرؤية المزيد<br>اضغط هنا" }));
      var g = el("div", { id: id, "class": "gallery" });
      var close = el("span", { "class": "close", html: "&times;" });
      close.addEventListener("click", function () { closeGallery(id); });
      g.appendChild(close);
      var content = el("div", { "class": "content" });
      imgs.forEach(function (src) { content.appendChild(img(src, al.title || "")); });
      g.appendChild(content);
      list.appendChild(item);
      list.appendChild(g);
    });
  }

  function renderSliders(d) {
    var wrap = document.getElementById("sliderList");
    if (!wrap) return;
    (d.sliders || []).forEach(function (p) {
      if (!p.before || !p.after) return;
      var box = el("div", { "class": "ba" });
      box.appendChild(img(p.after, "بعد التنفيذ"));
      var before = img(p.before, "قبل التنفيذ", { "class": "ba-before" });
      box.appendChild(before);
      box.appendChild(el("span", { "class": "ba-tag b", text: "قبل" }));
      box.appendChild(el("span", { "class": "ba-tag a", text: "بعد" }));
      var line = el("div", { "class": "ba-line" });
      box.appendChild(line);
      var r = el("input", { type: "range", min: "0", max: "100", value: "50", "aria-label": "مقارنة قبل وبعد" });
      box.appendChild(r);
      function u() {
        before.style.clipPath = "inset(0 " + (100 - r.value) + "% 0 0)";
        line.style.left = r.value + "%";
      }
      r.addEventListener("input", u); u();
      wrap.appendChild(box);
    });
  }

  function pm(tag, video, image) {
    var box = el("div", { "class": "pm" });
    box.appendChild(el("span", { "class": "pm-tag", text: tag }));
    if (video) {
      var v = el("video", { "data-src": video, muted: "", playsinline: "", preload: "none" });
      v.muted = true;
      v.addEventListener("click", function () { baOpenVideo(video); });
      box.appendChild(v);
      box.appendChild(el("span", { "class": "pm-play", html: "&#9654;" }));
    } else if (image) {
      box.appendChild(img(image, tag + " التنفيذ", { onclick: "baOpenImg(this.src)" }));
    }
    return box;
  }

  function renderProjects(d) {
    var grid = document.getElementById("projGrid");
    if (!grid) return;
    (d.projects || []).forEach(function (p) {
      var card = el("div", { "class": "proj-card" });
      card.appendChild(pm("قبل", p.before_video, p.before_image));
      card.appendChild(pm("بعد", p.after_video, p.after_image));
      if (p.name || p.place) {
        var cap = el("div", { "class": "proj-cap" });
        if (p.name) cap.appendChild(el("strong", { text: p.name }));
        if (p.place) cap.appendChild(el("span", { text: p.place }));
        card.appendChild(cap);
      }
      grid.appendChild(card);
    });
    if (typeof projInit === "function") projInit();
  }

  function projFromRow(p) {
    return {
      before_video: p.before_type === "video" ? p.before_url : null,
      before_image: p.before_type === "image" ? p.before_url : null,
      after_video: p.after_type === "video" ? p.after_url : null,
      after_image: p.after_type === "image" ? p.after_url : null,
      name: p.name || "",
      place: p.place || ""
    };
  }

  window.kdLoadProjects = function () {
    var grid = document.getElementById("projGrid");
    if (grid) grid.innerHTML = "";
    fetch("https://ohkytoubtcqnqqxxsrgq.supabase.co/rest/v1/projects?select=*&order=sort", {
      headers: { apikey: "sb_publishable_GDJPyjmhjypYrvOzdrvjsw_5yHIsShe" }
    }).then(function (r) {
      if (!r.ok) throw new Error("sb");
      return r.json();
    }).then(function (rows) {
      renderProjects({ projects: rows.map(projFromRow) });
    }).catch(function () {
      load("before-after.json").then(renderProjects).catch(function () {});
    });
  };

  load("services.json").then(renderServices).catch(function () {});
  load("gallery.json").then(renderGallery).catch(function () {});
  load("before-after.json").then(renderSliders).catch(function () {});
  kdLoadProjects();
})();
