const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, '..', 'apps', 'web', 'src', 'app', 'page.tsx');
const cssFile = path.join(__dirname, '..', 'apps', 'web', 'src', 'app', 'globals.css');

if (!fs.existsSync(pageFile)) {
  console.error("page.tsx not found");
  process.exit(1);
}

let code = fs.readFileSync(pageFile, 'utf8');

// Find start of styles definition
const startMarker = 'const styles: Record<string, React.CSSProperties> = {';
const stylesIndex = code.indexOf(startMarker);
if (stylesIndex === -1) {
  console.error("Could not find styles object starting with:", startMarker);
  process.exit(1);
}

// Extract styles object block
let stylesObjectText = code.substring(stylesIndex + 'const styles: Record<string, React.CSSProperties> = '.length).trim();
if (stylesObjectText.endsWith(';')) {
  stylesObjectText = stylesObjectText.substring(0, stylesObjectText.length - 1).trim();
}

// Evaluate object
let stylesObj;
try {
  stylesObj = eval('(' + stylesObjectText + ')');
} catch (e) {
  console.error("Failed to parse styles object with eval:", e.message);
  process.exit(1);
}

// Translate camelCase key to kebab-case
function toKebabCase(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

// Generate CSS rules
const cssRules = [];
const keys = Object.keys(stylesObj);

keys.forEach(key => {
  const className = `jss-${toKebabCase(key)}`;
  const propsObj = stylesObj[key];
  const propsLines = [];
  
  Object.keys(propsObj).forEach(prop => {
    let cssProp = toKebabCase(prop);
    let val = propsObj[prop];
    
    // Auto-append px to raw numeric values if not zIndex, opacity, flex, etc.
    if (typeof val === 'number') {
      if (!['zIndex', 'opacity', 'flex', 'fontWeight', 'lineHeight'].includes(prop)) {
        val = val + 'px';
      }
    }
    propsLines.push(`  ${cssProp}: ${val};`);
  });

  const rule = `.${className} {\n${propsLines.join('\n')}\n}`;
  cssRules.push(rule);
});

// Append CSS rules to globals.css
const cssSeparator = `\n\n/* ==========================================================================\n   AUTO-GENERATED JSS STYLES MIGRATION (page.tsx)\n   ========================================================================== */\n`;
fs.appendFileSync(cssFile, cssSeparator + cssRules.join('\n\n') + '\n', 'utf8');
console.log(`Added ${cssRules.length} styles from JSS object to globals.css`);

let modifiedCode = code.substring(0, stylesIndex).trim();

// Scan and create replacements array
const replacements = [];
let match;

// Pattern 1: style={{ ...styles.navItem, ...(activeTab === 'XXX' ? styles.navItemActive : {}) }}
const navItemPattern = /style=\{\{\s*\.\.\.styles\.navItem,\s*\.\.\.\(\s*activeTab\s*===\s*'([a-zA-Z0-9_-]+)'\s*\?\s*styles\.navItemActive\s*:\s*\{\}\s*\)\s*\}\}/g;
while ((match = navItemPattern.exec(modifiedCode)) !== null) {
  const fullMatch = match[0];
  const activeTabVal = match[1];
  const replacementExpr = `className={\`jss-nav-item \${activeTab === '${activeTabVal}' ? 'jss-nav-item-active' : ''}\`}`;
  replacements.push({
    pos: match.index,
    length: fullMatch.length,
    original: fullMatch,
    type: 'direct-replace',
    replacement: replacementExpr
  });
}

// Pattern 2: style={{ ...styles.subTabButton, ...(contentSubTab === 'XXX' ? styles.subTabButtonActive : {}) }}
const subTabPattern = /style=\{\{\s*\.\.\.styles\.subTabButton,\s*\.\.\.\(\s*contentSubTab\s*===\s*'([a-zA-Z0-9_-]+)'\s*\?\s*styles\.subTabButtonActive\s*:\s*\{\}\s*\)\s*\}\}/g;
while ((match = subTabPattern.exec(modifiedCode)) !== null) {
  const fullMatch = match[0];
  const tabVal = match[1];
  const replacementExpr = `className={\`jss-sub-tab-button \${contentSubTab === '${tabVal}' ? 'jss-sub-tab-button-active' : ''}\`}`;
  replacements.push({
    pos: match.index,
    length: fullMatch.length,
    original: fullMatch,
    type: 'direct-replace',
    replacement: replacementExpr
  });
}

// Pattern 3: style={{ ...styles.KEY }}
const spreadOnlyRegex = /style=\{\{\s*\.\.\.styles\.([a-zA-Z0-9_]+)\s*\}\}/g;
while ((match = spreadOnlyRegex.exec(modifiedCode)) !== null) {
  const fullMatch = match[0];
  const key = match[1];
  replacements.push({
    pos: match.index,
    length: fullMatch.length,
    original: fullMatch,
    className: `jss-${toKebabCase(key)}`,
    type: 'class-only'
  });
}

// Pattern 4: style={styles.KEY}
const styleOnlyRegex = /style=\{\s*styles\.([a-zA-Z0-9_]+)\s*\}/g;
while ((match = styleOnlyRegex.exec(modifiedCode)) !== null) {
  const fullMatch = match[0];
  const key = match[1];
  replacements.push({
    pos: match.index,
    length: fullMatch.length,
    original: fullMatch,
    className: `jss-${toKebabCase(key)}`,
    type: 'class-only'
  });
}

// Pattern 5: style={{ ...styles.KEY, REST }}
const spreadPropsRegex = /style=\{\{\s*\.\.\.styles\.([a-zA-Z0-9_]+),\s*([\s\S]+?)\s*\}\}/g;
while ((match = spreadPropsRegex.exec(modifiedCode)) !== null) {
  const fullMatch = match[0];
  const key = match[1];
  const rest = match[2];
  
  if (rest.includes("activeTab ===") || rest.includes("contentSubTab ===")) {
    continue;
  }
  
  replacements.push({
    pos: match.index,
    length: fullMatch.length,
    original: fullMatch,
    className: `jss-${toKebabCase(key)}`,
    type: 'class-and-style',
    styleContent: `style={{ ${rest.trim()} }}`
  });
}

// Order replacements backwards from end of file to prevent shifting positions
replacements.sort((a, b) => b.pos - a.pos);

// Apply replacements to code
replacements.forEach(rep => {
  if (rep.type === 'direct-replace') {
    modifiedCode = modifiedCode.substring(0, rep.pos) + rep.replacement + modifiedCode.substring(rep.pos + rep.length);
  } else {
    // Find enclosing tag borders
    const tagStartPos = modifiedCode.lastIndexOf('<', rep.pos);
    const tagEndPos = modifiedCode.indexOf('>', rep.pos);
    const tagContent = modifiedCode.substring(tagStartPos, tagEndPos + 1);

    const classNameMatch = tagContent.match(/className\s*=\s*(['"]([^'"]+)['"]|\{\s*['"]([^'"]+)['"]\s*\}|\{\s*`([^`]+)`\s*\})/);

    let newTagContent = '';

    if (classNameMatch) {
      const fullClassAttr = classNameMatch[0];
      const classVal = classNameMatch[2] || classNameMatch[3] || classNameMatch[4];
      let newMergedClassAttr = '';

      if (classNameMatch[1].startsWith('{`')) {
        newMergedClassAttr = `className={\`${classVal} ${rep.className}\`}`;
      } else if (classNameMatch[1].startsWith('{')) {
        newMergedClassAttr = `className={\`${classVal} ${rep.className}\`}`;
      } else {
        newMergedClassAttr = `className="${classVal} ${rep.className}"`;
      }

      newTagContent = tagContent.replace(rep.original, rep.type === 'class-and-style' ? rep.styleContent : '').replace(/\s+/g, ' ').trim();
      newTagContent = newTagContent.replace(fullClassAttr, newMergedClassAttr);
    } else {
      // Create new className attribute
      const classNameAttr = `className="${rep.className}"`;
      const replacementStr = rep.type === 'class-and-style' ? `${classNameAttr} ${rep.styleContent}` : classNameAttr;
      newTagContent = tagContent.replace(rep.original, replacementStr).replace(/\s+/g, ' ').trim();
    }

    if (!newTagContent.startsWith('<')) newTagContent = '<' + newTagContent;
    if (!newTagContent.endsWith('>')) newTagContent = newTagContent + '>';

    modifiedCode = modifiedCode.substring(0, tagStartPos) + newTagContent + modifiedCode.substring(tagEndPos + 1);
  }
});

fs.writeFileSync(pageFile, modifiedCode, 'utf8');
console.log("Successfully refactored page.tsx JSS declarations!");
