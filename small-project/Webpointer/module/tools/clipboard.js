(function(window) {
  'use strict';

  var cfg = window.WebpointerConfig;

  var WebpointerClipboard = {
    copiedObjects: [],

    copySelectedObjects: function() {
      if (!cfg || !cfg.selectedIds || cfg.selectedIds.size === 0) return false;
      this.copiedObjects = [];

      var selectedList = [];
      cfg.selectedIds.forEach(function(id) {
        var obj = cfg.objectsMap.get(id);
        if (obj) {
          selectedList.push(JSON.parse(JSON.stringify(obj)));
        }
      });

      if (selectedList.length === 0) return false;
      this.copiedObjects = selectedList;

      // Copy JSON string to system clipboard
      try {
        var jsonStr = JSON.stringify({ type: 'webpointer_clipboard', data: selectedList });
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(jsonStr);
        }
      } catch (err) {
        console.warn('[WebpointerClipboard] Clipboard writeText failed:', err);
      }

      return true;
    },

    pasteClipboardObjects: function() {
      if (!this.copiedObjects || this.copiedObjects.length === 0) return false;

      var newSelectedIds = new Set();
      var render = window.WebpointerRender;
      var objectsHelper = window.WebpointerObjects;

      this.copiedObjects.forEach(function(item) {
        var newObj = JSON.parse(JSON.stringify(item));
        var newId = 'obj_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        newObj.id = newId;

        // Offset coordinates slightly (+10px)
        if (newObj.attrs) {
          if (newObj.attrs.x !== undefined) newObj.attrs.x += 10;
          if (newObj.attrs.y !== undefined) newObj.attrs.y += 10;
          if (newObj.attrs.cx !== undefined) newObj.attrs.cx += 10;
          if (newObj.attrs.cy !== undefined) newObj.attrs.cy += 10;
          if (newObj.attrs.x1 !== undefined) {
            newObj.attrs.x1 += 10;
            newObj.attrs.x2 += 10;
            newObj.attrs.y1 += 10;
            newObj.attrs.y2 += 10;
          }
        }

        // Create DOM element for object
        if (objectsHelper && objectsHelper.createDomElementForObject) {
          newObj.el = objectsHelper.createDomElementForObject(newObj);
        } else {
          var mainSvg = document.getElementById('mainSvg');
          var objectsGroup = document.getElementById('objectsGroup') || mainSvg;
          var el;
          if (newObj.type === 'rect') el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          else if (newObj.type === 'ellipse') el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
          else if (newObj.type === 'line') el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          else if (newObj.type === 'text') el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          else el = document.createElementNS('http://www.w3.org/2000/svg', 'path');

          el.setAttribute('id', newObj.id);
          if (objectsGroup) objectsGroup.appendChild(el);
          newObj.el = el;
        }

        cfg.objectsMap.set(newId, newObj);
        if (render && render.updateElementAttributes) {
          render.updateElementAttributes(newObj);
        }
        newSelectedIds.add(newId);
      });

      // Auto-select pasted objects
      cfg.selectedIds.clear();
      newSelectedIds.forEach(function(id) {
        cfg.selectedIds.add(id);
      });

      if (render && render.renderUI) render.renderUI();
      if (render && render.renderRibbon) render.renderRibbon();
      if (window.pushHistoryState) window.pushHistoryState();

      return true;
    },

    pasteSVGFromClipboard: function(svgCode) {
      if (!svgCode || typeof svgCode !== 'string') return false;
      if (!svgCode.includes('<svg') && !svgCode.includes('<path') && !svgCode.includes('<rect') && !svgCode.includes('<g')) {
        return false;
      }

      var importer = window.WebpointerSVGImporter;
      if (!importer || !importer.importSVGContent) return false;

      var existingKeys = new Set(cfg.objectsMap.keys());
      importer.importSVGContent(svgCode);

      var newKeys = [];
      cfg.objectsMap.forEach(function(val, key) {
        if (!existingKeys.has(key)) {
          newKeys.push(key);
        }
      });

      if (newKeys.length > 0) {
        cfg.selectedIds.clear();
        newKeys.forEach(function(id) {
          cfg.selectedIds.add(id);
        });
        if (window.WebpointerRender && window.WebpointerRender.renderUI) {
          window.WebpointerRender.renderUI();
          window.WebpointerRender.renderRibbon();
        }
        if (window.pushHistoryState) window.pushHistoryState();
        return true;
      }

      return false;
    }
  };

  window.WebpointerClipboard = WebpointerClipboard;
})(window);
