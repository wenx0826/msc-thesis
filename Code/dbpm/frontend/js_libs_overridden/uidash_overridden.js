(function ($) {
  $.fn.dragcolumn = function () {
    let $active = null,
      $prev = null,
      $next = null;
    let startTotal = 0;
    let startPrevLeft = 0;
    let sumGrow = 0;
    let prevMin = 0;
    let nextMin = 0;

    function getGrow($el) {
      const flex = $el.css("flex") || "";
      const g = parseFloat(flex.split(" ")[0]);
      return Number.isFinite(g) ? g : 1;
    }

    function getMinWidth($el) {
      const mw = parseFloat($el.css("min-width"));
      return Number.isFinite(mw) ? mw : 0;
    }

    this.on("mousedown", function (e) {
      console.log("mousedown", e.target);
      $active = $(e.target);
      $prev = $active.prev();
      $next = $active.next();

      startTotal = $prev.outerWidth() + $next.outerWidth();
      startPrevLeft = $prev.offset().left;

      sumGrow = getGrow($prev) + getGrow($next);

      // Read minimum width (from CSS)
      prevMin = getMinWidth($prev);
      nextMin = getMinWidth($next);

      $("body").addClass("drag-in-progress");

      $active.addClass("draggable");
      $("body").addClass("drag-in-progress");

      $(document).on("mousemove.dragcolumn", function (e) {
        // console.log("mousemove - drag column - triggered", e.pageX);
        if (!$active || !$active.hasClass("draggable")) return;
        e.preventDefault();
        $active.trigger("dragcolumnmove");
        // Relative position of the mouse within "prev + next"
        let pos = e.pageX - startPrevLeft;

        // ===== clamp core =====
        // prev >= prevMin
        // next >= nextMin
        const minPos = prevMin;
        const maxPos = startTotal - nextMin;

        if (pos < minPos) pos = minPos;
        if (pos > maxPos) pos = maxPos;
        // ======================

        const leftRatio = startTotal === 0 ? 0.5 : pos / startTotal;
        const rightRatio = 1 - leftRatio;

        // Only reallocate grow within this pair
        $prev.css({
          "flex-grow": (leftRatio * sumGrow).toString(),
          "flex-basis": "0px",
        });
        $next.css({
          "flex-grow": (rightRatio * sumGrow).toString(),
          "flex-basis": "0px",
        });
      });
      $(document).one("mouseup", function (e) {
        $(document).off("mousemove.dragcolumn");
        $active.removeClass("draggable");
        $("body").removeClass("drag-in-progress");
        e.preventDefault();
      });
      e.preventDefault();
    });
  };

  $.fn.dragrow = function () {
    let $active = null,
      $prev = null,
      $next = null;

    let startTotal = 0; // Total height of prev+next
    let startPrevTop = 0; // Top of prev
    let sumGrow = 0; // Sum of flex-grow of prev+next
    let prevMin = 0,
      nextMin = 0;

    function getGrow($el) {
      const flex = $el.css("flex") || "";
      const g = parseFloat(flex.split(" ")[0]);
      return Number.isFinite(g) ? g : 1;
    }

    function getMinHeight($el) {
      const mh = parseFloat($el.css("min-height"));
      return Number.isFinite(mh) ? mh : 0;
    }

    // Global mousemove handler (namespace to avoid conflicts)
    $(document)
      .off("mousemove.dragrow")
      .on("mousemove.dragrow", function (e) {
        if (!$active || !$active.hasClass("draggable")) return;

        // Relative mouse position (Y axis) within "prev + next"
        let pos = e.pageY - startPrevTop;

        // Clamp: prev >= prevMin, next >= nextMin
        const minPos = prevMin;
        const maxPos = startTotal - nextMin;
        if (pos < minPos) pos = minPos;
        if (pos > maxPos) pos = maxPos;

        const ratioPrev = startTotal === 0 ? 0.5 : pos / startTotal;
        const ratioNext = 1 - ratioPrev;

        // Only reallocate grow within this pair (keep third block unaffected)
        $prev.css({
          "flex-grow": (ratioPrev * sumGrow).toString(),
        });
        $next.css({
          "flex-grow": (ratioNext * sumGrow).toString(),
        });

        e.preventDefault();
      });

    return this.each(function () {
      $(this).on("mousedown", function (e) {
        $active = $(this); // Always use this (the handle itself)
        $prev = $active.prev(); // The block above
        $next = $active.next(); // The block below

        startTotal = $prev.outerHeight() + $next.outerHeight();
        startPrevTop = $prev.offset().top;

        sumGrow = getGrow($prev) + getGrow($next);
        prevMin = getMinHeight($prev);
        nextMin = getMinHeight($next);
        $active.addClass("draggable");
        $("body").addClass("drag-in-progress");

        $(document).one("mouseup.dragrow", function () {
          $("body").removeClass("drag-in-progress");
          $active.removeClass("draggable");
        });

        e.preventDefault();
        e.stopPropagation();
      });
    });
  };

  $.fn.dragresize = function () {};
})(jQuery);

$(document).ready(function () {
  $("*[is=x-ui-] ui-resizehandle[data-direction='vertical']").dragcolumn();
  $("*[is=x-ui-] ui-resizehandle[data-direction='horizontal']").dragrow();
});
