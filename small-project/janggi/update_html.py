import re
import os

html_path = r'c:\git\html\small-project\janggi\index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

css_links = """  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/board.css">
  <link rel="stylesheet" href="css/controls.css">
  <link rel="stylesheet" href="css/scoreboard.css">
  <link rel="stylesheet" href="css/settings.css">
  <link rel="stylesheet" href="css/record.css">
  <link rel="stylesheet" href="css/modal.css">
  <link rel="stylesheet" href="css/comment.css">"""

content = content.replace('<link rel="stylesheet" href="style.css">', css_links)
content = content.replace('<body style="overflow: hidden;">', '<body>')

replacements = [
    ('style="display: flex; align-items: center; justify-content: flex-end;"', 'class="settings-flex-row"'),
    ('style="display: flex; align-items: center; justify-content: flex-end; gap: 10px;"', 'class="settings-flex-row-gap"'),
    ('style="display: none; vertical-align: middle; margin-left: 10px; width: 30px; height: 30px; padding: 0; border: none; border-radius: 4px; background: transparent; cursor: pointer;"', 'class="color-picker-input"'),
    ('style="width: 150px; accent-color: #3b82f6;"', 'class="range-slider-input"'),
    ('style="min-width: 45px; text-align: right; color: #3b82f6;"', 'class="range-value-display"'),
    ('style="font-size: 0.8em; color: rgba(255, 255, 255, 0.4); margin-left: 4px; transition: transform 0.2s;"', 'class="accordion-arrow"'),
    ('style="font-size: 0.8em; color: rgba(255,255,255,0.4); margin-left: 4px; transition: transform 0.2s;"', 'class="accordion-arrow"'),
    ('style="display: none; margin-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 10px;"', 'class="accordion-content"'),
    ('style="font-weight: bold; border: none; border-radius: 6px; padding: 6px 15px; cursor: pointer;"', 'class="nation-toggle-btn"'),
    ('style="cursor: pointer; width: 18px; height: 18px; accent-color: #3b82f6;"', 'class="settings-checkbox"'),
    ('style="text-align: center; font-weight: bold;"', 'class="charim-table-header"'),
    ('style="font-weight: bold; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 12px; color: rgba(255, 255, 255, 0.4); font-size: 0.85em; text-align: left;"', 'class="settings-section-label"'),
    ('style="display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap;"', 'class="score-slide-settings-row"'),
    ('style="display: flex; align-items: center; gap: 4px; font-size: 0.85em; cursor: pointer; color: #cbd5e1; user-select: none;"', 'class="score-slide-label"'),
    ('style="cursor: pointer;"', 'class="score-slide-checkbox"'),
    ('style="display: flex; align-items: center; gap: 10px;"', 'class="metadata-actions-row"'),
    ('style="margin-bottom: 12px; font-size: 13px; opacity: 0.8;"', 'class="modal-description"'),
    ('style="display: flex; align-items: center; justify-content: space-between; gap: 15px; padding: 10px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05); flex-wrap: wrap;"', 'class="modal-theme-row"'),
    ('style="display: flex; align-items: center; justify-content: space-between; gap: 15px; padding: 10px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05); flex-wrap: wrap; margin-bottom: 15px;"', 'class="modal-theme-row modal-theme-row-mb"'),
    ('style="display: flex; align-items: center; justify-content: space-between; gap: 15px; padding: 10px; background: rgba(255, 255, 255, 0.03); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05); flex-wrap: wrap; margin-top: 10px;"', 'class="modal-theme-row modal-theme-row-mt"'),
    ('style="display: flex; align-items: center; gap: 8px;"', 'class="modal-theme-group"'),
    ('style="display: flex; align-items: center; gap: 8px; flex-grow: 1; justify-content: flex-end;"', 'class="modal-theme-group-grow"'),
    ('style="font-size: 13px; color: rgba(255, 255, 255, 0.7);"', 'class="modal-theme-label"'),
    ('style="width: 100%; height: 120px; background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #fff; padding: 10px; font-family: inherit; font-size: 14px; resize: none; box-sizing: border-box; margin-bottom: 15px; outline: none;"', 'class="comment-modal-textarea"'),
    ('style="width: 65px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; color: white; padding: 3px 5px; outline: none; text-align: center;"', 'class="comment-duration-input"'),
]

for s, c in replacements:
    content = content.replace(s, c)

content = re.sub(r'(class="category-header[^"]*")\s+style="[^"]*"', r'\1', content)
content = re.sub(r'(class="category-header-actions[^"]*")\s+style="[^"]*"', r'\1', content)

# specific patch for btn-primary
content = content.replace('class="btn btn-primary" style="background: #3b82f6; color: #fff;"', 'class="btn btn-primary modal-save-btn"')
content = content.replace('style="background: #3b82f6; color: #fff;" class="btn btn-primary"', 'class="btn btn-primary modal-save-btn"')

new_lines = []
for line in content.splitlines():
    if line.count('class="') > 1:
        classes = re.findall(r'class="([^"]+)"', line)
        if len(classes) > 1:
            merged = " ".join(classes)
            line = re.sub(r'class="[^"]+"\s*', '', line)
            if ' />' in line:
                line = line.replace('/>', f'class="{merged}" />', 1)
            else:
                line = line.replace('>', f' class="{merged}">', 1)
    new_lines.append(line)

content = "\n".join(new_lines)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)
