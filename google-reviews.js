/* Live Google reviews for ftguinspections.com
   Reads /api/reviews (a Cloudflare Pages Function) and fills:
   - [data-g-reviews="N" | "all"]  a .reviews-grid to fill with review cards
   - [data-g-count]                 elements that show the review count
   - [data-g-rating]                elements that show the star rating
   If anything fails, the static fallback content already in the page stays. */
(function () {
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function initials(name) {
    var parts = String(name).trim().split(/\s+/);
    var a = parts[0] ? parts[0][0] : "";
    var b = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (a + b).toUpperCase() || "G";
  }
  function stars(n) {
    var r = Math.round(n || 0);
    return "★★★★★".slice(0, r) + "☆☆☆☆☆".slice(0, 5 - r);
  }
  function card(r) {
    var name = r.authorUrl
      ? '<a href="' + esc(r.authorUrl) + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;">' + esc(r.author) + "</a>"
      : esc(r.author);
    return (
      '<div class="review-card">' +
        '<div class="review-stars" aria-label="' + r.rating + ' out of 5 stars">' + stars(r.rating) + "</div>" +
        '<p class="review-text" style="display:-webkit-box;-webkit-line-clamp:8;-webkit-box-orient:vertical;overflow:hidden;">“' + esc(r.text) + "”</p>" +
        '<div class="review-author">' +
          '<div class="review-avatar">' + esc(initials(r.author)) + "</div>" +
          '<div><div class="review-name">' + name + "</div>" +
          '<div class="review-date review-meta">' + (r.when ? esc(r.when) + " · " : "") +
            (r.link ? '<a href="' + esc(r.link) + '" target="_blank" rel="noopener" style="color:inherit;">Google Review</a>' : "Google Review") +
          "</div></div>" +
        "</div>" +
      "</div>"
    );
  }

  fetch("/api/reviews")
    .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
    .then(function (d) {
      if (d.count) {
        document.querySelectorAll("[data-g-count]").forEach(function (el) {
          var n = Number(d.count).toLocaleString();
          if (el.hasAttribute("data-count")) {
            el.setAttribute("data-count", d.count);
            el.setAttribute("data-suffix", "");
          }
          el.textContent = n;
        });
      }
      if (d.rating) {
        document.querySelectorAll("[data-g-rating]").forEach(function (el) {
          el.textContent = Number(d.rating).toFixed(1);
        });
      }
      if (!d.reviews || !d.reviews.length) return;

      document.querySelectorAll("[data-g-reviews]").forEach(function (grid) {
        var limit = grid.getAttribute("data-g-reviews");
        var list = limit === "all" ? d.reviews : d.reviews.slice(0, Number(limit) || 3);
        var html = list.map(card).join("");
        if (limit === "all" && d.url) {
          html +=
            '<a class="review-card" href="' + esc(d.url) + '" target="_blank" rel="noopener" ' +
            'style="text-decoration:none;justify-content:center;align-items:center;text-align:center;">' +
              '<div class="review-stars">★★★★★</div>' +
              '<p class="review-text" style="font-style:normal;font-weight:700;margin-bottom:6px;">Read all ' +
                Number(d.count).toLocaleString() + " reviews on Google →</p>" +
              '<div class="review-date review-meta">' + Number(d.rating).toFixed(1) + " average rating</div>" +
            "</a>";
        }
        grid.innerHTML = html;
        var credit = document.createElement("p");
        credit.textContent = "Reviews from Google";
        var sample = grid.querySelector(".review-text");
        credit.style.cssText = "margin-top:14px;font-size:11px;letter-spacing:0.06em;opacity:0.75;text-align:right;color:" + (sample ? getComputedStyle(sample).color : "inherit") + ";";
        grid.parentNode.insertBefore(credit, grid.nextSibling);
      });
    })
    .catch(function () { /* keep the static fallback */ });
})();
