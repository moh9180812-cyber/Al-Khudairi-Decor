/* لوحة تحكم الأدمن: تسجيل دخول + إضافة/حذف مشاريع (Supabase) */
(function () {
  var SUPABASE_URL = "https://ohkytoubtcqnqqxxsrgq.supabase.co";
  var SUPABASE_KEY = "sb_publishable_GDJPyjmhjypYrvOzdrvjsw_5yHIsShe";
  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window.KD_SB = sb;

  function $(id) { return document.getElementById(id); }
  function esc(s) { var d = document.createElement("div"); d.textContent = s || ""; return d.innerHTML; }

  var admProjects = [];
  var admEditId = null;

  function openLogin() { $("admLogin").style.display = "flex"; }
  function closeLogin() { $("admLogin").style.display = "none"; $("admErr").textContent = ""; }
  function openPanel() { $("admPanel").style.display = "flex"; loadList(); }
  function closePanel() { $("admPanel").style.display = "none"; }

  window.admOpen = function () {
    sb.auth.getSession().then(function (r) {
      if (r.data.session) openPanel(); else openLogin();
    });
  };
  window.admCloseLogin = closeLogin;
  window.admClosePanel = closePanel;

  window.admLogin = function () {
    var email = $("admEmail").value.trim();
    var pass = $("admPass").value;
    $("admErr").textContent = "";
    $("admLoginBtn").disabled = true;
    sb.auth.signInWithPassword({ email: email, password: pass }).then(function (r) {
      $("admLoginBtn").disabled = false;
      if (r.error) { $("admErr").textContent = "بيانات الدخول غير صحيحة"; return; }
      closeLogin(); openPanel();
    });
  };

  window.admLogout = function () {
    sb.auth.signOut().then(function () { closePanel(); location.reload(); });
  };

  function thumb(p) {
    var src = p.before_type === "video" ? p.after_url : p.before_url;
    if (p.before_type === "video" && p.after_type === "video") {
      return '<video src="' + esc(p.before_url) + '" muted preload="metadata"></video>';
    }
    return '<img src="' + esc(src) + '" alt="">';
  }

  function loadList() {
    sb.from("projects").select("*").order("sort").then(function (r) {
      var box = $("admList");
      if (r.error) { box.innerHTML = "<p>تعذر تحميل المشاريع</p>"; return; }
      admProjects = r.data;
      if (!r.data.length) { box.innerHTML = "<p>لا توجد مشاريع بعد</p>"; return; }
      box.innerHTML = r.data.map(function (p) {
        var cap = esc(p.name || "بدون اسم") + (p.place ? " — " + esc(p.place) : "");
        return '<div class="adm-row">' + thumb(p) +
          '<span class="adm-cap">' + cap + "</span>" +
          '<button type="button" class="adm-del adm-edit" onclick="admEdit(\'' + p.id + '\')">تعديل</button>' +
          '<button type="button" class="adm-del" onclick="admDel(\'' + p.id + '\')">حذف</button></div>';
      }).join("");
    });
  }

  window.admDel = function (id) {
    if (!confirm("حذف هذا المشروع نهائياً؟")) return;
    sb.from("projects").delete().eq("id", id).then(function (r) {
      if (r.error) { alert("فشل الحذف"); return; }
      loadList(); refreshSite();
    });
  };

  function uploadOne(file, name) {
    var ext = (file.name.match(/\.[a-z0-9]+$/i) || [".jpg"])[0].toLowerCase();
    var path = name + ext;
    return sb.storage.from("projects").upload(path, file, { upsert: true }).then(function (r) {
      if (r.error) throw r.error;
      return SUPABASE_URL + "/storage/v1/object/public/projects/" + path;
    });
  }

  /* تطبيق صورة قسم "من نحن" المحفوظة عند تحميل الصفحة */
  sb.from("site_settings").select("value").eq("key", "about_image").maybeSingle().then(function (r) {
    if (r.data && r.data.value) { var im = $("aboutImg"); if (im) im.src = r.data.value; }
  });

  window.admSaveAbout = function () {
    var f = $("admAboutFile").files[0];
    var msg = $("admAboutMsg");
    var btn = $("admAboutBtn");
    if (!f) { msg.textContent = "اختر صورة أولاً"; return; }
    btn.disabled = true;
    msg.textContent = "جارٍ رفع الصورة...";
    uploadOne(f, "site/about-" + Date.now()).then(function (url) {
      return sb.from("site_settings").upsert({ key: "about_image", value: url }).then(function (r) {
        if (r.error) throw r.error;
        var im = $("aboutImg");
        if (im) im.src = url;
        msg.textContent = "تم حفظ الصورة بنجاح";
        $("admAboutFile").value = "";
      });
    }).catch(function () {
      msg.textContent = "فشل حفظ الصورة، حاول مرة أخرى";
    }).then(function () {
      btn.disabled = false;
    });
  };

  /* آراء العملاء: عرض عام + إضافة/حذف من اللوحة */
  function loadReviews() {
    sb.from("reviews").select("*").order("created_at").then(function (r) {
      if (r.error || !r.data) return;
      var grid = $("reviewsList");
      if (grid) {
        grid.innerHTML = r.data.length ? r.data.map(function (v) {
          return '<img loading="lazy" decoding="async" src="' + esc(v.image_url) + '" alt="رأي عميل">';
        }).join("") : '<p style="grid-column:1/-1;text-align:center;color:#777;padding:18px">لا توجد آراء الآن</p>';
      }
      var lst = $("admRevList");
      if (lst) {
        lst.innerHTML = r.data.map(function (v) {
          return '<div class="adm-row"><img src="' + esc(v.image_url) + '" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:8px">' +
            '<button type="button" class="adm-del" onclick="admDelReview(\'' + v.id + '\')">حذف</button></div>';
        }).join("");
      }
    });
  }
  loadReviews();

  window.admAddReview = function () {
    var f = $("admRevFile").files[0];
    var msg = $("admRevMsg");
    var btn = $("admRevBtn");
    if (!f) { msg.textContent = "اختر صورة أولاً"; return; }
    btn.disabled = true;
    msg.textContent = "جارٍ رفع الصورة...";
    uploadOne(f, "reviews/review-" + Date.now()).then(function (url) {
      return sb.from("reviews").insert({ image_url: url }).then(function (r) {
        if (r.error) { msg.textContent = "فشل الحفظ، حاول مرة أخرى"; return; }
        msg.textContent = "✅ تمت الإضافة";
        $("admRevFile").value = "";
        loadReviews();
      });
    }).catch(function () { msg.textContent = "فشل رفع الصورة، حاول مرة أخرى"; })
      .then(function () { btn.disabled = false; });
  };

  window.admDelReview = function (id) {
    if (!confirm("حذف هذا الرأي نهائياً؟")) return;
    sb.from("reviews").delete().eq("id", id).then(function (r) {
      if (r.error) { alert("فشل الحذف"); return; }
      loadReviews();
    });
  };

  window.admEdit = function (id) {
    var p = null;
    for (var i = 0; i < admProjects.length; i++) { if (String(admProjects[i].id) === String(id)) p = admProjects[i]; }
    if (!p) return;
    admEditId = p.id;
    $("admEditName").value = p.name || "";
    $("admEditPlace").value = p.place || "";
    $("admEditBefore").value = "";
    $("admEditAfter").value = "";
    $("admEditMsg").textContent = "";
    $("admEditBox").style.display = "block";
    $("admEditBox").scrollIntoView({ block: "center" });
  };

  window.admCancelEdit = function () {
    admEditId = null;
    $("admEditBox").style.display = "none";
  };

  window.admSaveEdit = function () {
    if (!admEditId) return;
    var name = $("admEditName").value.trim();
    var place = $("admEditPlace").value.trim();
    var bf = $("admEditBefore").files[0];
    var af = $("admEditAfter").files[0];
    var msg = $("admEditMsg");
    var btn = $("admEditBtn");
    btn.disabled = true;
    msg.textContent = "جارٍ الحفظ...";
    Promise.all([
      bf ? uploadOne(bf, "proj-" + admEditId + "-before-" + Date.now()) : null,
      af ? uploadOne(af, "proj-" + admEditId + "-after-" + Date.now()) : null
    ]).then(function (urls) {
      var upd = { name: name, place: place };
      if (bf) { upd.before_url = urls[0]; upd.before_type = bf.type.indexOf("video") === 0 ? "video" : "image"; }
      if (af) { upd.after_url = urls[1]; upd.after_type = af.type.indexOf("video") === 0 ? "video" : "image"; }
      return sb.from("projects").update(upd).eq("id", admEditId);
    }).then(function (r) {
      btn.disabled = false;
      if (r.error) { msg.textContent = "فشل الحفظ، حاول مرة أخرى"; return; }
      msg.textContent = "✅ تم حفظ التعديل";
      loadList(); refreshSite();
      setTimeout(admCancelEdit, 800);
    }).catch(function () {
      btn.disabled = false;
      msg.textContent = "فشل الحفظ، حاول مرة أخرى";
    });
  };

  window.admAdd = function () {
    var name = $("admName").value.trim();
    var place = $("admPlace").value.trim();
    var bf = $("admBefore").files[0];
    var af = $("admAfter").files[0];
    var msg = $("admAddMsg");
    if (!bf || !af) { msg.textContent = "اختار صورة أو فيديو لقبل وبعد"; return; }
    msg.textContent = "جاري الرفع...";
    $("admAddBtn").disabled = true;
    var id = Date.now().toString(36);
    Promise.all([uploadOne(bf, id + "-before"), uploadOne(af, id + "-after")]).then(function (urls) {
      return sb.from("projects").select("sort").order("sort", { ascending: false }).limit(1).then(function (m) {
        var next = (m.data && m.data.length ? m.data[0].sort : 0) + 1;
        return sb.from("projects").insert({
          name: name, place: place, sort: next,
          before_type: bf.type.indexOf("video") === 0 ? "video" : "image", before_url: urls[0],
          after_type: af.type.indexOf("video") === 0 ? "video" : "image", after_url: urls[1]
        });
      });
    }).then(function (r) {
      $("admAddBtn").disabled = false;
      if (r.error) { msg.textContent = "فشلت الإضافة"; return; }
      msg.textContent = "✅ تمت الإضافة";
      $("admName").value = ""; $("admPlace").value = "";
      $("admBefore").value = ""; $("admAfter").value = "";
      loadList(); refreshSite();
    }).catch(function () {
      $("admAddBtn").disabled = false;
      msg.textContent = "فشل الرفع، حاول مرة أخرى";
    });
  };

  sb.auth.onAuthStateChange(function (event) {
    if (event === "PASSWORD_RECOVERY") {
      var b = $("admReset"); if (b) b.style.display = "flex";
    }
  });

  window.admSetPass = function () {
    var p1 = $("admNewPass").value, p2 = $("admNewPass2").value;
    var msg = $("admResetMsg");
    if (p1.length < 6) { msg.textContent = "كلمة المرور 6 أحرف على الأقل"; return; }
    if (p1 !== p2) { msg.textContent = "كلمتا المرور غير متطابقتين"; return; }
    sb.auth.updateUser({ password: p1 }).then(function (r) {
      msg.textContent = r.error ? "فشل التغيير، حاول مرة أخرى" : "✅ تم تغيير كلمة المرور";
    });
  };

  function refreshSite() {
    if (typeof kdLoadProjects === "function") kdLoadProjects(true);
  }
})();
